QUnit.module( 'mw.editcheck.ConvertReferenceEditCheck', ve.test.utils.newEditCheckEnvironment( {
	// Citoid isn't a dependency of this test module, so getConvertibleHref is faked
	beforeEach() {
		// Stub the Citoid context item so getConvertibleHref is controllable.
		this.citoidPropExisted = Object.prototype.hasOwnProperty.call( ve.ui, 'CitoidReferenceContextItem' );
		this.originalCitoid = ve.ui.CitoidReferenceContextItem;
		ve.ui.CitoidReferenceContextItem = {
			static: {
				// Overridden per-case below.
				getConvertibleHref: () => 'https://google.com'
			}
		};
	},
	afterEach() {
		if ( this.citoidPropExisted ) {
			ve.ui.CitoidReferenceContextItem = this.originalCitoid;
		} else {
			delete ve.ui.CitoidReferenceContextItem;
		}
	}
} ) );

QUnit.test( 'onDocumentChange: strict modes', ( assert ) => {
	const link = ( href ) => ( {
		type: 'link/mwExternal',
		attributes: {
			href,
			rel: 'mw:ExtLink'
		}
	} );

	// `body` is the reference content; `convertible` drives the stubbed getConvertibleHref.
	const cases = [
		{
			// Bare URL: annotated URL text. url-only matches the text; covered
			// matches the single covering annotation.
			name: 'bare URL',
			body: [
				...ve.dm.example.annotateText( 'https://google.com', link( 'https://google.com' ) )
			],
			convertible: true,
			expected: { 'url-only': 1, covered: 1, any: 1 }
		},
		{
			// A label-less [https://google.com] is a node, not an annotation, so
			// url-only catches it (length-4 special case) but covered does not.
			name: 'numbered external link only',
			body: [
				{ type: 'link/mwNumberedExternal', attributes: { href: 'https://google.com' } },
				{ type: '/link/mwNumberedExternal' }
			],
			convertible: true,
			expected: { 'url-only': 1, covered: 0, any: 1 }
		},
		{
			name: 'single link annotation covering whole content',
			body: [
				...ve.dm.example.annotateText( 'Book Name', link( 'http://google.com/' ) )
			],
			convertible: true,
			expected: { 'url-only': 0, covered: 1, any: 1 }
		},
		{
			name: 'link annotation plus other text',
			body: [
				...'Author One, Author Two. ',
				...ve.dm.example.annotateText( 'Book Name', link( 'http://google.com/' ) ),
				...'. p.58.'
			],
			convertible: true,
			expected: { 'url-only': 0, covered: 0, any: 1 }
		},
		{
			// T430087: the url-only regex is anchored, so a URL with trailing text
			// must not trigger. The old unanchored regex wrongly matched here.
			name: 'URL text not covering whole reference',
			body: [ ...'https://google.com plus trailing words' ],
			convertible: true,
			expected: { 'url-only': 0, covered: 0, any: 1 }
		},
		{
			name: 'no convertible href',
			body: [ ...'https://google.com' ],
			convertible: false,
			expected: { 'url-only': 0, covered: 0, any: 0 }
		}
	];

	const strictModes = [ 'url-only', 'covered', 'any' ];

	const buildSurface = ( body ) => {
		const doc = ve.dm.mwExample.createExampleDocumentFromData( [
			{ type: 'paragraph' },
			...'Lead',
			{
				type: 'mwReference',
				attributes: {
					listIndex: 0,
					listGroup: 'mwReference/',
					listKey: 'auto/0',
					refGroup: '',
					contentsUsed: true
				}
			},
			{ type: '/mwReference' },
			{ type: '/paragraph' },
			{ type: 'internalList' },
			{ type: 'internalItem' },
			{ type: 'paragraph', internal: { generated: 'wrapper' } },
			...body,
			{ type: '/paragraph' },
			{ type: '/internalItem' },
			{ type: '/internalList' }
		] );
		return new ve.dm.Surface( doc );
	};

	cases.forEach( ( caseItem ) => {
		strictModes.forEach( ( strict ) => {
			const surfaceModel = buildSurface( caseItem.body );

			ve.ui.CitoidReferenceContextItem.static.getConvertibleHref =
				() => ( caseItem.convertible ? 'https://google.com' : null );

			const check = new mw.editcheck.ConvertReferenceEditCheck(
				ve.test.utils.EditCheck.dummyController,
				{ strict },
				true
			);

			const results = check.onDocumentChange( surfaceModel ).filter( Boolean );
			const expected = caseItem.expected[ strict ];
			const message = caseItem.name + ' (strict=' + strict + ')';
			assert.strictEqual( results.length, expected, message );
			if ( expected ) {
				assert.strictEqual( results[ 0 ].getName(), 'convertReference', message + ': name' );
			}
		} );
	} );
} );
