/**
 * Specialized layout similar to BookletLayout, but to synchronize the sidebar
 * and content pane of the transclusion dialog
 *
 * Also owns the outline controls.
 *
 * This class has domain knowledge about its contents, for example different
 * behaviors for template vs template parameter elements.
 *
 * @class
 * @extends OO.ui.MenuLayout
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @cfg {boolean} [outlined=false] Show the outline. The outline is used to navigate through the
 *  pages of the booklet.
 * @property {Object.<string,OO.ui.PageLayout>} pages
 */
ve.ui.MWTwoPaneTransclusionDialogLayout = function VeUiMWTwoPaneTransclusionDialogLayout( config ) {
	// Configuration initialization
	config = config || {};

	// Parent constructor
	ve.ui.MWTwoPaneTransclusionDialogLayout.super.call( this, config );

	// Properties
	this.currentPageName = null;
	this.pages = {};
	this.ignoreFocus = false;
	this.stackLayout = new OO.ui.StackLayout( {
		continuous: true,
		expanded: this.expanded
	} );
	this.setContentPanel( this.stackLayout );
	this.sidebar = new ve.ui.MWTransclusionOutlineWidget();
	this.autoFocus = true;
	this.outlineVisible = false;
	this.outlined = !!config.outlined;
	if ( this.outlined ) {
		this.outlinePanel = new OO.ui.PanelLayout( {
			expanded: this.expanded,
			scrollable: true
		} );
		this.setMenuPanel( this.outlinePanel );
		this.outlineVisible = true;
		this.outlineControlsWidget = new ve.ui.MWTransclusionOutlineControlsWidget();
	}
	this.toggleMenu( this.outlined );

	// Events
	this.sidebar.connect( this, {
		focusPageByName: 'focusPart',
		filterPagesByName: 'onFilterPagesByName'
	} );
	this.stackLayout.connect( this, {
		set: 'onStackLayoutSet'
	} );
	// Event 'focus' does not bubble, but 'focusin' does
	this.stackLayout.$element.on( 'focusin', this.onStackLayoutFocus.bind( this ) );

	// Initialization
	this.$element.addClass( 've-ui-mwTwoPaneTransclusionDialogLayout' );
	this.stackLayout.$element.addClass( 've-ui-mwTwoPaneTransclusionDialogLayout-stackLayout' );
	if ( this.outlined ) {
		this.outlinePanel.$element
			.addClass( 've-ui-mwTwoPaneTransclusionDialogLayout-outlinePanel' )
			.append(
				$( '<div>' ).addClass( 've-ui-mwTwoPaneTransclusionDialogLayout-sidebar-container' )
					.append( this.sidebar.$element ),
				this.outlineControlsWidget.$element
			);
	}
};

/* Setup */

OO.inheritClass( ve.ui.MWTwoPaneTransclusionDialogLayout, OO.ui.MenuLayout );

/* Methods */

