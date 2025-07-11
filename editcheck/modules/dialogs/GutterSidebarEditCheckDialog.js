/*!
 * VisualEditor UserInterface GutterSidebarEditCheckDialog class.
 *
 * @copyright See AUTHORS.txt
 */

/**
 * @class
 * @extends ve.ui.SidebarDialog
 * @constructor
 * @param {Object} config Configuration options
 */
ve.ui.GutterSidebarEditCheckDialog = function VeUiGutterSidebarEditCheckDialog( config ) {
	// Parent constructor
	ve.ui.GutterSidebarEditCheckDialog.super.call( this, config );

	this.$element.addClass( 've-ui-gutterSidebarEditCheckDialog' );
};

/* Inheritance */

OO.inheritClass( ve.ui.GutterSidebarEditCheckDialog, ve.ui.SidebarDialog );

/* Static properties */

ve.ui.GutterSidebarEditCheckDialog.static.name = 'gutterSidebarEditCheckDialog';

ve.ui.GutterSidebarEditCheckDialog.static.size = 'gutter';

// The gutter should never steal the focus, as it's intended to be a discreet notification
ve.ui.GutterSidebarEditCheckDialog.static.activeSurface = true;

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.GutterSidebarEditCheckDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.GutterSidebarEditCheckDialog.super.prototype.initialize.call( this );
};

/**
 * @inheritdoc
 */
ve.ui.GutterSidebarEditCheckDialog.prototype.getSetupProcess = function ( data ) {
	const process = this.constructor.super.prototype.getSetupProcess.call( this, data );
	return process.first( () => {
		this.controller = data.controller;
		if ( !Object.prototype.hasOwnProperty.call( data, 'inBeforeSave' ) ) {
			throw new Error( 'inBeforeSave argument required' );
		}
		this.inBeforeSave = data.inBeforeSave;
		this.surface = data.controller.surface;
		this.surface.getTarget().$element.addClass( 've-ui-editCheck-gutter-active' );

		this.controller.on( 'actionsUpdated', this.onActionsUpdated, null, this );
		this.controller.on( 'position', this.onPosition, null, this );

		this.renderActions( data.actions || this.controller.getActions() );
	}, this );
};

/**
 * @inheritdoc
 */
ve.ui.GutterSidebarEditCheckDialog.prototype.getTeardownProcess = function ( data ) {
	// Parent method
	const process = ve.ui.GutterSidebarEditCheckDialog.super.prototype.getTeardownProcess.call( this, data );
	return process.first( () => {
		this.controller.disconnect( this );

		this.surface = null;
		this.controller = null;
	}, this );
};

/**
 * @inheritdoc
 */
ve.ui.GutterSidebarEditCheckDialog.prototype.onActionsUpdated = function ( inBeforeSave, actions ) {
	if ( inBeforeSave !== this.inBeforeSave ) {
		return;
	}
	this.renderActions( actions );
};

/**
 * @inheritdoc
 */
ve.ui.GutterSidebarEditCheckDialog.prototype.onPosition = function () {
	this.renderActions( this.controller.getActions() );
};

/**
 * Render the edit check actions as gutter icons, grouping overlapping actions.
 *
 * @param {mw.editcheck.EditCheckAction[]} actions List of actions to render
 */
