QUnit.module( 'mw.editcheck.FakeHeadingsEditCheck', ve.test.utils.newMwEnvironment() );

QUnit.test( 'onDocumentChange', ( assert ) => {
	const cases = [
		{
			msg: 'Bold paragraph at root',
			data: [
				{ type: 'paragraph' },
				...ve.dm.example.annotateText( 'Fake heading', ve.dm.example.bold ),
				{ type: '/paragraph' }
			],
			expectedActions: 1
		},
		{
			msg: 'Plain paragraph at root',
			data: [
				{ type: 'paragraph' },
				...'Not a heading',
				{ type: '/paragraph' }
			],
			expectedActions: 0
		},
		{
			msg: 'Bold paragraph inside heading',
			data: [
				{ type: 'mwHeading', attributes: { level: 2 } },
				{ type: 'paragraph' },
				...ve.dm.example.annotateText( 'Real heading', ve.dm.example.bold ),
				{ type: '/paragraph' },
				{ type: '/mwHeading' }
			],
			expectedActions: 0
		},
		{
			msg: 'Bold paragraph inside table cell',
			data: [
				{ type: 'table' },
				{ type: 'tableSection', attributes: { style: 'body' } },
				{ type: 'tableRow' },
				{ type: 'tableCell', attributes: { style: 'data' } },
				{ type: 'paragraph' },
				...ve.dm.example.annotateText( 'Bold cell', ve.dm.example.bold ),
				{ type: '/paragraph' },
				{ type: '/tableCell' },
				{ type: '/tableRow' },
				{ type: '/tableSection' },
				{ type: '/table' }
			],
			expectedActions: 0
		}
	];

	cases.forEach( ( caseItem ) => {
		const doc = ve.dm.example.createExampleDocumentFromData( [
			...caseItem.data,
			{ type: 'internalList' },
			{ type: '/internalList' }
		] );

		const surface = new ve.dm.Surface( doc );
		const check = new mw.editcheck.FakeHeadingsEditCheck( ve.test.utils.EditCheck.dummyController, {}, true );
		const actions = check.onDocumentChange( surface );

		assert.strictEqual( actions.length, caseItem.expectedActions, caseItem.msg );
		if ( caseItem.expectedActions > 0 ) {
			assert.strictEqual( actions[ 0 ].getName(), 'fakeHeadings', caseItem.msg + ': Action name' );
		}
	} );
} );
