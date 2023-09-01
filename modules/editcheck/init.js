require( './EditCheckContextItem.js' );
require( './EditCheckInspector.js' );

mw.editcheck = {};

mw.editcheck.config = require( './config.json' );

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
	var operations;
	try {
		operations = documentModel.completeHistory.squash().transactions[ 0 ].operations;
	} catch ( err ) {
		// TransactionSquasher can sometimes throw errors; until T333710 is
		// fixed just count this as not needing a reference.
		mw.errorLogger.logError( err, 'error.visualeditor' );
		return [];
	}

	var ranges = [];
	var offset = 0;
	var endOffset = documentModel.getDocumentRange().end;
	operations.every( function ( op ) {
		if ( op.type === 'retain' ) {
			offset += op.length;
		} else if ( op.type === 'replace' ) {
			var insertedRange = new ve.Range( offset, offset + op.insert.length );
			offset += op.insert.length;
			if ( op.remove.length === 0 ) {
				ve.batchPush(
					ranges,
					mw.editcheck.getContentRanges( documentModel, insertedRange )
				);
			}
		}
		// Reached the end of the doc / start of internal list, stop searching
		return offset < endOffset;
	} );
	var addedTextRanges = ranges.filter( function ( range ) {
		var minimumCharacters = mw.editcheck.config.addReference.minimumCharacters;
		// 1. Check that at least minimumCharacters characters have been inserted sequentially
		if ( range.getLength() >= minimumCharacters ) {
			// 2. Exclude any ranges that already contain references
			if ( !includeReferencedContent ) {
				for ( var i = range.start; i < range.end; i++ ) {
					if ( documentModel.data.isElementData( i ) && documentModel.data.getType( i ) === 'mwReference' ) {
						return false;
					}
				}
			}
			// 3. Exclude any ranges that aren't at the document root (i.e. image captions, table cells)
			var branchNode = documentModel.getBranchNodeFromOffset( range.start );
			if ( branchNode.getParent() !== documentModel.attachedRoot ) {
				return false;
			}
			return true;
		}
		return false;
	} );

	return addedTextRanges.map( function ( range ) {
		return new ve.dm.LinearSelection( range );
	} );
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
 * @return {ve.Range[]} The contained content ranges (content branch node interiors)
 */
mw.editcheck.getContentRanges = function ( documentModel, range ) {
	var ranges = [];
	documentModel.selectNodes( range, 'branches' ).forEach( function ( spec ) {
		if ( spec.node.canContainContent() ) {
			ranges.push( spec.range || spec.nodeRange );
		}
	} );
	return ranges;
};

mw.editcheck.refCheckShown = false;

if ( mw.config.get( 'wgVisualEditorConfig' ).editCheckTagging ) {
	mw.hook( 've.activationComplete' ).add( function () {
		var target = ve.init.target;

		function getRefNodes() {
			// The firstNodes list is a numerically indexed array of reference nodes in the document.
			// The list is append only, and removed references are set to undefined in place.
			// To check if a new reference is being published, we just need to know if a reference
			// with an index beyond the initial list (initLength) is still set.
			var internalList = target.getSurface().getModel().getDocument().getInternalList();
			var group = internalList.getNodeGroup( 'mwReference/' );
			return group ? group.firstNodes || [] : [];
		}

		var initLength = getRefNodes().length;
		target.saveFields.vetags = function () {
			var refNodes = getRefNodes();
			var newLength = refNodes.length;
			var newNodesInDoc = false;
			for ( var i = initLength; i < newLength; i++ ) {
				if ( refNodes[ i ] ) {
					newNodesInDoc = true;
					break;
				}
			}
			var tags = [];
			if ( newNodesInDoc ) {
				tags.push( 'editcheck-newreference' );
			}
			if ( mw.editcheck.refCheckShown ) {
				tags.push( 'editcheck-references-activated' );
			}
			return tags.join( ',' );
		};
	} );
}

if ( mw.config.get( 'wgVisualEditorConfig' ).editCheck ) {
	mw.hook( 've.preSaveProcess' ).add( function ( saveProcess, target ) {
		var surface = target.getSurface();

		var selections = mw.editcheck.findAddedContentNeedingReference( surface.getModel().getDocument() );

		if ( selections.length ) {
			mw.editcheck.refCheckShown = true;

			var surfaceView = surface.getView();
			var toolbar = target.getToolbar();
			var reviewToolbar = new ve.ui.PositionedTargetToolbar( target, target.toolbarConfig );
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

			var selection = selections[ 0 ];
			var highlightNodes = surfaceView.getDocument().selectNodes( selection.getCoveringRange(), 'branches' ).map( function ( spec ) {
				return spec.node;
			} );

			surfaceView.drawSelections( 'editCheck', [ ve.ce.Selection.static.newFromModel( selection, surfaceView ) ] );
			surfaceView.setReviewMode( true, highlightNodes );
			toolbar.toggle( false );
			target.onContainerScroll();

			saveProcess.next( function () {
				var saveProcessDeferred = ve.createDeferred();
				var fragment = surface.getModel().getFragment( selection, true );

				var context = surface.getContext();

				// Select the found content to correctly the context on desktop
				fragment.select();
				// Deactivate to prevent selection suppressing mobile context
				surface.getView().deactivate();

				context.addPersistentSource( {
					embeddable: false,
					data: {
						fragment: fragment,
						saveProcessDeferred: saveProcessDeferred
					},
					name: 'editCheck'
				} );

				// Once the context is positioned, clear the selection
				setTimeout( function () {
					surface.getModel().setNullSelection();
				} );

				return saveProcessDeferred.promise().then( function ( data ) {
					context.removePersistentSource( 'editCheck' );

					surfaceView.drawSelections( 'editCheck', [] );
					surfaceView.setReviewMode( false );

					reviewToolbar.$element.remove();
					toolbar.toggle( true );
					target.toolbar = toolbar;
					target.onContainerScroll();

					// Check the user inserted a citation
					if ( data && data.action ) {
						if ( data.action !== 'reject' ) {
							mw.notify( ve.msg( 'editcheck-dialog-addref-success-notify' ), { type: 'success' } );
						}
						var delay = ve.createDeferred();
						// If they inserted, wait 2 seconds on desktop before showing save dialog
						setTimeout( function () {
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
	var context = this.toolbar.getSurface().getContext();
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
