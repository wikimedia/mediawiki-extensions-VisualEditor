/*!
 * VisualEditor DataModel MWCategoryMetaItem tests.
 *
 * @copyright See AUTHORS.txt
 */

QUnit.module( 've.dm.MWCategoryMetaItem', ve.test.utils.newMwEnvironment() );

QUnit.test( 'toDataElement', ( assert ) => {
	const siteConfigurations = [
		{
			msg: 'query string URL',
			config: {
				wgServer: 'http://example.org',
				wgScript: '/w/index.php',
				wgArticlePath: '/w/index.php?title=$1'
			},
			base: 'http://example.org/w/'
		},
		{
			msg: 'short URL using pathinfo',
			config: {
				wgServer: 'http://example.org',
				wgScript: '/w/index.php',
				wgArticlePath: '/w/index.php/$1'
			},
			base: 'http://example.org/w/index.php/'
		},
		{
			msg: 'proper short URL',
			config: {
				wgServer: 'http://example.org',
				wgScript: '/w/index.php',
				wgArticlePath: '/wiki/$1'
			},
			base: 'http://example.org/wiki/'
		}
	];
	const createLink = ( href ) => {
		const link = document.createElement( 'link' );
		link.setAttribute( 'rel', 'mw:PageProp/Category' );
		if ( mw.config.get( 'wgArticlePath' ).includes( '?' ) && href.indexOf( './' ) === 0 ) {
			href = './index.php?title=' + href.slice( 2 );
		}
		link.setAttribute( 'href', href );
		return link;
	};

	const getTestCases = () => ( [
		{
			msg: 'Simple category',
			element: createLink( './Category:MyCategory' ),
			expected: {
				type: 'mwCategory',
				attributes: {
					category: 'Category:MyCategory',
					sortkey: ''
				}
			}
		},
		{
			msg: 'Category with whitespace',
			element: createLink( './Category:Some_Category' ),
			expected: {
				type: 'mwCategory',
				attributes: {
					category: 'Category:Some Category',
					sortkey: ''
				}
			}
		},
		{
			msg: 'Category with Sortkey',
			element: createLink( './Category:Some_Category#MySortkey' ),
			expected: {
				type: 'mwCategory',
				attributes: {
					category: 'Category:Some Category',
					sortkey: 'MySortkey'
				}
			}
		}
	] );

	for ( const siteConfig of siteConfigurations ) {
		// Set up global state (site configuration)
		mw.config.set( siteConfig.config );

		const doc = ve.dm.mwExample.createExampleDocumentFromData( [], undefined, siteConfig.base );
		// toDataElement is called during a converter run, so we need to fake up a bit of state to test it.
		const converter = new ve.dm.ModelFromDomConverter( ve.dm.modelRegistry, ve.dm.nodeFactory, ve.dm.annotationFactory );
		converter.doc = doc.getHtmlDocument();
		converter.targetDoc = doc.getHtmlDocument();
		converter.store = doc.getStore();
		converter.internalList = doc.getInternalList();
		converter.contextStack = [];
		for ( const testCase of getTestCases() ) {
			assert.deepEqual(
				ve.dm.MWCategoryMetaItem.static.toDataElement( [ testCase.element ], converter ),
				testCase.expected,
				testCase.msg + ': ' + siteConfig.msg
			);
		}
	}
} );
