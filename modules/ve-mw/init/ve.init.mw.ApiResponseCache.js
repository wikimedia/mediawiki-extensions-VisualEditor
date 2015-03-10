/*!
 * VisualEditor MediaWiki Initialization ApiResponseCache class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */
( function () {
	var hasOwn = Object.prototype.hasOwnProperty;

	/**
	 * MediaWiki API batch queue.
	 *
	 * Used to queue up lists of items centrally to get information about in batches
	 *  of requests.
	 *
	 * @class
	 * @extends OO.EventEmitter
	 * @constructor
	 */
	ve.init.mw.ApiResponseCache = function VeInitMwApiResponseCache() {
		// Mixin constructor
		OO.EventEmitter.call( this );

		// Keys are titles, values are deferreds
		this.deferreds = {};

		// Keys are page names, values are link data objects
		// This is kept for synchronous retrieval of cached values via #getCached
		this.cacheValues = {};

		// Array of page titles queued to be looked up
		this.queue = [];

		this.schedule = ve.debounce( this.processQueue.bind( this ), 0 );
	};

	OO.mixinClass( ve.init.mw.ApiResponseCache, OO.EventEmitter );

	// TODO should reuse ve.dm.MWInternalLinkAnnotation#getLookupTitle once factored out
	ve.init.mw.ApiResponseCache.prototype.normalizeTitle = function ( title ) {
		var titleObj = mw.Title.newFromText( title );
		if ( !titleObj ) {
			return title;
		}
		return titleObj.getPrefixedText();
	};

	/**
	 * Look up data about a title. If the data about this title is already in the cache, this
	 * returns an already-resolved promise. Otherwise, it returns a pending promise and schedules
	 * an request to retrieve the data.
	 * @param {string} title Title
	 * @returns {jQuery.Promise} Promise that will be resolved with the data once it's available
	 */
	ve.init.mw.ApiResponseCache.prototype.get = function ( title ) {
		if ( typeof title !== 'string' ) {
			// Don't bother letting things like undefined or null make it all the way through,
			// just reject them here. Otherwise they'll cause problems or exceptions at random
			// other points in this file.
			return $.Deferred().reject().promise();
		}
		title = this.normalizeTitle( title );
		if ( !hasOwn.call( this.deferreds, title ) ) {
			this.deferreds[title] = $.Deferred();
			this.queue.push( title );
			this.schedule();
		}
		return this.deferreds[title].promise();
	};

	/**
	 * Look up data about a page in the cache. If the data about this page is already in the cache,
	 * this returns that data. Otherwise, it returns undefined.
	 *
	 * @param {string} name Normalized page title
	 * @returns {Object|undefined} Cache data for this name.
	 */
	ve.init.mw.ApiResponseCache.prototype.getCached = function ( name ) {
		if ( hasOwn.call( this.cacheValues, name ) ) {
			return this.cacheValues[name];
		}
	};

	/**
	 * Fired when a new entry is added to the cache.
	 * @event add
	 * @param {Object} entries Cache entries that were added. Object mapping names to data objects.
	 */

	/**
	 * Add entries to the cache.
	 * @param {Object} entries Object keyed by page title, with the values being data objects
	 * @fires add
	 */
	ve.init.mw.ApiResponseCache.prototype.set = function ( entries ) {
		var name;
		for ( name in entries ) {
			if ( hasOwn.call( this.cacheValues, name ) ) {
				continue;
			}
			if ( !hasOwn.call( this.deferreds, name ) ) {
				this.deferreds[name] = $.Deferred();
			}
			this.deferreds[name].resolve( entries[name] );
			this.cacheValues[name] = entries[name];
		}
		this.emit( 'add', Object.keys( entries ) );
	};

	/**
	 * Get an API request promise to deal with a list of titles
	 * @abstract
	 * @param subqueue
	 * @return {jQuery.Promise}
	 */
	ve.init.mw.ApiResponseCache.prototype.getRequestPromise = function () {
		throw new Error( 'Stub, override in subclass' );
	};

	/**
	 * Process each page in the response of an API request
	 * @abstract
	 * @param {Object} page The page object
	 * @return {Object|undefined} Any relevant info that we want to cache and return.
	 */
	ve.init.mw.ApiResponseCache.prototype.processPage = function () {
		throw new Error( 'Stub, override in subclass' );
	};

	/**
	 * Perform any scheduled API requests.
	 * @private
	 * @fires add
	 */
	ve.init.mw.ApiResponseCache.prototype.processQueue = function () {
		var subqueue, queue, batchQueue = this;

		function rejectSubqueue( rejectQueue ) {
			var i, len;
			for ( i = 0, len = rejectQueue.length; i < len; i++ ) {
				batchQueue.deferreds[rejectQueue[i]].reject();
			}
		}

		function processResult( data ) {
			var pageid, page, processedPage,
				pages = ( data.query && data.query.pages ) || data.pages,
				processed = {};

			if ( pages ) {
				for ( pageid in pages ) {
					page = pages[pageid];
					processedPage = batchQueue.processPage( page );
					if ( processedPage !== undefined ) {
						processed[page.title] = processedPage;
					}
				}
				batchQueue.set( processed );
			}
		}

		queue = this.queue;
		this.queue = [];
		while ( queue.length ) {
			subqueue = queue.splice( 0, 50 ).map( this.normalizeTitle );
			this.getRequestPromise( subqueue )
				.then( processResult )

				// Reject everything in subqueue; this will only reject the ones
				// that weren't already resolved above, because .reject() on an
				// already resolved Deferred is a no-op.
				.then( rejectSubqueue.bind( null, subqueue ) );
		}
	};
}() );
