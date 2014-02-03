/*!
 * VisualEditor UserInterface MWGalleryInspector class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki gallery inspector.
 *
 * @class
 * @extends ve.ui.MWExtensionInspector
 *
 * @constructor
 * @param {ve.ui.WindowSet} windowSet Window set this inspector is part of
 * @param {Object} [config] Configuration options
 */
ve.ui.MWGalleryInspector = function VeUiMWGalleryInspector( windowSet, config ) {
	// Parent constructor
	ve.ui.MWExtensionInspector.call( this, windowSet, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWGalleryInspector, ve.ui.MWExtensionInspector );

/* Static properties */

ve.ui.MWGalleryInspector.static.name = 'gallery';

ve.ui.MWGalleryInspector.static.icon = 'gallery';

ve.ui.MWGalleryInspector.static.titleMessage = 'visualeditor-mwgalleryinspector-title';

ve.ui.MWGalleryInspector.static.placeholder = 'visualeditor-mwgalleryinspector-placeholder';

ve.ui.MWGalleryInspector.static.nodeView = ve.ce.MWGalleryNode;

ve.ui.MWGalleryInspector.static.nodeModel = ve.dm.MWGalleryNode;

/* Registration */

ve.ui.inspectorFactory.register( ve.ui.MWGalleryInspector );
