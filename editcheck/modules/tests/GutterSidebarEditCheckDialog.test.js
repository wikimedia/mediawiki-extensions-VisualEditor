QUnit.module( 'mw.editcheck.GutterSidebarEditCheckDialog', ve.test.utils.newEditCheckEnvironment() );

QUnit.test( 'onPosition renders the current actions', ( assert ) => {
	const calls = [];
	const dialog = {
		renderActions: ( ...args ) => calls.push( args )
	};

	ve.ui.GutterSidebarEditCheckDialog.prototype.onPosition.call( dialog );

	assert.deepEqual( calls, [ [] ], 'The actions are rendered once, with no new actions' );
} );

QUnit.test( 'onActionsUpdated renders the current actions', ( assert ) => {
	const actions = ve.test.utils.EditCheck.makeDisplayActions();
	const calls = [];
	const dialog = {
		inBeforeSave: false,
		renderActions: ( ...args ) => calls.push( args )
	};

	ve.ui.GutterSidebarEditCheckDialog.prototype.onActionsUpdated.call(
		dialog, 'onDocumentChange', actions, actions
	);

	assert.deepEqual( calls, [ [ actions ] ], 'The actions are rendered once, with the new actions' );
} );

QUnit.test( 'onActionsUpdated ignores the other mode', ( assert ) => {
	const actions = ve.test.utils.EditCheck.makeDisplayActions();
	const cases = [
		{
			msg: 'A mid-edit dialog ignores a pre-save update',
			inBeforeSave: false,
			listener: 'onBeforeSave'
		},
		{
			msg: 'A pre-save dialog ignores a mid-edit update',
			inBeforeSave: true,
			listener: 'onDocumentChange'
		}
	];

	cases.forEach( ( caseItem ) => {
		const calls = [];
		const dialog = {
			inBeforeSave: caseItem.inBeforeSave,
			controller: ve.test.utils.EditCheck.makeHidingController( actions ),
			renderActions: ( rendered ) => calls.push( rendered )
		};

		ve.ui.GutterSidebarEditCheckDialog.prototype.onActionsUpdated.call(
			dialog, caseItem.listener, actions, actions
		);

		assert.strictEqual( calls.length, 0, caseItem.msg );
	} );
} );
