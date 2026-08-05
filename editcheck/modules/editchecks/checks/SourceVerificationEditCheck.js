/**
 * SourceVerificationEditCheck
 *
 * Displays suggestions provided by the AI Source Verification script
 *
 * @class
 *
 * @constructor
 * @param {mw.editcheck.Controller} controller
 * @param {Object} [config]
 * @param {boolean} [includeSuggestions=false]
 */
mw.editcheck.SourceVerificationEditCheck = function MWSourceVerificationEditCheck() {
	mw.editcheck.SourceVerificationEditCheck.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( mw.editcheck.SourceVerificationEditCheck, mw.editcheck.BaseEditCheck );

/* Static properties */

mw.editcheck.SourceVerificationEditCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.BaseEditCheck.static.defaultConfig, {
	showAsCheck: false, // This would never make sense to enable
	showAsSuggestion: false,
	templateToInsert: false, // Name of the template to insert
	minimumEditCount: {
		suggestionMode: 8000000,
		checkMode: 8000000
	}
} );

mw.editcheck.SourceVerificationEditCheck.static.name = 'llmSourceVerification';
mw.editcheck.SourceVerificationEditCheck.static.title = OO.ui.deferMsg( 'editcheck-sourceveri-title' );
mw.editcheck.SourceVerificationEditCheck.static.description = OO.ui.deferMsg( 'editcheck-sourceveri-description' );
mw.editcheck.SourceVerificationEditCheck.static.footer = ve.deferJQueryMsg( 'editcheck-sourceveri-footer' );
mw.editcheck.SourceVerificationEditCheck.static.footerIcon = 'robot';
mw.editcheck.SourceVerificationEditCheck.static.success = OO.ui.deferMsg( 'editcheck-sourceveri-thank' );
mw.editcheck.SourceVerificationEditCheck.static.canBeStale = true;

mw.editcheck.SourceVerificationEditCheck.static.choices = [
	{
		action: 'edit',
		label: ve.msg( 'editcheck-dialog-action-revise' ),
		modes: [ '' ]
	},
	{
		action: 'done',
		label: ve.msg( 'editcheck-dialog-action-done' ),
		flags: [ 'primary', 'progressive' ],
		icon: 'check',
		modes: [ 'revising' ]
	},
	{
		action: 'dismiss',
		label: OO.ui.deferMsg( 'editcheck-action-dismiss' ),
		modes: [ '', 'revising' ]
	}
];

mw.editcheck.SourceVerificationEditCheck.static.cachedPromises = new Map();

/* Static methods */

mw.editcheck.SourceVerificationEditCheck.static.fetchSuggestions = function ( surfaceModel ) {
	if ( !this.cachedPromises.has( surfaceModel ) ) {
		const promise = mw.editcheck.fetchTimeout( 'https://source-verification-suggestions.wmcloud.org/v1/models/editing-suggestions:predict', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: JSON.stringify(
				/* eslint-disable camelcase */
				{
					wiki_id: mw.config.get( 'wgDBname' ),
					page_id: mw.config.get( 'wgRelevantArticleId' )
				}
				/* eslint-enable camelcase */
			)
		} )
			.then( ( response ) => response.json() )
			.then( ( results ) => {
				if ( !Array.isArray( results ) ) {
					throw new Error( 'Invalid source verification response' );
				}
				const suggestions = [];
				const documentModel = surfaceModel.getDocument();
				results.forEach( ( result ) => {
					if ( !result.target ) {
						return;
					}
					const ranges = documentModel.findText( result.target, { caseSensitiveString: true } );
					const range = ranges[ 0 ];
					if ( !range ) {
						ve.track( 'activity.editCheck-' + this.name, {
							action: `stale-id-${ result.suggestion_id }-reason-targetnotfound`
						} );
						return;
					}
					if ( ranges.length > 1 ) {
						// If multiple ranges are found for a suggestion, we'll still try to check the citation of the first one
						// However, we want to track when this happens.
						ve.track( 'activity.editCheck-' + this.name, {
							action: `ambiguoustarget-id-${ result.suggestion_id }`
						} );
					}
					result.fragment = surfaceModel.getLinearFragment( range );
					suggestions.push( result );
				} );
				return suggestions;
			} );
		this.cachedPromises.set( surfaceModel, promise );
	}
	return this.cachedPromises.get( surfaceModel );
};

/**
 * Send VEFU events if suggestion could not be applied
 *
 * Tracks as 'invalidated' if it had been applied in this session, otherwise 'stale'
 * Includes suggestion id and reason it could not be applied
 *
 * @param {Object} suggestion
 * @param {string} suggestion.suggestion_id
 * @param {boolean} suggestion.previouslyApplied
 * @param {boolean} suggestion.tracked
 * @param {string} reason
 */
