/*!
 * VisualEditor UserInterface MWTitleInputWidget class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Thin wrapper around mw.widgets.TitleInputWidget
 *
 * @class
 * @extends mw.widgets.TitleInputWidget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWTitleInputWidget = function VeUiMWTitleInputWidget( config ) {
	// Parent constructor
	ve.ui.MWTitleInputWidget.super.call( this, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTitleInputWidget, mw.widgets.TitleInputWidget );

/* Methods */

/**
 * Get a list of menu option widgets from the (possibly cached) data returned by
 * #getLookupCacheDataFromResponse.
 *
 * See the parent documentation at <https://doc.wikimedia.org/mediawiki-core/master/js/#!/api/mw.widgets.TitleInputWidget>
 *
 * @param {Mixed} data Cached result data, usually an array
 * @return {OO.ui.MenuOptionWidget[]} Menu items
 */
ve.ui.MWTitleInputWidget.prototype.getLookupMenuOptionsFromData = function ( data ) {
	var i, len,
		linkCacheUpdate = {};
	if ( data && data.length ) {
		for ( i = 0, len = data.length; i < len; i++ ) {
			linkCacheUpdate[data[i]] = { missing: false };
		}
		ve.init.platform.linkCache.set( linkCacheUpdate );
	}

	return ve.ui.MWTitleInputWidget.super.prototype.getLookupMenuOptionsFromData.apply( this, arguments );
};
