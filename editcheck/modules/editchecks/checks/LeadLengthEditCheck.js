/**
 * Edit check to detect lead sections that are longer than the guidelines recommend
 *
 * @class
 * @extends mw.editcheck.BaseEditCheck
 *
 * @constructor
 * @param {mw.editcheck.Controller} controller
 * @param {Object} [config]
 * @param {number} [config.maximumWords=400] Maximum number of words in the lead section
 * @param {boolean} [includeSuggestions=false]
 */
mw.editcheck.LeadLengthEditCheck = function MWLeadLengthEditCheck() {
	// Parent constructor
	mw.editcheck.LeadLengthEditCheck.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( mw.editcheck.LeadLengthEditCheck, mw.editcheck.BaseEditCheck );

/* Static properties */

mw.editcheck.LeadLengthEditCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.LeadLengthEditCheck.super.static.defaultConfig, {
	showAsCheck: false,
	showAsSuggestion: false,
	minimumEditCount: {
		checkMode: 25,
		suggestionMode: 25
	},
	maximumEditCount: false,
	ignoreDisambiguationPages: true,
	// Upper end of the length of most featured article leads, per en:MOS:LEADLENGTH
	maximumWords: 400
} );

mw.editcheck.LeadLengthEditCheck.static.name = 'leadLength';

mw.editcheck.LeadLengthEditCheck.static.title = OO.ui.deferMsg( 'editcheck-leadlength-title' );

mw.editcheck.LeadLengthEditCheck.static.description = ve.deferJQueryMsg( 'editcheck-leadlength-description' );

mw.editcheck.LeadLengthEditCheck.static.successResult = OO.ui.deferMsg( 'editcheck-leadlength-thank' );

mw.editcheck.LeadLengthEditCheck.static.canBeStale = true;

mw.editcheck.LeadLengthEditCheck.static.choices = [
	{
		action: 'edit',
		label: ve.msg( 'editcheck-dialog-action-revise' ),
		modes: [ '' ]
	},
	{
		action: 'recheck',
		label: ve.msg( 'editcheck-dialog-action-recheck' ),
		flags: [ 'primary', 'progressive' ],
		icon: 'check',
		modes: [ 'revising' ]
	},
	{
		action: 'dismiss',
		label: ve.msg( 'editcheck-dialog-action-decline' ),
		modes: [ '', 'revising' ]
	}
];

// There is only one lead section, so one ID is sufficient. The ID keeps the
// dismissal when the lead grows past the dismissed range.
mw.editcheck.LeadLengthEditCheck.static.actionId = 'lead';

mw.editcheck.LeadLengthEditCheck.static.wordSegmenters = new Map();

/* Static methods */

/**
 * Count the words in a string
 *
 * @static
 * @param {string} text
 * @param {string} lang Language code
 * @return {number}
 */
mw.editcheck.LeadLengthEditCheck.static.countWords = function ( text, lang ) {
	// Intl.Segmenter also finds words in languages that do not use spaces
	if ( typeof Intl.Segmenter === 'function' ) {
		const segmenters = this.wordSegmenters;
		if ( !segmenters.has( lang ) ) {
			segmenters.set( lang, new Intl.Segmenter( lang, { granularity: 'word' } ) );
		}
		let count = 0;
		for ( const segment of segmenters.get( lang ).segment( text ) ) {
			if ( segment.isWordLike ) {
				count++;
			}
		}
		return count;
	}
	return text.split( /\s+/ ).filter( ( word ) => word ).length;
};

/* Methods */

/**
 * Get the paragraphs of the lead section
 *
 * Paragraphs inside other nodes (e.g. image captions, tables or lists) do not
 * count. Like #isRangeInValidSection, a document without headings has no lead
 * section.
 *
 * @param {ve.dm.Document} documentModel
 * @return {ve.dm.ParagraphNode[]}
 */
mw.editcheck.LeadLengthEditCheck.prototype.getLeadParagraphs = function ( documentModel ) {
	const headings = this.getHeadingsFromDocument( documentModel );
	if ( !headings.length ) {
		return [];
	}
	const leadEnd = headings[ 0 ].getOuterRange().start;
	const documentNode = documentModel.getDocumentNode();
	const isTopLevel = ( node ) => {
		let parent = node.getParent();
		while ( parent && parent.getType() === 'section' ) {
			parent = parent.getParent();
		}
		return parent === documentNode;
	};
	return documentModel.getNodesByType( 'paragraph', true ).filter(
		( node ) => node.getOuterRange().end <= leadEnd && isTopLevel( node )
	);
};

/**
 * Count the words in the lead section
 *
 * @param {ve.dm.Document} documentModel
 * @param {ve.dm.ParagraphNode[]} [paragraphs] Lead paragraphs, if already known
 * @return {number}
 */
