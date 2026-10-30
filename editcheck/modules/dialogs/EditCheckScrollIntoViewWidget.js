/**
 * EditCheckScrollIntoViewWidget class.
 *
 * @class
 * @extends OO.ui.ButtonGroupWidget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.EditCheckScrollIntoViewWidget = function VeUiEditCheckScrollIntoViewWidget( config ) {
	this.showButton = new OO.ui.ButtonWidget( {
		label: ve.msg( 'editcheck-dialog-scroll-into-view' ),
		flags: [ 'progressive' ],
		size: 'large',
		icon: 'arrowDown'
	} );

	this.closeButton = new OO.ui.ButtonWidget( {
		icon: 'close',
		flags: [ 'progressive' ],
		label: mw.msg( 'ooui-popup-widget-close-button-aria-label' ),
		size: 'large',
		invisibleLabel: true
	} );

	config = Object.assign( {
		classes: [ 've-ui-editCheck-scrollIntoView ve-ce-surface-interface' ],
		items: [ this.showButton, this.closeButton ]
	}, config );

	// Parent constructor
	ve.ui.EditCheckScrollIntoViewWidget.super.call( this, config );

	if ( OO.ui.isMobile() ) {
		// Set the position before the first show, so the transition has a start state.
		this.$element.addClass( 've-ui-editCheck-scrollIntoView-bottom' );
	}

	this.target = ve.init.target;

	this.trackedElements = new Map();
	this.fullPageIntersecting = false;
	this.attentionActive = false;
	this.suppressed = false;
	this.visible = false;
	this.updateDebounced = ve.debounce( this.update.bind( this ), 300 );

	// Events
	this.showButton.connect( this, { click: [ 'emit', 'showClick' ] } );
	this.closeButton.connect( this, { click: [ 'emit', 'closeClick' ] } );

	this.connect( this, {
		showClick: () => ve.track( 'activity.editCheckScrollIntoView', { action: 'click-show' } ),
		closeClick: () => ve.track( 'activity.editCheckScrollIntoView', { action: 'click-close' } )
	} );

	this.target.connect( this, { virtualKeyboardChange: 'update' } );

	this.observer = window.IntersectionObserver ? new IntersectionObserver(
		( entries ) => {
			entries.forEach( ( entry ) => {
				this.trackedElements.set( entry.target, entry );
			} );
			this.emit( 'visibilityChange' );
			this.updateDebounced();
		},
		{ threshold: [ 0.3 ] }
	) : null;

	this.fullPageButtonObserver = null;
	if ( mw.config.get( 'wgVisualEditorConfig' ).enableVisualSectionEditing ) {
		this.fullPageButtonObserver = window.IntersectionObserver ? new IntersectionObserver(
			( entries ) => {
				// hide View Suggestions button when it conflicts with Edit Full Page
				entries.forEach( ( entry ) => {
					this.fullPageIntersecting = entry.isIntersecting;
				} );
				this.updateDebounced();
			},
			{ threshold: [ 0 ] }
		) : null;
	}
};

/* Inheritance */

OO.inheritClass( ve.ui.EditCheckScrollIntoViewWidget, OO.ui.ButtonGroupWidget );

/* Events */

/**
 * Fired when a tracked element's visibility was (re)computed
 *
 * @event ve.ui.EditCheckScrollIntoViewWidget#visibilityChange
 */

/* Methods */

/**
 * Clear tracked elements
 */
ve.ui.EditCheckScrollIntoViewWidget.prototype.clear = function () {
	if ( this.observer ) {
		this.observer.disconnect();
	}
	this.trackedElements.clear();
};

/**
 * Release the widget
 *
 * Use this when you discard the widget. To only stop the current
 * observations, use #clear.
 */
ve.ui.EditCheckScrollIntoViewWidget.prototype.destroy = function () {
	this.target.disconnect( this );
	if ( this.observer ) {
		this.observer.disconnect();
	}
	if ( this.fullPageButtonObserver ) {
		this.fullPageButtonObserver.disconnect();
	}
	this.trackedElements.clear();
};

/**
 * Observe an element for visibility changes
 *
 * @param {Element} element
 */
ve.ui.EditCheckScrollIntoViewWidget.prototype.observe = function ( element ) {
	if ( this.observer ) {
		this.observer.observe( element );
	}
};

/**
 * Observe full page button for visibility changes
 *
 * @param {Element} element
 */
ve.ui.EditCheckScrollIntoViewWidget.prototype.observeFullPageButton = function ( element ) {
	if ( this.fullPageButtonObserver ) {
		this.fullPageButtonObserver.observe( element );
	}
};

/**
 * Get one of the currently visible tracked elements, if any
 *
 * Picks arbitrarily among visible elements, because callers just need *a* visible
 * suggestion to draw attention to, not a specific one.
 *
 * @return {Element|null}
 */
