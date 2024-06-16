require( './EditCheckContextItem.js' );
require( './EditCheckInspector.js' );

mw.editcheck = {};

mw.editcheck.config = require( './config.json' );

mw.editcheck.accountShouldSeeEditCheck = function ( config ) {
	// account status:
	// loggedin, loggedout, or any-other-value meaning 'both'
	// we'll count temporary users as "logged out" by using isNamed here
	if ( config.account === 'loggedout' && mw.user.isNamed() ) {
		return false;
	}
	if ( config.account === 'loggedin' && !mw.user.isNamed() ) {
		return false;
	}
	if ( config.maximumEditcount && mw.config.get( 'wgUserEditCount', 0 ) > config.maximumEditcount ) {
		return false;
	}
	return true;
};

mw.editcheck.shouldApplyToSection = function ( documentModel, selection, config ) {
	const ignoreSections = config.ignoreSections || [];
	if ( ignoreSections.length === 0 && !config.ignoreLeadSection ) {
		// Nothing is forbidden, so everything is permitted
		return true;
	}
	const isHeading = function ( nodeType ) {
		return nodeType === 'mwHeading';
	};
	// Note: we set a limit of 1 here because otherwise this will turn around
	// to keep looking when it hits the document boundary:
	const heading = documentModel.getNearestNodeMatching( isHeading, selection.getRange().start, -1, 1 );
	if ( !heading ) {
		// There's no preceding heading, so work out if we count as being in a
		// lead section. It's only a lead section if there's more headings
		// later in the document, otherwise it's just a stub article.
		return !(
			config.ignoreLeadSection &&
			!!documentModel.getNearestNodeMatching( isHeading, selection.getRange().start, 1 )
		);
	}
	if ( ignoreSections.length === 0 ) {
		// There's nothing left to deny
		return true;
	}
	const compare = new Intl.Collator( documentModel.getLang(), { sensitivity: 'accent' } ).compare;
	const headingText = documentModel.data.getText( false, heading.getRange() );
	for ( let i = ignoreSections.length - 1; i >= 0; i-- ) {
		if ( compare( headingText, ignoreSections[ i ] ) === 0 ) {
			return false;
		}
	}
	return true;
};

/**
 * Find added content in the document model that might need a reference
 *
 * @param {ve.dm.DocumentModel} documentModel Document model
 * @param {boolean} [includeReferencedContent] Include content ranges that already
 *  have a reference.
 * @return {ve.dm.Selection[]} Content ranges that might need a reference
 */
mw.editcheck.findAddedContentNeedingReference = function ( documentModel, includeReferencedContent ) {
	if ( mw.config.get( 'wgNamespaceNumber' ) !== mw.config.get( 'wgNamespaceIds' )[ '' ] ) {
		return [];
	}

	if ( !documentModel.completeHistory.getLength() ) {
		return [];
	}
	let operations;
	try {
		operations = documentModel.completeHistory.squash().transactions[ 0 ].operations;
	} catch ( err ) {
		// TransactionSquasher can sometimes throw errors; until T333710 is
		// fixed just count this as not needing a reference.
		mw.errorLogger.logError( err, 'error.visualeditor' );
		return [];
	}

	const ranges = [];
	let offset = 0;
	const endOffset = documentModel.getDocumentRange().end;
	operations.every( ( op ) => {
		if ( op.type === 'retain' ) {
			offset += op.length;
		} else if ( op.type === 'replace' ) {
			const insertedRange = new ve.Range( offset, offset + op.insert.length );
			offset += op.insert.length;
			// 1. Only trigger if the check is a pure insertion, with no adjacent content removed (T340088)
			if ( op.remove.length === 0 ) {
				ve.batchPush(
					ranges,
					// 2. Only fully inserted paragraphs (ranges that cover the whole node) (T345121)
					mw.editcheck.getContentRanges( documentModel, insertedRange, true )
				);
			}
		}
		// Reached the end of the doc / start of internal list, stop searching
		return offset < endOffset;
	} );
	const addedTextRanges = ranges.filter( ( range ) => {
		const minimumCharacters = mw.editcheck.config.addReference.minimumCharacters;
		// 3. Check that at least minimumCharacters characters have been inserted sequentially
		if ( range.getLength() >= minimumCharacters ) {
			// 4. Exclude any ranges that already contain references
			if ( !includeReferencedContent ) {
				for ( let i = range.start; i < range.end; i++ ) {
					if ( documentModel.data.isElementData( i ) && documentModel.data.getType( i ) === 'mwReference' ) {
						return false;
					}
				}
			}
			// 5. Exclude any ranges that aren't at the document root (i.e. image captions, table cells)
			const branchNode = documentModel.getBranchNodeFromOffset( range.start );
			if ( branchNode.getParent() !== documentModel.attachedRoot ) {
				return false;
			}
			return true;
		}
		return false;
	} );

	return addedTextRanges
		.map( ( range ) => new ve.dm.LinearSelection( range ) )
		.filter( ( selection ) => mw.editcheck.shouldApplyToSection( documentModel, selection, mw.editcheck.config.addReference ) );
};

