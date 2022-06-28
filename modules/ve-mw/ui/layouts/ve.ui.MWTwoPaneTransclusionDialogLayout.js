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
		this.outlineControlsWidget = null;
		this.outlineSelectWidget = new OO.ui.OutlineSelectWidget();
		this.outlinePanel = new OO.ui.PanelLayout( {
			expanded: this.expanded,
			scrollable: true
		} );
		this.setMenuPanel( this.outlinePanel );
		this.outlineVisible = true;
		this.outlineControlsWidget = new ve.ui.MWTransclusionOutlineControlsWidget(
			this.outlineSelectWidget
		);
	}
	this.toggleMenu( this.outlined );

	// Events
	this.sidebar.connect( this, {
		focusPageByName: 'focusPart',
		filterPagesByName: 'onFilterPagesByName',
		selectedTransclusionPartChanged: 'onSelectedTransclusionPartChanged'
	} );
	this.stackLayout.connect( this, {
		set: 'onStackLayoutSet'
	} );
	if ( this.outlined ) {
		this.outlineSelectWidget.connect( this, {
			select: 'onOutlineSelectWidgetSelect'
		} );
	}
	// Event 'focus' does not bubble, but 'focusin' does
	this.stackLayout.$element.on( 'focusin', this.onStackLayoutFocus.bind( this ) );

	// Initialization
	this.$element.addClass( 've-ui-mwTwoPaneTransclusionDialogLayout' );
	this.stackLayout.$element.addClass( 've-ui-mwTwoPaneTransclusionDialogLayout-stackLayout' );
	if ( this.outlined ) {
		this.outlinePanel.$element
			.addClass( 've-ui-mwTwoPaneTransclusionDialogLayout-outlinePanel' )
			.append( this.outlineControlsWidget.$element );
	}
};

/* Setup */

OO.inheritClass( ve.ui.MWTwoPaneTransclusionDialogLayout, OO.ui.MenuLayout );

/* Events */

/**
 * A 'set' event is emitted when a page is {@link #setPage set} to be displayed by the
 * booklet layout.
 *
 * @event set
 * @param {OO.ui.PageLayout} page Current page
 */

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
 * @private
 * @param {string} partId
 * @param {boolean} internal Used for internal calls to suppress events
 *
 * This method supports using the space bar in a sidebar template header.
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.onSelectedTransclusionPartChanged = function ( partId, internal ) {
	var page = this.getPage( partId );
	if ( page && !internal ) {
		page.scrollElementIntoView();
	}

	// FIXME: This hack re-implements what OO.ui.SelectWidget.selectItem would do, without firing
	// the "select" event. This will stop working when we disconnect the old sidebar.
	this.outlineSelectWidget.items.forEach( function ( item ) {
		// This repeats what ve.ui.MWTransclusionOutlineWidget.setSelectionByPageName did, but for
		// the old sidebar
		item.setSelected( item.getData() === partId );
	} );
	this.outlineControlsWidget.onOutlineChange();
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

	if ( this.outlined ) {
		var isLastPlaceholder = page instanceof ve.ui.MWTemplatePlaceholderPage &&
			Object.keys( this.pages ).length === 1;
		// TODO: In other cases this is disabled rather than hidden. See T311303
		this.outlineControlsWidget.removeButton.toggle( !isLastPlaceholder );
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
 * Handle outline widget select events.
 *
 * @private
 * @param {OO.ui.OptionWidget|null} item Selected item
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.onOutlineSelectWidgetSelect = function ( item ) {
	if ( item ) {
		this.setPage( item.getData() );
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
 * If the booklet is not outlined, the method will return `null`.
 *
 * @return {OO.ui.OutlineSelectWidget|null} Outline widget, or null if the booklet is not outlined
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.getOutline = function () {
	return this.outlineSelectWidget;
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
 * @chainable
 * @return {ve.ui.MWTwoPaneTransclusionDialogLayout} The layout, for chaining
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
	var items = [];
	for ( i = 0; i < pages.length; i++ ) {
		page = pages[ i ];
		name = page.getName();
		this.pages[ page.getName() ] = page;
		if ( this.outlined ) {
			var item = new OO.ui.OutlineOptionWidget( { data: name } );
			page.setOutlineItem( item );
			items.push( item );
		}
	}

	if ( this.outlined ) {
		this.outlineSelectWidget.addItems( items, index );
		// It's impossible to lose a selection here. Selecting something else is business logic.
	}
	this.stackLayout.addItems( pages, index );
	return this;
};

/**
 * Remove the specified pages from the booklet layout.
 *
 * To remove all pages from the booklet, you may wish to use the #clearPages method instead.
 *
 * @param {OO.ui.PageLayout[]} pages An array of pages to remove
 * @chainable
 * @return {ve.ui.MWTwoPaneTransclusionDialogLayout} The layout, for chaining
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.removePages = function ( pages ) {
	var itemsToRemove = [];

	for ( var i = 0; i < pages.length; i++ ) {
		var page = pages[ i ],
			name = page.getName();
		delete this.pages[ name ];
		if ( this.outlined ) {
			itemsToRemove.push( this.outlineSelectWidget.findItemFromData( name ) );
			page.setOutlineItem( null );
		}
		// If the current page is removed, clear currentPageName
		if ( this.currentPageName === name ) {
			this.currentPageName = null;
		}
	}
	if ( itemsToRemove.length ) {
		this.outlineSelectWidget.removeItems( itemsToRemove );
		// We might loose the selection here, but what to select instead is business logic.
	}
	this.stackLayout.removeItems( pages );
	return this;
};

/**
 * Clear all pages from the booklet layout.
 *
 * To remove only a subset of pages from the booklet, use the #removePages method.
 *
 * @chainable
 * @return {ve.ui.MWTwoPaneTransclusionDialogLayout} The layout, for chaining
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.clearPages = function () {
	var pages = this.stackLayout.getItems();

	this.pages = {};
	this.currentPageName = null;
	if ( this.outlined ) {
		this.outlineSelectWidget.clearItems();
		for ( var i = 0; i < pages.length; i++ ) {
			pages[ i ].setOutlineItem( null );
		}
	}
	this.sidebar.clear();
	this.stackLayout.clearItems();
	return this;
};

/**
 * Set the current page by symbolic name.
 *
 * @fires set
 * @param {string} name Symbolic name of page
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.setPage = function ( name ) {
	var page = this.pages[ name ];
	if ( !page || name === this.currentPageName ) {
		return;
	}

	var previousPage = this.currentPageName ? this.pages[ this.currentPageName ] : null;
	this.currentPageName = name;

	if ( this.outlined ) {
		var selectedItem = this.outlineSelectWidget.findSelectedItem();
		if ( !selectedItem || selectedItem.getData() !== name ) {
			// Warning! This triggers a "select" event and the .onOutlineSelectWidgetSelect()
			// handler, which calls .setPage() a second time. Make sure .currentPageName is set to
			// break this loop.
			this.outlineSelectWidget.selectItemByData( name );
		}
	}

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
	this.emit( 'set', page );
};
