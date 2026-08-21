QUnit.module( 'mw.editcheck.GutterSidebarEditCheckDialog', ve.test.utils.newEditCheckEnvironment() );

QUnit.test( 'onPosition hides suggestions', ( assert ) => {
	const actions = ve.test.utils.EditCheck.makeDisplayActions();
	const calls = [];
	const dialog = {
		controller: ve.test.utils.EditCheck.makeHidingController( actions ),
		renderActions: ( rendered, renderedNew ) => calls.push( [ rendered, renderedNew ] )
	};

	ve.ui.GutterSidebarEditCheckDialog.prototype.onPosition.call( dialog );

	assert.strictEqual( calls.length, 1, 'The actions are rendered once' );
	assert.deepEqual(
		ve.test.utils.EditCheck.actionIds( calls[ 0 ][ 0 ] ),
		[ 'warning' ],
		'A redraw does not put a hidden suggestion back'
	);
} );

QUnit.test( 'onActionsUpdated hides suggestions', ( assert ) => {
	const actions = ve.test.utils.EditCheck.makeDisplayActions();
	const calls = [];
	const dialog = {
		inBeforeSave: false,
		controller: ve.test.utils.EditCheck.makeHidingController( actions ),
		renderActions: ( rendered, renderedNew ) => calls.push( [ rendered, renderedNew ] )
	};

	ve.ui.GutterSidebarEditCheckDialog.prototype.onActionsUpdated.call(
		dialog, 'onDocumentChange', actions, actions
	);

	assert.strictEqual( calls.length, 1, 'The actions are rendered once' );
	assert.deepEqual(
		ve.test.utils.EditCheck.actionIds( calls[ 0 ][ 0 ] ),
		[ 'warning' ],
		'The action list is filtered'
	);
	assert.deepEqual(
		ve.test.utils.EditCheck.actionIds( calls[ 0 ][ 1 ] ),
		[ 'warning' ],
		'The new action list is filtered'
	);
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
