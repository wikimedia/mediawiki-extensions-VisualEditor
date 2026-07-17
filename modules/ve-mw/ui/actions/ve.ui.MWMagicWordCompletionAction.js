/*!
 * VisualEditor UserInterface MWMagicWordCompletionAction class.
 *
 * @copyright See AUTHORS.txt
 */

/**
 * Autocompletion of double-underscore behaviour switches (e.g. __TOC__) in
 * wikitext source mode, triggered by typing "__". The chosen word is inserted
 * complete, with the caret after it.
 *
 * @class
 * @extends ve.ui.CompletionAction
 *
 * @constructor
 * @param {ve.ui.Surface} surface Surface to act on
 * @param {string} [source]
 */
ve.ui.MWMagicWordCompletionAction = function VeUiMWMagicWordCompletionAction() {
	// Parent constructor
	ve.ui.MWMagicWordCompletionAction.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWMagicWordCompletionAction, ve.ui.CompletionAction );

/* Static Properties */

ve.ui.MWMagicWordCompletionAction.static.name = 'mwMagicWordCompletion';

// Strip the two-character "__" trigger from the searched input.
ve.ui.MWMagicWordCompletionAction.static.sequenceLength = 2;

// Only known words are offered, so don't suggest whatever the user typed.
ve.ui.MWMagicWordCompletionAction.static.alwaysIncludeInput = false;

/**
 * The double-underscore behaviour switches to offer, as complete "__WORD__"
 * forms (e.g. __TOC__). Populated at load time from the wiki's magic words by a
 * generated data script (ResourceLoaderData::makeMagicWordData) so it reflects
 * the content language and installed extensions; the empty default just offers
 * nothing until that runs.
 *
 * @property {string[]}
 * @static
 * @inheritable
 */
ve.ui.MWMagicWordCompletionAction.static.magicWords = [];

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWMagicWordCompletionAction.prototype.getSuggestions = function ( input ) {
	return ve.createDeferred().resolve(
		this.filterSuggestionsForInput( this.constructor.static.magicWords, input )
	).promise();
};

/**
 * @inheritdoc
 */
ve.ui.MWMagicWordCompletionAction.prototype.compareSuggestionToInput = function ( suggestion, normalizedInput ) {
	// Suggestions are complete "__WORD__" forms; the input is the text typed
	// after the "__" trigger, so match against the word without its underscores.
	const name = suggestion.slice( 2, -2 ).toLowerCase();
	return {
		isMatch: name.startsWith( normalizedInput ),
		isExact: name === normalizedInput
	};
};

/* Registration */

ve.ui.actionFactory.register( ve.ui.MWMagicWordCompletionAction );

const magicWordCommand = new ve.ui.Command(
	'openMWMagicWordCompletions', ve.ui.MWMagicWordCompletionAction.static.name, 'open',
	{ supportedSelections: [ 'linear' ] }
);
ve.ui.wikitextCommandRegistry.register( magicWordCommand );
ve.ui.wikitextSequenceRegistry.register(
	new ve.ui.Sequence( 'autocompleteMWMagicWords', 'openMWMagicWordCompletions', '__', 0 )
);
