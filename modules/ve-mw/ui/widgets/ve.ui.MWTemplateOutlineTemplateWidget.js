/*!
 * VisualEditor user interface MWTemplateOutlineTemplateWidget class.
 *
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Container for template, as rendered in the template dialog sidebar.
 *
 * @class
 * @extends OO.ui.Widget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWTemplateOutlineTemplateWidget = function VeUiMWTemplateOutlineTemplateWidget( config ) {
	config = config || {};

	// Parent constructor
	ve.ui.MWTemplateOutlineTemplateWidget.super.call( this, config );

	// Initialization
	// TODO: var title = new OO

	var parameters = new ve.ui.MWTemplateOutlineCheckboxListWidget( {
		// TODO: Probably take some responsibility for interpreting a template model.
		items: config.items
	} );
	var layout = new OO.ui.Layout( {
		// TODO: template title and icon
		items: [ parameters ]
	} );
	layout.$element
		.append( parameters.$element );

	this.$element
		.append( layout.$element )
		.addClass( 've-ui-mwTemplateDialogOutlineTemplate' );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTemplateOutlineTemplateWidget, OO.ui.Widget );
