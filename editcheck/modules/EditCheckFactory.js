/**
 * EditCheckFactory
 *
 * This class provides a registry of Edit Checks, and instantiates and calls them when createAllByListener() is called.
 *
 * The controller keeps track of the actions which have been returned by previous invocations, and deduplicates actions
 * which it has seen before. This allows us to keep state (mostly) out of the checks and EditCheckFactory itself.
 *
 * @class
 * @constructor
 * @extends OO.Factory
 */
mw.editcheck.EditCheckFactory = function MWEditCheckFactory() {
	// Parent constructor
	mw.editcheck.EditCheckFactory.super.call( this, arguments );

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
 * Invoked by Controller.prototype.updateForListener, which itself is called in response to user actions such as
 * navigating away from a paragraph, making changes to the document, or clicking 'Save changes...'
 *
 * Checks are created statelessly and then mapped to their 'originals' by the controller. The existing actions are
 * provided so that checks may, if necessary, do this mapping themselves in order to add state.
 *
 * TODO: Rename to createAllActionsByListener
 *
 * @param {mw.editcheck.Controller} controller
 * @param {string} listenerName Listener name
 * @param {ve.dm.Surface} surfaceModel Surface model
 * @param {mw.editcheck.EditCheckAction[]} existing Existing actions
 * @return {Promise} Promise that resolves with an updated list of Actions
 */
mw.editcheck.EditCheckFactory.prototype.createAllByListener = function ( controller, listenerName, surfaceModel, existing ) {
	const actionOrPromiseList = [];
	this.getNamesByListener( listenerName ).forEach( ( checkName ) => {
		const check = this.create( checkName, controller, mw.editcheck.config[ checkName ] );
		if ( !check.canBeShown() ) {
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
