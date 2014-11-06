/*!
 * VisualEditor UserInterface MWLinkMenuItemWidget class
 *
 * @copyright 2011-2014 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * Creates a ve.ui.MWInternalLinkMenuItemWidget object.
 *
 * @class
 * @extends ve.ui.MWLinkMenuItemWidget
 *
 * @constructor
 * @param {Mixed} data Item data
 * @param {Object} [config] Configuration options
 * @cfg {string} [pagename] Pagename to return the names of internal pages
 */
ve.ui.MWInternalLinkMenuItemWidget = function VeUiMWInternalLinkMenuItemWidget( data, config ) {
	// Config intialization
	config = config || {};

	// Properties
	this.pagename = config.pagename;

	// Parent constructor
	ve.ui.MWLinkMenuItemWidget.call( this, data, $.extend( { label: this.pagename, href: mw.util.getUrl( this.pagename ) }, config ) );

	// Style based on link cache information
	ve.init.platform.linkCache.styleElement( this.pagename, this.$link );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWInternalLinkMenuItemWidget, ve.ui.MWLinkMenuItemWidget );
