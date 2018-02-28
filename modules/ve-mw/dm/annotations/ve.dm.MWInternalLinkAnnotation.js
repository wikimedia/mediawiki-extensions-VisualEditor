/*!
 * VisualEditor DataModel MWInternalLinkAnnotation class.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * DataModel MediaWiki internal link annotation.
 *
 * Example HTML sources:
 *
 *     <a rel="mw:WikiLink">
 *
 * @class
 * @extends ve.dm.LinkAnnotation
 * @constructor
 * @param {Object} element
 */
ve.dm.MWInternalLinkAnnotation = function VeDmMWInternalLinkAnnotation() {
	// Parent constructor
	ve.dm.MWInternalLinkAnnotation.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.dm.MWInternalLinkAnnotation, ve.dm.LinkAnnotation );

/* Static Properties */

ve.dm.MWInternalLinkAnnotation.static.name = 'link/mwInternal';

ve.dm.MWInternalLinkAnnotation.static.matchRdfaTypes = [ 'mw:WikiLink' ];

ve.dm.MWInternalLinkAnnotation.static.toDataElement = function ( domElements, converter ) {
	var targetData = this.getTargetDataFromHref(
		domElements[ 0 ].getAttribute( 'href' ),
		converter.getTargetHtmlDocument()
	);

	return {
		type: this.name,
		attributes: {
			hrefPrefix: targetData.hrefPrefix,
			title: targetData.title,
			normalizedTitle: this.normalizeTitle( targetData.title ),
			lookupTitle: this.getLookupTitle( targetData.title ),
			origTitle: targetData.rawTitle
		}
	};
};

/**
 * Build a ve.dm.MWInternalLinkAnnotation from a given mw.Title.
 *
 * @param {mw.Title} title The title to link to.
 * @param {string} [rawTitle] String from which the title was created
 * @return {ve.dm.MWInternalLinkAnnotation} The annotation.
 */
ve.dm.MWInternalLinkAnnotation.static.newFromTitle = function ( title, rawTitle ) {
	var element,
		target = title.toText(),
		namespaceIds = mw.config.get( 'wgNamespaceIds' );

	if ( title.getNamespaceId() === namespaceIds.file || title.getNamespaceId() === namespaceIds.category ) {
		// File: or Category: link
		// We have to prepend a colon so this is interpreted as a link
		// rather than an image inclusion or categorization
		target = ':' + target;
	}
	if ( title.getFragment() ) {
		target += '#' + title.getFragment();
	}

	element = {
		type: 'link/mwInternal',
		attributes: {
			title: target,
			normalizedTitle: ve.dm.MWInternalLinkAnnotation.static.normalizeTitle( title ),
			lookupTitle: ve.dm.MWInternalLinkAnnotation.static.getLookupTitle( title )
		}
	};
	if ( rawTitle ) {
		element.attributes.origTitle = rawTitle;
	}
	return new ve.dm.MWInternalLinkAnnotation( element );
};

/**
 * Parse URL to get title it points to.
 *
 * @param {string} href
 * @param {HTMLDocument|string} doc Document whose base URL to use, or base URL as a string.
 * @return {Object} Information about the given href
 * @return {string} return.title
 *    The title of the internal link, else the original href if href is external
 * @return {string} return.rawTitle
 *    The title without URL decoding and underscore normalization applied
 * @return {string} return.hrefPrefix
 *    Any ./ or ../ prefixes on a relative link
 * @return {boolean} return.isInternal
 *    True if the href pointed to the local wiki, false if href is external
 */
ve.dm.MWInternalLinkAnnotation.static.getTargetDataFromHref = function ( href, doc ) {
	var relativeBase, relativeBaseRegex, relativeHref, isInternal, matches, data;

	function regexEscape( str ) {
		return str.replace( /([.?*+^$[\]\\(){}|-])/g, '\\$1' );
	}

	// Protocol relative base
	relativeBase = ve.resolveUrl( mw.config.get( 'wgArticlePath' ), doc ).replace( /^https?:/i, '' );
	relativeBaseRegex = new RegExp( regexEscape( relativeBase ).replace( regexEscape( '$1' ), '(.*)' ) );
	// Protocol relative href
	relativeHref = href.replace( /^https?:/i, '' );
	// Paths without a host portion are assumed to be internal
	isInternal = !/^\/\//.test( relativeHref );
	// Check if this matches the server's article path
	matches = relativeHref.match( relativeBaseRegex );

	if ( matches && matches[ 1 ].indexOf( '?' ) === -1 ) {
		// Take the relative path
		href = matches[ 1 ];
		isInternal = true;
	}

	// This href doesn't necessarily come from Parsoid (and it might not have the "./" prefix), but
	// this method will work fine.
	data = ve.parseParsoidResourceName( href );

	return {
		title: data.title,
		rawTitle: data.rawTitle,
		hrefPrefix: data.hrefPrefix,
		isInternal: isInternal
	};
};

