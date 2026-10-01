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
		emitBranchNodeChangeIfNeeded: () => {},
		filterActionsForDisplay: mw.editcheck.Controller.prototype.filterActionsForDisplay,
		updateSuggestionIndicators: mw.editcheck.Controller.prototype.updateSuggestionIndicators,
		showSidebar: mw.editcheck.Controller.prototype.showSidebar
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
		[ 'controller', 'inBeforeSave', 'newActions' ],
		'The data uses the keys the dialogs read, and no actions, because the dialogs read them from the controller'
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
 * actions of spec.suggestions in the suggestion run. Each action is
 * [ id, start ], or [ id, start, promise ] for an action that arrives when
 * the promise resolves.
 *
 * @ignore
 * @param {Object} spec Actions for the next run. Change its properties between runs.
 * @param {Object} [checkStatic] Static properties of the stub check
 * @return {Object} The controller, the factory to use as mw.editcheck.editCheckFactory,
 *  and the surface model
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
		return ( this.includeSuggestions ? spec.suggestions : spec.checks ).map( ( [ id, start, wait ] ) => {
			const action = new mw.editcheck.EditCheckAction( {
				check: this,
				id,
				choices: [],
				fragments: [ surfaceModel.getLinearFragment( new ve.Range( start, start + 1 ) ) ]
			} );
			return wait ? wait.then( () => action ) : action;
		} );
	};
	const factory = new mw.editcheck.EditCheckFactory();
	factory.register( StubCheck );

	const controller = Object.create( mw.editcheck.Controller.prototype );
	OO.EventEmitter.call( controller );
	controller.clearState();
	controller.suggestionsModeAvailable = true;
	controller.suggestionsVisible = true;
	controller.suppressSuggestions = false;
	controller.surface = { getModel: () => surfaceModel };
	controller.target = { active: true, deactivating: false, enableVisualSectionEditing: false };
	controller.updateSuggestionCountDebounced = () => {};
	controller.showSidebar = () => ve.createDeferred().resolve().promise();
	return { controller, factory, surfaceModel };
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

		controller.focusedAction = suggestion;
		assert.deepEqual(
			await run( { checks: [ [ 'warning', 1 ], [ 'suggestion', 3 ] ], suggestions: [] } ),
			[ { actions: [ 'warning', 'suggestion' ], newActions: [], discardedActions: [] } ],
			'A check that replaces an equal suggestion causes an update, but is not new'
		);
		const takeover = controller.getActions()[ 1 ];
		assert.notStrictEqual( takeover, suggestion, 'A check replaces an equal suggestion' );
		assert.strictEqual( takeover.isSuggestion(), false, 'The replacement is a check' );
		assert.strictEqual( controller.focusedAction, takeover, 'The focus moves to the replacement' );
		controller.focusedAction = null;

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
		ve.test.utils.EditCheck.actionIds( controller.getDisplayActions() ),
		[ 'forced' ],
		'The dialogs can show the check'
	);
	assert.deepEqual( newActions, [ 'forced' ], 'The check is new, so that a dialog can focus it' );
} );

QUnit.test( 'whenSidebarShown waits for a pending open', ( assert ) => {
	const opening = ve.createDeferred();
	const whenSidebarShown = mw.editcheck.Controller.prototype.whenSidebarShown;

	// The window manager sets the current window before it runs the setup,
	// so a current window does not stop the wait
	const waiting = whenSidebarShown.call( { sidebarOpeningPromise: opening.promise() } );
	assert.strictEqual( waiting.state(), 'pending', 'It waits for the open' );
	opening.resolve();
	assert.strictEqual( waiting.state(), 'resolved', 'It resolves when the open finishes' );
	assert.strictEqual(
		whenSidebarShown.call( { sidebarOpeningPromise: null } ).state(),
		'resolved',
		'With no open, it resolves at once'
	);
} );

