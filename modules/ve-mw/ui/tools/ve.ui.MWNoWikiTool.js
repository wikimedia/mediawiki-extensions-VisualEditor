/*!
 * VisualEditor UserInterface nowiki tool class.
 *
 * @copyright See AUTHORS.txt
 */

/**
 * UserInterface nowiki tool.
 *
 * @class
 * @extends ve.ui.Tool
 * @constructor
 * @param {OO.ui.ToolGroup} toolGroup
 * @param {Object} [config] Configuration options
 */
ve.ui.NowikiTool = function () {
	ve.ui.NowikiTool.super.apply( this, arguments );
};

OO.inheritClass( ve.ui.NowikiTool, ve.ui.Tool );

ve.ui.NowikiTool.static.name = 'nowiki';
ve.ui.NowikiTool.static.group = 'textStyle';
ve.ui.NowikiTool.static.icon = 'noWikiText';
ve.ui.NowikiTool.static.title = OO.ui.deferMsg( 'visualeditor-nowiki-tooltip' );
ve.ui.NowikiTool.static.commandName = 'nowiki';

ve.ui.toolFactory.register( ve.ui.NowikiTool );

ve.ui.wikitextCommandRegistry.register(
	new ve.ui.Command(
		'nowiki', 'mwWikitext', 'toggleWrapSelection',
		{ args: [ '<nowiki>', '</nowiki>', OO.ui.deferMsg( 'visualeditor-nowiki-tooltip' ) ], supportedSelections: [ 'linear' ] }
	)
);

ve.ui.triggerRegistry.register(
	'nowiki', { mac: new ve.ui.Trigger( 'cmd+shift+7' ), pc: new ve.ui.Trigger( 'ctrl+shift+7' ) }
);
