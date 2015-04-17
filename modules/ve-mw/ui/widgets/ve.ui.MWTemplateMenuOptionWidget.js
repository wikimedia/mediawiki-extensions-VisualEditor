/*!
 * VisualEditor UserInterface MWTemplateMenuOptionWidget class
 *
 * @copyright 2011-2015 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * Creates a ve.ui.MWTemplateMenuOptionWidget object.
 *
 * @class
 * @extends OO.ui.MenuOptionWidget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @cfg {string} [templateName] Template name
 * @cfg {string} [templateDescription] Template description
 */
ve.ui.MWTemplateMenuOptionWidget = function VeUiMWTemplateMenuOptionWidget( config ) {
	// Configuration initialization
	config = $.extend( { icon: 'check', data: config.templateName }, config );

	// Parent constructor
	ve.ui.MWTemplateMenuOptionWidget.super.call( this, config );

	if ( config.templateDescription ) {
		$( '<div>' )
			.addClass( 've-ui-mwTemplateMenuOptionWidget-description' )
			.text( config.templateDescription )
			.appendTo( this.$element );
	}
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTemplateMenuOptionWidget, OO.ui.MenuOptionWidget );
