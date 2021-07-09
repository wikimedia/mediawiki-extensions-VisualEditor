/**
 * Common base class for top-level items (a.k.a. "parts") in the template editor sidebar. Subclasses
 * should exist for all subclasses of {@see ve.dm.MWTransclusionPartModel}:
 * - {@see ve.dm.MWTemplateModel}
 * - {@see ve.dm.MWTemplatePlaceholderModel}
 * - {@see ve.dm.MWTransclusionContentModel}
 *
 * @abstract
 * @class
 * @extends OO.ui.Widget
 *
 * @constructor
 * @param {Object} [config]
 */
ve.ui.MWTemplateOutlinePartWidget = function VeUiMWTemplateOutlinePartWidget( config ) {
	// Parent constructor
	ve.ui.MWTemplateOutlinePartWidget.super.call( this, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTemplateOutlinePartWidget, OO.ui.Widget );
