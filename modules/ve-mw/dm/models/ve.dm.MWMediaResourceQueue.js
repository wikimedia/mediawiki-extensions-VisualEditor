/*!
 * VisualEditor DataModel MWMediaResourceQueue class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki media resource queue.
 *
 * @class
 * @extends ve.dm.APIResultsQueue
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @cfg {number} maxHeight The maximum height of the media, used in the
 *  search call to the API.
 */
ve.dm.MWMediaResourceQueue = function VeDmMWMediaResourceQueue( config ) {
	config = config || {};

	// Parent constructor
	ve.dm.MWMediaResourceQueue.super.call( this, config );

	this.maxHeight = config.maxHeight || 200;
};

/* Inheritance */
OO.inheritClass( ve.dm.MWMediaResourceQueue, ve.dm.APIResultsQueue );

/**
 * Fetch the file repos.
 *
 * @return {jQuery.Promise} Promise that resolves when the resources are set up
 */
ve.dm.MWMediaResourceQueue.prototype.getFileRepos = function () {
	var defaultSource = [ {
			url: mw.util.wikiScript( 'api' ),
			local: ''
		} ];

	if ( !this.fileRepoPromise ) {
		this.fileRepoPromise = new mw.Api().get( {
			action: 'query',
			meta: 'filerepoinfo'
		} ).then(
			function ( resp ) {
				return resp.query && resp.query.repos || defaultSource;
			},
			function () {
				return $.Deferred().resolve( defaultSource );
			}
		);
	}

	return this.fileRepoPromise;
};

/**
 * Get image maximum height
 *
 * @return {string} Image max height
 */
ve.dm.MWMediaResourceQueue.prototype.getMaxHeight = function () {
	return this.maxHeight;
};
