/**
 * Specialized layout similar to BookletLayout, but to synchronize the sidebar
 * and content pane of the transclusion dialog
 *
 * Also owns the outline controls.
 *
 * @class
 * @extends OO.ui.MenuLayout
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @cfg {boolean} [continuous=false] Show all pages, one after another
 * @cfg {boolean} [autoFocus=true] Focus on the first focusable element when a new page is
 *  displayed. Disabled on mobile.
 * @cfg {boolean} [outlined=false] Show the outline. The outline is used to navigate through the
 *  pages of the booklet.
 * @cfg {boolean} [editable=false] Show controls for adding, removing and reordering pages.
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
		continuous: !!config.continuous,
		expanded: this.expanded
	} );
	this.setContentPanel( this.stackLayout );
	this.sidebar = new ve.ui.MWTransclusionOutlineWidget();
	this.autoFocus = config.autoFocus === undefined || !!config.autoFocus;
	this.outlineVisible = false;
	this.outlined = !!config.outlined;
	if ( this.outlined ) {
		this.editable = !!config.editable;
		this.outlineControlsWidget = null;
		this.outlineSelectWidget = new OO.ui.OutlineSelectWidget();
		this.outlinePanel = new OO.ui.PanelLayout( {
			expanded: this.expanded,
			scrollable: true
		} );
		this.setMenuPanel( this.outlinePanel );
		this.outlineVisible = true;
		if ( this.editable ) {
			this.outlineControlsWidget = new OO.ui.OutlineControlsWidget(
				this.outlineSelectWidget
			);
		}
	}
	this.toggleMenu( this.outlined );

	// Events
	this.stackLayout.connect( this, {
		set: 'onStackLayoutSet'
	} );
	if ( this.outlined ) {
		this.outlineSelectWidget.connect( this, {
			select: 'onOutlineSelectWidgetSelect'
		} );
	}
	if ( this.autoFocus ) {
		// Event 'focus' does not bubble, but 'focusin' does
		this.stackLayout.$element.on( 'focusin', this.onStackLayoutFocus.bind( this ) );
	}

	// Initialization
	this.$element.addClass( 've-ui-mwTwoPaneTransclusionDialogLayout' );
	this.stackLayout.$element.addClass( 've-ui-mwTwoPaneTransclusionDialogLayout-stackLayout' );
	if ( this.outlined ) {
		this.outlinePanel.$element
			.addClass( 've-ui-mwTwoPaneTransclusionDialogLayout-outlinePanel' )
			.append( this.outlineSelectWidget.$element );
		if ( this.editable ) {
			this.outlinePanel.$element
				.addClass( 've-ui-mwTwoPaneTransclusionDialogLayout-outlinePanel-editable' )
				.append( this.outlineControlsWidget.$element );
		}
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

/**
 * An 'add' event is emitted when pages are {@link #addPages added} to the booklet layout.
 *
 * @event add
 * @param {OO.ui.PageLayout[]} page Added pages
 * @param {number} index Index pages were added at
 */

/**
 * A 'remove' event is emitted when pages are {@link #clearPages cleared} or
 * {@link #removePages removed} from the booklet.
 *
 * @event remove
 * @param {OO.ui.PageLayout[]} pages Removed pages
 */

/* Methods */

