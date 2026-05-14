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

	this.trackedElements = new Map();
	this.fullPageIntersecting = false;

	// Events
	this.showButton.connect( this, { click: [ 'emit', 'showClick' ] } );
	this.closeButton.connect( this, { click: [ 'emit', 'closeClick' ] } );

	this.connect( this, {
		showClick: () => ve.track( 'activity.editCheckScrollIntoView', 'click-show' ),
		closeClick: () => ve.track( 'activity.editCheckScrollIntoView', 'click-close' )
	} );

	ve.init.target.on( 'virtualKeyboardChange', this.update.bind( this ) );

	// eslint-disable-next-line compat/compat
	this.observer = window.IntersectionObserver ? new IntersectionObserver(
		( entries ) => {
			entries.forEach( ( entry ) => {
				this.trackedElements.set( entry.target, entry );
			} );
			this.update();
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
				this.update();
			},
			{ threshold: [ 0 ] }
		) : null;
	}
};

/* Inheritance */

OO.inheritClass( ve.ui.EditCheckScrollIntoViewWidget, OO.ui.ButtonGroupWidget );

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
 * Set state for suggestions outside current section. For use on mobile.
 *
 * @param {Object|null} state State object
 * @param {boolean} state.enabled Whether to show button (disabled when suggestion exists in current section)
 * @param {boolean} state.hasAbove Suggestions exist above current section
 * @param {boolean} state.hasBelow Suggestions exist below current section
 */
ve.ui.EditCheckScrollIntoViewWidget.prototype.setOutsideSectionState = function ( state ) {
	this.outsideSectionState = state || null;
	this.update();
};

/**
 * Update classes based on the visibility of the tracked elements.
 */
ve.ui.EditCheckScrollIntoViewWidget.prototype.update = function () {
	if ( mw.config.get( 'wgVisualEditorConfig' ).enableVisualSectionEditing ) {
		if ( this.fullPageIntersecting ) {
			this.$element.removeClass( 've-ui-editCheck-scrollIntoView-visible' );
			return;
		}

		const forced = this.outsideSectionState &&
			this.outsideSectionState.enabled &&
			( this.outsideSectionState.hasAbove || this.outsideSectionState.hasBelow );

		if ( forced && !ve.init.target.isVirtualKeyboardOpen() ) {
			this.showButton.setIcon( this.outsideSectionState.hasAbove ? 'arrowUp' : 'arrowDown' );
			this.$element.addClass( 've-ui-editCheck-scrollIntoView-bottom' );
			this.$element.addClass( 've-ui-editCheck-scrollIntoView-visible' );
			return;
		}
	}

	if ( !this.observer || !this.trackedElements.size || ve.init.target.isVirtualKeyboardOpen() ) {
		this.$element.removeClass( 've-ui-editCheck-scrollIntoView-visible' );
		return;
	}

	const allNotVisible = Array.from( this.trackedElements.values() ).every(
		( entry ) => !entry.isIntersecting
	);
	if ( allNotVisible ) {
		const firstEntry = this.trackedElements.values().next().value;
		const isUp = firstEntry ? firstEntry.boundingClientRect.top < 0 : true;
		this.showButton.setIcon( isUp ? 'arrowUp' : 'arrowDown' );
		if ( OO.ui.isMobile() ) {
			this.$element.addClass( 've-ui-editCheck-scrollIntoView-bottom' );
		} else {
			this.$element.toggleClass( 've-ui-editCheck-scrollIntoView-top', isUp );
			this.$element.toggleClass( 've-ui-editCheck-scrollIntoView-bottom', !isUp );
		}

		requestAnimationFrame( () => {
			this.$element.addClass( 've-ui-editCheck-scrollIntoView-visible' );
		} );

		if ( !this.loggedShown ) {
			ve.track( 'activity.editCheckScrollIntoView', 'shown' );
			this.loggedShown = true;
		}
	} else {
		requestAnimationFrame( () => {
			this.$element.removeClass( 've-ui-editCheck-scrollIntoView-visible' );
		} );
	}
};
