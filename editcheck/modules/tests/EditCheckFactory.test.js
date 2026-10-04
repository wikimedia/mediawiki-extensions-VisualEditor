QUnit.module( 'mw.editcheck.EditCheckFactory', ve.test.utils.newEditCheckEnvironment() );

QUnit.test( 'createAllActionsByListener', ( assert ) => {
	const doc = new ve.dm.Document( [ { type: 'paragraph' }, ...'abcdef', { type: '/paragraph' } ] ),
		surface = new ve.dm.Surface( doc );

	const makeStubCheckClass = function ( name, listener, actionsCallback ) {
		const Check = function () {};
		OO.inheritClass( Check, mw.editcheck.BaseEditCheck );
		Check.static.name = name;
		Check.prototype.canBeShown = function () {
			return true;
		};
		Check.prototype[ listener ] = function () {
			return actionsCallback( this );
		};
		return Check;
	};
	const makeAction = ( check, start ) => new mw.editcheck.EditCheckAction( {
		check,
		fragments: [ surface.getLinearFragment( new ve.Range( start, start + 1 ) ) ]
	} );

	const cases = [
		{
			msg: 'Simple synchronous check, single action',
			checks: [
				makeStubCheckClass( 'sync', 'onDocumentChange',
					( check ) => makeAction( check, 2 )
				)
			],
			expectedActions: [ 'sync-2' ]
		},
		{
			msg: 'Simple synchronous check, array of actions',
			checks: [
				makeStubCheckClass( 'syncMany', 'onDocumentChange',
					( check ) => [ makeAction( check, 2 ), makeAction( check, 1 ) ]
				)
			],
			expectedActions: [ 'syncMany-1', 'syncMany-2' ]
		},
		{
			msg: 'Simple promise check, single action',
			checks: [
				makeStubCheckClass( 'promise', 'onDocumentChange',
					( check ) => Promise.resolve( makeAction( check, 2 ) )
				)
			],
			expectedActions: [ 'promise-2' ]
		},
		{
			msg: 'Simple promise check, array of actions',
			checks: [
				makeStubCheckClass( 'promiseMany', 'onDocumentChange',
					( check ) => Promise.resolve( [ makeAction( check, 4 ), makeAction( check, 2 ) ] )
				)
			],
			expectedActions: [ 'promiseMany-2', 'promiseMany-4' ]
		},
		{
			msg: 'Simple promise check, array of promises',
			checks: [
				makeStubCheckClass( 'promiseManyPromises', 'onDocumentChange',
					( check ) => [ Promise.resolve( makeAction( check, 4 ) ), Promise.resolve( makeAction( check, 2 ) ) ]
				)
			],
			expectedActions: [ 'promiseManyPromises-2', 'promiseManyPromises-4' ]
		},
		{
			msg: 'Rejecting promise check',
			checks: [
				makeStubCheckClass( 'promiseReject', 'onDocumentChange',
					() => [ Promise.reject( 'oh no' ) ]
				)
			],
			expectedActions: []
		},
		{
			msg: 'Partially rejecting promise check',
			checks: [
				makeStubCheckClass( 'promiseRejectPartial', 'onDocumentChange',
					( check ) => [ Promise.reject( 'oh no' ), Promise.resolve( makeAction( check, 1 ) ) ]
				)
			],
			expectedActions: [ 'promiseRejectPartial-1' ]
		},
		{
			msg: 'jQuery promises',
			checks: [
				makeStubCheckClass( 'jQuery', 'onDocumentChange',
					( check ) => [
						ve.createDeferred().resolve( makeAction( check, 4 ) ).promise(),
						ve.createDeferred().reject( 'oh no' ).promise(),
						ve.createDeferred().resolve( makeAction( check, 1 ) ).promise()
					]
				)
			],
			expectedActions: [ 'jQuery-1', 'jQuery-4' ]
		},
		{
			msg: 'jQuery promises, allSettled polyfill',
			checks: [
				makeStubCheckClass( 'jQuery', 'onDocumentChange',
					( check ) => [
						ve.createDeferred().resolve( makeAction( check, 4 ) ).promise(),
						ve.createDeferred().reject( 'oh no' ).promise(),
						ve.createDeferred().resolve( makeAction( check, 1 ) ).promise()
					]
				)
			],
			expectedActions: [ 'jQuery-1', 'jQuery-4' ],
			forceAllSettledPolyfill: true
		},
		{
			msg: 'Mixed resolving and rejecting checks, promise and sync',
			checks: [
				makeStubCheckClass( 'promiseMany', 'onDocumentChange',
					( check ) => Promise.resolve( [ makeAction( check, 4 ), makeAction( check, 2 ) ] )
				),
				makeStubCheckClass( 'promiseManyPromises', 'onDocumentChange',
					( check ) => [ Promise.resolve( makeAction( check, 4 ) ), Promise.resolve( makeAction( check, 2 ) ) ]
				),
				makeStubCheckClass( 'promiseReject', 'onDocumentChange',
					() => [ Promise.reject( 'oh no' ) ]
				),
				makeStubCheckClass( 'promiseRejectPartial', 'onDocumentChange',
					( check ) => [ Promise.reject( 'oh no' ), Promise.resolve( makeAction( check, 1 ) ) ]
				),
				makeStubCheckClass( 'syncMany', 'onDocumentChange',
					( check ) => [ makeAction( check, 3 ), makeAction( check, 0 ) ]
				),
				makeStubCheckClass( 'jQuery', 'onDocumentChange',
					( check ) => [
						ve.createDeferred().resolve( makeAction( check, 4 ) ).promise(),
						ve.createDeferred().reject( 'oh no' ).promise(),
						ve.createDeferred().resolve( makeAction( check, 1 ) ).promise()
					]
				)
			],
			expectedActions: [ 'syncMany-0', 'promiseRejectPartial-1', 'jQuery-1', 'promiseMany-2', 'promiseManyPromises-2', 'syncMany-3', 'promiseMany-4', 'promiseManyPromises-4', 'jQuery-4' ]
		}
	];

	/* eslint-disable es-x/no-promise-all-settled */
	const allSettled = Promise.allSettled;
	cases.forEach( ( caseItem ) => {
		if ( caseItem.forceAllSettledPolyfill ) {
			Promise.allSettled = undefined;
		}
		const factory = new mw.editcheck.EditCheckFactory();
		caseItem.checks.forEach( ( checkClass ) => {
			factory.register( checkClass );
		} );
		const done = assert.async();
		let progressEvents = 0;
		factory.createAllActionsByListener(
			ve.test.utils.EditCheck.dummyController,
			caseItem.listener || 'onDocumentChange',
			surface,
			caseItem.includeSuggestions,
			() => progressEvents++
		).then( ( actions ) => {
			assert.deepEqual(
				actions.map( ( action ) => `${ action.getName() }-${ action.getHighlightSelections()[ 0 ].getRange().start }` ),
				caseItem.expectedActions,
				caseItem.msg
			);
			assert.strictEqual( progressEvents, caseItem.expectedActions.length, caseItem.msg + ': expected progress count' );
			done();
		} );
		Promise.allSettled = allSettled;
	} );
	/* eslint-enable es-x/no-promise-all-settled */
} );

