( function () {
	QUnit.module( 've.ui.MWTemplateOutlineParameterCheckboxLayout', ve.test.utils.mwEnvironment );

	QUnit.test( 'interprets param with no attributes', ( assert ) => {
		const layout = new ve.ui.MWTemplateOutlineParameterCheckboxLayout( {} );

		assert.strictEqual( layout.fieldWidget.disabled, false );
		assert.strictEqual( layout.fieldWidget.selected, false );
		assert.strictEqual( layout.fieldWidget.title, null );
	} );

	QUnit.test( 'interprets required param', ( assert ) => {
		const layout = new ve.ui.MWTemplateOutlineParameterCheckboxLayout( { required: true } );

		assert.strictEqual( layout.fieldWidget.disabled, true );
		assert.strictEqual( layout.fieldWidget.selected, true );
		assert.notStrictEqual( layout.fieldWidget.title, null );
	} );

	QUnit.test( 'interprets included param', ( assert ) => {
		const layout = new ve.ui.MWTemplateOutlineParameterCheckboxLayout( { selected: true } );

		assert.strictEqual( layout.fieldWidget.disabled, false );
		assert.strictEqual( layout.fieldWidget.selected, true );
		assert.strictEqual( layout.fieldWidget.title, null );
	} );
}() );
