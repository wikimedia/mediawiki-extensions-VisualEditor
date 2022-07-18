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
	this.stackLayout = new ve.ui.MWVerticalLayout();
	this.setContentPanel( this.stackLayout );
	this.sidebar = new ve.ui.MWTransclusionOutlineWidget();
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
		filterPagesByName: 'onFilterPagesByName',
		sidebarPartSelected: 'onSidebarItemSelected',
		templateParameterSelected: 'onSidebarItemSelected'
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
 * @param {Object.<string,boolean>} visibility
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
		if ( this.pages[ name ].$element[ 0 ] === $target[ 0 ] ) {
			this.setPage( name );
			break;
		}
	}
};

/**
 * Focus the input field for the current page.
 *
 * If no page is selected, the first selectable page will be selected.
 * If the focus is already in an element on the current page, nothing will happen.
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.focus = function () {
	var page = this.pages[ this.currentPageName ];

	if ( !page ) {
		return;
	}
	// Only change the focus if it's visible and is not already the current page
	if ( page.$element[ 0 ].offsetParent !== null &&
		!OO.ui.contains( page.$element[ 0 ], this.getElementDocument().activeElement, true )
	) {
		page.focus();
	}
};

/**
 * @param {string} pageName
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.focusPart = function ( pageName ) {
	this.setPage( pageName );
	this.focus();
};

/**
 * Parts and parameters can be soft-selected, or selected and focused.
 *
 * @param {string|null} pageName Full, unique name of part or parameter, or null to deselect
 * @param {boolean} [soft] If true, suppress content pane focus.
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.onSidebarItemSelected = function ( pageName, soft ) {
	this.setPage( pageName );
	if ( !soft ) {
		this.focus();
	}

	var page = this.pages[ pageName ];
	if ( page ) {
		page.scrollElementIntoView( { alignToTop: true, padding: { top: 20 } } );
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
 * Get the list of pages on the stack ordered by appearance.
 *
 * @return {OO.ui.PageLayout[]}
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.getPagesOrdered = function () {
	return this.stackLayout.getItems();
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
			remove.push( name );
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
 * @param {string[]} pagesNamesToRemove
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.removePages = function ( pagesNamesToRemove ) {
	var layout = this,
		pagesToRemove = [],
		isCurrentParameter = this.pages[ this.currentPageName ] instanceof ve.ui.MWParameterPage,
		isCurrentPageRemoved = false,
		prevSelectionCandidate, nextSelectionCandidate;

	this.stackLayout.getItems().forEach( function ( page ) {
		var pageName = page.getName();
		if ( pagesNamesToRemove.indexOf( pageName ) !== -1 ) {
			pagesToRemove.push( page );
			delete layout.pages[ pageName ];
			// If the current page is removed, clear currentPageName
			if ( layout.currentPageName === pageName ) {
				isCurrentPageRemoved = true;
			}
		} else {
			// avoid choosing a parameter as previous selection
			if ( !isCurrentPageRemoved && pageName.indexOf( '/' ) === -1 ) {
				prevSelectionCandidate = pageName;
			} else if ( isCurrentPageRemoved && !nextSelectionCandidate ) {
				nextSelectionCandidate = pageName;
			}
		}
	} );

	this.stackLayout.removeItems( pagesToRemove );
	if ( isCurrentPageRemoved ) {
		this.setPage( isCurrentParameter ? null :
			nextSelectionCandidate || prevSelectionCandidate
		);
	}
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
 * Set the current page and sidebar selection, by symbolic name. Doesn't focus the input.
 *
 * @param {string} [name] Symbolic name of page. Omit to remove current selection.
 */
ve.ui.MWTwoPaneTransclusionDialogLayout.prototype.setPage = function ( name ) {
	var page = this.pages[ name ];

	if ( page && name === this.currentPageName ) {
		return;
	}

	var previousPage = this.currentPageName ? this.pages[ this.currentPageName ] : null;
	this.currentPageName = name;

	if ( previousPage ) {
		// Blur anything focused if the next page doesn't have anything focusable.
		// This is not needed if the next page has something focusable (because once it is
		// focused this blur happens automatically).
		if ( !OO.ui.isMobile() &&
			( !page || OO.ui.findFocusable( page.$element ).length !== 0 )
		) {
			var $focused = previousPage.$element.find( ':focus' );
			if ( $focused.length ) {
				$focused[ 0 ].blur();
			}
		}
	}
	this.sidebar.setSelectionByPageName( name );
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
