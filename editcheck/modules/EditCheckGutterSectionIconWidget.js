/**
 * EditCheckGutterSectionIconWidget
 *
 * The icon shown in the edit check gutter for one section of the document.
 *
 * A section can be much taller than the viewport, so the icon doesn't just sit at
 * its top: it's kept in view as the section scrolls past, in three states.
 *
 * - `top`: the section's top hasn't reached the sticky line, so the icon rests at
 *   the top of the section.
 * - `stuck`: the section straddles the line, so the icon is pinned to the line.
 * - `bottom`: the section's bottom has caught up with the pinned icon, so the icon
 *   rides the bottom out of view.
 *
 * That's what `position: sticky` does, and this is shaped for handing over to it:
 * `$element` is the element that would be sticky, and the observer and sentinel are
 * emulation to be deleted with it. Sticky is blocked for now by ancestors of the
 * gutter which are themselves scroll containers, trapping it short of the scroller.
 *
 * @class
 * @extends OO.ui.Widget
 *
 * @param {Object} config Configuration options
 * @param {jQuery} config.$section Element covering the whole section this icon
 *  belongs to, observed to work out where the icon should be
 */
mw.editcheck.EditCheckGutterSectionIconWidget = function MWEditCheckGutterSectionIconWidget( config ) {
	// Parent constructor
	mw.editcheck.EditCheckGutterSectionIconWidget.super.call( this, config );

	this.$section = config.$section;

	this.icon = new OO.ui.IconWidget();
	this.countLabel = new OO.ui.LabelWidget();
	this.actionButton = new OO.ui.ButtonWidget( {
		icon: 'check',
		flags: [ 'invert' ],
		label: 'act',
		invisibleLabel: true,
		framed: false
	} );
	this.actionButton.toggle( false );

	// Sticky emulation state, see #setStickyMetrics
	this.state = null;
	this.line = null;
	this.observer = null;
	this.rootMargin = null;
	this.sentinelHeight = null;
	this.sectionAboveLine = false;
	this.sentinelAboveLine = false;
	this.onIntersection = this.onIntersection.bind( this );

	this.$element
		.addClass( 've-ui-editCheck-gutter-action-sticky' )
		.append( this.icon.$element, this.countLabel.$element, this.actionButton.$element );

	// Hidden icon-tall band at the section's bottom, see #setStickyMetrics. It sits
	// on the section rather than on $element, which moves, so #teardown removes it.
	this.$sentinel = $( '<div>' )
		.addClass( 've-ui-editCheck-gutter-action-sticky-sentinel' )
		.appendTo( this.$section );
};

/* Inheritance */

OO.inheritClass( mw.editcheck.EditCheckGutterSectionIconWidget, OO.ui.Widget );

/* Static methods */

/**
 * Collect the metrics the sticky emulation needs. They're the same for every
 * section, so they're gathered once per update and shared between the icons.
 *
 * @param {ve.init.mw.Target} target
 * @return {Object|null} `{ root, rootTop, rootHeight, line }` in viewport
 *  coordinates, or null if IntersectionObserver is unsupported
 */
mw.editcheck.EditCheckGutterSectionIconWidget.static.getStickyMetrics = function ( target ) {
	if ( !window.IntersectionObserver ) {
		return null;
	}
	const scrollContainer = target.$scrollContainer[ 0 ];
	const viewportRoot = !scrollContainer ||
		scrollContainer === document.documentElement ||
		scrollContainer === document.body;
	const rootEl = viewportRoot ? document.documentElement : scrollContainer;
	const rootTop = viewportRoot ? 0 : rootEl.getBoundingClientRect().top;
	// Sticky line: the toolbar bottom (it floats over the surface) plus a 4px gap
	const toolbarPadding = target.getToolbarSurfacePadding();
	return {
		root: viewportRoot ? null : scrollContainer,
		rootTop,
		rootHeight: rootEl.clientHeight,
		line: rootTop + ( toolbarPadding ? toolbarPadding.top + 4 : 0 )
	};
};

/* Methods */

/**
 * Update the icon to represent an action
 *
 * @param {mw.editcheck.EditCheckAction} action Primary action of the section
 * @param {number} count Number of actions in the section
 */
mw.editcheck.EditCheckGutterSectionIconWidget.prototype.setAction = function ( action, count ) {
	const quickAction = !!action.gutterQuickAction;
	if ( !quickAction ) {
		this.icon.setIcon( mw.editcheck.EditCheckActionWidget.static.iconMap[ action.getType() ] || 'notice' );
		this.icon.clearFlags().setFlags( action.getType() );
		this.countLabel.setLabel( count.toString() );
		this.countLabel.setInvisibleLabel( count === 1 );
	}
	this.icon.toggle( !quickAction );
	this.countLabel.toggle( !quickAction );
	this.actionButton.toggle( quickAction );
};

/**
 * Set whether the quick action is currently being performed
 *
 * @param {boolean} acting
 */
mw.editcheck.EditCheckGutterSectionIconWidget.prototype.setActing = function ( acting ) {
	this.actionButton.setDisabled( acting );
};

