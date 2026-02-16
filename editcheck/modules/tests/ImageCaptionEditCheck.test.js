QUnit.module( 'mw.editcheck.ImageCaptionEditCheck', ve.test.utils.newMwEnvironment() );

QUnit.test( 'onBranchNodeChange', ( assert ) => {
	const cases = [
		{
			msg: 'Empty caption',
			data: [
				ve.copy( ve.dm.mwExample.MWBlockImage.data[ 0 ] ),
				{ type: 'mwImageCaption' },
				{ type: 'paragraph', internal: { generated: 'wrapper' } },
				{ type: '/paragraph' },
				{ type: '/mwImageCaption' },
				{ type: '/mwBlockImage' }
			],
			expectedActions: 1
		},
		{
			msg: 'Non-empty caption',
			data: ve.copy( ve.dm.mwExample.MWBlockImage.data ),
			expectedActions: 0
		}
	];

	cases.forEach( ( caseItem ) => {
		const doc = ve.dm.mwExample.createExampleDocumentFromData( [
			...caseItem.data,
			{ type: 'internalList' },
			{ type: '/internalList' }
		] );
		const surface = new ve.dm.Surface( doc );

		const check = new mw.editcheck.ImageCaptionEditCheck( ve.test.utils.EditCheck.dummyController, {}, true );
		const actions = check.onBranchNodeChange( surface );

		assert.strictEqual( actions.length, caseItem.expectedActions, caseItem.msg );
		if ( actions.length > 0 ) {
			assert.strictEqual( actions[ 0 ].getName(), 'imageCaption', 'Action name' );
		}
	} );
} );
