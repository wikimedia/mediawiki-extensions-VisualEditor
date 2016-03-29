/*!
 * VisualEditor UserInterface MWWikitextStringTransferHandler tests.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see http://ve.mit-license.org
 */
var MWWIKITEXT_MOCK_API = true;

QUnit.module( 've.ui.MWWikitextStringTransferHandler', QUnit.newMwEnvironment( {
	setup: function () {
		// Mock XHR for mw.Api()
		this.server = MWWIKITEXT_MOCK_API ? this.sandbox.useFakeServer() : null;
	}
} ) );

/* Tests */

function runWikitextStringHandlerTest( assert, server, string, mimeType, expectedResponse, expectedData, annotations, msg ) {
	var handler, i, j, name,
		done = assert.async(),
		item = ve.ui.DataTransferItem.static.newFromString( string, mimeType ),
		doc = ve.dm.example.createExampleDocument(),
		mockSurface = {
			getModel: function () {
				return {
					getDocument: function () {
						return doc;
					}
				};
			},
			createProgress: function () {
				return $.Deferred().promise();
			}
		};

	// Preprocess the expectedData array
	for ( i = 0; i < expectedData.length; i++ ) {
		if ( Array.isArray( expectedData[ i ] ) ) {
			for ( j = 0; j < expectedData[ i ][ 1 ].length; j++ ) {
				if ( typeof expectedData[ i ][ 1 ][ j ] === 'number' ) {
					expectedData[ i ][ 1 ][ j ] = annotations[ expectedData[ i ][ 1 ][ j ] ];
				}
			}
		}
	}

	// Check we match the wikitext string handler
	name = ve.ui.dataTransferHandlerFactory.getHandlerNameForItem( item );
	assert.strictEqual( name, 'wikitextString', msg + ': triggers match function' );

	// Invoke the handler
	handler = ve.ui.dataTransferHandlerFactory.create( 'wikitextString', mockSurface, item );

	handler.getInsertableData().done( function ( doc2 ) {
		var actualData = doc2.getData();
		ve.dm.example.postprocessAnnotations( actualData, doc2.getStore() );
		assert.equalLinearData( actualData, expectedData, msg + ': data match' );
		done();
	} );

	if ( server ) {
		server.respond( [ 200, { 'Content-Type': 'application/json' }, JSON.stringify( {
			visualeditor: {
				result: 'success',
				content: '<body lang="en" class="mw-content-ltr sitedir-ltr ltr mw-body mw-body-content mediawiki" dir="ltr">' +
					expectedResponse +
					'</body>'
			}
		} ) ] );
	}
}

QUnit.test( 'convert', function ( assert ) {
	var i,
		cases = [
			{
				msg: 'Simple link',
				// Put link in the middle of text to verify that the
				// start-of-line and end-or-line anchors on the heading
				// identification pattern don't affect link identification
				pasteString: 'some [[Foo]] text',
				pasteType: 'text/plain',
				parsoidResponse: '<p>some <a rel="mw:WikiLink" href="./Foo" title="Foo">Foo</a> text</p>',
				annotations: [ {
					type: 'link/mwInternal',
					attributes: {
						hrefPrefix: './',
						lookupTitle: 'Foo',
						normalizedTitle: 'Foo',
						origTitle: 'Foo',
						title: 'Foo'
					}
				} ],
				expectedData: [
					's',
					'o',
					'm',
					'e',
					' ',
					[ 'F', [ 0 ] ],
					[ 'o', [ 0 ] ],
					[ 'o', [ 0 ] ],
					' ',
					't',
					'e',
					'x',
					't',
					{ type: 'internalList' },
					{ type: '/internalList' }
				]
			},
			{
				msg: 'Simple link with no p-wrapping',
				pasteString: '*[[Foo]]',
				pasteType: 'text/plain',
				parsoidResponse: '<ul><li><a rel="mw:WikiLink" href="./Foo" title="Foo">Foo</a></li></ul>',
				annotations: [ {
					type: 'link/mwInternal',
					attributes: {
						hrefPrefix: './',
						lookupTitle: 'Foo',
						normalizedTitle: 'Foo',
						origTitle: 'Foo',
						title: 'Foo'
					}
				} ],
				expectedData: [
					{
						type: 'list',
						attributes: { style: 'bullet' }
					},
					{ type: 'listItem' },
					{
						type: 'paragraph',
						internal: { generated: 'wrapper' }
					},
					[ 'F', [ 0 ] ],
					[ 'o', [ 0 ] ],
					[ 'o', [ 0 ] ],
					{ type: '/paragraph' },
					{ type: '/listItem' },
					{ type: '/list' },
					{ type: 'internalList' },
					{ type: '/internalList' }
				]
			},
			{
				msg: 'Heading',
				pasteString: '==heading==',
				pasteType: 'text/plain',
				parsoidResponse: '<h2>heading</h2>',
				annotations: [],
				expectedData: [
					{ type: 'heading', attributes: { level: 2 } },
					'h',
					'e',
					'a',
					'd',
					'i',
					'n',
					'g',
					{ type: '/heading' },
					{ type: 'internalList' },
					{ type: '/internalList' }
				]
			},
			{
				msg: 'Magic link (RFC)',
				pasteString: 'RFC 1234',
				pasteType: 'text/plain',
				parsoidResponse: '<p><a href="//tools.ietf.org/html/rfc1234" rel="mw:ExtLink">RFC 1234</a></p>',
				annotations: [],
				expectedData: [
					{
						type: 'link/mwMagic',
						attributes: {
							content: 'RFC 1234',
							origText: 'RFC 1234',
							origHtml: 'RFC 1234'
						}
					},
					{
						type: '/link/mwMagic'
					},
					{ type: 'internalList' },
					{ type: '/internalList' }
				]
			},
			{
				msg: 'Magic link (PMID)',
				pasteString: 'PMID 1234',
				pasteType: 'text/plain',
				parsoidResponse: '<p><a href="//www.ncbi.nlm.nih.gov/pubmed/1234?dopt=Abstract" rel="mw:ExtLink">PMID 1234</a></p>',
				annotations: [],
				expectedData: [
					{
						type: 'link/mwMagic',
						attributes: {
							content: 'PMID 1234',
							origText: 'PMID 1234',
							origHtml: 'PMID 1234'
						}
					},
					{
						type: '/link/mwMagic'
					},
					{ type: 'internalList' },
					{ type: '/internalList' }
				]
			},
			{
				msg: 'Magic link (ISBN)',
				pasteString: 'ISBN 123456789X',
				pasteType: 'text/plain',
				parsoidResponse: '<p><a href="./Special:BookSources/123456789X" rel="mw:ExtLink">ISBN 123456789X</a></p>',
				annotations: [],
				expectedData: [
					{
						type: 'link/mwMagic',
						attributes: {
							content: 'ISBN 123456789X',
							origText: 'ISBN 123456789X',
							origHtml: 'ISBN 123456789X'
						}
					},
					{
						type: '/link/mwMagic'
					},
					{ type: 'internalList' },
					{ type: '/internalList' }
				]
			}
		];

	QUnit.expect( cases.length * 2 );
	for ( i = 0; i < cases.length; i++ ) {
		runWikitextStringHandlerTest( assert, this.server, cases[ i ].pasteString, cases[ i ].pasteType, cases[ i ].parsoidResponse, cases[ i ].expectedData, cases[ i ].annotations, cases[ i ].msg );
	}
} );
