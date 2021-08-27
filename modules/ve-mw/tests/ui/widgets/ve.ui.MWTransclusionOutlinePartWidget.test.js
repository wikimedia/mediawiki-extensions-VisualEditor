QUnit.module( 've.ui.MWTransclusionOutlinePartWidget' );

QUnit.test( 'Constructor', ( assert ) => {
	const transclusion = new ve.dm.MWTransclusionModel(),
		part = new ve.dm.MWTransclusionPartModel( transclusion ),
		widget = new ve.ui.MWTransclusionOutlinePartWidget( part );

	assert.ok( widget );
} );