QUnit.test( 'ensureActionIsShown', async ( assert ) => {
	const [ action ] = ve.test.utils.EditCheck.makeComparableActions( [ 'forced' ] );
	// jQuery runs promise handlers in a later task
	const nextTask = () => new Promise( ( resolve ) => {
		setTimeout( resolve );
	} );
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
		await nextTask();
		assert.strictEqual( shown.state(), 'pending', 'Mobile waits for the gutter to render the actions' );
		rendered.resolve();
		assert.deepEqual(
			await shown.promise(),
			[ action, { alignToTop: true } ],
			'Mobile opens the drawer on the action, aligned to the top'
		);

		// Desktop: focus the action and scroll to it, when the sidebar is open
		OO.ui.isMobile = () => false;
		const focused = [];
		const opening = ve.createDeferred();
		const desktopController = {
			surface: {},
			sidebarOpeningPromise: opening.promise(),
			whenSidebarShown: mw.editcheck.Controller.prototype.whenSidebarShown,
			focusAction: ( ...args ) => focused.push( args )
		};
		mw.editcheck.Controller.prototype.ensureActionIsShown.call( desktopController, action, true );
		await nextTask();
		assert.deepEqual( focused, [], 'Desktop does not focus the action while the sidebar opens' );
		opening.resolve();
		await nextTask();
		assert.deepEqual( focused, [ [ action, true, { alignToTop: true } ] ], 'Desktop focuses the action and scrolls to it' );

		// Desktop: the surface is destroyed while the sidebar opens
		focused.length = 0;
		const destroyedOpening = ve.createDeferred();
		desktopController.sidebarOpeningPromise = destroyedOpening.promise();
		mw.editcheck.Controller.prototype.ensureActionIsShown.call( desktopController, action, true );
		desktopController.surface = null;
		destroyedOpening.resolve();
		await nextTask();
		assert.deepEqual( focused, [], 'Desktop does not focus the action after the surface is destroyed' );
	} finally {
		OO.ui.isMobile = originalIsMobile;
	}
} );

QUnit.test( 'showSidebar opens the sidebar only once while it opens', ( assert ) => {
	const [ streamed, later ] = ve.test.utils.EditCheck.makeComparableActions( [ 'streamed', 'later' ] );
	const openDeferred = ve.createDeferred();
	let openCount = 0;
	let openData = null;
	let currentWindow = null;
	const controller = {
		target: { $element: $( '<div>' ) },
		surface: {
			getSidebarDialogs: () => ( { getCurrentWindow: () => currentWindow } )
		},
		inBeforeSave: false,
		sidebarOpeningPromise: null,
		sidebarOpeningNewActions: null
	};

	const originalOpen = ve.ui.WindowAction.prototype.open;
	ve.ui.WindowAction.prototype.open = function ( name, data ) {
		openCount++;
		openData = data;
		return openDeferred.promise();
	};
	const callerNewActions = [ streamed ];
	let firstPromise, secondPromise;
	try {
		firstPromise = mw.editcheck.Controller.prototype.showSidebar.call( controller, callerNewActions );
		// The window manager sets the current window before it runs the setup
		currentWindow = { constructor: { static: { name: 'sidebarEditCheckDialog' } } };
		secondPromise = mw.editcheck.Controller.prototype.showSidebar.call( controller, [ later ] );
	} finally {
		ve.ui.WindowAction.prototype.open = originalOpen;
	}

	assert.strictEqual( openCount, 1, 'A second call does not open the sidebar again' );
	assert.strictEqual( secondPromise, firstPromise, 'A second call waits for the first open, also after the current window is set' );
	assert.deepEqual( openData.newActions, [ streamed, later ], 'The setup reads the new actions of both calls' );
	assert.deepEqual( callerNewActions, [ streamed ], 'The array of the caller does not change' );

	const done = assert.async();
	firstPromise.always( () => {
		assert.strictEqual( controller.sidebarOpeningPromise, null, 'The open is not pending after it resolves' );
		assert.strictEqual( controller.sidebarOpeningNewActions, null, 'The new actions are cleared when the open finishes' );
		done();
	} );
	openDeferred.resolve( { closed: ve.createDeferred().promise() } );
} );

QUnit.test( 'updateForListener ignores the results of a run that a newer run replaced', async ( assert ) => {
	let releaseOld;
	const oldGate = new Promise( ( resolve ) => {
		releaseOld = resolve;
	} );
	const spec = { checks: [ [ 'dismissed', 1, oldGate ] ], suggestions: [] };
	const { controller, factory } = makeStubCheckController( spec );

	const originalFactory = mw.editcheck.editCheckFactory;
	mw.editcheck.editCheckFactory = factory;
	try {
		const oldRun = controller.updateForListener( 'onDocumentChange' );
		// For example, the user dismissed the action, which starts a new run
		spec.checks = [ [ 'kept', 3 ] ];
		await controller.updateForListener( 'onDocumentChange' );
		releaseOld();
		await oldRun;
		assert.deepEqual(
			ve.test.utils.EditCheck.actionIds( controller.getActions() ),
			[ 'kept' ],
			'The results of the newer run are kept when the older run finishes last'
		);
	} finally {
		mw.editcheck.editCheckFactory = originalFactory;
	}
} );

