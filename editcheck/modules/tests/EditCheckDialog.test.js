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
	const data = await openDrawerFromGutter( [ first, second ], second, null );

	const shown = [];
	let renders = 0;
	const drawer = Object.assign( Object.create( ve.ui.EditCheckDialog.prototype ), {
		inBeforeSave: false,
		updateFilter: data.updateFilter,
		currentActions: data.actions,
		controller: { filterActionsForDisplay: ( actions ) => actions },
		showActions: ( actions ) => {
			shown.push( ve.test.utils.EditCheck.actionIds( actions ) );
			drawer.currentActions = actions;
		},
		renderAction: () => renders++,
		afterRefreshDebounced: () => {}
	} );
	assert.deepEqual( ve.test.utils.EditCheck.actionIds( data.actions ), [ 'first', 'second' ], 'The drawer opens with the actions of the gutter' );

	drawer.onActionsUpdated( 'onDocumentChange', [ first, second, third ], [ third ], [], false );
	assert.deepEqual( shown.pop(), [ 'first', 'second' ], 'A new action from outside the drawer is not shown' );

	drawer.onActionsUpdated( 'onDocumentChange', [ first, third ], [], [ second ], false );
	assert.deepEqual( shown.pop(), [ 'first' ], 'A discarded action is removed from the drawer' );

	drawer.onActionsUpdatedProgress( 'onDocumentChange', third, null );
	assert.strictEqual( renders, 0, 'A streamed action from outside the drawer is not rendered' );
} );

QUnit.test( 'A second gutter icon replaces the actions of the open drawer', ( assert ) => {
	const [ second, third ] = ve.test.utils.EditCheck.makeComparableActions( [ 'second', 'third' ] );
	const calls = [];
	const drawer = {
		constructor: { static: { name: 'mobileEditCheckDialog' } },
		showActions: ( actions, newActions ) => calls.push( [ actions, newActions ] )
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

	assert.deepEqual( calls, [ [ [ second, third ], [ third ] ] ], 'The drawer shows the actions of the new icon, and focuses its action' );
	assert.deepEqual( drawer.sectionActions, [ third ], 'The drawer knows the actions of the new icon' );
} );
