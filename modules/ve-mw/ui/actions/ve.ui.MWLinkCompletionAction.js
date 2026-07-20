/*!
 * VisualEditor UserInterface MWLinkCompletionAction class.
 *
 * @copyright See AUTHORS.txt
 */

/**
 * Autocompletion of wikilinks in source mode, triggered by typing "[[".
 *
 * @class
 * @extends ve.ui.MWTitleCompletionAction
 *
 * @constructor
 * @param {ve.ui.Surface} surface Surface to act on
 * @param {string} [source]
 */
ve.ui.MWLinkCompletionAction = function VeUiMWLinkCompletionAction() {
	// Parent constructor
	ve.ui.MWLinkCompletionAction.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWLinkCompletionAction, ve.ui.MWTitleCompletionAction );

/* Static Properties */

ve.ui.MWLinkCompletionAction.static.name = 'mwLinkCompletion';

ve.ui.MWLinkCompletionAction.static.headerMessage = 'visualeditor-linkcompletion-header';

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWLinkCompletionAction.prototype.getInsertionText = function ( suggestion ) {
	return '[[' + suggestion + ']]';
};

/* Registration */

ve.ui.actionFactory.register( ve.ui.MWLinkCompletionAction );

const linkCommand = new ve.ui.Command(
	'openMWLinkCompletions', ve.ui.MWLinkCompletionAction.static.name, 'open',
	{ supportedSelections: [ 'linear' ] }
);
ve.ui.wikitextCommandRegistry.register( linkCommand );
ve.ui.wikitextSequenceRegistry.register(
	new ve.ui.Sequence( 'autocompleteMWLinks', 'openMWLinkCompletions', '[[', 0 )
);
