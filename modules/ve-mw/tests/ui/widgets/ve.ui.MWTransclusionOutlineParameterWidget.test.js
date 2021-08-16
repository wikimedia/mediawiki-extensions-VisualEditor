( function () {
	QUnit.module( 've.ui.MWTransclusionOutlineParameterWidget', ve.test.utils.mwEnvironment );

	QUnit.test( 'interprets param with no attributes', ( assert ) => {
		const layout = new ve.ui.MWTransclusionOutlineParameterWidget( {} );

		assert.strictEqual( layout.checkbox.isDisabled(), false );
		assert.strictEqual( layout.checkbox.isSelected(), false );
		assert.strictEqual( layout.checkbox.getTitle(), null );
	} );

	QUnit.test( 'interprets required param', ( assert ) => {
		const layout = new ve.ui.MWTransclusionOutlineParameterWidget( { required: true } );

		assert.strictEqual( layout.checkbox.isDisabled(), true );
		assert.strictEqual( layout.checkbox.isSelected(), true );
		assert.notStrictEqual( layout.checkbox.getTitle(), null );
	} );

	QUnit.test( 'interprets selected param', ( assert ) => {
		const layout = new ve.ui.MWTransclusionOutlineParameterWidget( { selected: true } );

		assert.strictEqual( layout.checkbox.isDisabled(), false );
		assert.strictEqual( layout.checkbox.isSelected(), true );
		assert.strictEqual( layout.checkbox.getTitle(), null );
	} );
}() );
