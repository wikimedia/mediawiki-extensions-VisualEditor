/**
 * SVGO Configuration
 * Compatible with v4.0.0+
 * Recommended options from:
 * https://www.mediawiki.org/wiki/Manual:Coding_conventions/SVG#Exemplified_safe_configuration
 */
'use strict';
module.exports = {
	plugins: [
		{
			// Set of built-in plugins enabled by default.
			name: 'preset-default',
			params: {
				overrides: {
					cleanupIds: false,
					removeDesc: false,
					// If the SVG doesn't start with an XML declaration, then its MIME type will
					// be detected as "text/plain" rather than "image/svg+xml" by libmagic and,
					// consequently, MediaWiki's CSSMin CSS minifier. libmagic's default database
					// currently requires that SVGs contain an XML declaration:
					// https://github.com/threatstack/libmagic/blob/master/magic/Magdir/sgml#L5
					removeXMLProcInst: false
				}
			}
		},
		'removeRasterImages',
		'sortAttrs'
	],
	// Set whitespace according to Wikimedia Coding Conventions.
	// @see https://github.com/svg/svgo/blob/main/lib/stringifier.js#L39 for available options.
	js2svg: {
		eol: 'lf',
		finalNewline: true,
		// Configure the indent to tabs (default 4 spaces) used by `--pretty` here.
		indent: '\t',
		pretty: true
	},
	multipass: true
};
