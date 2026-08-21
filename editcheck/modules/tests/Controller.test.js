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