/**
 * Return the content ranges (content branch node interiors) contained within a range
 *
 * For a content branch node entirely contained within the range, its entire interior
 * range will be included. For a content branch node overlapping with the range boundary,
 * only the covered part of its interior range will be included.
 *
 * @param {ve.dm.Document} documentModel The documentModel to search
 * @param {ve.Range} range The range to include
 * @param {boolean} covers Only include ranges which cover the whole of their node
 * @return {ve.Range[]} The contained content ranges (content branch node interiors)
 */
mw.editcheck.getContentRanges = function ( documentModel, range, covers ) {
	const ranges = [];
	documentModel.selectNodes( range, 'branches' ).forEach( ( spec ) => {
		if (
			spec.node.canContainContent() && (
				!covers || (
					!spec.range || // an empty range means the node is covered
					spec.range.equalsSelection( spec.nodeRange )
				)
			)
		) {
			ranges.push( spec.range || spec.nodeRange );
		}
	} );
	return ranges;
};

mw.editcheck.rejections = [];

mw.editcheck.getRejectionReasons = function () {
	return mw.editcheck.rejections;
};

mw.editcheck.refCheckShown = false;

if ( mw.config.get( 'wgVisualEditorConfig' ).editCheckTagging ) {
	mw.hook( 've.activationComplete' ).add( () => {
		const target = ve.init.target;

		function getRefNodes() {
			// The firstNodes list is a numerically indexed array of reference nodes in the document.
			// The list is append only, and removed references are set to undefined in place.
			// To check if a new reference is being published, we just need to know if a reference
			// with an index beyond the initial list (initLength) is still set.
			const internalList = target.getSurface().getModel().getDocument().getInternalList();
			const group = internalList.getNodeGroup( 'mwReference/' );
			return group ? group.firstNodes || [] : [];
		}

		const initLength = getRefNodes().length;
		target.saveFields.vetags = function () {
			const refNodes = getRefNodes();
			const newLength = refNodes.length;
			let newNodesInDoc = false;
			for ( let i = initLength; i < newLength; i++ ) {
				if ( refNodes[ i ] ) {
					newNodesInDoc = true;
					break;
				}
			}
			const tags = [];
			if ( newNodesInDoc ) {
				tags.push( 'editcheck-newreference' );
			}
			if ( mw.editcheck.refCheckShown ) {
				tags.push( 'editcheck-references-activated' );
			}
			return tags.join( ',' );
		};
	} );
	mw.hook( 've.deactivationComplete' ).add( () => {
		const target = ve.init.target;
		delete target.saveFields.vetags;
	} );
}

