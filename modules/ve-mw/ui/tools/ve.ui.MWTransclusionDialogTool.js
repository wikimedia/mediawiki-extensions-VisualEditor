/*!
 * VisualEditor MediaWiki UserInterface transclusion tool classes.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki UserInterface transclusion tool.
 *
 * @class
 * @extends ve.ui.DialogTool
 * @constructor
 * @param {OO.ui.ToolGroup} toolGroup
 * @param {Object} [config] Configuration options
 */
ve.ui.MWTransclusionDialogTool = function VeUiMWTransclusionDialogTool( toolGroup, config ) {
	ve.ui.DialogTool.call( this, toolGroup, config );
};
OO.inheritClass( ve.ui.MWTransclusionDialogTool, ve.ui.DialogTool );
ve.ui.MWTransclusionDialogTool.static.name = 'transclusion';
ve.ui.MWTransclusionDialogTool.static.group = 'object';
ve.ui.MWTransclusionDialogTool.static.icon = 'template';
ve.ui.MWTransclusionDialogTool.static.title =
	OO.ui.deferMsg( 'visualeditor-dialogbutton-transclusion-tooltip' );
ve.ui.MWTransclusionDialogTool.static.dialog = 'transclusion';
ve.ui.MWTransclusionDialogTool.static.modelClasses = [ ve.dm.MWTransclusionNode ];
ve.ui.toolFactory.register( ve.ui.MWTransclusionDialogTool );
