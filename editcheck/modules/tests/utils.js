ve.test.utils.EditCheck = {};

ve.test.utils.EditCheck.dummyController = {
	taggedFragments: {},
	taggedIds: {},
	ephemeralTags: [],
	registerEphemeralTag: function ( name, tag, fragment ) {
		this.ephemeralTags.push( { name, tag, fragment } );
	},
	getTarget: () => ve.init.target
};

/**
 * Make one suggestion action and one non-suggestion action
 *
 * Each action carries an id, so that tests can assert on which actions reached
 * a function without comparing the action objects themselves.
 *
 * @return {mw.editcheck.EditCheckAction[]} Suggestion action, then warning action
 */
ve.test.utils.EditCheck.makeDisplayActions = function () {
	const doc = new ve.dm.Document( [ { type: 'paragraph' }, ...'abcdef', { type: '/paragraph' } ] ),
		surface = new ve.dm.Surface( doc ),
		fragments = [ surface.getFragment( new ve.dm.LinearSelection( new ve.Range( 1, 4 ) ) ) ];

	return [
		new mw.editcheck.EditCheckAction( { fragments, choices: [], suggestion: true, id: 'suggestion' } ),
		new mw.editcheck.EditCheckAction( { fragments, choices: [], suggestion: false, id: 'warning' } )
	];
};

/**
 * Get the ids of a list of actions
 *
 * Missing actions give an empty list, so that a failure shows the difference
 * instead of stopping the test.
 *
 * @param {mw.editcheck.EditCheckAction[]} [actions] Actions to name
 * @return {string[]} Action ids
 */
ve.test.utils.EditCheck.actionIds = function ( actions ) {
	return ( actions || [] ).map( ( action ) => action.id );
};

/**
 * Make a controller stub which hides suggestions, as suppressSuggestionDisplay does
 *
 * @param {mw.editcheck.EditCheckAction[]} actions Actions the controller holds
 * @return {Object} Controller stub
 */
ve.test.utils.EditCheck.makeHidingController = function ( actions ) {
	return {
		getActions: () => actions,
		filterActionsForDisplay: ( toFilter ) => toFilter.filter( ( action ) => !action.isSuggestion() )
	};
};

// Edit check environment extends MW environment:
ve.test.utils.newEditCheckEnvironment = function ( env = {} ) {
	return ve.test.utils.newMwEnvironment( ve.extendObject( {}, env, {
		beforeEach() {
			this.originalConfig = mw.editcheck.config;
			mw.editcheck.config = {};
			if ( env.beforeEach ) {
				env.beforeEach.call( this );
			}
		},
		afterEach() {
			mw.editcheck.config = this.originalConfig;
			if ( env.afterEach ) {
				env.afterEach.call( this );
			}
		}
	} ) );
};
