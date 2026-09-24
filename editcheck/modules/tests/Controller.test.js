QUnit.module( 'mw.editcheck.Controller', ve.test.utils.newEditCheckEnvironment() );

QUnit.test( 'filterActionsForDisplay', ( assert ) => {
	const actions = ve.test.utils.EditCheck.makeDisplayActions();
	const cases = [
		{
			msg: 'Suggestions are shown',
			suggestionsVisible: true,
			suppressSuggestions: false,
			expected: [ 'suggestion', 'warning' ]
		},
		{
			msg: 'Suggestions are turned off by the user',
			suggestionsVisible: false,
			suppressSuggestions: false,
			expected: [ 'warning' ]
		},
		{
			msg: 'Suggestions are suppressed by an external tool',
			suggestionsVisible: true,
			suppressSuggestions: true,
			expected: [ 'warning' ]
		},
		{
			msg: 'Suggestions are both turned off and suppressed',
			suggestionsVisible: false,
			suppressSuggestions: true,
			expected: [ 'warning' ]
		}
	];

	cases.forEach( ( caseItem ) => {
		const controller = {
			suggestionsVisible: caseItem.suggestionsVisible,
			suppressSuggestions: caseItem.suppressSuggestions
		};
		assert.deepEqual(
			ve.test.utils.EditCheck.actionIds(
				mw.editcheck.Controller.prototype.filterActionsForDisplay.call( controller, actions )
			),
			caseItem.expected,
			caseItem.msg
		);
	} );
} );

QUnit.test( 'onActionsUpdated opens the sidebar with the data the dialogs read', ( assert ) => {
	const actions = ve.test.utils.EditCheck.makeDisplayActions();
	const opened = [];

	const controller = {
		target: {
			$element: $( '<div>' ),
			enableVisualSectionEditing: false,
			section: null
		},
		surface: {
			getSidebarDialogs: () => ( { getCurrentWindow: () => null } )
		},
		inBeforeSave: false,
		inSetup: false,
		focusedAction: null,
		// Suppressed, so that a dialog which ignores the filtering is visible
		// in the data below
		suggestionsVisible: true,
		suppressSuggestions: true,
		updatePositionsDebounced: () => {},
		updateSuggestionCountDebounced: () => {},
		focusActionForSelection: () => {},
		filterActionsForDisplay: mw.editcheck.Controller.prototype.filterActionsForDisplay
	};

	const originalOpen = ve.ui.WindowAction.prototype.open;
	ve.ui.WindowAction.prototype.open = function ( name, data ) {
		opened.push( { name, data } );
		return ve.createDeferred().resolve( {
			closed: ve.createDeferred().resolve().promise()
		} ).promise();
	};
	try {
		mw.editcheck.Controller.prototype.onActionsUpdated.call(
			controller, 'onDocumentChange', actions, actions, []
		);
	} finally {
		ve.ui.WindowAction.prototype.open = originalOpen;
	}

	assert.strictEqual( opened.length, 1, 'The sidebar is opened' );
	assert.deepEqual(
		Object.keys( opened[ 0 ].data ).sort(),
		[ 'actions', 'controller', 'inBeforeSave', 'newActions' ],
		'The data uses the keys the dialogs read'
	);
	assert.deepEqual(
		ve.test.utils.EditCheck.actionIds( opened[ 0 ].data.actions ),
		[ 'warning' ],
		'Suppressed suggestions are not sent as actions'
	);
	assert.deepEqual(
		ve.test.utils.EditCheck.actionIds( opened[ 0 ].data.newActions ),
		[ 'warning' ],
		'Suppressed suggestions are not sent as new actions'
	);
} );

QUnit.test( 'getActions gives the actions for the current mode', ( assert ) => {
	const [ branch, doc, suggestion, preSave ] = ve.test.utils.EditCheck.makeComparableActions(
		[ 'branch', 'doc', 'suggestion', 'preSave' ]
	);
	suggestion.suggestion = true;
	const cases = [
		{
			msg: 'Mid-edit gives the actions of all mid-edit listeners, in document order',
			inBeforeSave: false,
			suppressSuggestions: false,
			expected: [ 'branch', 'doc', 'suggestion' ]
		},
		{
			msg: 'Suppressed suggestions are not given',
			inBeforeSave: false,
			suppressSuggestions: true,
			expected: [ 'branch', 'doc' ]
		},
		{
			msg: 'Before save gives only the pre-save actions',
			inBeforeSave: true,
			suppressSuggestions: false,
			expected: [ 'preSave' ]
		}
	];

	cases.forEach( ( caseItem ) => {
		const controller = {
			actionsByListener: {
				onDocumentChange: [ doc, suggestion ],
				onBranchNodeChange: [ branch ],
				onBeforeSave: [ preSave ]
			},
			inBeforeSave: caseItem.inBeforeSave,
			suppressSuggestions: caseItem.suppressSuggestions
		};
		assert.deepEqual(
			ve.test.utils.EditCheck.actionIds( mw.editcheck.Controller.prototype.getActions.call( controller ) ),
			caseItem.expected,
			caseItem.msg
		);
	} );
} );

