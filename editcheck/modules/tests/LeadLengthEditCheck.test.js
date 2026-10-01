QUnit.module( 'mw.editcheck.LeadLengthEditCheck', ve.test.utils.newEditCheckEnvironment() );

{
	const paragraph = ( text ) => [ { type: 'paragraph' }, ...text, { type: '/paragraph' } ];
	const heading = ( text ) => [ { type: 'mwHeading', attributes: { level: 2 } }, ...text, { type: '/mwHeading' } ];
	const internalList = [ { type: 'internalList' }, { type: '/internalList' } ];

	QUnit.test( 'countWords', ( assert ) => {
		const countWords = mw.editcheck.LeadLengthEditCheck.static.countWords.bind( mw.editcheck.LeadLengthEditCheck.static );
		assert.strictEqual( countWords( 'One two  three.', 'en' ), 3, 'Punctuation and extra spaces are not words' );
		assert.strictEqual( countWords( '', 'en' ), 0, 'Empty string' );
	} );

	QUnit.test( 'onBranchNodeChange', ( assert ) => {
		const cases = [
			{
				msg: 'Lead longer than the maximum',
				data: [ ...paragraph( 'one two three' ), ...paragraph( 'four' ), ...heading( 'Heading' ), ...paragraph( 'x' ) ],
				expectedActions: 1,
				expectedRange: new ve.Range( 1, 20 )
			},
			{
				msg: 'Lead at the maximum',
				data: [ ...paragraph( 'one two three' ), ...heading( 'Heading' ), ...paragraph( 'four five six seven' ) ],
				expectedActions: 0
			},
			{
				msg: 'No headings, so no lead section',
				data: [ ...paragraph( 'one two three four five' ) ],
				expectedActions: 0
			},
			{
				msg: 'Paragraphs inside lists do not count',
				data: [
					...paragraph( 'one two' ),
					{ type: 'list', attributes: { style: 'bullet' } },
					{ type: 'listItem' },
					...paragraph( 'three four five' ),
					{ type: '/listItem' },
					{ type: '/list' },
					...heading( 'Heading' )
				],
				expectedActions: 0
			}
		];
		cases.forEach( ( caseItem ) => {
			const doc = ve.dm.example.createExampleDocumentFromData( [ ...caseItem.data, ...internalList ] );
			const surface = new ve.dm.Surface( doc );
			const controller = { taggedFragments: {}, taggedIds: {} };
			const check = new mw.editcheck.LeadLengthEditCheck( controller, { maximumWords: 3 }, true );
			const actions = check.onBranchNodeChange( surface );

			assert.strictEqual( actions.length, caseItem.expectedActions, caseItem.msg );
			if ( caseItem.expectedRange ) {
				assert.strictEqual( actions[ 0 ].getName(), 'leadLength', caseItem.msg + ': action name' );
				assert.equalRange( actions[ 0 ].fragments[ 0 ].getSelection().getRange(), caseItem.expectedRange, caseItem.msg + ': range' );
			}
		} );
	} );

	QUnit.test( 'Check mode and dismissal', ( assert ) => {
		const doc = ve.dm.example.createExampleDocumentFromData( [
			...paragraph( 'one two three four' ), ...heading( 'Heading' ), ...paragraph( 'x' ), ...internalList
		] );
		const surface = new ve.dm.Surface( doc );
		const controller = { taggedFragments: {}, taggedIds: {} };

		const check = new mw.editcheck.LeadLengthEditCheck( controller, { maximumWords: 3 }, false );
		assert.strictEqual( check.onBranchNodeChange( surface ).length, 0, 'Check mode ignores an unmodified lead' );

		surface.getLinearFragment( new ve.Range( 30 ) ).insertContent( 'y' );
		assert.strictEqual( check.onBranchNodeChange( surface ).length, 0, 'Check mode ignores edits outside the lead' );

		surface.getLinearFragment( new ve.Range( 1 ) ).insertContent( 'zero ' );
		const actions = check.onBranchNodeChange( surface );
		assert.strictEqual( actions.length, 1, 'Check mode shows the check for an edit to the lead' );

		check.dismiss( actions[ 0 ] );
		surface.getLinearFragment( new ve.Range( 1 ) ).insertContent( 'more ' );
		assert.strictEqual( check.onBranchNodeChange( surface ).length, 0, 'Dismissal holds after the lead grows' );
	} );
}