QUnit.test( 'buildConfig', ( assert ) => {
	const factory = new mw.editcheck.EditCheckFactory();
	const Check = function () {};
	OO.inheritClass( Check, mw.editcheck.BaseEditCheck );
	Check.static.name = 'test';
	Check.static.defaultConfig = {
		ignoreSections: [ 'References' ],
		extraNamespaces: { Draft: true },
		maximumEditCount: 100
	};
	factory.register( Check );

	mw.editcheck.config = {
		'*': {
			'+ignoreSections': [ 'Notes' ],
			maximumEditCount: 50
		},
		test: {
			'+ignoreSections': [ 'See also' ],
			'-ignoreSections': [ 'References' ],
			'+extraNamespaces': { User: true }
		}
	};

	assert.deepEqual(
		factory.buildConfig( 'test', { '+ignoreSections': [ 'Extra' ] } ),
		{
			ignoreSections: [ 'Notes', 'See also', 'Extra' ],
			extraNamespaces: { Draft: true, User: true },
			maximumEditCount: 50
		},
		'Prefixed keys apply to the check defaults and to earlier configs'
	);
	assert.deepEqual(
		factory.buildConfig( 'unregistered' ),
		{ ignoreSections: [ 'Notes' ], maximumEditCount: 50 },
		'Unregistered check gets the shared config only'
	);
} );

QUnit.test( 'buildConfig output is not changed by the check constructor', ( assert ) => {
	const factory = new mw.editcheck.EditCheckFactory();
	const Check = function ( controller, config ) {
		mw.editcheck.BaseEditCheck.call( this, controller, config );
	};
	OO.inheritClass( Check, mw.editcheck.BaseEditCheck );
	Check.static.name = 'test';
	Check.static.defaultConfig = {
		ignoreSections: [ 'References', 'Notes' ],
		extraNamespaces: { Draft: true },
		maximumEditCount: 100
	};
	factory.register( Check );

	mw.editcheck.config = {
		'*': {
			'+ignoreSections': [ 'A' ],
			'-ignoreSections': 'Notes',
			'-extraNamespaces': [ 'Draft' ]
		},
		test: {
			'+ignoreSections': [ 'B' ],
			'-ignoreSections': [ 'References' ],
			'+extraNamespaces': { User: true },
			maximumEditCount: 5
		}
	};

	const extraConfig = { '-ignoreSections': [ 'A' ] };
	const layers = [ Check.static.defaultConfig, mw.editcheck.config, extraConfig ];
	const layersBefore = ve.copy( layers );

	const config = factory.buildConfig( 'test', extraConfig );
	assert.deepEqual(
		config,
		{ ignoreSections: [ 'B' ], extraNamespaces: { User: true }, maximumEditCount: 5 },
		'Removed items and keys are not in the config'
	);
	assert.deepEqual( new Check( null, config ).config, config, 'Check config is the same as the built config' );
	assert.deepEqual( layers, layersBefore, 'Defaults, site config and extra config are not changed' );
} );
