QUnit.module( 'mw.editcheck.DuplicateLinksEditCheck', ve.test.utils.newMwEnvironment() );

function getLinksData( links ) {
	// eslint-disable-next-line es-x/no-array-prototype-flat
	return links.flatMap( ( linkItem ) => [
		...ve.dm.example.annotateText(
			linkItem.labelText,
			ve.dm.MWInternalLinkAnnotation.static.dataElementFromTitle( mw.Title.newFromText( linkItem.targetTitle ) )
		),
		'-'
	] );
}

QUnit.test( 'onDocumentChange', ( assert ) => {
	const cases = [
		{
			msg: 'Two identical links in separate paragraphs (paragraph scope)',
			scope: 'paragraph',
			data: [
				{ type: 'paragraph' },
				...getLinksData( [
					{ targetTitle: 'Foo', labelText: 'alpha' }
				] ),
				{ type: '/paragraph' },
				{ type: 'paragraph' },
				...getLinksData( [
					{ targetTitle: 'Foo', labelText: 'beta' }
				] ),
				{ type: '/paragraph' }
			],
			expectedActions: 0
		},
		{
			msg: 'Two identical links in separate paragraphs (section scope)',
			scope: 'section',
			data: [
				{ type: 'paragraph' },
				...getLinksData( [
					{ targetTitle: 'Foo', labelText: 'alpha' }
				] ),
				{ type: '/paragraph' },
				{ type: 'paragraph' },
				...getLinksData( [
					{ targetTitle: 'Foo', labelText: 'beta' }
				] ),
				{ type: '/paragraph' }
			],
			expectedActions: 1,
			expectedHighlights: 2
		},
		{
			msg: 'Two identical links in the same paragraph (paragraph scope)',
			scope: 'paragraph',
			data: [
				{ type: 'paragraph' },
				...getLinksData( [
					{ targetTitle: 'Foo', labelText: 'alpha' },
					{ targetTitle: 'Foo', labelText: 'beta' }
				] ),
				{ type: '/paragraph' }
			],
			expectedActions: 1,
			expectedHighlights: 2
		},
		{
			msg: 'Three identical links in the same paragraph (paragraph scope)',
			scope: 'paragraph',
			data: [
				{ type: 'paragraph' },
				...getLinksData( [
					{ targetTitle: 'Foo', labelText: 'alpha' },
					{ targetTitle: 'Foo', labelText: 'beta' },
					{ targetTitle: 'Foo', labelText: 'gamma' }
				] ),
				{ type: '/paragraph' }
			],
			expectedActions: 2,
			expectedHighlights: 3
		}
	];

	cases.forEach( ( caseItem ) => {
		const doc = ve.dm.example.createExampleDocumentFromData( [
			...caseItem.data,
			{ type: 'internalList' },
			{ type: '/internalList' }
		] );
		const surface = new ve.dm.Surface( doc );

		const check = new mw.editcheck.DuplicateLinksEditCheck( ve.test.utils.EditCheck.dummyController, { scope: caseItem.scope }, true );
		const actions = check.onDocumentChange( surface );

		assert.strictEqual( actions.length, caseItem.expectedActions, caseItem.msg );
		if ( actions.length > 0 ) {
			assert.strictEqual( actions[ 0 ].getName(), 'duplicateLink', 'Action name' );
			assert.strictEqual( actions[ 0 ].fragments.length, caseItem.expectedHighlights, 'Highlight' );
		}
	} );
} );
