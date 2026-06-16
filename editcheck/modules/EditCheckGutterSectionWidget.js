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
	this.navigableActions = config.navigableActions;

	this.$element = $( '<div>' )
		.addClass( 've-ui-editCheck-gutter-action' )
		.on( 'click', this.onClick.bind( this ) );

	// The icon keeps itself in view while a tall section scrolls past
	this.iconWidget = new mw.editcheck.EditCheckGutterSectionIconWidget( {
		$section: this.$element
	} );
	this.$element.append( this.iconWidget.$element );

	// Its metrics are viewport-derived, so refresh on resize. Rare, so debounced.
	this.updateStickyDebounced = ve.debounce( this.updateSticky.bind( this ), 100 );
	$( window ).on( 'resize', this.updateStickyDebounced );

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
	const check = this.actions.find( ( action ) => !action.isSuggestion() );
	if ( check ) {
		return check;
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
		.toggleClass( 've-ui-editCheck-gutter-action-suggestion', action.isSuggestion() )
		.toggleClass( 've-ui-editCheck-gutter-action-quickaction', !!action.gutterQuickAction );

	this.iconWidget.setAction( action, this.actions.length );
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
 * Keep this section's icon in view as the section scrolls past. Call after moving
 * the section, or when the viewport has changed.
 */
mw.editcheck.EditCheckGutterSectionWidget.prototype.updateSticky = function () {
	// A debounced resize can still land after teardown
	if ( !this.controller ) {
		return;
	}
	this.iconWidget.setStickyMetrics(
		mw.editcheck.EditCheckGutterSectionIconWidget.static.getStickyMetrics(
			this.controller.getTarget()
		)
	);
};

/**
 * Handle click events
 */
mw.editcheck.EditCheckGutterSectionWidget.prototype.onClick = function () {
	if ( this.acting ) {
		return;
	}
	const action = this.getPrimaryAction();
	// Should we trigger the popup? By default yes, unless
	// we're in the onBeforeSave mode where we can assume
	// something else is handling it.
	if ( this.controller.inBeforeSave ) {
		this.controller.focusAction( action, true );
		return;
	}
	// mid-edit
	const controller = this.controller;
	const surface = controller.surface;
	if ( action.gutterQuickAction ) {
		// This is an abridged set of what ve.ui.EditCheckDialog.prototype.onAct does
		const promise = action.check.act( action.gutterQuickAction, action, surface );
		this.iconWidget.setActing( true );
		this.acting = true;
		( promise || ve.createDeferred().resolve().promise() ).always( () => {
			this.iconWidget.setActing( false );
			this.acting = false;
			controller.updatePositionsDebounced();
			if ( controller.getActions().includes( action ) ) {
				// The action wasn't removed, so show its dialog again
				this.showDialogWithAction( action );
			}
		} );
		return;
	}
	const currentWindow = surface.getToolbarDialogs( ve.ui.MobileEditCheckDialog.static.position ).getCurrentWindow();
	if (
		currentWindow && currentWindow.constructor.static.name === 'mobileEditCheckDialog' &&
		this.actions.every( ( sact ) => currentWindow.hasActionInSection( sact ) )
	) {
		// Second click: defocus and close
		this.controller.focusAction( null );
		this.controller.closeDialog( 'gutter-toggle' );
		return;
	} else {
		this.showDialogWithAction( action );
	}
};

/**
 * Show the edit check dialog with this widget's actions and with a specific action focused
 *
 * @param {mw.editcheck.EditCheckAction} action Action to focus
 * @param {Object} [scrollConfig] Configuration for scrolling
 */
mw.editcheck.EditCheckGutterSectionWidget.prototype.showDialogWithAction = function ( action, scrollConfig ) {
	const controller = this.controller;
	const surface = controller.surface;
	action.select( surface, false, false );
	const currentWindow = surface.getToolbarDialogs( ve.ui.MobileEditCheckDialog.static.position ).getCurrentWindow();
	if ( !currentWindow || currentWindow.constructor.static.name !== 'mobileEditCheckDialog' ) {
		if ( scrollConfig && scrollConfig.alignToTop ) {
			// Scroll immediately, because we don't need to wait for the padding to settle
			controller.focusAction( action, true, scrollConfig );
		}
		const windowAction = ve.ui.actionFactory.create( 'window', this.controller.surface, 'check' );
		windowAction.open(
			'mobileEditCheckDialog',
			{
				controller,
				inBeforeSave: false,
				actions: this.navigableActions,
				newActions: [ action ],
				sectionActions: this.actions,
				footer: true,
				// Just filter out any discarded actions from the allowed set
				updateFilter: ( updatedActions, newActions, discardedActions, prevActions ) => prevActions.filter( ( a ) => !discardedActions.includes( a ) )
			}
		).then( () => {
			if ( scrollConfig && scrollConfig.alignToTop ) {
				// We already focused and scrolled because it was safe to do so
				return;
			}
			// Wait for window to open and new surface padding to be applied
			// before trying to focus and scroll.
			setTimeout( () => {
				controller.focusAction( action, true, scrollConfig );
			}, OO.ui.theme.getDialogTransitionDuration() );
		} );
	} else {
		controller.focusAction( action, true, scrollConfig );
		currentWindow.showActions( this.navigableActions, [ action ] );
		currentWindow.sectionActions = this.actions;
	}
};

/**
 * Teardown the widget
 */
mw.editcheck.EditCheckGutterSectionWidget.prototype.teardown = function () {
	$( window ).off( 'resize', this.updateStickyDebounced );
	this.iconWidget.teardown();
	this.$element.remove();

	this.controller = null;
	this.surface = null;
};
