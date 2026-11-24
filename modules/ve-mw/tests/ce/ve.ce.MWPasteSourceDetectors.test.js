/*!
 * VisualEditor MediaWiki paste source detector tests.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

QUnit.module( 've.ce.MWPasteSourceDetectors', ve.test.utils.newMwEnvironment() );

QUnit.test( 'wikimedia and mediawiki detectors', ( assert ) => {
	const marker = ( json ) => '<span data-mw-clipboard="' + ve.escapeHtml( json ) +
		'" style="display: inline-block; width: 1px;"></span>';
	const cases = [
		{
			msg: 'Wikipedia',
			html: marker( '{"domain":"en.wikipedia.org"}' ) + '<span>Text</span>',
			expected: 'wikimedia'
		},
		{
			msg: 'Single quotes',
			html: '<p><span data-mw-clipboard=\'{"domain":"www.wikidata.org"}\'></span>Text</p>',
			expected: 'wikimedia'
		},
		{
			msg: 'Domain without subdomain',
			html: marker( '{"domain":"mediawiki.org"}' ) + 'Text',
			expected: 'wikimedia'
		},
		{
			msg: 'Other wiki',
			html: marker( '{"domain":"example.org"}' ) + 'Text',
			expected: 'mediawiki'
		},
		{
			msg: 'Domain that only ends with a Wikimedia domain',
			html: marker( '{"domain":"notwikipedia.org"}' ) + 'Text',
			expected: 'mediawiki'
		},
		{
			msg: 'Other Cloud VPS project',
			html: marker( '{"domain":"patchdemo.wmcloud.org"}' ) + 'Text',
			expected: 'mediawiki'
		},
		{
			msg: 'Invalid JSON',
			html: marker( '{domain' ) + 'Text',
			expected: null
		},
		{
			msg: 'No domain',
			html: marker( '{}' ) + 'Text',
			expected: 'mediawiki'
		},
		{
			msg: 'No marker',
			html: '<p>Text</p>',
			expected: null
		}
	];

	cases.forEach( ( caseItem ) => {
		const clipboardData = {
			types: [ 'text/html', 'text/plain' ],
			getData: ( type ) => type === 'text/html' ? caseItem.html : 'Text'
		};
		const detector = ve.ce.pasteSourceDetectors.match( clipboardData );
		assert.strictEqual( detector && detector.name, caseItem.expected, caseItem.msg );
	} );
} );
