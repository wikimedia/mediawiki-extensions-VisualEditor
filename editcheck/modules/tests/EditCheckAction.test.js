QUnit.module( 'mw.editcheck.EditCheckAction', ve.test.utils.newEditCheckEnvironment() );

QUnit.test( 'equals', ( assert ) => {
	const doc = new ve.dm.Document( [ { type: 'paragraph' }, ...'abcdef', { type: '/paragraph' } ] ),
		surface = new ve.dm.Surface( doc ),
		check1 = new mw.editcheck.BaseEditCheck( ve.test.utils.EditCheck.dummyController, {}, false ),
		check2 = new mw.editcheck.BaseEditCheck( ve.test.utils.EditCheck.dummyController, {}, false );

	const cases = [
		{
			name: 'Exact range match',
			allowsOverlap: false,
			actionConfig: {
				check: check1,
				range: [ 1, 2 ]
			},
			otherActionConfig: {
				check: check2,
				range: [ 1, 2 ]
			},
			equals: true
		},
		{
			name: 'Complete range miss',
			allowsOverlap: false,
			actionConfig: {
				check: check1,
				range: [ 1, 2 ]
			},
			otherActionConfig: {
				check: check2,
				range: [ 4, 5 ]
			},
			equals: false
		},
		{
			name: 'Overlapping ranges',
			allowsOverlap: false,
			actionConfig: {
				check: check1,
				range: [ 1, 3 ]
			},
			otherActionConfig: {
				check: check2,
				range: [ 2, 5 ]
			},
			equals: false
		},
		{
			name: 'Overlapping ranges, allowsOverlap',
			allowsOverlap: true,
			actionConfig: {
				check: check1,
				range: [ 1, 3 ]
			},
			otherActionConfig: {
				check: check2,
				range: [ 2, 5 ]
			},
			equals: true
		},
		{
			name: 'Touching ranges',
			allowsOverlap: false,
			actionConfig: {
				check: check1,
				range: [ 1, 2 ]
			},
			otherActionConfig: {
				check: check2,
				range: [ 2, 3 ]
			},
			equals: false
		},
		{
			name: 'Touching ranges, allowsOverlap',
			allowsOverlap: false,
			actionConfig: {
				check: check1,
				range: [ 1, 2 ]
			},
			otherActionConfig: {
				check: check2,
				range: [ 2, 3 ]
			},
			equals: false
		},
		{
			name: 'Complete range miss',
			allowsOverlap: false,
			actionConfig: {
				check: check1,
				range: [ 1, 2 ]
			},
			otherActionConfig: {
				check: check2,
				range: [ 4, 5 ]
			},
			equals: false
		},
		{
			name: 'Range match with id mismatch',
			allowsOverlap: false,
			actionConfig: {
				check: check1,
				range: [ 1, 2 ],
				id: 1
			},
			otherActionConfig: {
				check: check2,
				range: [ 1, 2 ],
				id: 2
			},
			equals: false
		},
		{
			name: 'Exact range match with zero-width ranges',
			allowsOverlap: false,
			actionConfig: {
				check: check1,
				range: [ 1, 1 ]
			},
			otherActionConfig: {
				check: check2,
				range: [ 1, 1 ]
			},
			equals: true
		},
		{
			name: 'Exact range match with zero-width ranges, allowsOverlap',
			allowsOverlap: true,
			actionConfig: {
				check: check1,
				range: [ 1, 1 ]
			},
			otherActionConfig: {
				check: check2,
				range: [ 1, 1 ]
			},
			equals: true
		},
		{
			name: 'Inexact range match with one zero-width range',
			allowsOverlap: false,
			actionConfig: {
				check: check1,
				range: [ 1, 1 ]
			},
			otherActionConfig: {
				check: check2,
				range: [ 1, 2 ]
			},
			equals: false
		},
		{
			name: 'Inexact range match with one zero-width range, allowsOverlap',
			allowsOverlap: true,
			actionConfig: {
				check: check1,
				range: [ 1, 1 ]
			},
			otherActionConfig: {
				check: check2,
				range: [ 1, 2 ]
			},
			equals: true
		}
	];

	const makeFragments = ( start, end ) => [
		surface.getFragment( new ve.dm.LinearSelection( new ve.Range( start, end ) ) )
	];

	cases.forEach( ( caseItem ) => {
		caseItem.actionConfig.fragments = makeFragments( ...caseItem.actionConfig.range );
		caseItem.otherActionConfig.fragments = makeFragments( ...caseItem.otherActionConfig.range );

		const action = new mw.editcheck.EditCheckAction( caseItem.actionConfig ),
			otherAction = new mw.editcheck.EditCheckAction( caseItem.otherActionConfig );

		assert.strictEqual(
			action.equals( otherAction, caseItem.allowsOverlap ),
			caseItem.equals,
			caseItem.name
		);
	} );
} );

