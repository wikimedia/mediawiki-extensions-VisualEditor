/*!
 * VisualEditor UserInterface MWLinkMenuItemWidget class
 *
 * @copyright 2011-2014 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * Creates a ve.ui.MWLinkMenuItemWidget object.
 *
 * @class
 * @extends OO.ui.MenuItemWidget
 *
 * @constructor
 * @param {Mixed} data Item data
 * @param {Object} [config] Configuration options
 * @cfg {string} [href] href to point to pages from link suggestions
 */
ve.ui.MWLinkMenuItemWidget = function VeUiMWLinkMenuItemWidget( data, config ) {
	// Config intialization
	config = config || {};

	// Parent constructor
	ve.ui.MWLinkMenuItemWidget.super.call( this, data, config );

	// Intialization
	this.$label.wrap( '<a>' );
	this.$link = this.$label.parent();
	this.$link.attr( 'href', config.href );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWLinkMenuItemWidget, OO.ui.MenuItemWidget );
