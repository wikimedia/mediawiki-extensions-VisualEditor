// The checks directory is loaded in alphabetical order, so require the parent class.
require( './PasteCheck.js' );

/**
 * Edit check to detect content pasted from an LLM website.
 *
 * It acts on the LLM pastes that mw.editcheck.PasteCheck ignores. It is a separate check so
 * that it can have its own configuration, messages and tags.
 *
 * @class
 * @extends mw.editcheck.PasteCheck
 *
 * @constructor
 * @param {mw.editcheck.Controller} controller
 * @param {Object} [config]
 * @param {boolean} [includeSuggestions=false]
 */
mw.editcheck.LLMPasteCheck = function MWLLMPasteCheck() {
	// Parent constructor
	mw.editcheck.LLMPasteCheck.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( mw.editcheck.LLMPasteCheck, mw.editcheck.PasteCheck );

/* Static properties */

// State the inherited defaults again, because Special:EditChecks reads each check file on its
// own and cannot follow the inheritance.
mw.editcheck.LLMPasteCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.LLMPasteCheck.super.static.defaultConfig, {
	showAsSuggestion: false,
	maximumEditCount: false,
	minimumEditCount: 0,
	minimumCharacters: 50,
	ignoreQuotedContent: false
} );

mw.editcheck.LLMPasteCheck.static.name = 'llm-paste';

mw.editcheck.LLMPasteCheck.static.title = OO.ui.deferMsg( 'editcheck-copyvio-llm-title' );

mw.editcheck.LLMPasteCheck.static.description = ve.deferJQueryMsg( 'editcheck-copyvio-llm-description' );

mw.editcheck.LLMPasteCheck.static.prompt = null;

mw.editcheck.LLMPasteCheck.static.success = OO.ui.deferMsg( 'editcheck-copyvio-llm-remove-notify' );

mw.editcheck.LLMPasteCheck.static.keepSuccess = OO.ui.deferMsg( 'editcheck-copyvio-llm-keep-notify' );

mw.editcheck.LLMPasteCheck.static.choices = [
	{
		action: 'keep',
		label: OO.ui.deferMsg( 'editcheck-copyvio-llm-action-keep' )
	},
	{
		action: 'remove',
		label: OO.ui.deferMsg( 'editcheck-copyvio-llm-action-remove' )
	}
];

/* Methods */

/**
 * @inheritdoc
 */
mw.editcheck.LLMPasteCheck.prototype.isRelevantPaste = function ( categories ) {
	return categories.includes( this.constructor.static.llmPasteCategory );
};

/**
 * @inheritdoc
 */
mw.editcheck.LLMPasteCheck.prototype.getKeepFeedback = function () {
	return {
		description: ve.msg( 'editcheck-copyvio-keep-description' ),
		choices: [ 'edited', 'not-ai', 'generated', 'other' ].map(
			( key ) => ( {
				data: 'llm-' + key,
				// Messages that can be used here:
				// * editcheck-copyvio-llm-keep-edited
				// * editcheck-copyvio-llm-keep-not-ai
				// * editcheck-copyvio-llm-keep-generated
				// * editcheck-copyvio-llm-keep-other
				// Parse the label, because keep-generated has a link.
				label: $( ve.htmlMsg( 'editcheck-copyvio-llm-keep-' + key ) )
			} ) )
	};
};

/* Registration */

mw.editcheck.editCheckFactory.register( mw.editcheck.LLMPasteCheck );