/**
 * Make a controller that runs one stub check
 *
 * The stub check makes the actions of spec.checks in the check run, and the
 * actions of spec.suggestions in the suggestion run. Each action is [ id, start ].
 *
 * @ignore
 * @param {Object} spec Actions for the next run. Change its properties between runs.
 * @param {Object} [checkStatic] Static properties of the stub check
 * @return {Object} The controller, and the factory to use as mw.editcheck.editCheckFactory
 */
const makeStubCheckController = function ( spec, checkStatic = {} ) {
	const doc = new ve.dm.Document( [ { type: 'paragraph' }, ...'abcdefgh', { type: '/paragraph' } ] ),
		surfaceModel = new ve.dm.Surface( doc );

	const StubCheck = function ( controller, config, includeSuggestions ) {
		this.includeSuggestions = includeSuggestions;
	};
	OO.inheritClass( StubCheck, mw.editcheck.BaseEditCheck );
	StubCheck.static.name = 'stub';
	Object.assign( StubCheck.static, checkStatic );
	StubCheck.prototype.canBeShown = () => true;
	StubCheck.prototype.onDocumentChange = function () {
		return ( this.includeSuggestions ? spec.suggestions : spec.checks ).map(
			( [ id, start ] ) => new mw.editcheck.EditCheckAction( {
				check: this,
				id,
				choices: [],
				fragments: [ surfaceModel.getLinearFragment( new ve.Range( start, start + 1 ) ) ]
			} )
		);
	};
	const factory = new mw.editcheck.EditCheckFactory();
	factory.register( StubCheck );

	const controller = Object.create( mw.editcheck.Controller.prototype );
	OO.EventEmitter.call( controller );
	controller.clearState();
	controller.suggestionsModeAvailable = true;
	controller.suppressSuggestions = false;
	controller.surface = { getModel: () => surfaceModel };
	return { controller, factory };
};

QUnit.test( 'updateForListener keeps equal actions and reports changes', async ( assert ) => {
	const spec = { checks: [], suggestions: [] };
	const { controller, factory } = makeStubCheckController( spec );
	const updates = [];
	controller.on( 'actionsUpdated', ( listener, actions, newActions, discardedActions ) => {
		updates.push( {
			actions: ve.test.utils.EditCheck.actionIds( actions ),
			newActions: ve.test.utils.EditCheck.actionIds( newActions ),
			discardedActions: ve.test.utils.EditCheck.actionIds( discardedActions )
		} );
	} );
	const run = async ( newSpec ) => {
		Object.assign( spec, newSpec );
		updates.length = 0;
		await controller.updateForListener( 'onDocumentChange' );
		return updates.slice();
	};

	const originalFactory = mw.editcheck.editCheckFactory;
	mw.editcheck.editCheckFactory = factory;
	try {
		assert.deepEqual(
			await run( { checks: [ [ 'warning', 1 ] ], suggestions: [ [ 'suggestion', 3 ], [ 'warning', 1 ] ] } ),
			[ { actions: [ 'warning', 'suggestion' ], newActions: [ 'warning', 'suggestion' ], discardedActions: [] } ],
			'New actions are reported, and a suggestion equal to a check is dropped'
		);
		const [ warning, suggestion ] = controller.getActions();
		assert.strictEqual( suggestion.isSuggestion(), true, 'The suggestion is a suggestion' );

		assert.deepEqual(
			await run( { checks: [ [ 'warning', 1 ] ], suggestions: [ [ 'suggestion', 3 ] ] } ),
			[],
			'No update is sent when the actions did not change'
		);
		assert.strictEqual( controller.getActions()[ 0 ], warning, 'An equal action keeps its object' );
		assert.strictEqual( controller.getActions()[ 1 ], suggestion, 'An equal suggestion keeps its object' );

		await run( { checks: [ [ 'warning', 1 ], [ 'suggestion', 3 ] ], suggestions: [] } );
		const takeover = controller.getActions()[ 1 ];
		assert.notStrictEqual( takeover, suggestion, 'A check replaces an equal suggestion' );
		assert.strictEqual( takeover.isSuggestion(), false, 'The replacement is a check' );

		assert.deepEqual(
			await run( { checks: [ [ 'suggestion', 3 ] ], suggestions: [] } ),
			[ { actions: [ 'suggestion' ], newActions: [], discardedActions: [ 'warning' ] } ],
			'A removed action is reported as discarded'
		);

		controller.inSetup = true;
		assert.deepEqual(
			( await run( { checks: [ [ 'suggestion', 3 ], [ 'setup', 5 ] ], suggestions: [] } ) )[ 0 ].newActions,
			[],
			'Actions found during setup are not reported as new'
		);
		controller.inSetup = null;

		controller.suppressSuggestions = true;
		assert.deepEqual(
			( await run( { checks: [ [ 'suggestion', 3 ], [ 'setup', 5 ] ], suggestions: [ [ 'hidden', 7 ] ] } ) )[ 0 ].newActions,
			[],
			'Suppressed suggestions are not reported as new'
		);
	} finally {
		mw.editcheck.editCheckFactory = originalFactory;
	}
} );