mw.editcheck.SourceVerificationEditCheck.static.logSuggestionNotApplied = function ( suggestion, reason ) {
	if ( suggestion.tracked ) {
		return;
	}
	suggestion.tracked = true;
	const actionType = suggestion.previouslyApplied ? 'invalidated' : 'stale';
	ve.track( 'activity.editCheck-' + this.name, {
		action: `${ actionType }-id-${ suggestion.suggestion_id }-reason-${ reason }`
	} );
};

/* Methods */

mw.editcheck.SourceVerificationEditCheck.prototype.onBranchNodeChange = function ( surfaceModel ) {
	if ( !this.includeSuggestions ) {
		return;
	}
	const documentModel = surfaceModel.getDocument();
	const modified = this.getModifiedRanges( documentModel );
	return this.constructor.static.fetchSuggestions( surfaceModel ).then( ( suggestions ) => suggestions.map( ( suggestion ) => {
		const fragment = suggestion.fragment;
		const range = fragment.getSelection().getRange();
		if ( this.isDismissedId( suggestion.suggestion_id ) ) {
			return null;
		}
		if (
			range.isCollapsed() || // deleted fragment
			fragment.getText( '\uFFFC' ) !== suggestion.target // modified text might no longer apply
		) {
			this.constructor.static.logSuggestionNotApplied( suggestion, 'targetnotfound' );
			return null;
		}
		if ( modified.some( ( modifiedRange ) => modifiedRange.touchesRange( range ) ) ) {
			// return if not followed immediately by a citation
			if ( !documentModel.data.isOpenElementData( range.end ) || documentModel.data.getType( range.end ) !== 'mwReference' ) {
				this.constructor.static.logSuggestionNotApplied( suggestion, 'nosource' );
				return null;
			}
			// get the reference nodes following the target, only if they match the expected urls
			const res = this.followedByUrl( documentModel, suggestion.url, range );
			const refNodePairs = res && res.matchedPairs;

			if ( refNodePairs ) {
				const refNodesLength = refNodePairs.reduce(
					( sum, pair ) => sum + pair.node.getOuterLength(),
					0
				);
				const offset = range.end + 1 + refNodesLength;
				const node = documentModel.getDocumentNode().getNodeFromOffset( offset );
				// return if already followed by some specified "failed verification" template
				if (
					this.config.templateToInsert &&
					node instanceof ve.dm.MWTransclusionNode &&
					node.isSingleTemplate( this.config.templateToInsert )
				) {
					this.constructor.static.logSuggestionNotApplied( suggestion, 'templatefound' );
					return null;
				}
				const footnotes = refNodePairs.map( ( pair ) => ( {
					footnoteLabel: pair.node.getFormattedRefLinkLabel(),
					url: pair.url
				} ) );

				// include the citation in the fragment so that it's highlighted
				const fragmentWithCitation = fragment.adjustLinearSelection( 0, refNodesLength );
				const action = new mw.editcheck.SourceVerificationEditCheckAction( {
					suggestionData: suggestion,
					id: suggestion.suggestion_id,
					fragments: [ fragmentWithCitation ],
					title: suggestion.title,
					check: this,
					trackId: true,
					footnotes
				} );
				action.on( 'stale', ( stale ) => {
					action.setMode( stale ? 'revising' : '' );
				} );
				suggestion.previouslyApplied = true;
				return action;
			} else if ( res ) {
				this.constructor.static.logSuggestionNotApplied( suggestion, res.invalidationReason );
			}
		} else {
			this.constructor.static.logSuggestionNotApplied( suggestion, 'other' );
		}
		return null;
	} ) );
};

/**
 * Build the message shown in the action card
 *
 * @param {Object} suggestion
 * @param {Array<{footnoteLabel: jQuery, url: string}>} footnotes
 * @return {jQuery|string}
 */
