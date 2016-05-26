/*!
 * VisualEditor DataModel Surface class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * DataModel surface.
 *
 * @class
 * @extends ve.dm.Surface
 *
 * @constructor
 * @param {ve.dm.Document} doc
 */
ve.dm.MWWikitextSurface = function VeDmMwWikitextSurface() {
	// Parent constructors
	ve.dm.MWWikitextSurface.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.dm.MWWikitextSurface, ve.dm.Surface );

/**
 * @inheritdoc
 */
ve.dm.MWWikitextSurface.prototype.getFragment = function ( selection, noAutoSelect, excludeInsertions ) {
	return new ve.dm.MWWikitextSurfaceFragment( this, selection || this.selection, noAutoSelect, excludeInsertions );
};
