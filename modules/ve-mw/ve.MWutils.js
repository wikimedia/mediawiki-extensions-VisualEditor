/*!
 * VisualEditor MediaWiki utilities.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * @class ve
 */

/**
 * Decode a URI component into a mediawiki article title
 *
 * N.B. Illegal article titles can result from fairly reasonable input (e.g. "100%25beef");
 * see https://phabricator.wikimedia.org/T137847 .
 *
 * @param {string} s String to decode
 * @param {boolean} [preserveUnderscores] Don't convert underscores to spaces
 * @return {string} Decoded string, or original string if decodeURIComponent failed
 */
ve.decodeURIComponentIntoArticleTitle = function ( s, preserveUnderscores ) {
	try {
		s = decodeURIComponent( s );
	} catch ( e ) {
		return s;
	}
	if ( preserveUnderscores ) {
		return s;
	}
	return s.replace( /_/g, ' ' );
};

/**
 * Unwrap Parsoid sections
 *
 * @param {HTMLElement} element Parent element, e.g. document body
 */
ve.unwrapParsoidSections = function ( element ) {
	Array.prototype.forEach.call( element.querySelectorAll( 'section[data-mw-section-id]' ), function ( section ) {
		var parent = section.parentNode;
		while ( section.firstChild ) {
			parent.insertBefore( section.firstChild, section );
		}
		parent.removeChild( section );
	} );
};

/**
 * Strip legacy (non-HTML5) IDs; typically found as section IDs inside
 * headings.
 *
 * @param {HTMLElement} element Parent element, e.g. document body
 */
ve.stripParsoidFallbackIds = function ( element ) {
	Array.prototype.forEach.call( element.querySelectorAll( 'span[typeof="mw:FallbackId"][id]:empty' ), function ( legacySpan ) {
		legacySpan.parentNode.removeChild( legacySpan );
	} );
};

/**
 * Expand a string of the form jquery.foo,bar|jquery.ui.baz,quux to
 * an array of module names like [ 'jquery.foo', 'jquery.bar',
 * 'jquery.ui.baz', 'jquery.ui.quux' ]
 *
 * Implementation of ResourceLoaderContext::expandModuleNames
 * TODO: Consider upstreaming this to MW core.
 *
 * @param {string} moduleNames Packed module name list
 * @return {string[]} Array of module names
 */
ve.expandModuleNames = function ( moduleNames ) {
	var modules = [];

	moduleNames.split( '|' ).forEach( function ( group ) {
		var matches, prefix, suffixes;
		if ( group.indexOf( ',' ) === -1 ) {
			// This is not a set of modules in foo.bar,baz notation
			// but a single module
			modules.push( group );
		} else {
			// This is a set of modules in foo.bar,baz notation
			matches = group.match( /(.*)\.([^.]*)/ );
			if ( !matches ) {
				// Prefixless modules, i.e. without dots
				modules = modules.concat( group.split( ',' ) );
			} else {
				// We have a prefix and a bunch of suffixes
				prefix = matches[ 1 ];
				suffixes = matches[ 2 ].split( ',' ); // [ 'bar', 'baz' ]
				suffixes.forEach( function ( suffix ) {
					modules.push( prefix + '.' + suffix );
				} );
			}
		}
	} );
	return modules;
};

/**
 * Split Parsoid resource name into the href prefix and the page title.
 *
 * @param {string} resourceName Resource name, from a `href` or `resource` attribute
 * @return {Object} Object with the following properties:
 * @return {string} return.title Full page title in text form (with namespace, and spaces instead of underscores)
 * @return {string} return.hrefPrefix Href prefix like './' or '../'
 * @return {string} return.rawTitle Everything following `hrefPrefix` in input, unprocessed
 */
ve.parseParsoidResourceName = function ( resourceName ) {
	// Resource names are always prefixed with './' to prevent the MediaWiki namespace from being
	// interpreted as a URL protocol, consider e.g. 'href="./File:Foo.png"'. If this resource name
	// came from a page that is a subpage, it is also prefixed with appropriate number of '../'.
	// (We accept input without the prefix, so this can also take plain page titles.)
	var matches = resourceName.match( /^((?:\.\.?\/)*)(.*)$/ );
	return {
		// '%' and '?' are valid in page titles, but normally URI-encoded. This also changes underscores
		// to spaces.
		title: ve.decodeURIComponentIntoArticleTitle( matches[ 2 ] ),
		rawTitle: matches[ 2 ],
		hrefPrefix: matches[ 1 ]
	};
};

/**
 * Extract the page title from a Parsoid resource name.
 *
 * @param {string} resourceName Resource name, from a `href` or `resource` attribute
 * @return {string} Full page title in text form (with namespace, and spaces instead of underscores)
 */
ve.normalizeParsoidResourceName = function ( resourceName ) {
	return ve.parseParsoidResourceName( resourceName ).title;
};
