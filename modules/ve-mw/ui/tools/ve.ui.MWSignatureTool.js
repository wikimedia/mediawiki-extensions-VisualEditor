/*!
 * VisualEditor MediaWiki UserInterface signature tool class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

var allowsSignatures = $.inArray(
	new mw.Title( mw.config.get( 'wgRelevantPageName' ) ).getNamespaceId(),
	mw.config.get( 'wgVisualEditorConfig' ).signatureNamespaces
) !== -1;

/**
 * MediaWiki UserInterface signature tool. This defines the menu button and its action.
 *
 * @class
 * @extends ve.ui.MWTransclusionDialogTool
 * @constructor
 * @param {OO.ui.ToolGroup} toolGroup
 * @param {Object} [config] Configuration options
 */
ve.ui.MWSignatureTool = function VeUiMWSignatureTool( toolGroup, config ) {
	// Parent constructor
	ve.ui.MWTransclusionDialogTool.call( this, toolGroup, config );
};
OO.inheritClass( ve.ui.MWSignatureTool, ve.ui.MWTransclusionDialogTool );

ve.ui.MWSignatureTool.static.name = 'mwSignature';
ve.ui.MWSignatureTool.static.group = 'object';
ve.ui.MWSignatureTool.static.icon = 'signature';
ve.ui.MWSignatureTool.static.title =
	OO.ui.deferMsg( 'visualeditor-mwsignature-tool' );
ve.ui.MWSignatureTool.static.modelClasses = [ ve.dm.MWSignatureNode ];
// Link the tool to the command defined below
ve.ui.MWSignatureTool.static.commandName = 'mwSignature';

ve.ui.toolFactory.register( ve.ui.MWSignatureTool );

if ( allowsSignatures ) {
	// Command to insert signature node.
	ve.ui.commandRegistry.register(
		new ve.ui.Command( 'mwSignature', 'content', 'insert', {
			args: [
				[
					{ type: 'mwSignature' },
					{ type: '/mwSignature' }
				],
				// annotate
				false,
				// collapseToEnd
				true
			],
			supportedSelections: [ 'linear' ]
		} )
	);
	ve.ui.sequenceRegistry.register(
		new ve.ui.Sequence( 'wikitextSignature', 'mwSignature', '~~~~', 4 )
	);
	ve.ui.commandHelpRegistry.register( 'insert', 'mwSignature', {
		sequences: [ 'wikitextSignature' ],
		label: OO.ui.deferMsg( 'visualeditor-mwsignature-tool' )
	} );
} else {
	// No-op command that is never executable
	ve.ui.commandRegistry.register(
		new ve.ui.Command( 'mwSignature', 'content', 'insert', {
			args: [ [] ],
			supportedSelections: []
		} )
	);
	// Wikitext insertion warning
	ve.ui.sequenceRegistry.register(
		new ve.ui.Sequence( 'wikitextSignature', 'mwWikitextWarning', '~~~' )
	);
}