/**
 * @private
 * @param {Object} visibility
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.onFilterPagesByName = function ( visibility ) {
	for ( var pageName in visibility ) {
		var page = this.getPage( pageName );
		if ( page ) {
			page.toggle( visibility[ pageName ] );
		}
	}
};

/**
 * @param {ve.dm.MWTransclusionPartModel|null} removed Removed part
 * @param {ve.dm.MWTransclusionPartModel|null} added Added part
 * @param {number} [newPosition]
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.onReplacePart = function ( removed, added, newPosition ) {
	this.sidebar.onReplacePart( removed, added, newPosition );

	var keys = Object.keys( this.pages ),
		isLastPlaceholder = keys.length === 1 &&
			this.pages[ keys[ 0 ] ] instanceof ve.ui.MWTemplatePlaceholderPage;
	// TODO: In other cases this is disabled rather than hidden. See T311303
	this.outlineControlsWidget.removeButton.toggle( !isLastPlaceholder );
};

/**
 * Handle stack layout focus.
 *
 * @private
 * @param {jQuery.Event} e Focusin event
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.onStackLayoutFocus = function ( e ) {
	// Find the page that an element was focused within
	var $target = $( e.target ).closest( '.oo-ui-pageLayout' );
	for ( var name in this.pages ) {
		// Check for page match, exclude current page to find only page changes
		if ( this.pages[ name ].$element[ 0 ] === $target[ 0 ] && name !== this.currentPageName ) {
			this.setPage( name );
			break;
		}
	}
};

/**
 * Handle stack layout set events.
 *
 * @private
 * @param {OO.ui.PanelLayout|null} page The page panel that is now the current panel
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.onStackLayoutSet = function ( page ) {
	// If everything is unselected, do nothing
	if ( !page ) {
		return;
	}
	// Scroll the selected page into view first
	var promise = page.scrollElementIntoView();
	// Focus the first element on the newly selected panel.
	if ( this.autoFocus && !OO.ui.isMobile() ) {
		promise.done( this.focus.bind( this ) );
	}

	this.sidebar.setSelectionByPageName( page.getName() );
};

/**
 * Focus the first input in the current page.
 *
 * If no page is selected, the first selectable page will be selected.
 * If the focus is already in an element on the current page, nothing will happen.
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.focus = function () {
	var page = this.stackLayout.getCurrentItem();

	if ( !page ) {
		return;
	}
	// Only change the focus if is not already in the current page
	if ( !OO.ui.contains( page.$element[ 0 ], this.getElementDocument().activeElement, true ) ) {
		page.focus();
	}
};

/**
 * @param {string} pageName
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.focusPart = function ( pageName ) {
	if ( pageName.indexOf( '/' ) === -1 ) {
		// FIXME: This is currently needed because the event that adds a new part to the new sidebar
		//  is executed later than this here.
		setTimeout( this.sidebar.setSelectionByPageName.bind( this.sidebar, pageName ) );
		this.setPage( pageName );
		// The .setPage() call above does not necessarily call .focus(). This forces it.
		this.focus();
	} else {
		this.setPage( pageName );
	}
};

/**
 * Check if booklet has an outline.
 *
 * @return {boolean} Booklet has an outline
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.isOutlined = function () {
	return this.outlined;
};

/**
 * Check if booklet has a visible outline.
 *
 * @return {boolean} Outline is visible
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.isOutlineVisible = function () {
	return this.outlined && this.outlineVisible;
};

/**
 * Hide or show the outline.
 *
 * @param {boolean} [show] Show outline, omit to invert current state
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.toggleOutline = function ( show ) {
	if ( !this.outlined ) {
		return;
	}

	show = show === undefined ? !this.outlineVisible : !!show;
	this.outlineVisible = show;
	this.toggleMenu( show );
	if ( show ) {
		var booklet = this;
		// HACK: Kill dumb scrollbars when the sidebar stops animating, see T161798.
		// Only necessary when outline controls are present, delay matches transition on
		// `.oo-ui-menuLayout-menu`.
		setTimeout( function () {
			OO.ui.Element.static.reconsiderScrollbars( booklet.outlinePanel.$element[ 0 ] );
		}, OO.ui.theme.getDialogTransitionDuration() );
	}
};

/**
 * @return {ve.ui.MWTransclusionOutlineControlsWidget|null}
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.getOutlineControls = function () {
	return this.outlineControlsWidget;
};

/**
 * Get a page by its symbolic name.
 *
 * @param {string} name Symbolic name of page
 * @return {OO.ui.PageLayout|undefined} Page, if found
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.getPage = function ( name ) {
	return this.pages[ name ];
};

/**
 * @return {OO.ui.PageLayout|undefined} Current page, if found
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.getCurrentPage = function () {
	var name = this.getCurrentPageName();
	return name ? this.getPage( name ) : undefined;
};

/**
 * Get the symbolic name of the current page.
 *
 * @return {string|null} Symbolic name of the current page
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.getCurrentPageName = function () {
	return this.currentPageName;
};

/**
 * Add pages to the booklet layout
 *
 * When pages are added with the same names as existing pages, the existing pages will be
 * automatically removed before the new pages are added.
 *
 * @param {OO.ui.PageLayout[]} pages Pages to add
 * @param {number} index Index of the insertion point
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.addPages = function ( pages, index ) {
	var i, name, page,
		stackLayoutPages = this.stackLayout.getItems();

	// Remove pages with same names
	var remove = [];
	for ( i = 0; i < pages.length; i++ ) {
		page = pages[ i ];
		name = page.getName();

		if ( Object.prototype.hasOwnProperty.call( this.pages, name ) ) {
			// Correct the insertion index
			var currentIndex = stackLayoutPages.indexOf( this.pages[ name ] );
			if ( currentIndex !== -1 && currentIndex + 1 < index ) {
				index--;
			}
			remove.push( this.pages[ name ] );
		}
	}
	if ( remove.length ) {
		this.removePages( remove );
	}

	// Add new pages
	for ( i = 0; i < pages.length; i++ ) {
		page = pages[ i ];
		name = page.getName();
		this.pages[ page.getName() ] = page;
	}

	this.stackLayout.addItems( pages, index );
};

/**
 * Remove the specified pages from the booklet layout.
 *
 * To remove all pages from the booklet, you may wish to use the #clearPages method instead.
 *
 * @param {OO.ui.PageLayout[]} pages An array of pages to remove
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.removePages = function ( pages ) {
	for ( var i = 0; i < pages.length; i++ ) {
		var page = pages[ i ],
			name = page.getName();
		delete this.pages[ name ];
		// If the current page is removed, clear currentPageName
		if ( this.currentPageName === name ) {
			this.currentPageName = null;
		}
	}
	this.stackLayout.removeItems( pages );
};

/**
 * Clear all pages from the booklet layout.
 *
 * To remove only a subset of pages from the booklet, use the #removePages method.
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.clearPages = function () {
	this.pages = {};
	this.currentPageName = null;
	this.sidebar.clear();
	this.stackLayout.clearItems();
};

/**
 * Set the current page by symbolic name.
 *
 * @param {string} name Symbolic name of page
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.setPage = function ( name ) {
	var page = this.pages[ name ];
	if ( !page || name === this.currentPageName ) {
		return;
	}

	var previousPage = this.currentPageName ? this.pages[ this.currentPageName ] : null;
	this.currentPageName = name;

	if ( previousPage ) {
		previousPage.setActive( false );
		// Blur anything focused if the next page doesn't have anything focusable.
		// This is not needed if the next page has something focusable (because once it is
		// focused this blur happens automatically).
		if ( !OO.ui.isMobile() &&
			OO.ui.findFocusable( page.$element ).length !== 0
		) {
			var $focused = previousPage.$element.find( ':focus' );
			if ( $focused.length ) {
				$focused[ 0 ].blur();
			}
		}
	}
	page.setActive( true );
	this.stackLayout.setItem( page );
	this.refreshControls();
};

/**
 * Refresh controls
 *
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.refreshControls = function () {
	var partId = this.sidebar.findSelectedPartId(),
		pages = this.stackLayout.getItems(),
		page = this.getPage( partId ),
		index = pages.indexOf( page ),
		isPart = !!partId,
		canMoveUp, canMoveDown = false,
		canBeDeleted = isPart;

	/* check if this is the first element and no parameter */
	canMoveUp = isPart && index > 0;

	/* check if this is the last element and no parameter */
	if ( isPart ) {
		for ( var i = index + 1; i < pages.length; i++ ) {
			if ( !( pages[ i ] instanceof ve.ui.MWParameterPage || pages[ i ] instanceof ve.ui.MWAddParameterPage ) ) {
				canMoveDown = true;
				break;
			}
		}
	}

	this.outlineControlsWidget.setButtonsEnabled( {
		canMoveUp: canMoveUp,
		canMoveDown: canMoveDown,
		canBeDeleted: canBeDeleted
	} );

};
