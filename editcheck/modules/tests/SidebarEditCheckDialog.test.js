QUnit.module( 'mw.editcheck.SidebarEditCheckDialog', ve.test.utils.newEditCheckEnvironment() );

QUnit.test( 'onPosition gives the same positions as setting each margin in turn', ( assert ) => {
	const $container = $( '<div>' ).css( { position: 'absolute', top: '50px', left: 0, width: '200px' } );
	// Widgets have vertical margins, which collapse with the margins of adjacent widgets
	const $style = $( '<style>' ).text( '.stub-widget { height: 20px; margin: 8px 0; }' );
	const $actions = $( '<div>' );
	$container.append( $style, $( '<p>' ).text( 'Header' ), $actions );
	$( document.body ).append( $container );

	// Selection tops, relative to the surface
	const tops = [
		// The first widget
		0,
		// Below the natural position: a large margin
		100,
		// Just below the natural position: a margin smaller than the default margin
		124,
		// Above the natural position: no margin
		0,
		// No visible selection: the default margin
		null,
		// Below a widget with no visible selection
		300,
		// Hidden widget
		600,
		400,
		// Not in $actions
		500
	];
	const actions = tops.map( ( top ) => ( {
		widget: { $element: $( '<div>' ).addClass( 'stub-widget' ) },
		getHighlightSelections: () => top === null ? [] : [ { top } ]
	} ) );
	actions.slice( 0, 8 ).forEach( ( action ) => $actions.append( action.widget.$element ) );
	actions[ 6 ].widget.$element.css( 'display', 'none' );
	$container.append( actions[ 8 ].widget.$element );

	const dialog = {
		inBeforeSave: false,
		currentActions: actions,
		$actions,
		surface: { getView: () => ( { $element: $container } ) }
	};
	const originalNewFromModel = ve.ce.Selection.static.newFromModel;
	ve.ce.Selection.static.newFromModel = ( selection ) => ( {
		getSelectionBoundingRect: () => ( { top: selection.top } ),
		isNativeCursor: () => false
	} );
	const getLayout = () => actions.map( ( action ) => [
		action.widget.$element[ 0 ].style.marginTop,
		action.widget.$element.offset().top
	] );
	try {
		// The old way: set each margin, then read the position of the next widget
		const surfaceTop = $container.offset().top + 8;
		actions.forEach( ( action ) => {
			const $element = action.widget.$element;
			$element.css( 'margin-top', '' );
			const top = Math.min( Infinity, ...action.getHighlightSelections().map( ( selection ) => selection.top ) );
			$element.css( 'margin-top', Math.max( 0, top + surfaceTop - $element.offset().top ) );
		} );
		const expected = getLayout();
		actions.forEach( ( action ) => action.widget.$element.css( 'margin-top', '50px' ) );

		ve.ui.SidebarEditCheckDialog.prototype.onPosition.call( dialog );

		assert.deepEqual( getLayout(), expected, 'Each widget has the same margin and position' );
		assert.notStrictEqual( expected[ 1 ][ 0 ], '0px', 'The test has a widget with a large margin' );
		assert.true( parseFloat( expected[ 2 ][ 0 ] ) > 0 && parseFloat( expected[ 2 ][ 0 ] ) < 8, 'The test has a widget with a margin smaller than the default margin' );
		assert.strictEqual( expected[ 4 ][ 0 ], '', 'A widget with no visible selection has the default margin' );
		assert.notStrictEqual( expected[ 5 ][ 0 ], '0px', 'The widget below it has a margin' );
	} finally {
		ve.ce.Selection.static.newFromModel = originalNewFromModel;
		$container.remove();
	}
} );