mw.editcheck.LeadLengthEditCheck.prototype.countLeadWords = function ( documentModel, paragraphs ) {
	paragraphs = paragraphs || this.getLeadParagraphs( documentModel );
	const lang = documentModel.getLang();
	// Count each paragraph separately, because the text of adjacent
	// paragraphs has no separator.
	return paragraphs.reduce(
		( total, node ) => total + this.constructor.static.countWords(
			documentModel.data.getText( false, node.getRange() ), lang
		),
		0
	);
};

/**
 * Get an action if the lead section is too long
 *
 * @param {ve.dm.Surface} surfaceModel
 * @return {mw.editcheck.EditCheckAction[]}
 */
mw.editcheck.LeadLengthEditCheck.prototype.getLeadActions = function ( surfaceModel ) {
	const documentModel = surfaceModel.getDocument();
	if ( this.isDismissedId( this.constructor.static.actionId ) ) {
		return [];
	}
	const paragraphs = this.getLeadParagraphs( documentModel );
	if ( !paragraphs.length ) {
		return [];
	}
	const leadRange = new ve.Range(
		paragraphs[ 0 ].getRange().start,
		paragraphs[ paragraphs.length - 1 ].getRange().end
	);
	// In suggestion mode all content counts as modified. In check mode, only
	// show the check if the edit touches the lead.
	if ( !this.getModifiedContentRanges( documentModel ).some(
		( range ) => range.touchesRange( leadRange )
	) ) {
		return [];
	}
	if ( this.countLeadWords( documentModel, paragraphs ) <= this.config.maximumWords ) {
		return [];
	}
	const action = new mw.editcheck.EditCheckAction( {
		fragments: [ surfaceModel.getLinearFragment( leadRange ) ],
		id: this.constructor.static.actionId,
		check: this
	} );
	action.on( 'stale', ( stale ) => {
		action.setMode( stale ? 'revising' : '' );
		action.gutterQuickAction = stale ? 'recheck' : null;
	} );
	return [ action ];
};

/**
 * @inheritdoc
 */
mw.editcheck.LeadLengthEditCheck.prototype.onBranchNodeChange = function ( surfaceModel ) {
	return this.getLeadActions( surfaceModel );
};

/**
 * @inheritdoc
 */
mw.editcheck.LeadLengthEditCheck.prototype.act = function ( choice, action, surface ) {
	// Acting again (recheck, dismiss, or re-starting edit) cancels an
	// intent to complete from a previous 'edit' choice that never
	// resolved via a natural discard.
	action.cancelComplete();
	if ( choice === 'dismiss' ) {
		return action.widget.showFeedback( {
			allowInSuggestions: true,
			choices: [
				{
					data: 'appropriate',
					label: ve.msg( 'editcheck-leadlength-reject-appropriate' )
				},
				{
					data: 'uncertain',
					label: ve.msg( 'editcheck-leadlength-reject-uncertain' )
				},
				{
					data: 'other',
					label: ve.msg( 'editcheck-leadlength-reject-other' )
				}
			]
		} ).then( ( reason ) => {
			this.dismiss( action );
			return ve.createDeferred().resolve( { action: choice, reason } ).promise();
		} );
	} else if ( choice === 'edit' && surface ) {
		// Same flow as ToneCheck: put the action in the bounded "revising"
		// state, and thank the user if a later run discards the action.
		const closePromise = this.controller.inBeforeSave ? this.controller.closeDialog() : ve.createDeferred().resolve().promise();
		return closePromise.then( () => {
			const fragment = action.fragments[ 0 ].collapseToEnd();
			// After pre-save, the mid-edit action is a different object
			const newAction = this.controller.getActions().find( ( cAct ) => cAct.equals( action ) );
			if ( newAction ) {
				newAction.startRevising();
				// Count revising as complete once this action is discarded,
				// e.g. because the user's edit resolved the tone issue.
				newAction.intendComplete();
				this.controller.refresh( true ).then( () => {
					this.controller.ensureActionIsShown( newAction );
					surface.getView().focus();
				} );
			} else {
				fragment.select();
				surface.getView().focus();
			}
		} );
	} else if ( choice === 'recheck' ) {
		action.stopRevising();
		if ( this.countLeadWords( surface.getModel().getDocument() ) <= this.config.maximumWords ) {
			action.complete();
			this.controller.removeAction( 'onBranchNodeChange', action, false );
		}
		return;
	}
	// Parent method
	return mw.editcheck.LeadLengthEditCheck.super.prototype.act.apply( this, arguments );
};

/* Registration */

mw.editcheck.editCheckFactory.register( mw.editcheck.LeadLengthEditCheck );