QUnit.test( 'A tool can suppress suggestions and still show its own check', async ( assert ) => {
	// As GrowthExperiments' ReviseTone does: its check runs as both a check and a
	// suggestion, and takes focus
	const spec = {
		checks: [ [ 'forced', 1 ] ],
		suggestions: [ [ 'forced', 1 ], [ 'other', 3 ] ]
	};
	const { controller, factory } = makeStubCheckController( spec, { takesFocus: true } );
	controller.target = { active: true, deactivating: false };
	controller.suggestionsVisible = true;
	controller.suppressSuggestions = true;
	const newActions = [];
	controller.on( 'actionsUpdated', ( listener, actions, listenerNewActions ) => {
		newActions.push( ...ve.test.utils.EditCheck.actionIds( listenerNewActions ) );
	} );

	const originalFactory = mw.editcheck.editCheckFactory;
	mw.editcheck.editCheckFactory = factory;
	let actions;
	try {
		actions = await controller.refresh();
	} finally {
		mw.editcheck.editCheckFactory = originalFactory;
	}

	assert.deepEqual( ve.test.utils.EditCheck.actionIds( actions ), [ 'forced' ], 'The refresh gives the check, and not the other suggestion' );
	assert.strictEqual( actions[ 0 ].isSuggestion(), false, 'The forced action is a check' );
	assert.deepEqual(
		ve.test.utils.EditCheck.actionIds( controller.filterActionsForDisplay( controller.getActions() ) ),
		[ 'forced' ],
		'The dialogs can show the check'
	);
	assert.deepEqual( newActions, [ 'forced' ], 'The check is new, so that a dialog can focus it' );
} );

QUnit.test( 'whenSidebarShown waits only for a sidebar that is not yet the current window', ( assert ) => {
	const opening = ve.createDeferred();
	const makeController = ( currentWindow ) => ( {
		surface: {
			getSidebarDialogs: () => ( { getCurrentWindow: () => currentWindow } )
		},
		sidebarShownPromise: opening.promise()
	} );
	const whenSidebarShown = mw.editcheck.Controller.prototype.whenSidebarShown;

	assert.strictEqual(
		whenSidebarShown.call( makeController( {} ) ).state(),
		'resolved',
		'A current window resolves at once, also while an open is pending'
	);
	const waiting = whenSidebarShown.call( makeController( null ) );
	assert.strictEqual( waiting.state(), 'pending', 'With no current window, it waits for the open' );
	opening.resolve();
	assert.strictEqual( waiting.state(), 'resolved', 'It resolves when the open finishes' );
	assert.strictEqual(
		whenSidebarShown.call( { surface: makeController( null ).surface } ).state(),
		'resolved',
		'With no open, it resolves at once'
	);
} );

QUnit.test( 'ensureActionIsShown', async ( assert ) => {
	const [ action ] = ve.test.utils.EditCheck.makeComparableActions( [ 'forced' ] );
	const originalIsMobile = OO.ui.isMobile;
	try {
		// Mobile: wait for the gutter to render, then open the drawer on the action
		OO.ui.isMobile = () => true;
		const rendered = ve.createDeferred();
		const shown = ve.createDeferred();
		const gutter = {
			constructor: { static: { name: 'gutterSidebarEditCheckDialog' } },
			whenActionsRendered: () => rendered.promise(),
			showDialogWithAction: ( ...args ) => shown.resolve( args )
		};
		const mobileController = {
			surface: {
				getSidebarDialogs: () => ( { getCurrentWindow: () => gutter } )
			},
			whenSidebarShown: () => ve.createDeferred().resolve().promise()
		};
		mw.editcheck.Controller.prototype.ensureActionIsShown.call( mobileController, action, true );
		// jQuery runs promise handlers in a later task
		await new Promise( ( resolve ) => {
			setTimeout( resolve );
		} );
		assert.strictEqual( shown.state(), 'pending', 'Mobile waits for the gutter to render the actions' );
		rendered.resolve();
		assert.deepEqual(
			await shown.promise(),
			[ action, { alignToTop: true } ],
			'Mobile opens the drawer on the action, aligned to the top'
		);

		// Desktop: focus the action and scroll to it
		OO.ui.isMobile = () => false;
		const focused = [];
		const desktopController = {
			focusAction: ( ...args ) => focused.push( args )
		};
		mw.editcheck.Controller.prototype.ensureActionIsShown.call( desktopController, action, true );
		assert.deepEqual( focused, [ [ action, true, { alignToTop: true } ] ], 'Desktop focuses the action and scrolls to it' );
	} finally {
		OO.ui.isMobile = originalIsMobile;
	}
} );
