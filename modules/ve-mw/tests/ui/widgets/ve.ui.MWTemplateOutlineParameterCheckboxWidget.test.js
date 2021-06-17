( function () {
	QUnit.module( 've.ui.MWTemplateOutlineParameterCheckboxWidget', ve.test.utils.mwEnvironment );

	QUnit.test( 'interprets param with no attributes', ( assert ) => {
		const widget = new ve.ui.MWTemplateOutlineParameterCheckboxWidget( {} );

		assert.strictEqual( widget.fieldWidget.disabled, false );
		assert.strictEqual( widget.fieldWidget.selected, false );
		assert.strictEqual( widget.fieldWidget.title, null );
	} );

	QUnit.test( 'interprets required param', ( assert ) => {
		const widget = new ve.ui.MWTemplateOutlineParameterCheckboxWidget( { required: true } );

		assert.strictEqual( widget.fieldWidget.disabled, true );
		assert.strictEqual( widget.fieldWidget.selected, true );
		assert.notStrictEqual( widget.fieldWidget.title, null );
	} );

	QUnit.test( 'interprets included param', ( assert ) => {
		const widget = new ve.ui.MWTemplateOutlineParameterCheckboxWidget( { selected: true } );

		assert.strictEqual( widget.fieldWidget.disabled, false );
		assert.strictEqual( widget.fieldWidget.selected, true );
		assert.strictEqual( widget.fieldWidget.title, null );
	} );
}() );
