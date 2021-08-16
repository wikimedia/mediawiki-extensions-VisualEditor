( function () {
	QUnit.module( 've.ui.MWTemplateOutlineParameterCheckboxLayout', ve.test.utils.mwEnvironment );

	QUnit.test( 'interprets param with no attributes', ( assert ) => {
		const layout = new ve.ui.MWTemplateOutlineParameterCheckboxLayout( {} );

		assert.strictEqual( layout.checkbox.isDisabled(), false );
		assert.strictEqual( layout.checkbox.isSelected(), false );
		assert.strictEqual( layout.checkbox.getTitle(), null );
	} );

	QUnit.test( 'interprets required param', ( assert ) => {
		const layout = new ve.ui.MWTemplateOutlineParameterCheckboxLayout( { required: true } );

		assert.strictEqual( layout.checkbox.isDisabled(), true );
		assert.strictEqual( layout.checkbox.isSelected(), true );
		assert.notStrictEqual( layout.checkbox.getTitle(), null );
	} );

	QUnit.test( 'interprets selected param', ( assert ) => {
		const layout = new ve.ui.MWTemplateOutlineParameterCheckboxLayout( { selected: true } );

		assert.strictEqual( layout.checkbox.isDisabled(), false );
		assert.strictEqual( layout.checkbox.isSelected(), true );
		assert.strictEqual( layout.checkbox.getTitle(), null );
	} );
}() );