if (
	( mw.config.get( 'wgVisualEditorConfig' ).editCheck && mw.editcheck.accountShouldSeeEditCheck( mw.editcheck.config.addReference ) ) ||
	// ecenable will bypass normal account-status checks as well:
	new URL( location.href ).searchParams.get( 'ecenable' ) ||
	!!window.MWVE_FORCE_EDIT_CHECK_ENABLED
) {
	let saveProcessDeferred;
	mw.hook( 've.preSaveProcess' ).add( ( saveProcess, target ) => {
		const surface = target.getSurface();

		if ( surface.getMode() !== 'visual' ) {
			// Some checks will entirely work in source mode for most cases.
			// But others will fail spectacularly -- e.g. reference check
			// isn't aware of <ref> tags and so will suggest that all content
			// has references added. As such, disable in source mode for now.
			return;
		}

		// clear rejection-reasons between runs of the save process, so only the last one counts
		mw.editcheck.rejections.length = 0;

		let selections = mw.editcheck.findAddedContentNeedingReference( surface.getModel().getDocument() );

		if ( selections.length ) {
			mw.editcheck.refCheckShown = true;

			const surfaceView = surface.getView();
			const toolbar = target.getToolbar();
			const reviewToolbar = new ve.ui.PositionedTargetToolbar( target, target.toolbarConfig );
			reviewToolbar.setup( [
				{
					name: 'back',
					type: 'bar',
					include: [ 'editCheckBack' ]
				},
				// Placeholder toolbar groups
				// TODO: Make a proper TitleTool?
				{
					name: 'title',
					type: 'bar',
					include: []
				},
				{
					name: 'save',
					// TODO: MobileArticleTarget should ignore 'align'
					align: OO.ui.isMobile() ? 'before' : 'after',
					type: 'bar',
					include: [ 'showSaveDisabled' ]
				}
			], surface );

			reviewToolbar.items[ 1 ].$element.removeClass( 'oo-ui-toolGroup-empty' );
			reviewToolbar.items[ 1 ].$group.append(
				$( '<span>' ).addClass( 've-ui-editCheck-toolbar-title' ).text( ve.msg( 'editcheck-dialog-title' ) )
			);
			if ( OO.ui.isMobile() ) {
				reviewToolbar.$element.addClass( 've-init-mw-mobileArticleTarget-toolbar' );
			}
			target.toolbar.$element.before( reviewToolbar.$element );
			target.toolbar = reviewToolbar;

			saveProcessDeferred = ve.createDeferred();
			const context = surface.getContext();

			// TODO: Allow multiple selections to be shown when multicheck is enabled
			selections = selections.slice( 0, 1 );

			// eslint-disable-next-line no-shadow
			const drawSelections = ( selections ) => {
				const highlightNodes = [];
				selections.forEach( ( selection ) => {
					highlightNodes.push.apply( highlightNodes, surfaceView.getDocument().selectNodes( selection.getCoveringRange(), 'branches' ).map( ( spec ) => spec.node ) );
				} );
				// TODO: Make selections clickable when multicheck is enabled
				surfaceView.drawSelections(
					'editCheck',
					selections.map( ( selection ) => ve.ce.Selection.static.newFromModel( selection, surfaceView ) )
				);
				surfaceView.setReviewMode( true, highlightNodes );
			};

			const contextDone = ( responseData, contextData ) => {
				if ( !responseData ) {
					// this is the back button
					return saveProcessDeferred.resolve();
				}
				const selectionIndex = selections.indexOf( contextData.selection );

				if ( responseData.action !== 'reject' ) {
					mw.notify( ve.msg( 'editcheck-dialog-addref-success-notify' ), { type: 'success' } );
				} else if ( responseData.reason ) {
					mw.editcheck.rejections.push( responseData.reason );
				}
				// TODO: Move on to the next issue, when multicheck is enabled
				// selections = mw.editcheck.findAddedContentNeedingReference( surface.getModel().getDocument() );
				selections = [];

				if ( selections.length ) {
					context.removePersistentSource( 'editCheckReferences' );
					setTimeout( () => {
						// timeout needed to wait out the newly added content being focused
						surface.getModel().setNullSelection();
						drawSelections( selections );
						setTimeout( () => {
							// timeout needed to allow the context to reposition
							showCheckContext( selections[ Math.min( selectionIndex, selections.length - 1 ) ] );
						} );
					}, 500 );
				} else {
					saveProcessDeferred.resolve( true );
				}
			};

			// eslint-disable-next-line no-inner-declarations
			function showCheckContext( selection ) {
				const fragment = surface.getModel().getFragment( selection, true );

				// Select the found content to correctly position the context on desktop
				fragment.select();

				context.addPersistentSource( {
					embeddable: false,
					data: {
						fragment: fragment,
						selection: selection,
						callback: contextDone,
						saveProcessDeferred: saveProcessDeferred
					},
					name: 'editCheckReferences'
				} );

				// Deactivate to prevent selection suppressing mobile context
				surface.getView().deactivate();

				// Once the context is positioned, clear the selection
				setTimeout( () => {
					surface.getModel().setNullSelection();
				} );
			}

			drawSelections( selections );
			toolbar.toggle( false );
			target.onContainerScroll();

			saveProcess.next( () => {

				showCheckContext( selections[ 0 ] );

				return saveProcessDeferred.promise().then( ( data ) => {
					context.removePersistentSource( 'editCheckReferences' );

					surfaceView.drawSelections( 'editCheck', [] );
					surfaceView.setReviewMode( false );

					reviewToolbar.$element.remove();
					toolbar.toggle( true );
					target.toolbar = toolbar;
					target.onContainerScroll();

					// Check the user inserted a citation
					if ( data ) {
						const delay = ve.createDeferred();
						// If they inserted, wait 2 seconds on desktop before showing save dialog
						setTimeout( () => {
							delay.resolve();
						}, !OO.ui.isMobile() && data.action !== 'reject' ? 2000 : 0 );
						return delay.promise();
					} else {
						return ve.createDeferred().reject().promise();
					}
				} );
			} );
		}
	} );
	mw.hook( 've.deactivationComplete' ).add( () => {
		if ( saveProcessDeferred ) {
			saveProcessDeferred.reject();
		}
	} );
}

