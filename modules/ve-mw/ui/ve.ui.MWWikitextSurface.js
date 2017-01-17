/*!
 * VisualEditor UserInterface MWWikitextSurface class.
 *
 * @copyright 2011-2017 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * A surface is a top-level object which contains both a surface model and a surface view.
 * This is the mobile version of the surface.
 *
 * @class
 * @extends ve.ui.Surface
 *
 * @constructor
 * @param {HTMLDocument|Array|ve.dm.LinearData|ve.dm.Document} dataOrDoc Document data to edit
 * @param {Object} [config] Configuration options
 */
ve.ui.MWWikitextSurface = function VeUiMWWikitextSurface() {
	// Parent constructor
	ve.ui.MWWikitextSurface.super.apply( this, arguments );

	// Initialization
	// The following classes can be used here:
	// * mw-editfont-default
	// * mw-editfont-monospace
	// * mw-editfont-sans-serif
	// * mw-editfont-serif
	this.getView().$element.addClass( 've-ui-mwWikitextSurface mw-editfont-' + mw.user.options.get( 'editfont' ) );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWWikitextSurface, ve.ui.Surface );

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWWikitextSurface.prototype.createModel = function ( doc ) {
	return new ve.dm.MWWikitextSurface( doc );
};

/**
 * @inheritdoc
 */
ve.ui.MWWikitextSurface.prototype.createView = function ( model ) {
	return new ve.ce.MWWikitextSurface( model, this );
};
