mw.editcheck.EditCheckFactory = function MWEditEditCheckFactory() {
	// Parent constructor
	mw.editcheck.EditCheckFactory.super.call( this, this.arguments );

	this.checksByListener = {
		onDocumentChange: [],
		onBranchNodeChange: [],
		onBeforeSave: []
	};
};

/* Inheritance */

OO.inheritClass( mw.editcheck.EditCheckFactory, OO.Factory );

/* Methods */

/**
 * @inheritdoc
 */
mw.editcheck.EditCheckFactory.prototype.register = function ( constructor, name ) {
	name = name || ( constructor.static && constructor.static.name );

	if ( typeof name !== 'string' || name === '' ) {
		throw new Error( 'Check names must be strings and must not be empty' );
	}
	if ( !( constructor.prototype instanceof mw.editcheck.BaseEditCheck ) ) {
		throw new Error( 'Checks must be subclasses of mw.editcheck.BaseEditCheck' );
	}
	if ( this.lookup( name ) === constructor ) {
		// Don't allow double registration as it would create duplicate
		// entries in various caches.
		return;
	}

	// Parent method
	mw.editcheck.EditCheckFactory.super.prototype.register.call( this, constructor, name );

	Object.keys( this.checksByListener ).forEach( ( listener ) => {
		if ( constructor.prototype[ listener ] ) {
			this.checksByListener[ listener ].push( name );
		}
	} );
};

/**
 * @inheritdoc
 */
mw.editcheck.EditCheckFactory.prototype.unregister = function ( key ) {
	if ( typeof key === 'function' ) {
		key = key.key || ( key.static && key.static.name );
	}

	// Parent method
	mw.editcheck.EditCheckFactory.super.prototype.unregister.apply( this, arguments );

	Object.keys( this.checksByListener ).forEach( ( listener ) => {
		const index = this.checksByListener[ listener ].indexOf( key );
		if ( index !== -1 ) {
			this.checksByListener[ listener ].splice( index, 1 );
		}
	} );
};

/**
 * Get a list of registered command names.
 *
 * @param {string} listener Listener name, 'onDocumentChange', 'onBeforeSave'
 * @return {string[]}
 */
mw.editcheck.EditCheckFactory.prototype.getNamesByListener = function ( listener ) {
	if ( !this.checksByListener[ listener ] ) {
		throw new Error( `Unknown listener '${ listener }'` );
	}
	return this.checksByListener[ listener ];
};

/**
 * Create all checks actions for a given listener
 *
 * TODO: Rename to createAllActionsByListener
 *
 * @param {mw.editcheck.Controller} controller
 * @param {string} listenerName Listener name
 * @param {ve.dm.Surface} surfaceModel Surface model
 * @param {mw.editcheck.EditCheckActions[]} existing Existing actions
 * @return {Promise} Promise that resolves with an updated list of Actions
 */
mw.editcheck.EditCheckFactory.prototype.createAllByListener = function ( controller, listenerName, surfaceModel, existing ) {
	const actionOrPromiseList = [];
	this.getNamesByListener( listenerName ).forEach( ( checkName ) => {
		const check = this.create( checkName, controller, mw.editcheck.config[ checkName ] );
		if ( !check.canBeShown() ) {
			return;
		}
		if (
			mw.config.get( 'wgVisualEditorConfig' ).editCheckSingle &&
			listenerName === 'onBeforeSave' &&
			check.getName() !== 'addReference'
		) {
			return;
		}
		const checkListener = check[ listenerName ];
		let actionOrPromise;
		try {
			actionOrPromise = checkListener.call( check, surfaceModel, existing );
		} catch ( ex ) {
			// HACK: ensure that synchronous exceptions are returned as rejected promises.
			// TODO: Consider making all checks return promises. This would unify exception
			// handling, at the cost of making debugging be async.
			actionOrPromise = Promise.reject( ex );
		}
		ve.batchPush( actionOrPromiseList, actionOrPromise );
	} );
	return Promise.all( actionOrPromiseList )
		.then( ( actions ) => actions.filter( ( action ) => action !== null ) )
		.then( ( actions ) => {
			actions.sort( mw.editcheck.EditCheckAction.static.compareStarts );
			return actions;
		} );
};

mw.editcheck.editCheckFactory = new mw.editcheck.EditCheckFactory();
