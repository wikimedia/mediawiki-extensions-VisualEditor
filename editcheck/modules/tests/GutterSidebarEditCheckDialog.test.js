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

QUnit.test( 'onActionsUpdatedProgress renders a streamed action', ( assert ) => {
	const [ action ] = ve.test.utils.EditCheck.makeDisplayActions();
	const cases = [
		{ msg: 'A new streamed action is rendered', listener: 'onDocumentChange', oldAction: null, expected: 1 },
		{ msg: 'An update to a shown action waits for all checks to finish', listener: 'onDocumentChange', oldAction: action, expected: 0 },
		{ msg: 'An action from the other mode is ignored', listener: 'onBeforeSave', oldAction: null, expected: 0 }
	];
	cases.forEach( ( caseItem ) => {
		let renders = 0;
		const dialog = {
			inBeforeSave: false,
			renderActionsDebounced: () => renders++
		};
		ve.ui.GutterSidebarEditCheckDialog.prototype.onActionsUpdatedProgress.call(
			dialog, caseItem.listener, action, caseItem.oldAction
		);
		assert.strictEqual( renders, caseItem.expected, caseItem.msg );
	} );
} );

QUnit.test( 'findReusableWidget', ( assert ) => {
	const [ first, second, third ] = ve.test.utils.EditCheck.makeComparableActions( [ 'first', 'second', 'third' ] );
	const findReusableWidget = ve.ui.GutterSidebarEditCheckDialog.prototype.findReusableWidget;
	const small = { actions: [ first ] };
	const large = { actions: [ second, third ] };
	const acting = { actions: [ first ], acting: true };
	const outside = { actions: [ first, third ] };

	assert.strictEqual( findReusableWidget( [ outside ], [ first, second ] ), null, 'A widget with an action outside the section is not reused' );
	assert.strictEqual( findReusableWidget( [ small ], [ first, second ] ), small, 'A widget is reused when a new action joins its section' );
	assert.strictEqual( findReusableWidget( [ small, large ], [ first, second, third ] ), large, 'The widget with the most actions is preferred' );
	assert.strictEqual( findReusableWidget( [ large, acting ], [ first, second, third ] ), acting, 'An acting widget is preferred' );
} );
