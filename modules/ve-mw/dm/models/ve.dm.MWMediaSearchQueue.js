/*!
 * VisualEditor DataModel MWMediaSearchQueue class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki media resource queue.
 *
 * @class
 * @extends ve.dm.MWMediaResourceQueue
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @cfg {number} maxHeight The maximum height of the media, used in the
 *  search call to the API.
 */
ve.dm.MWMediaSearchQueue = function VeDmMWMediaSearchQueue( config ) {
	config = config || {};

	// Parent constructor
	ve.dm.MWMediaSearchQueue.super.call( this, config );

	this.searchQuery = '';
};

/* Inheritance */
OO.inheritClass( ve.dm.MWMediaSearchQueue, ve.dm.MWMediaResourceQueue );

/**
 * Override parent method to set up the providers according to
 * the file repos
 *
 * @return {jQuery.Promise} Promise that resolves when the resources are set up
 */
ve.dm.MWMediaSearchQueue.prototype.setup = function () {
	var i, len,
		queue = this;

	return this.getFileRepos().then( function ( sources ) {
		if ( queue.providers.length === 0 ) {
			// Set up the providers
			for ( i = 0, len = sources.length; i < len; i++ ) {
				queue.providers.push( new ve.dm.MWMediaSearchProvider(
					sources[ i ].apiurl,
					{
						name: sources[ i ].name,
						local: sources[ i ].local,
						scriptDirUrl: sources[ i ].scriptDirUrl,
						userParams: {
							gsrsearch: queue.getSearchQuery()
						},
						staticParams: {
							iiurlheight: queue.getMaxHeight()
						}
					} )
				);
			}
		}
	} );
};

/**
 * Set the search query
 *
 * @param {string} searchQuery API search query
 */
ve.dm.MWMediaSearchQueue.prototype.setSearchQuery = function ( searchQuery ) {
	this.setParams( { gsrsearch: searchQuery } );
};

/**
 * Get the search query
 *
 * @return {string} API search query
 */
ve.dm.MWMediaSearchQueue.prototype.getSearchQuery = function () {
	return this.getParams().gsrsearch;
};
