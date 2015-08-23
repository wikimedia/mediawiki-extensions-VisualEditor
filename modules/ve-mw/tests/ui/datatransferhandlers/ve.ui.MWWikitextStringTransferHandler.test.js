/*!
 * VisualEditor UserInterface MWWikitextStringTransferHandler tests.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see http://ve.mit-license.org
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
	var handler, i, j,
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
				content: expectedResponse
			}
		} ) ] );
	}
}

QUnit.test( 'convert', function ( assert ) {
	var i,
		cases = [
			{
				msg: 'Simple link',
				pasteString: '[[Foo]]',
				pasteType: 'text/plain',
				parsoidResponse: '<body data-parsoid=\'{"dsr":[0,7,0,0]}\' lang="en" class="mw-content-ltr sitedir-ltr ltr mw-body mw-body-content mediawiki" dir="ltr"><p data-parsoid=\'{"dsr":[0,7,0,0]}\'><a rel="mw:WikiLink" href="./Foo" title="Foo" data-parsoid=\'{"stx":"simple","a":{"href":"./Foo"},"sa":{"href":"Foo"},"dsr":[0,7,2,2]}\'>Foo</a></p></body>',
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
					[ 'F', [ 0 ] ],
					[ 'o', [ 0 ] ],
					[ 'o', [ 0 ] ],
					{ type: 'internalList' },
					{ type: '/internalList' }
				]
			},
			{
				msg: 'Simple link with no p-wrapping',
				pasteString: '*[[Foo]]',
				pasteType: 'text/plain',
				parsoidResponse: '<body data-parsoid=\'{"dsr":[0,8,0,0]}\' lang="en" class="mw-content-ltr sitedir-ltr ltr mw-body mw-body-content mediawiki" dir="ltr"><ul data-parsoid=\'{"dsr":[0,8,0,0]}\'><li data-parsoid=\'{"dsr":[0,8,1,0]}\'><a rel="mw:WikiLink" href="./Foo" title="Foo" data-parsoid=\'{"stx":"simple","a":{"href":"./Foo"},"sa":{"href":"Foo"},"dsr":[1,8,2,2]}\'>Foo</a></li></ul></body>',
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
				parsoidResponse: '<body data-parsoid=\'{"dsr":[0,11,0,0]}\' lang="en" class="mw-content-ltr sitedir-ltr ltr mw-body mw-body-content mediawiki" dir="ltr"><h2 data-parsoid=\'{"dsr":[0,11,2,2]}\'>heading</h2></body>',
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
				parsoidResponse: '<body data-parsoid=\'{"dsr":[0,8,0,0]}\' lang="en" class="mw-content-ltr sitedir-ltr ltr mw-body mw-body-content mediawiki" dir="ltr"><p data-parsoid=\'{"dsr":[0,8,0,0]}\'><a href="//tools.ietf.org/html/rfc1234" rel="mw:ExtLink" data-parsoid=\'{"stx":"magiclink","dsr":[0,8,0,0]}\'>RFC 1234</a></p></body>',
				annotations: [ {
					type: 'link/mwExternal',
					attributes: {
						href: '//tools.ietf.org/html/rfc1234',
						rel: 'mw:ExtLink'
					}
				} ],
				expectedData: [
					[ 'R', [ 0 ] ],
					[ 'F', [ 0 ] ],
					[ 'C', [ 0 ] ],
					[ ' ', [ 0 ] ],
					[ '1', [ 0 ] ],
					[ '2', [ 0 ] ],
					[ '3', [ 0 ] ],
					[ '4', [ 0 ] ],
					{ type: 'internalList' },
					{ type: '/internalList' }
				]
			},
			{
				msg: 'Magic link (PMID)',
				pasteString: 'PMID 1234',
				pasteType: 'text/plain',
				parsoidResponse: '<body data-parsoid=\'{"dsr":[0,9,0,0]}\' lang="en" class="mw-content-ltr sitedir-ltr ltr mw-body mw-body-content mediawiki" dir="ltr"><p data-parsoid=\'{"dsr":[0,9,0,0]}\'><a href="//www.ncbi.nlm.nih.gov/pubmed/1234?dopt=Abstract" rel="mw:ExtLink" data-parsoid=\'{"stx":"magiclink","dsr":[0,9,0,0]}\'>PMID 1234</a></p></body>',
				annotations: [ {
					type: 'link/mwExternal',
					attributes: {
						href: '//www.ncbi.nlm.nih.gov/pubmed/1234?dopt=Abstract',
						rel: 'mw:ExtLink'
					}
				} ],
				expectedData: [
					[ 'P', [ 0 ] ],
					[ 'M', [ 0 ] ],
					[ 'I', [ 0 ] ],
					[ 'D', [ 0 ] ],
					[ ' ', [ 0 ] ],
					[ '1', [ 0 ] ],
					[ '2', [ 0 ] ],
					[ '3', [ 0 ] ],
					[ '4', [ 0 ] ],
					{ type: 'internalList' },
					{ type: '/internalList' }
				]
			},
			{
				msg: 'Magic link (ISBN)',
				pasteString: 'ISBN 123456789X',
				pasteType: 'text/plain',
				parsoidResponse: '<body data-parsoid=\'{"dsr":[0,15,0,0]}\' lang="en" class="mw-content-ltr sitedir-ltr ltr mw-body mw-body-content mediawiki" dir="ltr"><p data-parsoid=\'{"dsr":[0,15,0,0]}\'><a href="./Special:BookSources/123456789X" rel="mw:ExtLink" data-parsoid=\'{"stx":"magiclink","dsr":[0,15,0,0]}\'>ISBN 123456789X</a></p></body>',
				annotations: [ {
					type: 'link/mwExternal',
					attributes: {
						href: './Special:BookSources/123456789X',
						rel: 'mw:ExtLink'
					}
				} ],
				expectedData: [
					[ 'I', [ 0 ] ],
					[ 'S', [ 0 ] ],
					[ 'B', [ 0 ] ],
					[ 'N', [ 0 ] ],
					[ ' ', [ 0 ] ],
					[ '1', [ 0 ] ],
					[ '2', [ 0 ] ],
					[ '3', [ 0 ] ],
					[ '4', [ 0 ] ],
					[ '5', [ 0 ] ],
					[ '6', [ 0 ] ],
					[ '7', [ 0 ] ],
					[ '8', [ 0 ] ],
					[ '9', [ 0 ] ],
					[ 'X', [ 0 ] ],
					{ type: 'internalList' },
					{ type: '/internalList' }
				]
			}
		];

	QUnit.expect( cases.length );
	for ( i = 0; i < cases.length; i++ ) {
		runWikitextStringHandlerTest( assert, this.server, cases[ i ].pasteString, cases[ i ].pasteType, cases[ i ].parsoidResponse, cases[ i ].expectedData, cases[ i ].annotations, cases[ i ].msg );
	}
} );
