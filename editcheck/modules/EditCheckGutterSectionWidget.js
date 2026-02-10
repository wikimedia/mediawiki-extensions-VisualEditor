/**
 * EditCheckGutterSectionWidget
 *
 * @class
 *
 * @param {Object} config Configuration options
 * @param {mw.editcheck.Controller} config.controller
 * @param {mw.editcheck.EditCheckAction[]} config.actions
 */
mw.editcheck.EditCheckGutterSectionWidget = function MWEditCheckGutterSectionWidget( config ) {
	this.controller = config.controller;
	this.actions = config.actions;

	this.icon = new OO.ui.IconWidget();
	this.iconLabel = new OO.ui.LabelWidget( {
		label: this.actions.length.toString(),
		invisibleLabel: this.actions.length === 1
	} );

	this.actionButton = new OO.ui.ButtonWidget( {
		icon: 'check',
		flags: [ 'invert' ],
		label: 'act',
		invisibleLabel: true,
		framed: false
	} );
	this.actionButton.toggle( false );

	this.$element = $( '<div>' )
		.addClass( 've-ui-editCheck-gutter-action' )
		.append( this.icon.$element, this.iconLabel.$element, this.actionButton.$element )
		.on( 'click', this.onClick.bind( this ) );

	if ( config.rect ) {
		this.setPosition( config.rect );
	}
};

OO.initClass( mw.editcheck.EditCheckGutterSectionWidget );

/* Methods */

/**
 * Check if any of the actions in this section are focused
 *
 * @return {boolean}
 */
mw.editcheck.EditCheckGutterSectionWidget.prototype.isFocused = function () {
	return this.actions.includes( this.controller.focusedAction );
};

/**
 * Get the primary action for this section (the focused one, or the first one)
 *
 * @return {mw.editcheck.EditCheckAction}
 */
mw.editcheck.EditCheckGutterSectionWidget.prototype.getPrimaryAction = function () {
	if ( this.controller.focusedAction && this.actions.includes( this.controller.focusedAction ) ) {
		return this.controller.focusedAction;
	}
	return this.actions[ 0 ];
};

/**
 * Update the rendering of the gutter section
 */
mw.editcheck.EditCheckGutterSectionWidget.prototype.update = function () {
	const action = this.getPrimaryAction();

	this.$element
		.removeClass( ( index, classes ) => (
			classes.split( ' ' ).filter( ( cls ) => cls.startsWith( 've-ui-editCheck-gutter-action-' ) )
		) )
		// The following classes are used here:
		// * ve-ui-editCheck-gutter-action-error
		// * ve-ui-editCheck-gutter-action-warning
		// * ve-ui-editCheck-gutter-action-notice
		// * ve-ui-editCheck-gutter-action-success
		.addClass( 've-ui-editCheck-gutter-action-' + action.getType() )
		.toggleClass( 've-ui-editCheck-gutter-action-inactive', !this.isFocused() )
		.toggleClass( 've-ui-editCheck-gutter-action-stale', action.isStale() )
		.toggleClass( 've-ui-editCheck-gutter-action-suggestion', action.isSuggestion() );

	if ( action.gutterQuickAction ) {
		this.$element.addClass( 've-ui-editCheck-gutter-action-quickaction' );
		this.icon.toggle( false );
		this.iconLabel.toggle( false );
		this.actionButton.toggle( true );
	} else {
		this.icon.setIcon( mw.editcheck.EditCheckActionWidget.static.iconMap[ action.getType() ] || 'notice' );
		this.icon.setFlags( action.getType() );
		this.icon.toggle( true );
		this.iconLabel.toggle( true );
		this.actionButton.toggle( false );
	}
};

/**
 * Set the position of the gutter section
 *
 * @param {DOMRect|Object} rect DOMRect or DOMRect-like object describing rectangle
 */
mw.editcheck.EditCheckGutterSectionWidget.prototype.setPosition = function ( rect ) {
	this.$element.css( {
		top: rect.top + 2,
		height: rect.height
	} );

	this.update();
};

/**
 * Handle click events
 */
mw.editcheck.EditCheckGutterSectionWidget.prototype.onClick = function () {
	if ( this.acting ) {
		return;
	}
	const action = this.getPrimaryAction();
	this.controller.focusAction( action, true );
	// Should we trigger the popup? By default yes, unless
	// we're in the onBeforeSave mode where we can assume
	// something else is handling it.
	if ( this.controller.inBeforeSave ) {
		return;
	}
	// mid-edit
	const controller = this.controller;
	const surface = controller.surface;
	if ( action.gutterQuickAction ) {
		// This is an abridged set of what ve.ui.EditCheckDialog.prototype.onAct does
		const promise = action.check.act( action.gutterQuickAction, action, surface );
		this.actionButton.setDisabled( true );
		this.acting = true;
		( promise || ve.createDeferred().resolve().promise() ).always( () => {
			this.actionButton.setDisabled( false );
			this.acting = false;
			controller.updatePositionsDebounced();
			if ( controller.getActions().includes( action ) ) {
				// The action wasn't removed, so show its dialog again
				this.showDialogWithAction( action );
			}
		} );
		return;
	}
	const currentWindow = surface.getToolbarDialogs( ve.ui.FixedEditCheckDialog.static.position ).getCurrentWindow();
	if (
		currentWindow && currentWindow.constructor.static.name === 'fixedEditCheckDialog' &&
		this.actions.every( ( sact ) => currentWindow.hasAction( sact ) )
	) {
		// Second click: defocus and close
		this.controller.closeDialog( 'gutter-toggle' );
		return;
	} else {
		this.showDialogWithAction( action );
	}
};

/**
 * Show the edit check dialog with a specific action focused
 *
 * @param {mw.editcheck.EditCheckAction} action Action to focus
 */
mw.editcheck.EditCheckGutterSectionWidget.prototype.showDialogWithAction = function ( action ) {
	const controller = this.controller;
	const surface = controller.surface;
	const currentWindow = surface.getToolbarDialogs( ve.ui.FixedEditCheckDialog.static.position ).getCurrentWindow();
	if ( !currentWindow || currentWindow.constructor.static.name !== 'fixedEditCheckDialog' ) {
		const windowAction = ve.ui.actionFactory.create( 'window', this.controller.surface, 'check' );
		windowAction.open(
			'fixedEditCheckDialog',
			{
				controller: this.controller,
				inBeforeSave: false,
				actions: this.actions,
				newActions: [ action ],
				footer: this.actions.length !== 1,
				// just filter out any discarded actions from the allowed set
				updateFilter: ( updatedActions, newActions, discardedActions, prevActions ) => prevActions.filter( ( pact ) => !discardedActions.includes( pact ) )
			}
		);
		this.controller.focusAction( action, true );
	} else {
		currentWindow.showActions( this.actions, [ action ] );
		currentWindow.footer.toggle( this.actions.length !== 1 );
	}
};

/**
 * Teardown the widget
 */
mw.editcheck.EditCheckGutterSectionWidget.prototype.teardown = function () {
	this.$element.remove();

	this.controller = null;
	this.surface = null;
};
