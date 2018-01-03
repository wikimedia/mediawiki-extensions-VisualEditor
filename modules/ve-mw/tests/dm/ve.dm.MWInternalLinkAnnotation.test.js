/*!
 * VisualEditor DataModel MWInternalLinkAnnotation tests.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see http://ve.mit-license.org
 */

QUnit.module( 've.dm.MWInternalLinkAnnotation' );

QUnit.test( 'toDataElement', function ( assert ) {
	var i, l,
		doc = ve.dm.example.createExampleDocument(),
		internalLink = function ( pageTitle ) {
			var link = document.createElement( 'a' );
			link.setAttribute( 'href', location.origin + mw.Title.newFromText( pageTitle ).getUrl() );
			return link;
		},
		cases = [
			{
				msg: 'Simple',
				element: internalLink( 'Foo' ),
				expected: {
					type: 'link/mwInternal',
					attributes: {
						hrefPrefix: '',
						lookupTitle: 'Foo',
						normalizedTitle: 'Foo',
						origTitle: 'Foo',
						title: 'Foo'
					}
				}
			},
			{
				// Because percent-encoded URLs aren't valid titles, but what they decode to might be
				msg: 'Percent encoded characters',
				element: internalLink( 'Foo?' ),
				expected: {
					type: 'link/mwInternal',
					attributes: {
						hrefPrefix: '',
						lookupTitle: 'Foo?',
						normalizedTitle: 'Foo?',
						origTitle: 'Foo%3F',
						title: 'Foo?'
					}
				}
			}
		],
		converter = new ve.dm.Converter( ve.dm.modelRegistry, ve.dm.nodeFactory, ve.dm.annotationFactory, ve.dm.metaItemFactory );

	// toDataElement is called during a converter run, so we need to fake up a bit of state to test it.
	// This would normally be done by ve.dm.converter.getModelFromDom.
	converter.doc = doc.getHtmlDocument();
	converter.targetDoc = doc.getHtmlDocument();
	converter.store = doc.getStore();
	converter.internalList = doc.getInternalList();
	converter.contextStack = [];

	for ( i = 0, l = cases.length; i < l; i++ ) {
		assert.deepEqual( ve.dm.MWInternalLinkAnnotation.static.toDataElement( [ cases[ i ].element ], converter ), cases[ i ].expected, cases[ i ].msg );
	}
} );

QUnit.test( 'getFragment', function ( assert ) {
	var	i, l,
		cases = [
			{
				msg: 'No fragment returns null',
				original: 'Foo',
				expected: null
			},
			{
				msg: 'Invalid title returns null',
				original: 'A%20B',
				expected: null
			},
			{
				msg: 'Blank fragment returns empty string',
				original: 'Foo#',
				expected: ''
			},
			{
				msg: 'Extant fragment returns same string',
				original: 'Foo#bar',
				expected: 'bar'
			},
			{
				msg: 'Hash-bang works returns full string',
				original: 'Foo#!bar',
				expected: '!bar'
			},
			{
				msg: 'Double-hash returns everything after the first hash',
				original: 'Foo##bar',
				expected: '#bar'
			},
			{
				msg: 'Multi-fragment returns everything after the first hash',
				original: 'Foo#bar#baz#bat',
				expected: 'bar#baz#bat'
			}
		];

	for ( i = 0, l = cases.length; i < l; i++ ) {
		assert.deepEqual( ve.dm.MWInternalLinkAnnotation.static.getFragment( cases[ i ].original ), cases[ i ].expected, cases[ i ].msg );
	}
} );
