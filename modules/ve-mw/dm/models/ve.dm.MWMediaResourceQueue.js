/*!
 * VisualEditor DataModel MWMediaResourceQueue class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki media resource queue.
 *
 * @class
 * @mixins OO.EventEmitter
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.dm.MWMediaResourceQueue = function VeDmMWMediaResourceQueue( config ) {
	config = config || {};

	this.fileRepoPromise = null;
	this.providers = [];
	this.providerPromises = [];

	this.queue = [];

	this.limit = config.limit || 20;
	this.threshhold = config.threshhold || 10;

	// Mixin constructors
	OO.EventEmitter.call( this );
};

/* Setup */
OO.initClass( ve.dm.MWMediaResourceQueue );
OO.mixinClass( ve.dm.MWMediaResourceQueue, OO.EventEmitter );

/**
 * Get items from the queue
 *
 * @param {number} [howMany] How many items to retrieve
 * @return {jQuery.Promise} Promise that resolves into an array of items
 */
ve.dm.MWMediaResourceQueue.prototype.get = function ( howMany ) {
	var me = this,
		prepared = [];

	howMany = howMany || this.limit;

	// Check if the queue has enough items
	if ( this.queue.length < howMany + this.threshhold ) {
		// Call for more results
		prepared.push(
			this.getResults( howMany + this.threshhold )
				.then( function ( items ) {
					// Add to the queue
					me.queue = me.queue.concat.apply( me.queue, items );
				} )
		);
	}

	return $.when.apply( $, prepared )
		.then( function () {
			return me.queue.splice( 0, howMany );
		} );

};

/**
 * Get results from all providers
 * @return {jQuery.Promise} Promise that is resolved into an array of fetched items.
 */
ve.dm.MWMediaResourceQueue.prototype.getResults = function ( howMany ) {
	var i, len,
		queue = this;

	// Make sure there are resources set up
	return this.setup()
		.then( function () {
			queue.providerPromises = [];
			// Set up the query to all providers
			for ( i = 0, len = queue.providers.length; i < len; i++ ) {
				queue.providers[i].setQuery( queue.getQuery() );
				if ( !queue.providers[i].isDepleted() ) {
					queue.providerPromises.push(
						queue.providers[i].getResults( howMany )
					);
				}
			}

			return $.when.apply( $, queue.providerPromises )
				.then( Array.prototype.concat.bind( [] ) );
		} );
};

/**
 * Set up the queue and its resources
 *
 * @return {jQuery.Promise} Promise that resolves when the resources are set up
 */
ve.dm.MWMediaResourceQueue.prototype.setup = function () {
	var i, len,
		queue = this;

	return this.getFileRepos().then( function ( sources ) {
		if ( queue.providers.length === 0 ) {
			// Set up the providers
			for ( i = 0, len = sources.length; i < len; i++ ) {
				queue.providers.push( new ve.dm.MWMediaResourceProvider( {
					apiurl: sources[i].apiurl,
					name: sources[i].name,
					local: sources[i].local,
					scriptDirUrl: sources[i].scriptDirUrl
				} ) );
			}
		}
	} );
};

/**
 * Fetch the file repos.
 *
 * @return {jQuery.Promise} Promise that resolves when the resources are set up
 */
ve.dm.MWMediaResourceQueue.prototype.getFileRepos = function () {
	var defaultSource = [ {
			url: mw.util.wikiScript( 'api' ),
			local: true
		} ];

	if ( !this.fileRepoPromise ) {
		this.fileRepoPromise = ve.init.target.constructor.static.apiRequest( {
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
 * Set the search query for all the providers.
 *
 * This also makes sure to abort any previous promises.
 *
 * @param {string} query Search query
 */
ve.dm.MWMediaResourceQueue.prototype.setQuery = function ( query ) {
	var i, len;
	if ( query !== this.query ) {
		this.query = query;
		// Reset queue
		this.queue = [];
		// Reset promises
		for ( i = 0, len = this.providerPromises.length; i < len; i++ ) {
			this.providerPromises[i].abort();
		}
	}
};

/**
 * Get the current search query.
 *
 * @param {string} query Search query
 */
ve.dm.MWMediaResourceQueue.prototype.getQuery = function () {
	return this.query;
};
