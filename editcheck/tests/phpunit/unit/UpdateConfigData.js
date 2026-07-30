'use strict';

/**
 * Fetches the latest edit check configuration from specified Wikipedia languages
 * and saves them in the configs directory.
 *
 * Text match rules can reference another wiki page via an `import` key. Any such
 * referenced pages are fetched as well and saved alongside the main config, named
 * `<lang>wiki-<tail>.json` where <tail> is the page title with its `MediaWiki:`
 * and `Editcheck-config-` prefixes stripped.
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

/**
 * Fetch the raw wikitext of a page title from a given language Wikipedia.
 *
 * @param {string} lang Language code
 * @param {string} title Full page title (may include a namespace prefix)
 * @return {Promise<string>} Page content
 */
function fetchPage( lang, title ) {
	const url = `https://${ lang }.wikipedia.org/w/index.php?title=${ encodeURIComponent( title ) }&action=raw`;
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	return fetch( url )
		.then( ( response ) => {
			if ( !response.ok ) {
				throw new Error( `Failed to fetch ${ title } for ${ lang }wiki: ${ response.statusText }` );
			}
			return response.text();
		} )
		.then( ( data ) => data.endsWith( '\n' ) ? data : data + '\n' );
}

function writeConfig( path, data ) {
	// eslint-disable-next-line security/detect-non-literal-fs-filename
	fs.writeFileSync( path, data );
	console.log( `Config saved to ${ path }` );
}

/**
 * Derive the local filename for an imported page title.
 *
 * @param {string} lang Language code
 * @param {string} title Imported page title, e.g.
 *  `MediaWiki:Editcheck-config-textmatch-british-english.json`
 * @return {string} Filename, e.g. `enwiki-textmatch-british-english.json`
 */
function importFileName( lang, title ) {
	const tail = title
		.replace( /^[^:]*:/, '' )
		.replace( /^Editcheck-config-/, '' );
	return `${ lang }wiki-${ tail }`;
}

/**
 * Recursively collect all `import` page titles referenced within a config object.
 *
 * @param {*} node Parsed config value
 * @param {string[]} [imports] Accumulator
 * @return {string[]} Referenced page titles
 */
function collectImports( node, imports = [] ) {
	if ( Array.isArray( node ) ) {
		node.forEach( ( item ) => collectImports( item, imports ) );
	} else if ( node && typeof node === 'object' ) {
		if ( typeof node.import === 'string' ) {
			imports.push( node.import );
		}
		Object.keys( node ).forEach( ( key ) => collectImports( node[ key ], imports ) );
	}
	return imports;
}

langs.forEach( ( lang ) => {
	fetchPage( lang, 'MediaWiki:Editcheck-config.json' )
		.then( ( data ) => {
			writeConfig( `configs/${ lang }wiki.json`, data );

			let config;
			try {
				config = JSON.parse( data );
			} catch ( e ) {
				console.error( `Could not parse config for ${ lang }wiki to check for imports:`, e );
				return;
			}

			const imports = collectImports( config );
			imports.forEach( ( title ) => {
				fetchPage( lang, title )
					.then( ( importData ) => {
						writeConfig( `configs/textmatch-import/${ importFileName( lang, title ) }`, importData );
					} )
					.catch( ( error ) => {
						console.error( `Error fetching import ${ title } for ${ lang }wiki:`, error );
					} );
			} );
		} )
		.catch( ( error ) => {
			console.error( `Error fetching config for ${ lang }wiki:`, error );
		} );
} );
