QUnit.module( 've.ui.MWTransclusionOutlineTemplateWidget' );

QUnit.test( 'Constructor', ( assert ) => {
	const transclusion = new ve.dm.MWTransclusionModel(),
		template = new ve.dm.MWTemplateModel( transclusion, {} ),
		widget = new ve.ui.MWTransclusionOutlineTemplateWidget( template );

	assert.ok( widget );
} );