/**
 * Keep the icon in view as its section scrolls past.
 *
 * One observer watches the region of the scroll root above the line, asking two
 * elements the same question. The section overlaps that region once its top passes
 * the line, i.e. once the icon's resting place is out of view; the sentinel does so
 * once the section's bottom reaches where a pinned icon sits, which is when the icon
 * must be released. A region rather than a line, so a fast scroll can't skip it.
 *
 * @param {Object|null} metrics Metrics from .static.getStickyMetrics, or null to
 *  leave the icon resting at the top of its section
 * @param {Element|null} metrics.root Scroll root to observe against, null for the viewport
 * @param {number} metrics.rootTop Root top, in viewport coordinates
 * @param {number} metrics.rootHeight Root height
 * @param {number} metrics.line Line to pin the icon at, in viewport coordinates
 */
mw.editcheck.EditCheckGutterSectionIconWidget.prototype.setStickyMetrics = function ( metrics ) {
	const sectionRect = this.$section[ 0 ].getBoundingClientRect();
	const iconHeight = this.$element[ 0 ].offsetHeight;

	// Under two icon-heights there's no room for a stuck phase, so pinning would
	// only make the icon jitter
	if ( !metrics || sectionRect.height < iconHeight * 2 ) {
		this.disconnectObserver();
		this.setState( 'top' );
		return;
	}

	if ( metrics.line !== this.line ) {
		// The line has moved (a resize can change the toolbar height), so an
		// already-pinned icon needs re-pinning
		this.line = metrics.line;
		this.state = null;
	}

	// Only written when it actually changes, so the common scroll-driven update
	// stays read-only and doesn't force a layout
	if ( this.sentinelHeight !== iconHeight ) {
		this.$sentinel.css( 'height', iconHeight );
		this.sentinelHeight = iconHeight;
	}

	// A negative bottom inset shrinks the root to the region above the line. It
	// depends on neither the section nor the icon, so it rarely needs rebuilding.
	const rootMargin = '0px 0px ' +
		( metrics.line - ( metrics.rootTop + metrics.rootHeight ) ) + 'px 0px';
	if ( rootMargin !== this.rootMargin ) {
		this.disconnectObserver();
		this.observer = new IntersectionObserver( this.onIntersection, {
			root: metrics.root,
			rootMargin
		} );
		this.observer.observe( this.$section[ 0 ] );
		this.observer.observe( this.$sentinel[ 0 ] );
		this.rootMargin = rootMargin;
	}

	// The observer reports back asynchronously, so seed both flags to avoid a flash
	const isAboveLine = ( top, bottom ) => top < metrics.line && bottom > metrics.rootTop;
	this.sectionAboveLine = isAboveLine( sectionRect.top, sectionRect.bottom );
	this.sentinelAboveLine = isAboveLine( sectionRect.bottom - iconHeight, sectionRect.bottom );
	this.updateState();
};

/**
 * Handle the section or the sentinel crossing the line
 *
 * @private
 * @param {IntersectionObserverEntry[]} entries
 */
mw.editcheck.EditCheckGutterSectionIconWidget.prototype.onIntersection = function ( entries ) {
	entries.forEach( ( entry ) => {
		if ( entry.target === this.$sentinel[ 0 ] ) {
			this.sentinelAboveLine = entry.isIntersecting;
		} else {
			this.sectionAboveLine = entry.isIntersecting;
		}
	} );
	this.updateState();
};

/**
 * Move the icon to whichever state the observed flags imply
 *
 * @private
 */
mw.editcheck.EditCheckGutterSectionIconWidget.prototype.updateState = function () {
	if ( !this.sectionAboveLine ) {
		this.setState( 'top' );
	} else {
		this.setState( this.sentinelAboveLine ? 'bottom' : 'stuck' );
	}
};

/**
 * Position the icon for a sticky state
 *
 * @private
 * @param {string} state One of 'top', 'stuck' or 'bottom'
 */
mw.editcheck.EditCheckGutterSectionIconWidget.prototype.setState = function ( state ) {
	if ( state === this.state ) {
		return;
	}
	const pinning = state === 'stuck';
	if ( pinning ) {
		// Pinning uses position: fixed, which drops the width and the horizontal
		// position, so take both from the box as it stands. Measuring the distance
		// to the viewport's inline-end edge is border-immune and direction-correct.
		const rect = this.$element[ 0 ].getBoundingClientRect();
		const rtl = this.$element.css( 'direction' ) === 'rtl';
		this.$element.css( {
			top: this.line,
			width: rect.width,
			insetInlineEnd: rtl ? rect.left : document.documentElement.clientWidth - rect.right
		} );
	} else {
		this.$element.css( { top: '', width: '', insetInlineEnd: '' } );
	}
	this.state = state;
	this.$element
		.toggleClass( 've-ui-editCheck-gutter-action-sticky-stuck', pinning )
		.toggleClass( 've-ui-editCheck-gutter-action-sticky-bottom', state === 'bottom' );
};

/**
 * Disconnect the observer, clearing the cached margin so it can be rebuilt
 *
 * @private
 */
mw.editcheck.EditCheckGutterSectionIconWidget.prototype.disconnectObserver = function () {
	if ( this.observer ) {
		this.observer.disconnect();
		this.observer = null;
	}
	this.rootMargin = null;
};

/**
 * Teardown the widget
 */
mw.editcheck.EditCheckGutterSectionIconWidget.prototype.teardown = function () {
	this.disconnectObserver();
	this.$sentinel.remove();
};