QUnit.test( 'overlapsRanges', ( assert ) => {
	const doc = new ve.dm.Document( [ { type: 'paragraph' }, ...'abcdef', { type: '/paragraph' } ] ),
		surface = new ve.dm.Surface( doc ),
		fragments = [ surface.getFragment( new ve.dm.LinearSelection( new ve.Range( 1, 4 ) ) ) ];

	const action = new mw.editcheck.EditCheckAction( { fragments, choices: [] } );
	assert.strictEqual(
		action.overlapsRanges( [ new ve.Range( 5, 6 ), new ve.Range( 2, 3 ) ] ),
		true,
		'Overlapping ranges'
	);
	assert.strictEqual(
		action.overlapsRanges( [ new ve.Range( 5, 6 ), new ve.Range( 5, 7 ) ] ),
		false,
		'Nonoverlapping ranges'
	);
} );

QUnit.test( 'select', ( assert ) => {
	const isMobileOrig = OO.ui.isMobile;

	const cases = [
		{
			name: 'Desktop selects a focusable node',
			isMobile: false,
			selectFocusRange: false,
			expected: new ve.Range( 1, 4 )
		},
		{
			name: 'Mobile moves the cursor instead of selecting a focusable node',
			isMobile: true,
			selectFocusRange: false,
			expected: new ve.Range( 4 )
		},
		{
			name: 'Mobile selects the focus range on request',
			isMobile: true,
			selectFocusRange: true,
			expected: new ve.Range( 1, 4 )
		}
	];

	try {
		cases.forEach( ( caseItem ) => {
			// setSelection reads the document range, which needs the internal list
			const doc = new ve.dm.Document( [
				{ type: 'paragraph' }, ...'abcdefghij', { type: '/paragraph' },
				{ type: 'internalList' }, { type: '/internalList' }
			] );
			const surfaceModel = new ve.dm.Surface( doc );
			const fragments = [ surfaceModel.getFragment( new ve.dm.LinearSelection( new ve.Range( 1, 4 ) ) ) ];
			const action = new mw.editcheck.EditCheckAction( { fragments, choices: [] } );

			// Start outside the check range, so the cursor has somewhere to move to
			surfaceModel.setLinearSelection( new ve.Range( 8 ) );

			OO.ui.isMobile = () => caseItem.isMobile;
			// Pretend the check range holds a focusable node
			action.select( {
				getModel: () => surfaceModel,
				getView: () => ( { findFocusedNode: () => ( {} ) } )
			}, caseItem.selectFocusRange, false );

			assert.equalRange(
				surfaceModel.getSelection().getRange(),
				caseItem.expected,
				caseItem.name
			);
		} );
	} finally {
		OO.ui.isMobile = isMobileOrig;
	}
} );

QUnit.test( 'findEqualActions', ( assert ) => {
	const [ first, second, third ] = ve.test.utils.EditCheck.makeComparableActions( [ 'first', 'second', 'third' ] );
	const secondReplacement = new mw.editcheck.EditCheckAction( {
		fragments: second.fragments, choices: [], check: second.check, id: second.id
	} );

	assert.deepEqual(
		mw.editcheck.EditCheckAction.static.findEqualActions( [ first, second, third ], [ first, secondReplacement ] ),
		[ first, secondReplacement ],
		'Actions are replaced by their equal actions from the list, and actions not in the list are removed'
	);
} );

QUnit.test( 'intendComplete, cancelComplete and discarded', ( assert ) => {
	const doc = new ve.dm.Document( [ { type: 'paragraph' }, ...'abcdef', { type: '/paragraph' } ] ),
		surface = new ve.dm.Surface( doc ),
		fragments = [ surface.getFragment( new ve.dm.LinearSelection( new ve.Range( 1, 4 ) ) ) ];

	function makeAction() {
		const action = new mw.editcheck.EditCheckAction( { fragments, choices: [] } );
		const events = [];
		action.on( 'complete', ( message ) => events.push( { type: 'complete', message } ) );
		action.on( 'discard', () => events.push( { type: 'discard' } ) );
		return { action, events };
	}

	let { action, events } = makeAction();
	action.intendComplete();
	action.discarded();
	assert.strictEqual( action.completed, true, 'An intended completion is honoured when the action is discarded' );
	assert.deepEqual(
		events,
		[ { type: 'complete', message: undefined }, { type: 'discard' } ],
		'complete fires before discard, and both fire exactly once'
	);

	( { action, events } = makeAction() );
	action.discarded();
	assert.strictEqual( action.completed, false, 'A plain discard, with no prior intendComplete, does not complete the action' );
	assert.deepEqual( events, [ { type: 'discard' } ], 'Only discard fires when completion was never intended' );

	( { action, events } = makeAction() );
	action.intendComplete();
	action.cancelComplete();
	action.discarded();
	assert.strictEqual( action.completed, false, 'cancelComplete stops a later discard from completing the action' );
	assert.deepEqual( events, [ { type: 'discard' } ], 'Only discard fires once an intended completion has been cancelled' );

	( { action, events } = makeAction() );
	action.complete( 'done' );
	action.intendComplete();
	action.discarded();
	assert.deepEqual(
		events,
		[ { type: 'complete', message: 'done' }, { type: 'discard' } ],
		'An explicit completion is not duplicated or overridden by a later discard, even if completion was intended'
	);
} );