ve.ui.GutterSidebarEditCheckDialog.prototype.renderActions = function ( actions ) {
	if ( actions.length === 0 ) {
		this.close( 'complete' );
		return;
	}

	const surfaceView = this.surface.getView();
	const sections = [];

	// First join overlapping actions into "sections"
	actions.forEach( ( action ) => {
		const rects = action.getHighlightSelections().map( ( selection ) => {
			const selectionView = ve.ce.Selection.static.newFromModel( selection, surfaceView );
			return selectionView.getSelectionBoundingRect();
		} );
		const boundingRect = ve.getBoundingRect( rects );
		if ( !boundingRect ) {
			return;
		}

		// Look for any other section that the new one overlaps with
		// TODO: join when two other sections are joined by the new one?
		const prev = sections.find( ( p ) => !( p.rect.bottom < boundingRect.top || boundingRect.bottom < p.rect.top ) );
		if ( prev ) {
			// overlap, so merge
			prev.actions.push( action );
			// top, bottom, left, right, width, height
			prev.rect.top = Math.min( prev.rect.top, boundingRect.top );
			prev.rect.bottom = Math.max( prev.rect.bottom, boundingRect.bottom );
			prev.rect.height = prev.rect.bottom - prev.rect.top;
			return;
		}
		sections.push( { actions: [ action ], rect: boundingRect } );
	} );

	// Now try to reuse old widgets if possible, to avoid icons flickering
	const oldWidgets = this.widgets || [];
	this.widgets = [];
	sections.forEach( ( section ) => {
		const action = section.actions[ 0 ];
		let widget;
		const index = oldWidgets.findIndex(
			( owidget ) => owidget.actions.length === section.actions.length &&
				owidget.actions.every( ( oact ) => section.actions.includes( oact ) )
		);
		if ( index !== -1 ) {
			widget = oldWidgets.splice( index, 1 )[ 0 ];
		} else {
			const icon = new OO.ui.IconWidget( {
				icon: mw.editcheck.EditCheckActionWidget.static.iconMap[ action.getType() ] || 'notice'
			} );
			const iconLabel = new OO.ui.LabelWidget( {
				label: section.actions.length.toString(),
				invisibleLabel: section.actions.length === 1
			} );
			widget = {
				actions: section.actions,
				icon: icon,
				iconLabel: iconLabel,
				$element: $( '<div>' )
					.addClass( 've-ui-editCheck-gutter-action' )
					// The following classes are used here:
					// * ve-ui-editCheck-gutter-action-error
					// * ve-ui-editCheck-gutter-action-warning
					// * ve-ui-editCheck-gutter-action-notice
					// * ve-ui-editCheck-gutter-action-success
					.addClass( 've-ui-editCheck-gutter-action-' + action.getType() )
					.append( icon.$element, iconLabel.$element )
					.on( 'click', () => {
						// Should we trigger the popup? By default yes, unless
						// we're in the onBeforeSave mode where we can assume
						// something else is handling it.
						if ( !this.inBeforeSave ) {
							// mid-edit
							const currentWindow = this.surface.getToolbarDialogs( ve.ui.FixedEditCheckDialog.static.position ).getCurrentWindow();
							if ( !currentWindow || currentWindow.constructor.static.name !== 'fixedEditCheckDialog' ) {
								const windowAction = ve.ui.actionFactory.create( 'window', this.surface, 'check' );
								windowAction.open(
									'fixedEditCheckDialog',
									{
										controller: this.controller,
										inBeforeSave: false,
										actions: section.actions,
										footer: section.actions.length !== 1,
										// just filter out any discarded actions from the allowed set
										updateFilter: ( updatedActions, newActions, discardedActions, prevActions ) => prevActions.filter( ( pact ) => !discardedActions.includes( pact ) )
									}
								);
							} else if ( section.actions.every( ( sact ) => currentWindow.hasAction( sact ) ) ) {
								// Second click: defocus and close
								return this.controller.closeDialog();
							} else {
								currentWindow.showActions( section.actions, [ action ] );
								currentWindow.footer.toggle( section.actions.length !== 1 );
							}
						}
						this.controller.focusAction( action, true );
					} )
			};
			this.$body.append( widget.$element );
		}
		if ( widget.actions.includes( this.controller.focusedAction ) ) {
			widget.icon.setFlags( action.getType() );
		} else {
			widget.icon.clearFlags();
		}
		widget.$element.css( {
			top: section.rect.top + 2,
			height: section.rect.height
		} ).toggleClass( 've-ui-editCheck-gutter-action-inactive', !section.actions.includes( this.controller.focusedAction ) );

		this.widgets.push( widget );
	} );

	oldWidgets.forEach( ( widget ) => widget.$element.remove() );

	// surfaceView.$element.after( this.$mobile );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.GutterSidebarEditCheckDialog );