QUnit.test( 'A streamed action opens the sidebar before all checks finish', async ( assert ) => {
	let releaseSlow;
	const slow = new Promise( ( resolve ) => {
		releaseSlow = resolve;
	} );
	const spec = {
		checks: [ [ 'fast', 1 ], [ 'slow', 3, slow ] ],
		suggestions: [ [ 'suggestion', 5 ], [ 'fast', 1 ] ]
	};
	const { controller, factory } = makeStubCheckController( spec );
	const tracked = [];
	controller.trackAction = ( action ) => tracked.push( action.id );
	const counts = [];
	controller.updateSuggestionCountDebounced = ( count ) => counts.push( count );
	const opens = [];
	controller.showSidebar = ( newActions ) => {
		opens.push( newActions );
		return ve.createDeferred().resolve().promise();
	};
	const nextTask = () => new Promise( ( resolve ) => {
		setTimeout( resolve );
	} );

	const originalFactory = mw.editcheck.editCheckFactory;
	mw.editcheck.editCheckFactory = factory;
	try {
		const updating = controller.updateForListener( 'onDocumentChange' );
		await nextTask();
		assert.notStrictEqual( opens.length, 0, 'The sidebar opens before the slow check finishes' );
		assert.deepEqual( opens[ 0 ], [], 'A streamed action is not focused' );
		assert.deepEqual( counts, [], 'The suggestion count waits for all checks to finish' );
		assert.deepEqual( controller.getActions(), [], 'The streamed actions are not settled' );
		assert.deepEqual(
			ve.test.utils.EditCheck.actionIds( controller.getDisplayActions() ),
			[ 'fast', 'suggestion' ],
			'The dialogs can show the streamed actions, with one copy of an action that is both a check and a suggestion'
		);
		assert.strictEqual( controller.getDisplayActions()[ 0 ].isSuggestion(), false, 'The check is shown instead of the equal suggestion' );
		assert.deepEqual( tracked.slice().sort(), [ 'fast', 'fast', 'suggestion' ], 'Each pending action is tracked when it arrives' );

		controller.suppressSuggestions = true;
		assert.deepEqual(
			ve.test.utils.EditCheck.actionIds( controller.getDisplayActions() ),
			[ 'fast' ],
			'Suppressed suggestions are not shown while they are pending'
		);
		controller.suppressSuggestions = false;

		controller.inBeforeSave = true;
		assert.deepEqual( controller.getDisplayActions(), [], 'Before save, the mid-edit pending actions are not shown' );
		controller.inBeforeSave = false;

		releaseSlow();
		await updating;
		assert.deepEqual(
			ve.test.utils.EditCheck.actionIds( controller.getActions() ),
			[ 'fast', 'slow', 'suggestion' ],
			'All actions are settled when all checks finish'
		);
		assert.deepEqual( controller.pendingActionsByListener, {}, 'No action is pending after all checks finish' );
		assert.deepEqual( tracked.slice().sort(), [ 'fast', 'fast', 'slow', 'suggestion' ], 'An action is tracked once' );
	} finally {
		mw.editcheck.editCheckFactory = originalFactory;
	}
} );