mw.editcheck.SourceVerificationEditCheck.prototype.buildDialogMessage = function ( suggestion, footnotes ) {
	const $message = $( '<div>' )
		.addClass( 've-ui-editCheckActionWidget-sourceVerification-message' )
		.append( $( '<div>' ).text( OO.ui.resolveMsg( this.constructor.static.description ) ) );

	if ( suggestion.quote ) {
		$message.append(
			$( '<div>' )
				.addClass( 've-ui-editCheckActionWidget-sourceVerification-quoteLabel' )
				.text( ve.msg( 'editcheck-sourceveri-quote-label' ) ),
			$( '<blockquote>' )
				.addClass( 've-ui-editCheckActionWidget-sourceVerification-quote' )
				.text( suggestion.quote )
		);
	}

	if ( footnotes && footnotes.length ) {
		const $sourceLinks = $( '<div>' )
			.addClass( 've-ui-editCheckActionWidget-sourceVerification-link' )
			.append(
				$( '<span>' ).text( ve.msg( 'editcheck-sourceveri-go-to-source' ) ),
				document.createTextNode( ' ' )
			);
		footnotes.forEach( ( { footnoteLabel, url }, index ) => {
			const $footnoteLink = $( '<a>' )
				.append( footnoteLabel );
			ve.setAttributeSafe( $footnoteLink[ 0 ], 'href', url );

			$sourceLinks.append( $footnoteLink );

			if ( index < footnotes.length - 1 ) {
				$sourceLinks.append( document.createTextNode( ' ' ) );
			}
		} );

		$message.append( $sourceLinks );
	}

	if ( suggestion.comments ) {
		$message.append(
			$( '<div>' )
				.addClass( 've-ui-editCheckActionWidget-sourceVerification-comments' )
				.append(
					$( '<strong>' )
						.addClass( 've-ui-editCheckActionWidget-sourceVerification-comments-label' )
						.text( ve.msg( 'editcheck-sourceveri-model-comments' ) ),
					document.createTextNode( ' ' ),
					$( '<span>' )
						.addClass( 've-ui-editCheckActionWidget-sourceVerification-comments-text' )
						.text( suggestion.comments )
				)
		);
	}

	return $message;
};

/**
 * Check if the reference node(s) that immediately follow the given range contain the expected source URL(s)
 *
 * Validates one reference node per URL, in order.
 * Returns array of matched reference nodes and the url that they matched, or the reason matching failed.
 *
 * @param {ve.dm.Document} documentModel
 * @param {string[]} expectedUrls Ordered list of expected source URLs
 * @param {ve.Range} range Range that the expected URLs should follow
 * @return {{ matchedPairs: Array<{node: ve.dm.MWReferenceNode, url: string}>|null, invalidationReason: string|null }|null}
 */
mw.editcheck.SourceVerificationEditCheck.prototype.followedByUrl = function ( documentModel, expectedUrls, range ) {
	if ( !expectedUrls || !expectedUrls.length || expectedUrls.some( ( url ) => typeof url !== 'string' || !url ) ) {
		return {
			matchedPairs: null,
			invalidationReason: 'invalidurls'
		};
	}

	// check if given reference node contains the expected url
	const matchesUrlInRefNode = ( refNode, expectedUrl ) => {
		if ( !refNode ) {
			return false;
		}
		const itemNode = refNode.getInternalItem();
		if ( !itemNode ) {
			return false;
		}
		if ( ve.ui.CitoidReferenceContextItem ) {
			const url = ve.ui.CitoidReferenceContextItem.static.getConvertibleHref( itemNode );
			if ( url && url === expectedUrl ) {
				// don't want to return false yet in case archive URL matches
				return true;
			}
		}

		let matched = false;
		// now look for templates with parameters that seem url-y
		itemNode.traverse( ( node ) => {
			if ( matched || !( node instanceof ve.dm.MWTransclusionNode ) ) {
				return;
			}
			matched = node.getPartsList().some( ( part ) => part.params && Object.values( part.params ).some(
				( param ) => param.wt === expectedUrl
			) );
		} );
		return matched;
	};

	const refNodes = [];
	let offset = range.end + 1;

	// grab all reference nodes following the range
	for ( let i = 0; i < expectedUrls.length; i++ ) {
		const refNode = documentModel.getDocumentNode().getNodeFromOffset( offset );
		if ( !( refNode instanceof ve.dm.MWReferenceNode ) ) {
			return {
				matchedPairs: null,
				invalidationReason: 'missingref'
			};
		}
		refNodes.push( refNode );
		offset += refNode.getOuterLength();
	}

	const remainingUrls = expectedUrls.slice();
	const matchedPairs = [];

	// check that each reference node contains one of the expected urls
	for ( const refNode of refNodes ) {
		const i = remainingUrls.findIndex( ( rUrl ) => matchesUrlInRefNode( refNode, rUrl ) );
		if ( i === -1 ) {
			return {
				matchedPairs: null,
				invalidationReason: 'unexpectedsource'
			};
		}
		const [ url ] = remainingUrls.splice( i, 1 );
		matchedPairs.push( { node: refNode, url } );
	}

	const nextNode = documentModel.getDocumentNode().getNodeFromOffset( offset );
	if ( nextNode instanceof ve.dm.MWReferenceNode ) {
		return {
			matchedPairs: null,
			invalidationReason: 'incompletegroup'
		};
	}

	return {
		matchedPairs,
		invalidationReason: null
	};
};

