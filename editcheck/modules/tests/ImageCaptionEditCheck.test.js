QUnit.module( 'mw.editcheck.ImageCaptionEditCheck', ve.test.utils.newEditCheckEnvironment() );

QUnit.test( 'onBranchNodeChange', ( assert ) => {
	const typeFrameImage = ve.copy( ve.dm.mwExample.MWBlockImage.data[ 0 ] );
	typeFrameImage.attributes.type = 'frame';
	const noFrameImage = ve.copy( ve.dm.mwExample.MWBlockImage.data[ 0 ] );
	noFrameImage.attributes.type = 'none';
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
		...[ 'frame', 'none', 'frameless' ].map( ( type ) => {
			const image = ve.copy( ve.dm.mwExample.MWBlockImage.data[ 0 ] );
			image.attributes.type = type;
			return {
				msg: `Empty caption, type=${ type }`,
				data: [
					image,
					{ type: 'mwImageCaption' },
					{ type: 'paragraph', internal: { generated: 'wrapper' } },
					{ type: '/paragraph' },
					{ type: '/mwImageCaption' },
					{ type: '/mwBlockImage' }
				],
				expectedActions: 0
			};
		} ),
		{
			msg: 'Non-empty caption',
			data: ve.copy( ve.dm.mwExample.MWBlockImage.data ),
			expectedActions: 0
		},
		{
			msg: 'Non-empty caption, contents are a block transclusion',
			data: [
				ve.copy( ve.dm.mwExample.MWBlockImage.data[ 0 ] ),
				{ type: 'mwImageCaption' },
				ve.copy( ve.dm.mwExample.MWTransclusion.blockData ),
				{ type: '/mwTransclusionBlock' },
				{ type: '/mwImageCaption' },
				{ type: '/mwBlockImage' }
			],
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

QUnit.test( 'onBranchNodeChange skips images tagged as freshly-added', ( assert ) => {
	const doc = ve.dm.mwExample.createExampleDocumentFromData( [
		ve.copy( ve.dm.mwExample.MWBlockImage.data[ 0 ] ),
		{ type: 'mwImageCaption' },
		{ type: 'paragraph', internal: { generated: 'wrapper' } },
		{ type: '/paragraph' },
		{ type: '/mwImageCaption' },
		{ type: '/mwBlockImage' },
		{ type: 'internalList' },
		{ type: '/internalList' }
	] );
	const surface = new ve.dm.Surface( doc );
	const image = doc.getDocumentNode().children[ 0 ];

	const controller = { taggedFragments: {}, getTarget: () => ve.init.target };
	const check = new mw.editcheck.ImageCaptionEditCheck( controller, {}, true );

	assert.strictEqual(
		check.onBranchNodeChange( surface ).length, 1,
		'Untagged empty-caption image is flagged'
	);

	// Simulate SuggestedImageEditCheck having ephemerally tagged the just-added image.
	controller.taggedFragments[ mw.editcheck.SuggestedImageEditCheck.static.name ] = {
		newImage: [ surface.getLinearFragment( image.getOuterRange() ) ]
	};

	assert.strictEqual(
		check.onBranchNodeChange( surface ).length, 0,
		'Tagged image is skipped on branch-node change'
	);
	assert.strictEqual(
		check.onBeforeSave( surface ).length, 1,
		'onBeforeSave ignores the tag (pre-save safety net still fires)'
	);
} );
