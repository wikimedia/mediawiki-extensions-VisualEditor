QUnit.module( 've.ui.MWTransclusionOutlineWikitextWidget' );

QUnit.test( 'Constructor', ( assert ) => {
	const transclusion = new ve.dm.MWTransclusionModel(),
		content = new ve.dm.MWTransclusionContentModel( transclusion ),
		widget = new ve.ui.MWTransclusionOutlineWikitextWidget( content );

	assert.ok( widget );
} );
