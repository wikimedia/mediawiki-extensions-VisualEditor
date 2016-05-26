/*!
 * VisualEditor UserInterface MWDesktopWikitextSurface class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * A surface is a top-level object which contains both a surface model and a surface view.
 * This is the mobile version of the surface.
 *
 * @class
 * @extends ve.ui.DesktopSurface
 *
 * @constructor
 * @param {HTMLDocument|Array|ve.dm.LinearData|ve.dm.Document} dataOrDoc Document data to edit
 * @param {Object} [config] Configuration options
 */
ve.ui.MWDesktopWikitextSurface = function VeUiMWDesktopWikitextSurface() {
	// Parent constructor
	ve.ui.MWDesktopWikitextSurface.super.apply( this, arguments );

	// Initialization
	this.$element.addClass( 've-ui-mwDesktopWikitextSurface' );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWDesktopWikitextSurface, ve.ui.DesktopSurface );

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWDesktopWikitextSurface.prototype.createModel = function ( doc ) {
	return new ve.dm.MWWikitextSurface( doc );
};

/**
 * @inheritdoc
 */
ve.ui.MWDesktopWikitextSurface.prototype.createView = function ( model ) {
	return new ve.ce.MWWikitextSurface( model, this );
};
