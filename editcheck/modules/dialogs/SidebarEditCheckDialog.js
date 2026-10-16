/**
 * SidebarEditCheckDialog constructor.
 *
 * This dialog is shown to the side of a desktop editing session while the user is editing.
 *
 * @class
 * @extends ve.ui.SidebarDialog
 * @mixes ve.ui.EditCheckDialog
 * @param {Object} config
 */
ve.ui.SidebarEditCheckDialog = function VeUiSidebarEditCheckDialog( config ) {
	// Parent constructor
	ve.ui.SidebarEditCheckDialog.super.call( this, config );

	// Mixin constructor
	ve.ui.EditCheckDialog.call( this, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.SidebarEditCheckDialog, ve.ui.SidebarDialog );

OO.mixinClass( ve.ui.SidebarEditCheckDialog, ve.ui.EditCheckDialog );

/* Static properties */

ve.ui.SidebarEditCheckDialog.static.name = 'sidebarEditCheckDialog';

ve.ui.SidebarEditCheckDialog.static.size = 'medium';

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.SidebarEditCheckDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.SidebarEditCheckDialog.super.prototype.initialize.call( this );
	// Mixin method
	return ve.ui.EditCheckDialog.prototype.initialize.call( this );
};

/**
 * @inheritdoc
 */
ve.ui.SidebarEditCheckDialog.prototype.getSetupProcess = function ( data ) {
	// Parent method
	const process = ve.ui.SidebarEditCheckDialog.super.prototype.getSetupProcess.call( this, data );
	// Mixin method
	return ve.ui.EditCheckDialog.prototype.getSetupProcess.call( this, data, process ).next( () => {
		this.controller.on( 'position', this.onPosition, null, this );
	} );
};

/**
 * @inheritdoc
 */
ve.ui.SidebarEditCheckDialog.prototype.getTeardownProcess = function ( data ) {
	// Parent method
	const process = ve.ui.SidebarEditCheckDialog.super.prototype.getTeardownProcess.call( this, data );
	// Mixin method
	return ve.ui.EditCheckDialog.prototype.getTeardownProcess.call( this, data, process ).next( () => {
		this.controller.off( 'position', this.onPosition, this );
	} );
};

/**
 * Handle position events from the controller
 */
ve.ui.SidebarEditCheckDialog.prototype.onPosition = function () {
	if ( this.inBeforeSave ) {
		return;
	}
	const surfaceView = this.surface.getView();
	const surfaceTop = surfaceView.$element.offset().top + 8;
	const widgetElements = [];
	const targets = new Map();
	this.currentActions.forEach( ( action ) => {
		const widget = action.widget;
		if ( widget ) {
			widgetElements.push( widget.$element[ 0 ] );
			let top = Infinity;
			let isNativeCursor = false;
			action.getHighlightSelections().forEach( ( selection, i ) => {
				const selectionView = ve.ce.Selection.static.newFromModel( selection, surfaceView );
				const rect = selectionView.getSelectionBoundingRect();
				if ( !rect ) {
					return;
				}
				if ( i === 0 && selectionView.isNativeCursor() ) {
					isNativeCursor = true;
				}
				top = Math.min( top, rect.top );
			} );
			// A widget with no visible selection keeps its default margin
			if ( top !== Infinity ) {
				// Adjust alignment with text selection highlights
				targets.set( widget.$element[ 0 ], top + surfaceTop + ( isNativeCursor ? -2 : 0 ) );
			}
		}
	} );

	// A margin moves the widgets below it. Setting each margin and then reading the
	// position of the next widget makes the browser do a layout for each widget.
	// Thus, read all positions in one layout, and calculate how each margin moves
	// the widgets below it.
	const setMargin = ( element, offsetTop ) => {
		const margin = Math.max( 0, targets.get( element ) - offsetTop );
		element.style.marginTop = margin + 'px';
		return margin;
	};
	widgetElements.forEach( ( element ) => {
		element.style.marginTop = '';
	} );
	// A hidden widget does not move other widgets
	const shown = this.$actions.children().toArray().filter( ( element ) => element.offsetParent );
	if ( shown.length && targets.has( shown[ 0 ] ) ) {
		// The margin of the first widget can collapse with margins outside $actions.
		// Thus, set it before the other positions are read.
		setMargin( shown[ 0 ], $( shown[ 0 ] ).offset().top );
	}
	const items = shown.map( ( element ) => {
		const style = getComputedStyle( element );
		return {
			element,
			offsetTop: $( element ).offset().top,
			marginTop: parseFloat( style.marginTop ),
			marginBottom: parseFloat( style.marginBottom )
		};
	} );
	let shift = 0;
	items.forEach( ( item, i ) => {
		if ( i === 0 || !targets.has( item.element ) ) {
			return;
		}
		const margin = setMargin( item.element, item.offsetTop + shift );
		const previousMarginBottom = items[ i - 1 ].marginBottom;
		// Adjacent vertical margins collapse into the larger margin
		shift += Math.max( previousMarginBottom, margin ) - Math.max( previousMarginBottom, item.marginTop );
	} );
	const done = new Set( shown );
	targets.forEach( ( target, element ) => {
		if ( !done.has( element ) ) {
			setMargin( element, $( element ).offset().top );
		}
	} );
};

/**
 * @inheritdoc ve.ui.EditCheckDialog
 */
ve.ui.SidebarEditCheckDialog.prototype.onToggleCollapse = function () {
	// mixin
	ve.ui.EditCheckDialog.prototype.onToggleCollapse.apply( this, arguments );

	this.onPosition();
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.SidebarEditCheckDialog );
