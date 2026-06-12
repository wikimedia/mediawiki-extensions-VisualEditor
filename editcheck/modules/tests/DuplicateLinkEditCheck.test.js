QUnit.module( 'mw.editcheck.DuplicateLinkEditCheck', ve.test.utils.newEditCheckEnvironment( {
	config: {
		wgRelevantPageName: 'Test_page'
	}
} ) );

QUnit.test( 'onDocumentChange', ( assert ) => {
	const link = ( label, title ) => ve.dm.example.annotateText(
		label,
		ve.dm.MWInternalLinkAnnotation.static.dataElementFromTitle( mw.Title.newFromText( title ) )
	);

	const cases = [
		{
			msg: 'Two identical links in separate paragraphs (paragraph scope)',
			config: {
				scope: 'paragraph'
			},
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
			config: {
				scope: 'section'
			},
			data: [
				{ type: 'paragraph' },
				...link( 'alpha', 'Foo' ),
				{ type: '/paragraph' },
				{ type: 'paragraph' },
				...link( 'beta', 'Foo' ),
				{ type: '/paragraph' }
			],
			expectedActions: 1,
			expectedModes: [ '' ],
			expectedHighlights: 2
		},
		{
			msg: 'Fragment self links are ignored when ignoreFragmentSelfLinks is set (T422190)',
			config: {
				scope: 'section',
				ignoreFragmentSelfLinks: true
			},
			data: [
				{ type: 'paragraph' },
				...link( 'alpha', 'Test page#Foo' ),
				{ type: '/paragraph' },
				{ type: 'paragraph' },
				...link( 'beta', 'Test page#Foo' ),
				{ type: '/paragraph' }
			],
			expectedActions: 0
		},
		{
			msg: 'Self links are detected when ignoreFragmentSelfLinks is set',
			config: {
				scope: 'section',
				ignoreFragmentSelfLinks: true
			},
			data: [
				{ type: 'paragraph' },
				...link( 'alpha', 'Test page' ),
				{ type: '/paragraph' },
				{ type: 'paragraph' },
				...link( 'beta', 'Test page' ),
				{ type: '/paragraph' }
			],
			expectedActions: 1,
			expectedModes: [ '' ],
			expectedHighlights: 2
		},
		{
			msg: 'Two identical links in the same paragraph (paragraph scope)',
			config: {
				scope: 'paragraph'
			},
			data: [
				{ type: 'paragraph' },
				...link( 'alpha', 'Foo' ),
				'-',
				...link( 'beta', 'Foo' ),
				{ type: '/paragraph' }
			],
			expectedActions: 1,
			expectedModes: [ '' ],
			expectedHighlights: 2
		},
		{
			msg: 'Adjacent identical links separated by whitespace',
			config: {
				scope: 'paragraph'
			},
			data: [
				{ type: 'paragraph' },
				...link( 'alpha', 'Foo' ),
				' ',
				...link( 'beta', 'Foo' ),
				{ type: '/paragraph' }
			],
			expectedActions: 1,
			expectedActionName: 'duplicateLink-adjacent',
			expectedModes: [ 'adjacent' ],
			expectedHighlights: 2
		},
		{
			msg: 'Four identical links in the same paragraph (paragraph scope)',
			config: {
				scope: 'paragraph'
			},
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
			expectedModes: [ '', '', '' ],
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

		const check = new mw.editcheck.DuplicateLinkEditCheck( ve.test.utils.EditCheck.dummyController, caseItem.config, true );
		const actions = check.onDocumentChange( surface );

		assert.strictEqual( actions.length, caseItem.expectedActions, caseItem.msg );
		if ( actions.length > 0 ) {
			assert.strictEqual( actions[ 0 ].getName(), caseItem.expectedActionName || 'duplicateLink', caseItem.msg + ': Action name' );
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

QUnit.test( 'act (merge)', ( assert ) => {
	const linkFoo = () => ve.dm.MWInternalLinkAnnotation.static.dataElementFromTitle( mw.Title.newFromText( 'Foo' ) );
	// Parsoid puts a different id on each element, so two runs of '' give equal
	// annotations which are not identical. These cases keep that difference,
	// because it decides whether the merge can work. (T437749)
	const italic = ( id ) => ve.extendObject( {}, ve.dm.example.italic, {
		originalDomElements: $.parseHTML( '<i id="' + id + '"></i>' )
	} );
	const text = ve.dm.example.annotateText;
	const countLinkElements = ( documentModel ) => ve.dm.converter.getDomFromModel( documentModel ).body.getElementsByTagName( 'a' ).length;

	const cases = [
		{
			msg: 'Adjacent links inside one italic run, the second with its own italic (T437749)',
			data: [
				{ type: 'paragraph' },
				...'x ',
				...text( 'y, ', italic( 'i1' ) ),
				...text( 'one', [ italic( 'i1' ), linkFoo() ] ),
				' ',
				...text( 'two', [ linkFoo(), italic( 'i2' ) ] ),
				...' z',
				{ type: '/paragraph' }
			],
			expectedActions: 1,
			expectedModes: [ 'adjacent' ],
			expectedTextAfterMerge: 'one two'
		},
		{
			msg: 'Adjacent links with no annotations',
			data: [
				{ type: 'paragraph' },
				...'x ',
				...text( 'one', linkFoo() ),
				' ',
				...text( 'two', linkFoo() ),
				...' z',
				{ type: '/paragraph' }
			],
			expectedActions: 1,
			expectedModes: [ 'adjacent' ],
			expectedTextAfterMerge: 'one two'
		},
		{
			msg: 'Adjacent links, only the first inside a bold run: the merge needs a visible change, so show nothing (T437749)',
			data: [
				{ type: 'paragraph' },
				...'x ',
				...text( 'y ', ve.dm.example.bold ),
				...text( 'one', [ ve.dm.example.bold, linkFoo() ] ),
				' ',
				...text( 'two', linkFoo() ),
				...' z',
				{ type: '/paragraph' }
			],
			expectedActions: 0
		},
		{
			msg: 'Links separated by text are not adjacent, so the merge is not offered',
			data: [
				{ type: 'paragraph' },
				...'x ',
				...text( 'one', linkFoo() ),
				...' and ',
				...text( 'two', linkFoo() ),
				...' z',
				{ type: '/paragraph' }
			],
			expectedActions: 1,
			expectedModes: [ '' ]
		}
	];

	cases.forEach( ( caseItem ) => {
		const documentModel = ve.dm.example.createExampleDocumentFromData( [
			...caseItem.data,
			{ type: 'internalList' },
			{ type: '/internalList' }
		] );
		const surfaceModel = new ve.dm.Surface( documentModel );
		const surface = ve.test.utils.createModelOnlySurface( surfaceModel );

		const check = new mw.editcheck.DuplicateLinkEditCheck(
			ve.test.utils.EditCheck.dummyController, { scope: 'paragraph' }, true
		);
		const actions = check.onDocumentChange( surfaceModel );

		assert.strictEqual( actions.length, caseItem.expectedActions, caseItem.msg );
		if ( actions.length ) {
			assert.deepEqual(
				actions.map( ( action ) => action.mode ),
				caseItem.expectedModes,
				caseItem.msg + ': Action mode'
			);
		}

		if ( actions.length && caseItem.expectedTextAfterMerge ) {
			assert.strictEqual( countLinkElements( documentModel ), 2, caseItem.msg + ': Two link elements before the merge' );

			check.act( 'merge', actions[ 0 ], surface );

			const merged = documentModel.getDocumentNode().getAnnotationRanges().filter(
				( annRange ) => annRange.annotation.name === ve.dm.MWInternalLinkAnnotation.static.name
			);
			assert.strictEqual( merged.length, 1, caseItem.msg + ': One link annotation range after the merge' );
			assert.strictEqual(
				documentModel.data.getText( true, merged[ 0 ].range ),
				caseItem.expectedTextAfterMerge,
				caseItem.msg + ': Text of the merged link'
			);
			// The check comes back for ever if the merge does not change the page
			assert.strictEqual( countLinkElements( documentModel ), 1, caseItem.msg + ': One link element after the merge' );
			assert.strictEqual(
				check.onDocumentChange( surfaceModel ).length, 0,
				caseItem.msg + ': No action after the merge'
			);
		}
	} );
} );
