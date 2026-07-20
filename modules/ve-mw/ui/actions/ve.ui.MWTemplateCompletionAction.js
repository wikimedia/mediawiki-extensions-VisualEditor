/*!
 * VisualEditor UserInterface MWTemplateCompletionAction class.
 *
 * @copyright See AUTHORS.txt
 */

/**
 * Autocompletion of template transclusions in source mode, triggered by typing "{{".
 *
 * @class
 * @extends ve.ui.MWTitleCompletionAction
 *
 * @constructor
 * @param {ve.ui.Surface} surface Surface to act on
 * @param {string} [source]
 */
ve.ui.MWTemplateCompletionAction = function VeUiMWTemplateCompletionAction() {
	// Parent constructor
	ve.ui.MWTemplateCompletionAction.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTemplateCompletionAction, ve.ui.MWTitleCompletionAction );

/* Static Properties */

ve.ui.MWTemplateCompletionAction.static.name = 'mwTemplateCompletion';

ve.ui.MWTemplateCompletionAction.static.namespace = mw.config.get( 'wgNamespaceIds' ).template;

ve.ui.MWTemplateCompletionAction.static.headerMessage = 'visualeditor-templatecompletion-header';

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWTemplateCompletionAction.prototype.getInsertionText = function ( suggestion ) {
	return '{{' + suggestion + '}}';
};

/* Registration */

ve.ui.actionFactory.register( ve.ui.MWTemplateCompletionAction );

const templateCommand = new ve.ui.Command(
	'openMWTemplateCompletions', ve.ui.MWTemplateCompletionAction.static.name, 'open',
	{ supportedSelections: [ 'linear' ] }
);
ve.ui.wikitextCommandRegistry.register( templateCommand );
ve.ui.wikitextSequenceRegistry.register(
	new ve.ui.Sequence( 'autocompleteMWTemplates', 'openMWTemplateCompletions', '{{', 0 )
);
