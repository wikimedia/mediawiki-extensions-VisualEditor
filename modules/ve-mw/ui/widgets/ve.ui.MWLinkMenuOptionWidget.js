/*!
 * VisualEditor UserInterface MWLinkMenuOptionWidget class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Creates a ve.ui.MWLinkMenuOptionWidget object.
 *
 * @class
 * @extends OO.ui.MenuOptionWidget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @cfg {string} [href] href to point to pages from link suggestions
 */
ve.ui.MWLinkMenuOptionWidget = function VeUiMWLinkMenuOptionWidget( config ) {
	// Config initialization
	config = $.extend( { icon: null }, config );

	// Parent constructor
	ve.ui.MWLinkMenuOptionWidget.super.call( this, config );

	// initialization
	this.$label.wrap( '<a>' );
	this.$link = this.$label.parent();
	this.$link.attr( 'href', config.href );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWLinkMenuOptionWidget, OO.ui.MenuOptionWidget );
