QUnit.module( 'mw.editcheck.YearLinkEditCheck', ve.test.utils.newMwEnvironment() );

/**
 * Create a surface with an internal link whose label is the inserted text.
 *
 * @ignore
 * @param {string} targetTitle
 * @param {string} labelText
 * @return {ve.dm.Surface}
 */
function createSurfaceWithInternalLink( targetTitle, labelText ) {
	const doc = ve.dm.example.createExampleDocumentFromData( [
		{ type: 'paragraph' },
		{ type: '/paragraph' },
		{ type: 'internalList' },
		{ type: '/internalList' }
	] );

	const surface = new ve.dm.Surface( doc );
	const title = mw.Title.newFromText( targetTitle );
	const link = ve.dm.MWInternalLinkAnnotation.static.newFromTitle( title );

	surface.getLinearFragment( new ve.Range( 1, 1 ) ).insertContent( labelText ).annotateContent( 'set', link );

	return surface;
}

QUnit.test( 'onDocumentChange', ( assert ) => {
	const cases = [
		{
			name: 'Simple mismatched year',
			targetTitle: '1999',
			labelText: '2003',
			expectedActions: 1,
			expectedTargetYear: '1999',
			expectedLabelYear: '2003'
		},
		{
			name: 'Simple matched year',
			targetTitle: '1999',
			labelText: '1999',
			expectedActions: 0
		},
		{
			name: 'Mismatch with surrounding text',
			targetTitle: '1999 in film',
			labelText: 'films of 2003',
			expectedActions: 1,
			expectedTargetYear: '1999',
			expectedLabelYear: '2003'
		},
		{
			name: 'Multiple years range in target, single year in label',
			targetTitle: 'Season 1999-2000',
			labelText: '2003',
			expectedActions: 0
		},
		{
			name: 'No year in label',
			targetTitle: '2003',
			labelText: 'the year',
			expectedActions: 0
		},
		{
			name: 'No year in target',
			targetTitle: 'page',
			labelText: '2003',
			expectedActions: 0
		},
		{
			name: 'Multiple years in label, single year in target',
			targetTitle: '2003',
			labelText: '2003 and 2004',
			expectedActions: 0
		},
		{
			name: 'Label year only 2 digits',
			targetTitle: '2003',
			labelText: '99',
			expectedActions: 0
		},
		{
			name: 'Target year only 2 digits',
			targetTitle: 'Euro 99',
			labelText: '2003',
			expectedActions: 0
		}
	];

	cases.forEach( ( caseItem ) => {
		const surface = createSurfaceWithInternalLink( caseItem.targetTitle, caseItem.labelText );
		const check = new mw.editcheck.YearLinkEditCheck( ve.test.utils.EditCheck.dummyController, {}, true );
		const actions = check.onDocumentChange( surface ).filter( Boolean );

        const wikilink = '[[' + caseItem.targetTitle + ( caseItem.labelText !== caseItem.targetTitle ? '|' + caseItem.labelText : '' ) + ']]';
        const msg = caseItem.name + ' (' + wikilink + ')';
		assert.strictEqual( actions.length, caseItem.expectedActions, msg );

		if ( caseItem.expectedActions ) {
			const action = actions[ 0 ];
			assert.deepEqual(
				action.getChoices().slice( 0, 2 ).map( ( c ) => c.label ),
				[ 'Use ' + caseItem.expectedTargetYear, 'Use ' + caseItem.expectedLabelYear ],
				msg + ': choices'
			);
		}
	} );
} );