/**
 * Handle stack layout focus.
 *
 * @private
 * @param {jQuery.Event} e Focusin event
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.onStackLayoutFocus = function ( e ) {
	var name, $target;

	// Find the page that an element was focused within
	$target = $( e.target ).closest( '.oo-ui-pageLayout' );
	for ( name in this.pages ) {
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
	var promise, layout = this;
	// If everything is unselected, do nothing
	if ( !page ) {
		return;
	}
	// For continuous MWTwoPaneTransclusionDialogLayouts, scroll the selected page
	// into view first
	if ( this.stackLayout.continuous && !this.scrolling ) {
		promise = page.scrollElementIntoView();
	} else {
		// eslint-disable-next-line no-jquery/no-deferred
		promise = $.Deferred().resolve();
	}
	// Focus the first element on the newly selected panel.
	// Don't focus if the page was set by scrolling.
	if ( this.autoFocus && !OO.ui.isMobile() && !this.scrolling ) {
		promise.done( function () {
			layout.focus();
		} );
	}
};

/**
 * Focus the first input in the current page.
 *
 * If no page is selected, the first selectable page will be selected.
 * If the focus is already in an element on the current page, nothing will happen.
 *
 * @param {number} [itemIndex] A specific item to focus on
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.focus = function ( itemIndex ) {
	var page,
		items = this.stackLayout.getItems();

	if ( itemIndex !== undefined && items[ itemIndex ] ) {
		page = items[ itemIndex ];
	} else {
		page = this.stackLayout.getCurrentItem();
	}

	if ( !page && this.outlined ) {
		this.selectFirstSelectablePage();
		page = this.stackLayout.getCurrentItem();
	}
	if ( !page ) {
		return;
	}
	// Only change the focus if is not already in the current page
	if ( !OO.ui.contains( page.$element[ 0 ], this.getElementDocument().activeElement, true ) ) {
		page.focus();
	}
};

/**
 * Find the first focusable input in the booklet layout and focus
 * on it.
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.focusFirstFocusable = function () {
	OO.ui.findFocusable( this.stackLayout.$element ).focus();
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
 * Check if booklet has editing controls.
 *
 * @return {boolean} Booklet is editable
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.isEditable = function () {
	return this.editable;
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
 * @chainable
 * @return {ve.ui.MWTwoPaneTransclusionDialogLayout} The layout, for chaining
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.toggleOutline = function ( show ) {
	var booklet = this;

	if ( this.outlined ) {
		show = show === undefined ? !this.outlineVisible : !!show;
		this.outlineVisible = show;
		this.toggleMenu( show );
		if ( show && this.editable ) {
			// HACK: Kill dumb scrollbars when the sidebar stops animating, see T161798.
			// Only necessary when outline controls are present, delay matches transition on
			// `.oo-ui-menuLayout-menu`.
			setTimeout( function () {
				OO.ui.Element.static.reconsiderScrollbars( booklet.outlinePanel.$element[ 0 ] );
			}, OO.ui.theme.getDialogTransitionDuration() );
		}
	}

	return this;
};

/**
 * Find the page closest to the specified page.
 *
 * @param {OO.ui.PageLayout} page Page to use as a reference point
 * @return {OO.ui.PageLayout|null} Page closest to the specified page
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.findClosestPage = function ( page ) {
	var next, prev, level,
		pages = this.stackLayout.getItems(),
		index = pages.indexOf( page );

	if ( index !== -1 ) {
		next = pages[ index + 1 ];
		prev = pages[ index - 1 ];
		// Prefer adjacent pages at the same level
		if ( this.outlined ) {
			level = this.outlineSelectWidget.findItemFromData( page.getName() ).getLevel();
			if (
				prev &&
				level === this.outlineSelectWidget.findItemFromData( prev.getName() ).getLevel()
			) {
				return prev;
			}
			if (
				next &&
				level === this.outlineSelectWidget.findItemFromData( next.getName() ).getLevel()
			) {
				return next;
			}
		}
	}
	return prev || next || null;
};

/**
 * Get the outline widget.
 *
 * If the booklet is not outlined, the method will return `null`.
 *
 * @return {OO.ui.OutlineSelectWidget|null} Outline widget, or null if the booklet is not outlined
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.getOutline = function () {
	return this.outlineSelectWidget;
};

/**
 * Get the outline controls widget.
 *
 * If the outline is not editable, the method will return `null`.
 *
 * @return {OO.ui.OutlineControlsWidget|null} The outline controls widget.
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
 * Get the current page.
 *
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
 * @fires add
 * @chainable
 * @return {ve.ui.MWTwoPaneTransclusionDialogLayout} The layout, for chaining
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.addPages = function ( pages, index ) {
	var i, len, name, page, item, currentIndex,
		stackLayoutPages = this.stackLayout.getItems(),
		remove = [],
		items = [];

	// Remove pages with same names
	for ( i = 0, len = pages.length; i < len; i++ ) {
		page = pages[ i ];
		name = page.getName();

		if ( Object.prototype.hasOwnProperty.call( this.pages, name ) ) {
			// Correct the insertion index
			currentIndex = stackLayoutPages.indexOf( this.pages[ name ] );
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
	for ( i = 0, len = pages.length; i < len; i++ ) {
		page = pages[ i ];
		name = page.getName();
		this.pages[ page.getName() ] = page;
		if ( this.outlined ) {
			item = new OO.ui.OutlineOptionWidget( { data: name } );
			page.setOutlineItem( item );
			items.push( item );
		}
	}

	if ( this.outlined ) {
		this.outlineSelectWidget.addItems( items, index );
		// It's impossible to lose a selection here. Selecting something else is business logic.
	}
	this.stackLayout.addItems( pages, index );
	this.emit( 'add', pages, index );

	return this;
};

/**
 * Remove the specified pages from the booklet layout.
 *
 * To remove all pages from the booklet, you may wish to use the #clearPages method instead.
 *
 * @param {OO.ui.PageLayout[]} pages An array of pages to remove
 * @fires remove
 * @chainable
 * @return {ve.ui.MWTwoPaneTransclusionDialogLayout} The layout, for chaining
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.removePages = function ( pages ) {
	var i, len, name, page,
		itemsToRemove = [];

	for ( i = 0, len = pages.length; i < len; i++ ) {
		page = pages[ i ];
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
	this.emit( 'remove', pages );

	return this;
};

/**
 * Clear all pages from the booklet layout.
 *
 * To remove only a subset of pages from the booklet, use the #removePages method.
 *
 * @fires remove
 * @chainable
 * @return {ve.ui.MWTwoPaneTransclusionDialogLayout} The layout, for chaining
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.clearPages = function () {
	var i, len,
		pages = this.stackLayout.getItems();

	this.pages = {};
	this.currentPageName = null;
	if ( this.outlined ) {
		this.outlineSelectWidget.clearItems();
		for ( i = 0, len = pages.length; i < len; i++ ) {
			pages[ i ].setOutlineItem( null );
		}
	}
	this.stackLayout.clearItems();

	this.emit( 'remove', pages );

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

	var $focused;
	if ( previousPage ) {
		previousPage.setActive( false );
		// Blur anything focused if the next page doesn't have anything focusable.
		// This is not needed if the next page has something focusable (because once it is
		// focused this blur happens automatically). If the layout is non-continuous, this
		// check is meaningless because the next page is not visible yet and thus can't
		// hold focus.
		if ( this.autoFocus &&
			!OO.ui.isMobile() &&
			this.stackLayout.continuous &&
			OO.ui.findFocusable( page.$element ).length !== 0
		) {
			$focused = previousPage.$element.find( ':focus' );
			if ( $focused.length ) {
				$focused[ 0 ].blur();
			}
		}
	}
	page.setActive( true );
	this.stackLayout.setItem( page );
	if ( !this.stackLayout.continuous && previousPage ) {
		// This should not be necessary, since any inputs on the previous page should have
		// been blurred when it was hidden, but browsers are not very consistent about
		// this.
		$focused = previousPage.$element.find( ':focus' );
		if ( $focused.length ) {
			$focused[ 0 ].blur();
		}
	}
	this.emit( 'set', page );
};

/**
 * For outlined-continuous booklets, also reset the outlineSelectWidget to the first item.
 *
 * @inheritdoc
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.resetScroll = function () {
	// Parent method
	ve.ui.MWTwoPaneTransclusionDialogLayout.super.prototype.resetScroll.call( this );

	if (
		this.outlined &&
		this.stackLayout.continuous &&
		this.outlineSelectWidget.findFirstSelectableItem()
	) {
		this.scrolling = true;
		this.outlineSelectWidget.selectItem( this.outlineSelectWidget.findFirstSelectableItem() );
		this.scrolling = false;
	}
	return this;
};

/**
 * Select the first selectable page.
 *
 * @chainable
 * @return {ve.ui.MWTwoPaneTransclusionDialogLayout} The layout, for chaining
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.selectFirstSelectablePage = function () {
	if ( !this.outlineSelectWidget.findSelectedItem() ) {
		this.outlineSelectWidget.selectItem( this.outlineSelectWidget.findFirstSelectableItem() );
	}

	return this;
};