QUnit.test( 'refresh runs the mid-edit listeners at the same time', async ( assert ) => {
	let releaseSlow;
	const slow = new Promise( ( resolve ) => {
		releaseSlow = resolve;
	} );
	const spec = { checks: [ [ 'document', 1, slow ] ], suggestions: [] };
	const { controller, factory, surfaceModel } = makeStubCheckController( spec );

	const BranchCheck = function () {};
	OO.inheritClass( BranchCheck, mw.editcheck.BaseEditCheck );
	BranchCheck.static.name = 'branch';
	BranchCheck.prototype.canBeShown = () => true;
	BranchCheck.prototype.onBranchNodeChange = function () {
		return new mw.editcheck.EditCheckAction( {
			check: this,
			id: 'branch',
			choices: [],
			fragments: [ surfaceModel.getLinearFragment( new ve.Range( 3, 4 ) ) ]
		} );
	};
	factory.register( BranchCheck );

	let branchUpdated;
	const branchUpdate = new Promise( ( resolve ) => {
		branchUpdated = resolve;
	} );
	controller.on( 'actionsUpdated', ( listener ) => {
		if ( listener === 'onBranchNodeChange' ) {
			branchUpdated();
		}
	} );

	const originalFactory = mw.editcheck.editCheckFactory;
	mw.editcheck.editCheckFactory = factory;
	try {
		const refreshing = controller.refresh();
		await branchUpdate;
		assert.strictEqual( refreshing.state(), 'pending', 'The refresh waits for the slow check' );
		assert.deepEqual(
			ve.test.utils.EditCheck.actionIds( controller.getActions() ),
			[ 'branch' ],
			'The other listener finishes while the slow check runs'
		);

		releaseSlow();
		assert.deepEqual(
			ve.test.utils.EditCheck.actionIds( await refreshing ),
			[ 'document', 'branch' ],
			'The refresh gives the actions of both listeners'
		);
	} finally {
		mw.editcheck.editCheckFactory = originalFactory;
	}
} );

QUnit.test( 'Completing an action registers a system message only once', async ( assert ) => {
	const clock = sinon.useFakeTimers();
	const { controller, factory, surfaceModel } = makeStubCheckController( { checks: [], suggestions: [] } );
	factory.register( mw.editcheck.SystemMessageEditCheck );

	const originalFactory = mw.editcheck.editCheckFactory;
	mw.editcheck.editCheckFactory = factory;
	try {
		const check = factory.create( 'stub', controller );
		const action = new mw.editcheck.EditCheckAction( {
			check,
			choices: [],
			fragments: [ surfaceModel.getLinearFragment( new ve.Range( 1, 4 ) ) ]
		} );
		controller.trackAction( action );

		const updates = [];
		let systemMessageUpdated;
		const systemMessageUpdate = new Promise( ( resolve ) => {
			systemMessageUpdated = resolve;
		} );
		controller.on( 'actionsUpdated', ( listener ) => {
			updates.push( listener );
			if ( listener === 'onSystemMessage' ) {
				systemMessageUpdated();
			}
		} );

		// EditCheckAction#complete guards against firing its event twice
		action.complete();
		action.complete();
		// registerSystemMessage now goes through the normal updateForListener
		// pipeline, which resolves asynchronously even for a synchronous check
		await systemMessageUpdate;

		assert.strictEqual( controller.pendingSystemMessages.length, 1, 'Only one system message is registered' );
		assert.strictEqual( updates.length, 1, 'actionsUpdated is only emitted once for the new system message' );
	} finally {
		mw.editcheck.editCheckFactory = originalFactory;
		clock.restore();
	}
} );

QUnit.test( 'Completing an action mid-save does not register a system message', ( assert ) => {
	const { controller, factory, surfaceModel } = makeStubCheckController( { checks: [], suggestions: [] } );
	factory.register( mw.editcheck.SystemMessageEditCheck );

	const originalFactory = mw.editcheck.editCheckFactory;
	mw.editcheck.editCheckFactory = factory;
	try {
		controller.inBeforeSave = true;
		const check = factory.create( 'stub', controller );
		const action = new mw.editcheck.EditCheckAction( {
			check,
			choices: [],
			fragments: [ surfaceModel.getLinearFragment( new ve.Range( 1, 4 ) ) ]
		} );
		controller.trackAction( action );

		action.complete();

		assert.strictEqual(
			controller.pendingSystemMessages.length, 0,
			'No system message is registered while saving, since there is nowhere to show it yet'
		);
	} finally {
		mw.editcheck.editCheckFactory = originalFactory;
	}
} );

