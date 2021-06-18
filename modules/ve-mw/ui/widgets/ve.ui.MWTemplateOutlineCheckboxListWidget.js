/*!
 * VisualEditor user interface MWTemplateOutlineCheckboxListWidget class.
 *
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Container for multiple template parameter items
 *
 * Application-specific part of the implementation.
 *
 * @class
 * @extends OO.ui.Widget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @cfg {ve.ui.MWTemplateOutlineParameterCheckboxLayout[]} [items] An array of options to add to the multiselect.
 */
ve.ui.MWTemplateOutlineCheckboxListWidget = function VeUiMWTemplateOutlineCheckboxListWidget( config ) {
	// Parent constructor
	ve.ui.MWTemplateOutlineCheckboxListWidget.super.call( this, config );

	// TODO: Wire events
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTemplateOutlineCheckboxListWidget, OO.ui.FieldsetLayout );
