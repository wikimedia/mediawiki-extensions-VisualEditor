'use strict';

/**
 * Fetches the latest edit check configuration from specified Wikipedia languages
 * and saves them in the configs directory.
 *
 * Usage: `node UpdateConfigData.js`
 */

const fs = require( 'fs' );

const langs = [
	'cs',
	'en',
	'he',
	'ru',
	'uk'
];

langs.forEach( ( lang ) => {
	const url = `https://${ lang }.wikipedia.org/w/index.php?title=MediaWiki:Editcheck-config.json&action=raw`;
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	fetch( url )
		.then( ( response ) => {
			if ( !response.ok ) {
				throw new Error( `Failed to fetch config for ${ lang }wiki: ${ response.statusText }` );
			}
			return response.text();
		} )
		.then( ( data ) => {
			if ( !data.endsWith( '\n' ) ) {
				data += '\n';
			}
			const path = `configs/${ lang }wiki.json`;
			// eslint-disable-next-line security/detect-non-literal-fs-filename
			fs.writeFileSync( path, data );
			console.log( `Config for ${ lang }wiki saved to ${ path }` );
		} )
		.catch( ( error ) => {
			console.error( `Error fetching config for ${ lang }wiki:`, error );
		} );
} );
