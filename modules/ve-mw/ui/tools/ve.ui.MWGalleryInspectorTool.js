/*!
 * VisualEditor MediaWiki UserInterface gallery tool class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki UserInterface gallery tool.
 *
 * @class
 * @extends ve.ui.FragmentInspectorTool
 * @constructor
 * @param {OO.ui.ToolGroup} toolGroup
 * @param {Object} [config] Configuration options
 */
ve.ui.MWGalleryInspectorTool = function VeUiMWGalleryInspectorTool() {
	ve.ui.MWGalleryInspectorTool.super.apply( this, arguments );
};
OO.inheritClass( ve.ui.MWGalleryInspectorTool, ve.ui.FragmentInspectorTool );
ve.ui.MWGalleryInspectorTool.static.name = 'gallery';
ve.ui.MWGalleryInspectorTool.static.group = 'object';
ve.ui.MWGalleryInspectorTool.static.icon = 'imageGallery';
ve.ui.MWGalleryInspectorTool.static.title =
	OO.ui.deferMsg( 'visualeditor-mwgalleryinspector-title' );
ve.ui.MWGalleryInspectorTool.static.modelClasses = [ ve.dm.MWGalleryNode ];
ve.ui.MWGalleryInspectorTool.static.commandName = 'gallery';
ve.ui.toolFactory.register( ve.ui.MWGalleryInspectorTool );

ve.ui.commandRegistry.register(
	new ve.ui.Command(
		'gallery', 'window', 'open',
		{ args: [ 'gallery' ], supportedSelections: [ 'linear' ] }
	)
);

ve.ui.sequenceRegistry.register(
	new ve.ui.Sequence( 'wikitextGallery', 'gallery', '<gallery', 8 )
);
