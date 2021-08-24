QUnit.module( 've.ui.MWTransclusionOutlinePlaceholderWidget' );

QUnit.test( 'Constructor', ( assert ) => {
	const transclusion = new ve.dm.MWTransclusionModel(),
		placeholder = new ve.dm.MWTemplatePlaceholderModel( transclusion ),
		widget = new ve.ui.MWTransclusionOutlinePlaceholderWidget( placeholder );

	assert.ok( widget );
} );
