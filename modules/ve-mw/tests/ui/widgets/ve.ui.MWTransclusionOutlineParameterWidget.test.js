QUnit.module( 've.ui.MWTransclusionOutlineParameterWidget' );

QUnit.test( 'interprets param with no attributes', ( assert ) => {
	const widget = new ve.ui.MWTransclusionOutlineParameterWidget( {} );

	assert.notOk( widget.checkbox.isDisabled() );
	assert.notOk( widget.checkbox.isSelected() );
	assert.strictEqual( widget.checkbox.getTitle(), null );
} );

QUnit.test( 'interprets required param', ( assert ) => {
	const widget = new ve.ui.MWTransclusionOutlineParameterWidget( { required: true } );

	assert.ok( widget.checkbox.isDisabled() );
	assert.ok( widget.checkbox.isSelected() );
	assert.strictEqual(
		widget.checkbox.getTitle(),
		'visualeditor-dialog-transclusion-required-parameter'
	);
} );

QUnit.test( 'interprets selected param', ( assert ) => {
	const widget = new ve.ui.MWTransclusionOutlineParameterWidget( { selected: true } );

	assert.notOk( widget.checkbox.isDisabled() );
	assert.ok( widget.checkbox.isSelected() );
	assert.strictEqual( widget.checkbox.getTitle(), null );
} );
