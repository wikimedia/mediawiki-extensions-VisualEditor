QUnit.module( 'mw.editcheck.EditCheckDialog', ve.test.utils.newEditCheckEnvironment() );

QUnit.test( 'onActionsUpdated hides suggestions', ( assert ) => {
	const actions = ve.test.utils.EditCheck.makeDisplayActions();
	const calls = [];
	const dialog = {
		inBeforeSave: false,
		controller: ve.test.utils.EditCheck.makeHidingController( actions ),
		showActions: ( shown, shownNew, rejected ) => calls.push( [ shown, shownNew, rejected ] )
	};

	ve.ui.EditCheckDialog.prototype.onActionsUpdated.call(
		dialog, 'onDocumentChange', actions, actions, [], false
	);

	assert.strictEqual( calls.length, 1, 'The actions are shown once' );
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