QUnit.test( 'dropStaleSystemMessages removes messages whose fragment changed, e.g. via undo', async ( assert ) => {
	const { controller, factory, surfaceModel } = makeStubCheckController( { checks: [], suggestions: [] } );
	factory.register( mw.editcheck.SystemMessageEditCheck );

	const originalFactory = mw.editcheck.editCheckFactory;
	mw.editcheck.editCheckFactory = factory;
	try {
		const fragment = surfaceModel.getLinearFragment( new ve.Range( 1, 4 ) );
		// registerSystemMessage now goes through the normal updateForListener
		// pipeline, which resolves asynchronously even for a synchronous check
		await controller.registerSystemMessage( fragment, { title: 'Done!' } );
		assert.strictEqual( controller.pendingSystemMessages.length, 1, 'The message is registered' );

		controller.dropStaleSystemMessages();
		assert.strictEqual( controller.pendingSystemMessages.length, 1, 'An unchanged fragment is kept' );

		// Simulate an undo of the edit that resolved the original check: the
		// fragment's text no longer matches what was recorded.
		surfaceModel.change( ve.dm.TransactionBuilder.static.newFromRemoval( surfaceModel.getDocument(), new ve.Range( 1, 2 ) ) );

		controller.dropStaleSystemMessages();
		assert.strictEqual( controller.pendingSystemMessages.length, 0, 'A message whose fragment changed is dropped' );
	} finally {
		mw.editcheck.editCheckFactory = originalFactory;
	}
} );

QUnit.test( 'getUnshownSystemMessageUpdate', async ( assert ) => {
	const clock = sinon.useFakeTimers();
	const { controller, factory, surfaceModel } = makeStubCheckController( { checks: [], suggestions: [] } );
	factory.register( mw.editcheck.SystemMessageEditCheck );

	const originalFactory = mw.editcheck.editCheckFactory;
	mw.editcheck.editCheckFactory = factory;
	try {
		assert.strictEqual( controller.getUnshownSystemMessageUpdate(), null, 'Null when no message is registered' );

		const fragment = surfaceModel.getLinearFragment( new ve.Range( 1, 4 ) );
		const update = controller.registerSystemMessage( fragment, { title: 'Done!' } );
		assert.strictEqual(
			controller.getUnshownSystemMessageUpdate(), update,
			'Before the update resolves, the message has no action, so the update is returned'
		);

		await update;
		assert.strictEqual(
			controller.getUnshownSystemMessageUpdate(), null,
			'Null once the message has an action'
		);
	} finally {
		mw.editcheck.editCheckFactory = originalFactory;
		clock.restore();
	}
} );

QUnit.test( 'editChecksArePossible ignores system checks', ( assert ) => {
	const { controller, factory } = makeStubCheckController( { checks: [], suggestions: [] } );
	factory.register( mw.editcheck.SystemMessageEditCheck );

	const originalFactory = mw.editcheck.editCheckFactory;
	const originalSuggestionsModeAvailable = mw.editcheck.suggestionsModeAvailable;
	mw.editcheck.editCheckFactory = factory;
	mw.editcheck.suggestionsModeAvailable = false;
	try {
		const StubCheck = factory.lookup( 'stub' );
		factory.unregister( 'stub' );
		assert.strictEqual(
			controller.editChecksArePossible(), false,
			'A registry with only a system check reports no checks possible'
		);

		factory.register( StubCheck );
		assert.strictEqual(
			controller.editChecksArePossible(), true,
			'A normal check alongside it makes checks possible again'
		);
	} finally {
		mw.editcheck.editCheckFactory = originalFactory;
		mw.editcheck.suggestionsModeAvailable = originalSuggestionsModeAvailable;
	}
} );

QUnit.test( 'updateSuggestionIndicators excludes system check actions from the suggestion count', ( assert ) => {
	const { controller, factory, surfaceModel } = makeStubCheckController( { checks: [], suggestions: [] } );
	factory.register( mw.editcheck.SystemMessageEditCheck );
	controller.updateSuggestionCountDebounced = ( count ) => {
		controller.lastSuggestionCount = count;
	};

	const normalCheck = factory.create( 'stub', controller );
	const systemCheck = factory.create( 'systemMessage', controller );

	const suggestion = new mw.editcheck.EditCheckAction( {
		check: normalCheck,
		choices: [],
		suggestion: true,
		fragments: [ surfaceModel.getLinearFragment( new ve.Range( 1, 2 ) ) ]
	} );
	const systemMessage = new mw.editcheck.EditCheckAction( {
		check: systemCheck,
		choices: [],
		suggestion: true,
		fragments: [ surfaceModel.getLinearFragment( new ve.Range( 3, 4 ) ) ]
	} );

	controller.updateSuggestionIndicators( [ suggestion, systemMessage ] );

	assert.strictEqual( controller.lastSuggestionCount, 1, 'The system message does not count as a suggestion' );
} );
