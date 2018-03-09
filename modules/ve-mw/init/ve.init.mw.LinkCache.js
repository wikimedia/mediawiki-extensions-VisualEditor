/*!
 * VisualEditor MediaWiki Initialization LinkCache class.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Caches information about titles.
 *
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

/* Inheritance */

OO.inheritClass( ve.init.mw.LinkCache, ve.init.mw.ApiResponseCache );

/* Static methods */

/**
 * Get the icon name to use for a particular link type
 *
 * @param {Object} linkData Link data
 * @return {string} Icon name
 */
ve.init.mw.LinkCache.static.getIconForLink = function ( linkData ) {
	if ( linkData.missing ) {
		return 'page-not-found';
	}
	if ( linkData.redirect ) {
		return 'page-redirect';
	}
	if ( linkData.disambiguation ) {
		return 'page-disambiguation';
	}
	return 'page-existing';
};

/**
 * @inheritdoc
 */
ve.init.mw.LinkCache.static.processPage = function ( page ) {
	return {
		missing: page.missing !== undefined,
		known: page.known !== undefined,
		redirect: page.redirect !== undefined,
		disambiguation: ve.getProp( page, 'pageprops', 'disambiguation' ) !== undefined,
		imageUrl: ve.getProp( page, 'thumbnail', 'source' ),
		description: ve.getProp( page, 'terms', 'description' )
	};
};

/* Methods */

/**
 * Requests information about the title, then adds classes to the provided element as appropriate.
 *
 * @param {string} title
 * @param {jQuery} $element Element to style
 * @param {boolean} hasFragment Whether the link goes to a fragment
 */
ve.init.mw.LinkCache.prototype.styleElement = function ( title, $element, hasFragment ) {
	var promise,
		cache = this,
		cachedMissingData = this.getCached( '_missing/' + title );

	// Use the synchronous missing link cache data if it exists
	if ( cachedMissingData ) {
		promise = $.Deferred().resolve( cachedMissingData ).promise();
	} else {
		promise = this.get( title );
	}

	promise.done( function ( data ) {
		if ( data.missing && !data.known ) {
			$element.addClass( 'new' );
		} else {
			// Provided by core MediaWiki, styled like a <strong> element by default.
			if ( !hasFragment && cache.constructor.static.normalizeTitle( title ) === cache.constructor.static.normalizeTitle( mw.config.get( 'wgRelevantPageName' ) ) ) {
				$element.addClass( 'mw-selflink' );
			}
			// Provided by core MediaWiki, no styles by default.
			if ( data.redirect ) {
				$element.addClass( 'mw-redirect' );
			}
			// Provided by the Disambiguator extension, no styles by default.
			if ( data.disambiguation ) {
				$element.addClass( 'mw-disambig' );
			}
		}
	} );
};

/**
 * Given a chunk of Parsoid HTML, requests information about each link's title, then adds classes
 * to each such element as appropriate.
 *
 * TODO: Most/all of this code should be done upstream, either by Parsoid itself or by an
 * intermediary service – see T64803 and others.
 *
 * @param {jQuery} $element Elements to style
 * @param {HTMLDocument} doc Base document to use for normalisation
 */
ve.init.mw.LinkCache.prototype.styleParsoidElements = function ( $elements, doc ) {
	if ( ve.dm.MWLanguageVariantNode ) {
		// Render the user's preferred variant in language converter markup
		ve.dm.MWLanguageVariantNode.static.processVariants( $elements );
	}

	// TODO: Remove when fixed upstream in Parsoid (T58756)
	$elements
		.find( 'a[rel~="mw:ExtLink"]' ).addBack( 'a[rel~="mw:ExtLink"]' )
		.addClass( 'external' );

	// TODO: Remove when moved upstream into Parsoid or another service (T64803)
	// If the element isn't attached, doc will be null, so we don't know how to normalise titles
	if ( doc ) {
		$elements
			.find( 'a[rel~="mw:WikiLink"]' ).addBack( 'a[rel~="mw:WikiLink"]' )
			.each( function () {
				var title,
					href = this.href || mw.config.get( 'wgArticlePath' );

				title = ve.init.platform.linkCache.constructor.static.normalizeTitle(
					ve.dm.MWInternalLinkAnnotation.static.getTargetDataFromHref( href, doc ).title
				);
				ve.init.platform.linkCache.styleElement( title, $( this ), href.indexOf( '#' ) !== -1 );
			} );
	}
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
 * Set link missing data
 *
 * Stored separately from the full link data cache
 *
 * @param {Object} entries Object keyed by page title, with the values being data objects
 */
ve.init.mw.LinkCache.prototype.setMissing = function ( entries ) {
	var name, missingEntries = {};
	for ( name in entries ) {
		missingEntries[ '_missing/' + name ] = entries[ name ];
	}
	this.set( missingEntries );
};

/**
 * @inheritdoc
 */
ve.init.mw.LinkCache.prototype.get = function ( title ) {
	var data = {};
	if ( this.assumeExistence ) {
		data[ this.constructor.static.normalizeTitle( title ) ] = { missing: false };
		this.setMissing( data );
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
		prop: 'info|pageprops|pageimages|pageterms',
		pithumbsize: 80,
		pilimit: subqueue.length,
		wbptterms: 'description',
		ppprop: 'disambiguation',
		titles: subqueue,
		'continue': ''
	} );
};
