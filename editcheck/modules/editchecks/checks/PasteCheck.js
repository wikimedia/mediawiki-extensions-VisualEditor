/**
 * Edit check to detect pasted content, which is often a sign of copyright violation/plagiarism.
 *
 * @class
 * @extends mw.editcheck.BaseEditCheck
 *
 * @constructor
 * @param {mw.editcheck.Controller} controller
 * @param {Object} [config]
 * @param {boolean} [includeSuggestions=false]
 */
mw.editcheck.PasteCheck = function MWPasteCheck() {
	// Parent constructor
	mw.editcheck.PasteCheck.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( mw.editcheck.PasteCheck, mw.editcheck.BaseEditCheck );

/* Static properties */

mw.editcheck.PasteCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.PasteCheck.super.static.defaultConfig, {
	showAsSuggestion: false,
	minimumCharacters: 50,
	ignoreQuotedContent: true
} );

mw.editcheck.PasteCheck.static.title = OO.ui.deferMsg( 'editcheck-copyvio-title' );

mw.editcheck.PasteCheck.static.description = ve.deferJQueryMsg( 'editcheck-copyvio-description' );

mw.editcheck.PasteCheck.static.prompt = OO.ui.deferMsg( 'editcheck-copyvio-prompt' );

mw.editcheck.PasteCheck.static.success = OO.ui.deferMsg( 'editcheck-copyvio-remove-notify' );

/**
 * Message to show when the user keeps the pasted content
 *
 * @static
 * @property {jQuery|string|Function|OO.ui.HtmlSnippet}
 */
mw.editcheck.PasteCheck.static.keepSuccess = OO.ui.deferMsg( 'editcheck-copyvio-keep-notify' );

mw.editcheck.PasteCheck.static.name = 'paste';

mw.editcheck.PasteCheck.static.choices = [
	{
		action: 'keep',
		label: OO.ui.deferMsg( 'editcheck-copyvio-action-keep' )
	},
	{
		action: 'remove',
		label: OO.ui.deferMsg( 'editcheck-copyvio-action-remove' )
	}
];

mw.editcheck.PasteCheck.static.takesFocus = true;

/**
 * Length of each paste when it was first seen, keyed by event ID
 *
 * Shared with subclasses, which see a different set of pastes.
 *
 * @static
 * @property {Object.<string,number>}
 */
mw.editcheck.PasteCheck.static.originalPasteLengths = {};

/**
 * Categories of paste sources that have a lower plagiarism risk
 *
 * @static
 * @property {string[]}
 */
mw.editcheck.PasteCheck.static.trustedPasteCategories = [
	'internal', // Another VE instance
	'wordProcessor', // Word, Google Docs, etc.
	'plain' // Plain text sources, e.g. Notepad, or copied as plain text
];

/**
 * Category of paste source that mw.editcheck.LLMPasteCheck acts on
 *
 * @static
 * @property {string}
 */
mw.editcheck.PasteCheck.static.llmPasteCategory = 'ai';

/* Methods */

/**
 * Find out if a paste is in the scope of this check
 *
 * @param {string[]} categories Categories of the paste source
 * @return {boolean}
 */
mw.editcheck.PasteCheck.prototype.isRelevantPaste = function ( categories ) {
	const staticProps = this.constructor.static;
	// Trusted sources have a low plagiarism risk. LLMPasteCheck acts on the LLM pastes.
	return !categories.some( ( category ) => (
		staticProps.trustedPasteCategories.includes( category ) ||
		category === staticProps.llmPasteCategory
	) );
};

/**
 * Get the feedback to ask for when the user keeps the pasted content
 *
 * @return {Object} Options for mw.editcheck.EditCheckActionWidget#showFeedback
 */
mw.editcheck.PasteCheck.prototype.getKeepFeedback = function () {
	return {
		description: ve.msg( 'editcheck-copyvio-keep-description' ),
		choices: [ 'wrote', 'permission', 'other' ].map(
			( key ) => ( {
				data: key,
				// Messages that can be used here:
				// * editcheck-copyvio-keep-wrote
				// * editcheck-copyvio-keep-permission
				// * editcheck-copyvio-keep-other
				label: ve.msg( 'editcheck-copyvio-keep-' + key )
			} ) )
	};
};

mw.editcheck.PasteCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	const pastesById = {};
	const doc = surfaceModel.getDocument();
	doc.getDocumentNode().getAnnotationRanges().forEach( ( annRange ) => {
		const annotation = annRange.annotation;
		if ( !( annotation instanceof ve.dm.ImportedDataAnnotation ) ) {
			return;
		}
		const source = annotation.getAttribute( 'source' );
		if ( !this.isRelevantPaste( source ? source.categories : [] ) ) {
			return;
		}
		const id = annotation.getAttribute( 'eventId' );
		if ( this.isDismissedId( id ) ) {
			return;
		}
		if ( !this.isRangeValid( annRange.range, doc ) ) {
			return;
		}
		pastesById[ id ] = pastesById[ id ] || [];
		pastesById[ id ].push( annRange.range );
	} );
	return Object.keys( pastesById ).map( ( id ) => {
		const fragments = pastesById[ id ].map( ( range ) => surfaceModel.getLinearFragment( range ) );
		if ( !( id in mw.editcheck.PasteCheck.static.originalPasteLengths ) ) {
			const combinedLength = pastesById[ id ].reduce( ( sum, range ) => sum + range.getLength(), 0 );
			mw.editcheck.PasteCheck.static.originalPasteLengths[ id ] = combinedLength;
		}
		if ( mw.editcheck.PasteCheck.static.originalPasteLengths[ id ] < this.config.minimumCharacters ) {
			return null;
		}

		return new mw.editcheck.EditCheckAction( {
			fragments,
			id,
			check: this
		} );
	} ).filter( Boolean );
};

// TODO: enable this once issues editing content from pre-save are resolved (T407543)
// mw.editcheck.PasteCheck.prototype.onBeforeSave = mw.editcheck.PasteCheck.prototype.onDocumentChange;

mw.editcheck.PasteCheck.prototype.act = function ( choice, action, surface ) {
	switch ( choice ) {
		case 'keep':
			return action.widget.showFeedback( this.getKeepFeedback() ).then( ( reason ) => {
				this.dismiss( action );
				this.showSuccess( this.constructor.static.keepSuccess );
				return ve.createDeferred().resolve( { action: choice, reason } ).promise();
			} );
		case 'remove': {
			action.fragments.forEach( ( fragment ) => {
				fragment.removeContent();

				// If removal leaves an empty content branch node, then remove it too
				const range = fragment.getSelection().getCoveringRange();
				const node = surface.getModel().getDocument().getBranchNodeFromOffset( range.start );
				if ( node && node.canContainContent() && node.getRange().isCollapsed() ) {
					surface.getModel().getLinearFragment( node.getOuterRange() ).removeContent();
				}
			} );
			// If in pre-save mode, close the check dialog
			const closePromise = this.controller.inBeforeSave ? this.controller.closeDialog() : ve.createDeferred().resolve().promise();
			return closePromise.then( () => {
				// Auto-scrolling causes selection and focus changes...
				setTimeout( () => {
					action.fragments[ action.fragments.length - 1 ].select();
					surface.getView().focus();
				}, 500 );
				this.showSuccess();
			} );
		}
	}
};

/* Registration */

mw.editcheck.editCheckFactory.register( mw.editcheck.PasteCheck );
