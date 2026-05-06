QUnit.module( 'mw.editcheck.DuplicateLinkEditCheck', ve.test.utils.newEditCheckEnvironment() );

QUnit.test( 'onDocumentChange', ( assert ) => {
	const link = ( label, title ) => ve.dm.example.annotateText(
		label,
		ve.dm.MWInternalLinkAnnotation.static.dataElementFromTitle( mw.Title.newFromText( title ) )
	);

	const cases = [
		{
			msg: 'Two identical links in separate paragraphs (paragraph scope)',
			scope: 'paragraph',
			data: [
				{ type: 'paragraph' },
				...link( 'alpha', 'Foo' ),
				{ type: '/paragraph' },
				{ type: 'paragraph' },
				...link( 'beta', 'Foo' ),
				{ type: '/paragraph' }
			],
			expectedActions: 0
		},
		{
			msg: 'Two identical links in separate paragraphs (section scope)',
			scope: 'section',
			data: [
				{ type: 'paragraph' },
				...link( 'alpha', 'Foo' ),
				{ type: '/paragraph' },
				{ type: 'paragraph' },
				...link( 'beta', 'Foo' ),
				{ type: '/paragraph' }
			],
			expectedActions: 1,
			expectedModes: [ 'duplicate' ],
			expectedHighlights: 2
		},
		{
			msg: 'Two identical links in the same paragraph (paragraph scope)',
			scope: 'paragraph',
			data: [
				{ type: 'paragraph' },
				...link( 'alpha', 'Foo' ),
				'-',
				...link( 'beta', 'Foo' ),
				{ type: '/paragraph' }
			],
			expectedActions: 1,
			expectedModes: [ 'duplicate' ],
			expectedHighlights: 2
		},
		{
			msg: 'Adjacent identical links separated by whitespace',
			scope: 'paragraph',
			data: [
				{ type: 'paragraph' },
				...link( 'alpha', 'Foo' ),
				' ',
				...link( 'beta', 'Foo' ),
				{ type: '/paragraph' }
			],
			expectedActions: 1,
			expectedModes: [ 'adjacent' ],
			expectedHighlights: 2
		},
		{
			msg: 'Four identical links in the same paragraph (paragraph scope)',
			scope: 'paragraph',
			data: [
				{ type: 'paragraph' },
				...link( 'alpha', 'Foo' ),
				'-',
				...link( 'beta', 'Foo' ),
				'-',
				...link( 'gamma', 'Foo' ),
				'-',
				...link( 'delta', 'Foo' ),
				{ type: '/paragraph' }
			],
			expectedActions: 3,
			expectedModes: [ 'duplicate', 'duplicate', 'duplicate' ],
			expectedHighlights: 4
		}
	];

	cases.forEach( ( caseItem ) => {
		const doc = ve.dm.example.createExampleDocumentFromData( [
			...caseItem.data,
			{ type: 'internalList' },
			{ type: '/internalList' }
		] );
		const surface = new ve.dm.Surface( doc );

		const check = new mw.editcheck.DuplicateLinkEditCheck( ve.test.utils.EditCheck.dummyController, { scope: caseItem.scope }, true );
		const actions = check.onDocumentChange( surface );

		assert.strictEqual( actions.length, caseItem.expectedActions, caseItem.msg );
		if ( actions.length > 0 ) {
			assert.strictEqual( actions[ 0 ].getName(), 'duplicateLink', caseItem.msg + ': Action name' );
			assert.strictEqual( actions[ 0 ].fragments.length, caseItem.expectedHighlights, caseItem.msg + ': Highlight' );
			assert.deepEqual( actions.map( ( action ) => action.mode ), caseItem.expectedModes, caseItem.msg + ': Action mode' );
		}
		if ( actions.length > 1 ) {
			// Assert that all pairs of actions are not equal
			for ( let i = 0; i < actions.length; i++ ) {
				for ( let j = i + 1; j < actions.length; j++ ) {
					assert.false( actions[ i ].equals( actions[ j ] ), caseItem.msg + ': Actions are not equal to each other, despite having the same fragments (but in different orders)' );
				}
			}
		}
	} );
} );