ve.ui.EditCheckBack = function VeUiEditCheckBack() {
	// Parent constructor
	ve.ui.EditCheckBack.super.apply( this, arguments );

	this.setDisabled( false );
};
OO.inheritClass( ve.ui.EditCheckBack, ve.ui.Tool );
ve.ui.EditCheckBack.static.name = 'editCheckBack';
ve.ui.EditCheckBack.static.icon = 'previous';
ve.ui.EditCheckBack.static.autoAddToCatchall = false;
ve.ui.EditCheckBack.static.autoAddToGroup = false;
ve.ui.EditCheckBack.static.title =
	OO.ui.deferMsg( 'visualeditor-backbutton-tooltip' );
ve.ui.EditCheckBack.prototype.onSelect = function () {
	const context = this.toolbar.getSurface().getContext();
	if ( context.inspector ) {
		context.inspector.close();
	} else {
		context.items[ 0 ].close();
	}
	this.setActive( false );
};
ve.ui.EditCheckBack.prototype.onUpdateState = function () {
	this.setDisabled( false );
};
ve.ui.toolFactory.register( ve.ui.EditCheckBack );

ve.ui.EditCheckSaveDisabled = function VeUiEditCheckSaveDisabled() {
	// Parent constructor
	ve.ui.EditCheckSaveDisabled.super.apply( this, arguments );
};
OO.inheritClass( ve.ui.EditCheckSaveDisabled, ve.ui.MWSaveTool );
ve.ui.EditCheckSaveDisabled.static.name = 'showSaveDisabled';
ve.ui.EditCheckSaveDisabled.static.autoAddToCatchall = false;
ve.ui.EditCheckSaveDisabled.static.autoAddToGroup = false;
ve.ui.EditCheckSaveDisabled.prototype.onUpdateState = function () {
	this.setDisabled( true );
};

ve.ui.toolFactory.register( ve.ui.EditCheckSaveDisabled );
