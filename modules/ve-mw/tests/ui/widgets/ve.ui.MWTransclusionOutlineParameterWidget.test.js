QUnit.module( 've.ui.MWTransclusionOutlineParameterWidget' );

QUnit.test( 'interprets param with no attributes', ( assert ) => {
	const widget = new ve.ui.MWTransclusionOutlineParameterWidget( {} );

	assert.strictEqual( widget.checkbox.isDisabled(), false );
	assert.strictEqual( widget.checkbox.isSelected(), false );
	assert.strictEqual( widget.checkbox.getTitle(), null );
} );

QUnit.test( 'interprets required param', ( assert ) => {
	const widget = new ve.ui.MWTransclusionOutlineParameterWidget( { required: true } );

	assert.strictEqual( widget.checkbox.isDisabled(), true );
	assert.strictEqual( widget.checkbox.isSelected(), true );
	assert.strictEqual(
		widget.checkbox.getTitle(),
		'visualeditor-dialog-transclusion-required-parameter'
	);
} );

QUnit.test( 'interprets selected param', ( assert ) => {
	const widget = new ve.ui.MWTransclusionOutlineParameterWidget( { selected: true } );

	assert.strictEqual( widget.checkbox.isDisabled(), false );
	assert.strictEqual( widget.checkbox.isSelected(), true );
	assert.strictEqual( widget.checkbox.getTitle(), null );
} );
