QUnit.module( 've.ui.MWTransclusionOutlineTemplateWidget' );

QUnit.test( 'Constructor', ( assert ) => {
	const transclusion = new ve.dm.MWTransclusionModel(),
		template = new ve.dm.MWTemplateModel( transclusion, { wt: 'Example' } ),
		widget = new ve.ui.MWTransclusionOutlineTemplateWidget( template );

	assert.strictEqual( widget.getData(), 'part_0' );
	assert.strictEqual(
		widget.$element.find( '.ve-ui-mwTransclusionOutlineButtonWidget' ).text(),
		'Example'
	);
} );
