'use strict';

/**
 * Build a map of wiki dbname to base URL from a sitematrix API response.
 *
 * @param {Object} data API response
 * @return {Object} Map of dbname to base URL (e.g. { enwiki: 'https://en.wikipedia.org' })
 */
function buildDbnameMap( data ) {
	const matrix = data && data.sitematrix;
	if ( !matrix || typeof matrix !== 'object' ) {
		throw new Error( 'Unexpected sitematrix response: missing "sitematrix"' );
	}

	const map = Object.create( null );
	const addSite = ( site ) => {
		if ( site && typeof site.dbname === 'string' && typeof site.url === 'string' ) {
			map[ site.dbname ] = site.url.replace( /\/+$/, '' );
		}
	};

	for ( const key of Object.keys( matrix ) ) {
		// Numeric keys are language groups with a `site` array; `specials` is a
		// flat array of individual sites; `count` is metadata we ignore.
		const value = matrix[ key ];
		if ( key === 'specials' && Array.isArray( value ) ) {
			value.forEach( addSite );
		} else if ( value && Array.isArray( value.site ) ) {
			value.site.forEach( addSite );
		}
	}

	return map;
}

/**
 * Fetch the sitematrix and build the dbname to base URL map.
 *
 * @param {string} [apiUrl] MediaWiki API endpoint (default: Wikimedia meta api.php)
 * @return {Promise<Object>} Map of dbname to base URL
 */
async function fetchDbnameMap( apiUrl ) {
	const url = new URL( apiUrl || 'https://meta.wikimedia.org/w/api.php' );
	url.search = new URLSearchParams( {
		action: 'sitematrix',
		formatversion: '2',
		smlangprop: 'site',
		smsiteprop: 'dbname|url',
		format: 'json'
	} ).toString();
	const res = await fetch( url, {
		headers: {
			accept: 'application/json',
			'user-agent': 'VisualEditor-EditCheck-Headless/1.0 (https://www.mediawiki.org/wiki/VisualEditor)'
		}
	} );
	if ( !res.ok ) {
		throw new Error( `Sitematrix request failed: HTTP ${ res.status }` );
	}
	return buildDbnameMap( await res.json() );
}

/**
 * Resolve a wiki identifier to a base URL.
 *
 * A value starting with http:// or https:// is treated as a base URL directly;
 * anything else is treated as a dbname and looked up in the sitematrix map.
 *
 * @param {string} wiki Wiki base URL or dbname
 * @param {Object} dbnameMap Map of dbname to base URL (from fetchDbnameMap)
 * @return {string} Base URL with any trailing slashes removed
 */
function resolveWiki( wiki, dbnameMap ) {
	const trimmed = String( wiki || '' ).trim();
	if ( !trimmed ) {
		throw new Error( '"wiki" is required and must be a non-empty string' );
	}
	if ( /^https?:\/\//i.test( trimmed ) ) {
		return trimmed.replace( /\/+$/, '' );
	}
	const url = dbnameMap[ trimmed ];
	if ( !url ) {
		throw new Error( `Unknown wiki dbname: "${ trimmed }"` );
	}
	return url;
}

module.exports = {
	fetchDbnameMap,
	resolveWiki
};