QUnit.test( 'stale and revising', ( assert ) => {
	const doc = ve.dm.example.createExampleDocumentFromData( [
		{ type: 'paragraph' }, ...'abcdef', { type: '/paragraph' },
		{ type: 'internalList' }, { type: '/internalList' }
	] );
	const surface = new ve.dm.Surface( doc );
	const controller = {
		taggedFragments: {},
		taggedIds: {},
		ephemeralTags: [],
		registerEphemeralTag: ve.test.utils.EditCheck.dummyController.registerEphemeralTag,
		unregisterEphemeralTag: ve.test.utils.EditCheck.dummyController.unregisterEphemeralTag
	};
	const check = new mw.editcheck.BaseEditCheck( controller, {}, false );
	check.canBeStale = () => true;
	const name = check.getName();
	const newAction = ( config ) => new mw.editcheck.EditCheckAction( ve.extendObject( {
		check,
		choices: [],
		fragments: [ surface.getLinearFragment( new ve.Range( 1, 4 ) ) ]
	}, config ) );

	const action = newAction();
	const events = [];
	action.on( 'stale', ( stale ) => events.push( stale ) );
	assert.false( action.isStale(), 'New action is not stale' );

	action.startRevising();
	assert.true( action.isStale(), 'Revising action is stale' );
	assert.strictEqual( controller.ephemeralTags.length, 1, 'Revising tag is ephemeral' );

	surface.getLinearFragment( new ve.Range( 4 ) ).insertContent( 'x' );
	assert.true( action.isRevising(), 'Text typed at the end stays in the revising range' );
	assert.false( action.updateStale( true ), 'Checking the text again does not stop revising' );
	assert.false( newAction( { fragments: [ surface.getLinearFragment( new ve.Range( 1, 5 ) ) ] } ).isRevising(), 'Other action in the revising range is not revising' );

	action.stopRevising();
	assert.false( action.isStale(), 'Action is not stale after stopRevising' );
	assert.strictEqual( controller.ephemeralTags.length, 0, 'Revising tag is unregistered' );
	assert.deepEqual( events, [ true, false ], 'Stale events' );

	surface.getLinearFragment( new ve.Range( 2 ) ).insertContent( 'y' );
	assert.true( action.updateStale(), 'Typing makes the action stale' );
	assert.true( action.updateStale( true ), 'Checking the text again makes the action fresh' );

	action.startRevising();
	surface.getLinearFragment( new ve.Range( 2 ) ).insertContent( 'z' );
	// Same as Controller#clearEphemeralTagsForSelection
	controller.taggedFragments[ name ].revising = [];
	assert.true( action.updateStale(), 'Clearing the revising tag changes the stale state' );
	assert.false( action.isStale(), 'Text typed while revising does not keep the action stale' );

	const actionWithId = newAction( { id: 'example' } );
	actionWithId.startRevising();
	assert.true( actionWithId.isRevising(), 'Action with an ID uses its fragments for the revising tag' );
} );

QUnit.test( 'Revising does not apply to new actions in the tagged range', ( assert ) => {
	const doc = ve.dm.example.createExampleDocumentFromData( [
		{ type: 'paragraph' }, ...'abc', { type: '/paragraph' },
		{ type: 'internalList' }, { type: '/internalList' }
	] );
	const surface = new ve.dm.Surface( doc );
	const controller = {
		taggedFragments: {},
		taggedIds: {},
		ephemeralTags: [],
		registerEphemeralTag: ve.test.utils.EditCheck.dummyController.registerEphemeralTag,
		unregisterEphemeralTag: ve.test.utils.EditCheck.dummyController.unregisterEphemeralTag
	};
	const check = new mw.editcheck.BaseEditCheck( controller, {}, false );
	check.canBeStale = () => true;
	const newAction = ( range ) => new mw.editcheck.EditCheckAction( {
		check,
		choices: [],
		fragments: [ surface.getLinearFragment( range ) ]
	} );

	const action = newAction( new ve.Range( 1, 4 ) );
	action.startRevising();
	// Split the paragraph at its end, as the Enter key does. The tag grows
	// into the new paragraph.
	surface.getLinearFragment( new ve.Range( 4 ) ).insertContent( [ { type: '/paragraph' }, { type: 'paragraph' } ] );
	assert.true( action.isRevising(), 'The action that started revising is revising' );

	// A later run makes a new action for the original paragraph
	const replacement = newAction( new ve.Range( 1, 4 ) );
	replacement.updateStale();
	assert.false( replacement.isStale(), 'New action for the split paragraph is not stale' );

	// Pre-save makes a new action for the same range
	const preSaveAction = newAction( action.fragments[ 0 ].getSelection().getRange() );
	preSaveAction.updateStale();
	assert.false( preSaveAction.isStale(), 'New pre-save action for the same range is not stale' );
} );