mw.editcheck.SourceVerificationEditCheck.prototype.act = function ( choice, action, surface ) {
	if ( choice === 'dismiss' ) {
		return action.widget.showFeedback( {
			allowInSuggestions: true,
			suppressFeedback: true,
			choices: [
				{
					data: 'irrelevant',
					label: ve.msg( 'editcheck-sourceveri-reject-irrelevant' )
				},
				{
					data: 'valid',
					label: ve.msg( 'editcheck-sourceveri-reject-valid-nofix' )
				},
				{
					data: 'other',
					label: ve.msg( 'editcheck-sourceveri-reject-other' )
				}
			]
		} ).then( ( reason ) => {
			this.dismiss( action );
			this.showSuccess();
			this.controller.removeAction( 'onBranchNodeChange', action, false );
			ve.track( 'activity.editCheck-' + this.constructor.static.name, { action: `${ choice }-reason-${ reason }-id-${ action.id }` } );
			if ( reason === 'valid' && this.config.templateToInsert ) {
				return this.insertFailedVerificationTemplate(
					action.fragments[ action.fragments.length - 1 ],
					this.config.templateToInsert
				).then( () => ( { action: choice, reason } ) );
			}
			return ve.createDeferred().resolve( { action: choice, reason } ).promise();
		} );
	} else if ( choice === 'edit' && surface ) {
		const fragment = action.fragments[ action.fragments.length - 1 ].collapseToEnd();
		// prevent triggering branch node change listeners and thus clearing staleness immediately:
		this.controller.updateCurrentBranchNodeFromSelection( fragment.getSelection() );
		action.updateStale( true );
	} else if ( choice === 'done' ) {
		action.updateStale( false );
		this.dismiss( action );
		this.showSuccess();
		this.controller.removeAction( 'onBranchNodeChange', action, false );
	}
};

/**
 *  Insert a template that indicates a source does not support a claim
 *
 * @param {ve.dm.LinearFragment} fragment Fragment after which the template should be inserted
 * @param {string} templateToInsert Name of template to insert to communicate the source doesn't support the claim
 * @return {JQuery.Promise} promise that will resolve after template is inserted
 */
mw.editcheck.SourceVerificationEditCheck.prototype.insertFailedVerificationTemplate = function ( fragment, templateToInsert ) {
	const transclusionModel = new ve.dm.MWTransclusionModel( fragment.getDocument() );
	const template = ve.dm.MWTemplateModel.newFromName( transclusionModel, templateToInsert );
	if ( !template ) {
		return ve.createDeferred().reject(
			new Error( `Failed to find template: ${ templateToInsert }` )
		).promise();
	}
	return transclusionModel.addPart( template ).then(
		() => transclusionModel.insertTransclusionNode( fragment.collapseToEnd() )
	);
};

/* Registration */

mw.editcheck.editCheckFactory.register( mw.editcheck.SourceVerificationEditCheck );

/**
 * SourceVerificationEditCheckAction
 *
 * Subclass of EditCheckAction to include information about the suggestion associated with this action
 *
 * @class
 * @extends mw.editcheck.EditCheckAction
 *
 * @constructor
 * @param {Object} config Configuration options
 * @param {Object} config.suggestionData Suggestion data from the API
 * @param {Array<{footnoteLabel: jQuery, url: string}>} config.footnotes Footnote data computed when creating the action
 */
mw.editcheck.SourceVerificationEditCheckAction = function MWSourceVerificationEditCheckAction( config ) {
	mw.editcheck.SourceVerificationEditCheckAction.super.call( this, config );
	this.suggestionData = config.suggestionData;
	this.footnotes = config.footnotes;
};

/* Inheritance */

OO.inheritClass( mw.editcheck.SourceVerificationEditCheckAction, mw.editcheck.EditCheckAction );

/**
 * @inheritdoc
 */
mw.editcheck.SourceVerificationEditCheckAction.prototype.getDescription = function () {
	return this.check.buildDialogMessage( this.suggestionData, this.footnotes );
};

/**
 * @inheritdoc
 */
mw.editcheck.SourceVerificationEditCheckAction.prototype.updateFrom = function ( action ) {
	// Update the action description when footnote indices change
	if ( this.footnotes.length === action.footnotes.length &&
		// Compare the raw label text for each footnote (i.e., the citation number)
		this.footnotes.every( ( { footnoteLabel }, i ) => footnoteLabel.text() === action.footnotes[ i ].footnoteLabel.text() ) ) {
		return false;
	}
	this.footnotes = action.footnotes;
	return true;
};
