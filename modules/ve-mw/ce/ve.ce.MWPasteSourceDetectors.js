/*!
 * VisualEditor MediaWiki paste source detectors.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

( function () {
	const wikimediaDomains = [
		'wikipedia.org',
		'wiktionary.org',
		'wikibooks.org',
		'wikinews.org',
		'wikiquote.org',
		'wikisource.org',
		'wikiversity.org',
		'wikivoyage.org',
		'wikimedia.org',
		'wikidata.org',
		'wikifunctions.org',
		'mediawiki.org'
	];

	/**
	 * Get the metadata that MediaWiki adds to HTML copied from page content.
	 *
	 * See ve.init.mw.ArticleCopyHandler.
	 *
	 * @private
	 * @param {string} html Clipboard HTML
	 * @return {Object|null} Metadata, or null if there is none
	 */
	function getClipboardMetadata( html ) {
		const match = html && html.match( /<[^>]*\sdata-mw-clipboard=[^>]*>/i );
		if ( !match ) {
			return null;
		}
		// Parse only the tag, to decode the attribute value
		const element = new DOMParser().parseFromString( match[ 0 ], 'text/html' ).body.firstElementChild;
		const value = element && element.getAttribute( 'data-mw-clipboard' );
		if ( !value ) {
			return null;
		}
		try {
			const metadata = JSON.parse( value );
			return metadata && typeof metadata === 'object' ? metadata : null;
		} catch ( e ) {
			return null;
		}
	}

	// Each detector reads the same clipboard data, so parse it once
	const metadataCache = new WeakMap();

	/**
	 * Get the clipboard metadata from clipboard data, with a cache
	 *
	 * @private
	 * @param {DataTransfer} clipboardData
	 * @return {Object|null} Metadata, or null if there is none
	 */
	function getCachedClipboardMetadata( clipboardData ) {
		if ( !metadataCache.has( clipboardData ) ) {
			metadataCache.set( clipboardData, getClipboardMetadata( clipboardData.getData( 'text/html' ) ) );
		}
		return metadataCache.get( clipboardData );
	}

	/**
	 * @private
	 * @param {string} domain
	 * @return {boolean} The domain belongs to a Wikimedia wiki
	 */
	function isWikimediaDomain( domain ) {
		if ( typeof domain !== 'string' ) {
			return false;
		}
		domain = domain.toLowerCase();
		return wikimediaDomains.some( ( wmDomain ) => domain === wmDomain || domain.endsWith( '.' + wmDomain ) );
	}

	ve.ce.pasteSourceDetectors.register( new ve.ce.PasteSourceDetector(
		'localwiki',
		( clipboardData ) => {
			const metadata = getCachedClipboardMetadata( clipboardData );
			return !!metadata && metadata.domain === location.hostname;
		},
		[ 'mediawiki' ]
	) );

	ve.ce.pasteSourceDetectors.register( new ve.ce.PasteSourceDetector(
		'wikimedia',
		( clipboardData ) => {
			const metadata = getCachedClipboardMetadata( clipboardData );
			return !!metadata && isWikimediaDomain( metadata.domain );
		},
		[ 'mediawiki' ]
	) );

	// Fallback for other MediaWiki wikis. Detectors match in order of registration.
	ve.ce.pasteSourceDetectors.register( new ve.ce.PasteSourceDetector(
		'mediawiki',
		( clipboardData ) => !!getCachedClipboardMetadata( clipboardData ),
		[ 'mediawiki' ]
	) );
}() );