ve.dm.MWInternalLinkAnnotation.static.toDomElements = function () {
	var parentResult = ve.dm.LinkAnnotation.static.toDomElements.apply( this, arguments );
	parentResult[ 0 ].setAttribute( 'rel', 'mw:WikiLink' );
	return parentResult;
};

ve.dm.MWInternalLinkAnnotation.static.getHref = function ( dataElement ) {
	var href,
		title = dataElement.attributes.title,
		origTitle = dataElement.attributes.origTitle;
	if ( origTitle !== undefined && ve.decodeURIComponentIntoArticleTitle( origTitle ) === title ) {
		// Restore href from origTitle
		href = origTitle;
		// Only use hrefPrefix if restoring from origTitle
		if ( dataElement.attributes.hrefPrefix ) {
			href = dataElement.attributes.hrefPrefix + href;
		}
	} else {
		// Don't escape slashes in the title; they represent subpages.
		href = title.split( /(\/|#)/ ).map( function ( part ) {
			if ( part === '/' || part === '#' ) {
				return part;
			} else {
				return encodeURIComponent( part );
			}
		} ).join( '' );
	}
	return href;
};

/**
 * Normalize title for comparison purposes.
 * E.g. capitalisation and underscores.
 *
 * @param {string|mw.Title} original Original title
 * @return {string} Normalized title, or the original string if it is invalid
 */
ve.dm.MWInternalLinkAnnotation.static.normalizeTitle = function ( original ) {
	var title = original instanceof mw.Title ? original : mw.Title.newFromText( original );
	if ( !title ) {
		return original;
	}
	return title.getPrefixedText() + ( title.getFragment() !== null ? '#' + title.getFragment() : '' );
};

/**
 * Normalize title for lookup (search suggestion, existence) purposes.
 *
 * @param {string|mw.Title} original Original title
 * @return {string} Normalized title, or the original string if it is invalid
 */
ve.dm.MWInternalLinkAnnotation.static.getLookupTitle = function ( original ) {
	var title = original instanceof mw.Title ? original : mw.Title.newFromText( original );
	if ( !title ) {
		return original;
	}
	return title.getPrefixedText();
};

/**
 * Get the fragment for a title
 *
 * @static
 * @param {string|mw.Title} original Original title
 * @return {string|null} Fragment for the title, or null if it was invalid or missing
 */
ve.dm.MWInternalLinkAnnotation.static.getFragment = function ( original ) {
	var title = original instanceof mw.Title ? original : mw.Title.newFromText( original );
	if ( !title ) {
		return null;
	}
	return title.getFragment();
};

ve.dm.MWInternalLinkAnnotation.static.describeChange = function ( key, change ) {
	if ( key === 'title' ) {
		return ve.msg( 'visualeditor-changedesc-link-href', change.from, change.to );
	}
	return null;
};

/* Methods */

/**
 * @inheritdoc
 */
ve.dm.MWInternalLinkAnnotation.prototype.getComparableObject = function () {
	return {
		type: this.getType(),
		normalizedTitle: this.getAttribute( 'normalizedTitle' )
	};
};

/**
 * @inheritdoc
 */
ve.dm.MWInternalLinkAnnotation.prototype.getComparableHtmlAttributes = function () {
	// Assume that wikitext never adds meaningful html attributes for comparison purposes,
	// although ideally this should be decided by Parsoid (Bug T95028).
	return {};
};

/**
 * @inheritdoc
 */
ve.dm.MWInternalLinkAnnotation.prototype.getDisplayTitle = function () {
	return this.getAttribute( 'normalizedTitle' );
};

/**
 * Convenience wrapper for .getFragment() on the current element.
 *
 * @see #static-getFragment
 * @return {string} Fragment for the title, or an empty string if it was invalid
 */
ve.dm.MWInternalLinkAnnotation.prototype.getFragment = function () {
	return this.constructor.static.getFragment( this.getAttribute( 'normalizedTitle' ) );
};

/* Registration */

ve.dm.modelRegistry.register( ve.dm.MWInternalLinkAnnotation );
