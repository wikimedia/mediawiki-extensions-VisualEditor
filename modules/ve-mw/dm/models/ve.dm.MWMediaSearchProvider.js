/*!
 * VisualEditor DataModel MWMediaSearchProvider class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki media search provider.
 *
 * @class
 * @extends ve.dm.MWMediaResourceProvider
 *
 * @constructor
 * @param {string} apiurl The API url
 * @param {Object} [config] Configuration options
 */
ve.dm.MWMediaSearchProvider = function VeDmMWMediaSearchProvider( apiurl, config ) {
	config = config || {};

	config.staticParams = $.extend( {
		generator: 'search',
		gsrnamespace: mw.config.get( 'wgNamespaceIds' ).file
	}, config.staticParams );

	// Parent constructor
	ve.dm.MWMediaSearchProvider.super.call( this, apiurl, config );
};

/* Inheritance */
OO.inheritClass( ve.dm.MWMediaSearchProvider, ve.dm.MWMediaResourceProvider );

/* Methods */

/**
 * @inheritdoc
 */
ve.dm.MWMediaSearchProvider.prototype.getContinueData = function ( howMany ) {
	return {
		gsroffset: this.getOffset(),
		gsrlimit: howMany || this.getDefaultFetchLimit()
	};
};

/**
 * @inheritdoc
 */
ve.dm.MWMediaSearchProvider.prototype.setContinue = function ( continueData ) {
	// Update the offset for next time
	this.setOffset( continueData.gsroffset );
};

/**
 * @inheritdoc
 */
ve.dm.MWMediaSearchProvider.prototype.sort = function ( results ) {
	return results.sort( function ( a, b ) {
		return a.index - b.index;
	} );
};

/**
 * @inheritdoc
 */
ve.dm.MWMediaSearchProvider.prototype.isValid = function () {
	return this.getUserParams().gsrsearch && ve.dm.MWMediaSearchProvider.super.prototype.isValid.call( this );
};
