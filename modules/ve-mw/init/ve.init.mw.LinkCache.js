/*!
 * VisualEditor MediaWiki Initialization LinkCache class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */
( function () {
	/**
	 * Caches information about titles.
	 * @class
	 * @extends ve.init.mw.ApiResponseCache
	 * @constructor
	 */
	ve.init.mw.LinkCache = function VeInitMwLinkCache() {
		ve.init.mw.LinkCache.super.call( this );

		// Keys are page names, values are link data objects
		// This is kept for synchronous retrieval of cached values via #getCached
		this.cacheValues = {};
	};

	OO.inheritClass( ve.init.mw.LinkCache, ve.init.mw.ApiResponseCache );

	// TODO unit tests

	/**
	 * Requests information about the title, then adds classes to the provided element as appropriate.
	 *
	 * @param {string} title
	 * @param {jQuery} $element Element to style
	 */
	ve.init.mw.LinkCache.prototype.styleElement = function ( title, $element ) {
		this.get( title ).done( function ( data ) {
			if ( data.missing ) {
				$element.addClass( 'new' );
			} else {
				// Provided by core MediaWiki, no styles by default.
				if ( data.redirect ) {
					$element.addClass( 'mw-redirect' );
				}
				// Should be provided by the Disambiguator extension, but no one has yet written a suitably
				// performant patch to do it. It is instead implemented in JavaScript in on-wiki gadgets.
				if ( data.disambiguation ) {
					$element.addClass( 'mw-disambig' );
				}
			}
		} );
	};

	/**
	 * Enable or disable automatic assumption of existence.
	 *
	 * While enabled, any get() for a title that's not already in the cache will return
	 * { missing: false } and write that to the cache.
	 *
	 * @param {boolean} assume Assume all uncached titles exist
	 */
	ve.init.mw.LinkCache.prototype.setAssumeExistence = function ( assume ) {
		this.assumeExistence = !!assume;
	};

	/**
	 * @inheritdoc
	 */
	ve.init.mw.LinkCache.prototype.get = function ( title ) {
		var data = {};
		if ( this.assumeExistence ) {
			data[this.normalizeTitle( title )] = { missing: false };
			this.set( data );
		}

		// Parent method
		return ve.init.mw.LinkCache.super.prototype.get.call( this, title );
	};

	/**
	 * @inheritdoc
	 */
	ve.init.mw.LinkCache.prototype.getRequestPromise = function ( subqueue ) {
		return new mw.Api().get( {
			action: 'query',
			prop: 'info|pageprops',
			ppprop: 'disambiguation',
			titles: subqueue.join( '|' )
		} );
	};

	/**
	 * @inheritdoc
	 */
	ve.init.mw.LinkCache.prototype.processPage = function ( page ) {
		return {
			missing: page.missing !== undefined,
			redirect: page.redirect !== undefined,
			// Disambiguator extension
			disambiguation: page.pageprops && page.pageprops.disambiguation !== undefined
		};
	};
}() );