ve.ui.EditCheckScrollIntoViewWidget.prototype.getVisibleElement = function () {
	for ( const entry of this.trackedElements.values() ) {
		if ( entry.isIntersecting ) {
			return entry.target;
		}
	}
	return null;
};

/**
 * Get whether the button is currently shown
 *
 * @return {boolean}
 */
ve.ui.EditCheckScrollIntoViewWidget.prototype.isVisible = function () {
	return this.visible;
};

/**
 * Set whether the button is currently shown and update its visible class
 *
 * @private
 * @param {boolean} visible
 */
ve.ui.EditCheckScrollIntoViewWidget.prototype.setVisible = function ( visible ) {
	this.visible = visible;
	this.$element.toggleClass( 've-ui-editCheck-scrollIntoView-visible', visible );
};

/**
 * Set whether the suggestion discoverability attention effect is active
 *
 * @param {boolean} active
 */
ve.ui.EditCheckScrollIntoViewWidget.prototype.setAttentionActive = function ( active ) {
	if ( this.attentionActive === active ) {
		return;
	}
	this.attentionActive = active;
	this.updateDebounced();
};

/**
 * Set whether the button is suppressed, hiding it regardless of other state
 *
 * @param {boolean} suppressed
 */
ve.ui.EditCheckScrollIntoViewWidget.prototype.setSuppressed = function ( suppressed ) {
	if ( this.suppressed === suppressed ) {
		return;
	}
	this.suppressed = suppressed;
	// Update straight away in both directions, so callers can rely on #isVisible
	// immediately afterwards, e.g. right as a dialog closes
	this.update();
};

/**
 * Set state for suggestions outside current section. For use on mobile.
 *
 * @param {Object|null} state State object
 * @param {boolean} state.enabled Whether to show button (disabled when suggestion exists in current section)
 * @param {boolean} state.hasAbove Suggestions exist above current section
 * @param {boolean} state.hasBelow Suggestions exist below current section
 */
ve.ui.EditCheckScrollIntoViewWidget.prototype.setOutsideSectionState = function ( state ) {
	this.outsideSectionState = state || null;
	this.updateDebounced();
};

/**
 * Update classes based on the visibility of the tracked elements.
 */
ve.ui.EditCheckScrollIntoViewWidget.prototype.update = function () {
	if ( this.suppressed || mw.editcheck.discoverabilityOptOut ) {
		this.setVisible( false );
		this.$element.removeClass( 've-ui-editCheck-scrollIntoView-attention' );
		return;
	}

	if ( mw.config.get( 'wgVisualEditorConfig' ).enableVisualSectionEditing ) {
		if ( this.fullPageIntersecting ) {
			this.setVisible( false );
			this.$element.removeClass( 've-ui-editCheck-scrollIntoView-attention' );
			return;
		}

		const forced = this.outsideSectionState &&
			this.outsideSectionState.enabled &&
			( this.outsideSectionState.hasAbove || this.outsideSectionState.hasBelow );

		if ( forced && !this.target.isVirtualKeyboardOpen() ) {
			this.showButton.setIcon( this.outsideSectionState.hasAbove ? 'arrowUp' : 'arrowDown' );
			this.setVisible( true );
			this.$element.toggleClass( 've-ui-editCheck-scrollIntoView-attention', this.attentionActive );
			return;
		}
	}

	if ( !this.observer || !this.trackedElements.size || this.target.isVirtualKeyboardOpen() ) {
		this.setVisible( false );
		this.$element.removeClass( 've-ui-editCheck-scrollIntoView-attention' );
		return;
	}

	const allNotVisible = Array.from( this.trackedElements.values() ).every(
		( entry ) => !entry.isIntersecting
	);
	if ( allNotVisible ) {
		const firstEntry = this.trackedElements.values().next().value;
		const isUp = firstEntry ? firstEntry.boundingClientRect.top < 0 : true;
		this.showButton.setIcon( isUp ? 'arrowUp' : 'arrowDown' );
		if ( !OO.ui.isMobile() ) {
			this.$element.toggleClass( 've-ui-editCheck-scrollIntoView-top', isUp );
			this.$element.toggleClass( 've-ui-editCheck-scrollIntoView-bottom', !isUp );
		}

		this.visible = true;
		requestAnimationFrame( () => {
			this.$element.toggleClass( 've-ui-editCheck-scrollIntoView-visible', true );
			this.$element.toggleClass( 've-ui-editCheck-scrollIntoView-attention', this.attentionActive );
		} );

		if ( !this.loggedShown ) {
			ve.track( 'activity.editCheckScrollIntoView', { action: 'shown' } );
			this.loggedShown = true;
		}
	} else {
		this.visible = false;
		requestAnimationFrame( () => {
			this.$element.toggleClass( 've-ui-editCheck-scrollIntoView-visible', false );
			this.$element.removeClass( 've-ui-editCheck-scrollIntoView-attention' );
		} );
	}
};
