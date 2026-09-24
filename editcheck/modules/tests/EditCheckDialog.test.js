QUnit.module( 'mw.editcheck.EditCheckDialog', ve.test.utils.newEditCheckEnvironment() );

QUnit.test( 'onActionsUpdated hides suggestions', ( assert ) => {
	const actions = ve.test.utils.EditCheck.makeComparableActions( [ 'suggestion', 'warning' ] );
	actions[ 0 ].suggestion = true;
	const calls = [];
	const dialog = Object.assign( Object.create( ve.ui.EditCheckDialog.prototype ), {
		inBeforeSave: false,
		scope: null,
		controller: ve.test.utils.EditCheck.makeHidingController( actions ),
		showActions: ( shown, shownNew, rejected ) => calls.push( [ shown, shownNew, rejected ] )
	} );

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

QUnit.test( 'showActions chooses the focused action', ( assert ) => {
	const [ first, second, third ] = ve.test.utils.EditCheck.makeComparableActions( [ 'first', 'second', 'third' ] );
	// An update can replace an action with an equal one
	const firstReplacement = new mw.editcheck.EditCheckAction( {
		fragments: first.fragments, choices: [], check: first.check, id: first.id
	} );
	const cases = [
		{
			msg: 'With no focused action, the first new action is focused',
			alwaysFocusAction: false,
			currentAction: null,
			currentOffset: null,
			actions: [ first, second ],
			newActions: [ second ],
			expected: [ second, false ]
		},
		{
			msg: 'A focused action moves to its equal replacement',
			alwaysFocusAction: false,
			currentAction: first,
			currentOffset: 0,
			actions: [ firstReplacement, second ],
			newActions: [],
			expected: [ firstReplacement, false ]
		},
		{
			msg: 'When the focused action is removed, the focus moves to the action at its offset',
			alwaysFocusAction: true,
			currentAction: first,
			currentOffset: 1,
			actions: [ second, third ],
			newActions: [],
			expected: [ third, true ]
		},
		{
			msg: 'When the focused action is removed, a dialog that does not always focus has no focus',
			alwaysFocusAction: false,
			currentAction: first,
			currentOffset: 0,
			actions: [ second, third ],
			newActions: [],
			expected: [ null, false ]
		}
	];

	cases.forEach( ( caseItem ) => {
		let focused = null;
		const dialog = Object.assign( Object.create( ve.ui.EditCheckDialog.prototype ), {
			constructor: { static: { alwaysFocusAction: caseItem.alwaysFocusAction } },
			currentAction: caseItem.currentAction,
			currentOffset: caseItem.currentOffset,
			refresh: () => {},
			setCurrentAction: ( action, fromUserAction ) => {
				focused = [ action, fromUserAction ];
			}
		} );
		dialog.showActions( caseItem.actions, caseItem.newActions );
		assert.deepEqual( focused, caseItem.expected, caseItem.msg );
	} );
} );

QUnit.test( 'showActions closes the dialog when there are no actions', ( assert ) => {
	[ true, false ].forEach( ( rejected ) => {
		const closes = [];
		const dialog = Object.assign( Object.create( ve.ui.EditCheckDialog.prototype ), {
			close: ( data ) => closes.push( data )
		} );
		dialog.showActions( [], [], rejected );
		assert.deepEqual(
			closes,
			[ { action: rejected ? 'reject' : 'complete' } ],
			rejected ? 'A rejection closes with reject' : 'Otherwise it closes with complete'
		);
	} );
} );

/**
 * Open the mobile drawer from a gutter icon, and get the data that the drawer is opened with
 *
 * @ignore
 * @param {mw.editcheck.EditCheckAction[]} navigableActions Actions that the gutter shows
 * @param {mw.editcheck.EditCheckAction} action Action on the icon
 * @param {Object|null} currentWindow The open drawer, if there is one
 * @return {jQuery.Promise} Promise which resolves with the data of the open request
 */
const openDrawerFromGutter = function ( navigableActions, action, currentWindow ) {
	const opened = ve.createDeferred();
	const widget = Object.assign( Object.create( mw.editcheck.EditCheckGutterSectionWidget.prototype ), {
		actions: [ action ],
		navigableActions,
		controller: {
			surface: {
				getToolbarDialogs: () => ( { getCurrentWindow: () => currentWindow } )
			},
			focusAction: () => ve.createDeferred().resolve().promise()
		}
	} );
	action.select = () => {};

	const originalOpen = ve.ui.WindowAction.prototype.open;
	ve.ui.WindowAction.prototype.open = function ( name, data ) {
		opened.resolve( data );
		return ve.createDeferred().resolve().promise();
	};
	// Align to the top, so that the widget does not wait for the dialog transition
	widget.showDialogWithAction( action, { alignToTop: true } );
	return opened.promise().always( () => {
		ve.ui.WindowAction.prototype.open = originalOpen;
	} );
};

QUnit.test( 'The mobile drawer shows only the actions of its gutter icon', async ( assert ) => {
	const [ first, second, third ] = ve.test.utils.EditCheck.makeComparableActions( [ 'first', 'second', 'third' ] );
	// An update can replace an action with an equal one
	const firstReplacement = new mw.editcheck.EditCheckAction( {
		fragments: first.fragments, choices: [], check: first.check, id: first.id
	} );
	const data = await openDrawerFromGutter( [ first, second ], second, null );

	let controllerActions = [ first, second, third ];
	const shown = [];
	let renders = 0;
	const drawer = Object.assign( Object.create( ve.ui.EditCheckDialog.prototype ), {
		inBeforeSave: false,
		scope: data.scope,
		controller: {
			getDisplayActions: () => controllerActions,
			filterActionsForDisplay: ( actions ) => actions
		},
		showActions: ( actions, newActions ) => shown.push( [ actions, newActions ] ),
		renderAction: () => renders++,
		afterRefreshDebounced: () => {}
	} );
	assert.deepEqual( ve.test.utils.EditCheck.actionIds( data.scope ), [ 'first', 'second' ], 'The drawer opens with the actions of the gutter as its scope' );

	drawer.onActionsUpdated( 'onDocumentChange', controllerActions, [ third ], [], false );
	assert.deepEqual( shown.pop(), [ [ first, second ], [] ], 'A new action from outside the drawer is not shown or focused' );

	controllerActions = [ firstReplacement, third ];
	drawer.onActionsUpdated( 'onDocumentChange', controllerActions, [], [ second ], false );
	assert.deepEqual( shown.pop()[ 0 ], [ firstReplacement ], 'A discarded action is removed, and an equal replacement is shown' );

	drawer.onActionsUpdatedProgress( 'onDocumentChange', third, null );
	assert.strictEqual( renders, 0, 'A streamed action from outside the drawer is not rendered' );
} );

QUnit.test( 'A second gutter icon replaces the actions of the open drawer', ( assert ) => {
	const [ second, third ] = ve.test.utils.EditCheck.makeComparableActions( [ 'second', 'third' ] );
	const calls = [];
	const drawer = {
		constructor: { static: { name: 'mobileEditCheckDialog' } },
		setScope: ( scope, focusAction ) => calls.push( [ scope, focusAction ] )
	};
	const widget = Object.assign( Object.create( mw.editcheck.EditCheckGutterSectionWidget.prototype ), {
		actions: [ third ],
		navigableActions: [ second, third ],
		controller: {
			surface: {
				getToolbarDialogs: () => ( { getCurrentWindow: () => drawer } )
			},
			focusAction: () => ve.createDeferred().resolve().promise()
		}
	} );
	third.select = () => {};

	widget.showDialogWithAction( third );

	assert.deepEqual( calls, [ [ [ second, third ], third ] ], 'The drawer gets the actions of the new icon as its scope, and focuses its action' );
	assert.deepEqual( drawer.sectionActions, [ third ], 'The drawer knows the actions of the new icon' );
} );

QUnit.test( 'setScope focuses an equal replacement of the action', ( assert ) => {
	const [ first, second ] = ve.test.utils.EditCheck.makeComparableActions( [ 'first', 'second' ] );
	// The caller holds the old object, and the controller holds its replacement
	const secondReplacement = new mw.editcheck.EditCheckAction( {
		fragments: second.fragments, choices: [], check: second.check, id: second.id
	} );
	const calls = [];
	const dialog = Object.assign( Object.create( ve.ui.EditCheckDialog.prototype ), {
		scope: null,
		controller: {
			getDisplayActions: () => [ first, secondReplacement ]
		},
		showActions: ( shown, shownNew ) => calls.push( [ shown, shownNew ] )
	} );

	dialog.setScope( [ first, second ], second );

	assert.strictEqual( calls[ 0 ][ 0 ].length, 2, 'Both actions in the scope are shown' );
	assert.deepEqual( calls[ 0 ][ 1 ], [ secondReplacement ], 'The replacement is focused' );
} );
