/*!
 * VisualEditor MediaWiki Initialization MobileArticleTarget class.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * @external mw.mobileFrontend.VisualEditorOverlay
 */

/**
 * MediaWiki mobile article target.
 *
 * @class
 * @extends ve.init.mw.ArticleTarget
 *
 * @constructor
 * @param {mw.mobileFrontend.VisualEditorOverlay} overlay Mobile frontend overlay
 * @param {Object} [config] Configuration options
 * @param {Object} [config.toolbarConfig]
 * @param {string|null} [config.section] Number of the section target should scroll to
 */
ve.init.mw.MobileArticleTarget = function VeInitMwMobileArticleTarget( overlay, config = {} ) {
	this.overlay = overlay;
	this.$overlay = overlay.$el;
	this.$overlaySurface = overlay.$el.find( '.surface' );

	config.toolbarConfig = ve.extendObject( {
		actions: false
	}, config.toolbarConfig );

	// Parent constructor
	ve.init.mw.MobileArticleTarget.super.call( this, config );

	// eslint-disable-next-line no-jquery/no-global-selector
	this.$editableContent = $( '#mw-content-text' );

	if ( config.section !== undefined ) {
		this.section = config.section;
	}

	// Initialization
	this.$element.addClass( 've-init-mw-mobileArticleTarget ve-init-mobileTarget' );
};

/* Inheritance */

OO.inheritClass( ve.init.mw.MobileArticleTarget, ve.init.mw.ArticleTarget );

/* Static Properties */

ve.init.mw.MobileArticleTarget.static.toolbarGroups = [
	// Back
	{
		name: 'back',
		include: [ 'back' ],
		excludeFromTargetWidget: true
	},
	{
		name: 'history',
		include: [ 'undo' ]
	},
	{
		name: 'style',
		classes: [ 've-test-toolbar-style' ],
		type: 'list',
		icon: 'textStyle',
		title: OO.ui.deferMsg( 'visualeditor-toolbar-style-tooltip' ),
		label: OO.ui.deferMsg( 'visualeditor-toolbar-style-tooltip' ),
		invisibleLabel: true,
		include: [ { group: 'textStyle' }, 'language', 'clear' ],
		forceExpand: [ 'bold', 'italic', 'clear' ],
		promote: [ 'bold', 'italic' ],
		demote: [ 'strikethrough', 'code', 'underline', 'language', 'clear' ]
	},
	{
		name: 'link',
		include: [ 'link' ]
	},
	{
		name: 'editMode',
		type: 'list',
		icon: 'edit',
		title: ve.msg( 'visualeditor-mweditmode-tooltip' ),
		label: ve.msg( 'visualeditor-mweditmode-tooltip' ),
		invisibleLabel: true,
		include: [ { group: 'editMode' } ],
		excludeFromTargetWidget: true
	},
	{
		name: 'save',
		type: 'bar',
		include: [ 'showSave' ],
		excludeFromTargetWidget: true
	}
];

const mobileInsertMenu = mw.config.get( 'wgVisualEditorConfig' ).mobileInsertMenu;
if ( mobileInsertMenu ) {
	const insertGroup = {
		name: 'insert',
		label: OO.ui.deferMsg( 'visualeditor-toolbar-insert' ),
		title: OO.ui.deferMsg( 'visualeditor-toolbar-insert' ),
		narrowConfig: {
			invisibleLabel: true,
			icon: 'add'
		},
		// This is the default for include=*, but that's not guaranteed:
		type: 'list'
	};
	if ( mobileInsertMenu === true ) {
		insertGroup.include = '*';
		insertGroup.forceExpand = [ 'transclusion', 'insertTable' ];
		insertGroup.promote = [ 'transclusion', 'insertTable' ];
		insertGroup.exclude = [ { group: 'format' }, { group: 'history' }, { group: 'structure' }, 'gallery', 'media', 'mwSignature' ];
	} else {
		insertGroup.include = mobileInsertMenu;
		// Citoid sets this up, so we need to force it for everything:
		insertGroup.forceExpand = mobileInsertMenu;
	}
	ve.init.mw.MobileArticleTarget.static.toolbarGroups.push( insertGroup );
}

ve.init.mw.MobileArticleTarget.static.trackingName = 'mobile';

// FIXME Some of these users will be on tablets, check for this
ve.init.mw.MobileArticleTarget.static.platformType = 'phone';

ve.init.mw.MobileArticleTarget.static.enforceResizesContent = true;

/* Methods */

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.deactivateSurfaceForToolbar = function () {
	// Parent method
	ve.init.mw.MobileArticleTarget.super.prototype.deactivateSurfaceForToolbar.call( this );

	if ( this.wasSurfaceActive && ve.init.platform.constructor.static.isIos() ) {
		this.prevScrollPosition = this.$scrollContainer.scrollTop();
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.activateSurfaceForToolbar = function () {
	// Parent method
	ve.init.mw.MobileArticleTarget.super.prototype.activateSurfaceForToolbar.call( this );

	if ( this.wasSurfaceActive && ve.init.platform.constructor.static.isIos() ) {
		// Setting the cursor can cause unwanted scrolling on iOS, so manually
		// restore the scroll offset from before the toolbar was opened (T218650).
		this.$scrollContainer.scrollTop( this.prevScrollPosition );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.clearSurfaces = function () {
	if ( ve.init.platform.constructor.static.isIos() && this.viewportZoomHandler ) {
		this.viewportZoomHandler.detach();
		this.viewportZoomHandler = null;
	}
	// Parent method
	ve.init.mw.MobileArticleTarget.super.prototype.clearSurfaces.call( this );
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.onContainerScroll = function () {
	// Editor may not have loaded yet, in which case `this.surface` is undefined
	const surfaceView = this.surface && this.surface.getView(),
		isActiveWithKeyboard = surfaceView && surfaceView.isFocused() && !surfaceView.isDeactivated();

	// On iOS Safari, when the keyboard is open, the layout viewport reported by the browser is not
	// updated to match the real viewport reduced by the keyboard (diagram: T218414#5027607). On all
	// modern non-iOS browsers the layout viewport is updated to match real viewport.
	//
	// This allows the fixed toolbar to be scrolled out of view, ignoring `position: fixed` (because
	// it refers to the layout viewport).
	//
	// When this happens, bring it back in by scrolling down a bit and back up until the top of the
	// fake viewport is aligned with the top of the real viewport.

	clearTimeout( this.onContainerScrollTimer );
	if ( !isActiveWithKeyboard ) {
		return;
	}

	// Wait until after the scroll, because 'scroll' events are not emitted for every frame the
	// browser paints, so the toolbar would lag behind in a very unseemly manner. Additionally,
	// getBoundingClientRect returns incorrect values during scrolling, so make sure to calculate
	// it only after the scrolling ends (https://openradar.appspot.com/radar?id=6668472289329152).
	let animateToolbarIntoView;
	this.onContainerScrollTimer = setTimeout( animateToolbarIntoView = () => {
		if ( this.toolbarAnimating ) {
			// We can't do this while the 'transform' transition is happening, because
			// getBoundingClientRect() returns values that reflect that (and are negative).
			return;
		}

		const $header = this.overlay.$el.find( '.overlay-header-container' );

		// Check if toolbar is offscreen. In a better world, this would reject all negative values
		// (pos >= 0), but getBoundingClientRect often returns funny small fractional values after
		// this function has done its job (which triggers another 'scroll' event) and before the
		// user scrolled again. If we allowed it to run, it would trigger a hilarious loop! Toolbar
		// being 1px offscreen is not a big deal anyway.
		const pos = $header[ 0 ].getBoundingClientRect().top;
		if ( pos >= -1 ) {
			return;
		}

		// We don't know how much we have to scroll because we don't know how large the real
		// viewport is. This value is bigger than the screen height of all iOS devices.
		const viewportHeight = 2000;
		// OK so this one is really weird. Normally on iOS, the scroll position is set on <body>.
		// But on our sites, when using iOS 13, it's on <html> instead - maybe due to some funny
		// CSS we set on html and body? Anyway, this seems to work...
		const scrollY = document.body.scrollTop || document.documentElement.scrollTop;
		const scrollX = document.body.scrollLeft || document.documentElement.scrollLeft;

		// Prevent the scrolling we're about to do from triggering this event handler again.
		this.toolbarAnimating = true;

		const $overlaySurface = this.$overlaySurface;
		// Scroll down and translate the surface by the same amount, otherwise the content at new
		// scroll position visibly flashes.
		$overlaySurface.css( 'transform', 'translateY( ' + viewportHeight + 'px )' );
		window.scroll( scrollX, scrollY + viewportHeight );

		// Prepate to animate toolbar sliding into view
		$header.removeClass( 'toolbar-shown toolbar-shown-done' );
		const headerHeight = $header[ 0 ].offsetHeight;
		const headerTranslateY = Math.max( -headerHeight, pos );
		$header.css( 'transform', 'translateY( ' + headerTranslateY + 'px )' );

		// The scroll back up must be after a delay, otherwise no scrolling happens and the
		// viewports are not aligned.
		setTimeout( () => {
			// Scroll back up
			$overlaySurface.css( 'transform', '' );
			window.scroll( scrollX, scrollY );

			// Animate toolbar sliding into view
			$header.addClass( 'toolbar-shown' ).css( 'transform', '' );
			setTimeout( () => {
				$header.addClass( 'toolbar-shown-done' );
				// Wait until the animation is done before allowing this event handler to trigger again
				this.toolbarAnimating = false;
				// Re-check after the animation is done, in case the user scrolls in the meantime.
				animateToolbarIntoView();
				// The animation takes 250ms but we need to wait longer for some reason…
				// 'transitionend' event also doesn't seem to work reliably.
			}, 300 );
			// If the delays below are made any smaller, the weirdest graphical glitches happen,
			// so don't mess with them
		}, 50 );
	}, 250 );
};

/**
 * Handle surface scroll events
 */
ve.init.mw.MobileArticleTarget.prototype.onSurfaceScroll = function () {
	if ( ve.init.platform.constructor.static.isIos() && this.getSurface() ) {
		// iOS has a bug where if you change the scroll offset of a
		// contentEditable or textarea with a cursor visible, it disappears.
		// This function works around it by removing and reapplying the selection.
		const nativeSelection = this.getSurface().getView().nativeSelection;
		if ( nativeSelection.rangeCount && document.activeElement.contentEditable === 'true' ) {
			const range = nativeSelection.getRangeAt( 0 );
			nativeSelection.removeAllRanges();
			nativeSelection.addRange( range );
		}
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.createSurface = function ( dmDoc, config = {} ) {
	if ( this.overlay.isNewPage ) {
		config = ve.extendObject( {
			placeholder: this.overlay.options.placeholder
		}, config );
	}

	// Parent method
	const surface = ve.init.mw.MobileArticleTarget
		.super.prototype.createSurface.call( this, dmDoc, config );

	surface.connect( this, { scroll: 'onSurfaceScroll' } );

	return surface;
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.getSurfaceClasses = function () {
	const classes = ve.init.mw.MobileArticleTarget.super.prototype.getSurfaceClasses.call( this );
	return [ ...classes, 'content' ];
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.setSurface = function ( surface ) {
	const changed = surface !== this.surface;

	// Parent method
	// FIXME This actually skips ve.init.mw.Target.prototype.setSurface. Why?
	ve.init.mw.Target.super.prototype.setSurface.apply( this, arguments );

	if ( changed ) {
		this.$overlaySurface.append( surface.$element );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.surfaceReady = function () {
	if ( this.teardownPromise ) {
		// Loading was cancelled, the overlay is already closed at this point. Do nothing.
		// Otherwise e.g. scrolling from #goToHeading would kick in and mess things up.
		return;
	}

	// Deactivate the surface so any initial selection set in surfaceReady
	// listeners doesn't cause the keyboard to be shown.
	this.getSurface().getView().deactivate( false );

	// Parent method
	ve.init.mw.MobileArticleTarget.super.prototype.surfaceReady.apply( this, arguments );

	// If no selection has been set yet, set it to the start of the document.
	if ( this.getSurface().getModel().getSelection().isNull() ) {
		this.getSurface().getView().selectFirstSelectableContentOffset();
	}

	this.events.trackActivationComplete();

	if ( ve.init.platform.constructor.static.isIos() ) {
		if ( this.viewportZoomHandler ) {
			this.viewportZoomHandler.detach();
		}
		this.viewportZoomHandler = new ve.init.mw.ViewportZoomHandler();
		this.viewportZoomHandler.attach( this.getSurface() );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.afterSurfaceReady = function () {
	this.adjustContentPadding();

	// Parent method
	ve.init.mw.MobileArticleTarget.super.prototype.afterSurfaceReady.apply( this, arguments );
};

/**
 * Match the content padding to the toolbar height
 */
ve.init.mw.MobileArticleTarget.prototype.adjustContentPadding = function () {
	const surface = this.getSurface(),
		surfaceView = surface.getView(),
		paddingTop = surface.getPadding().top;

	surfaceView.$attachedRootNode.css( 'padding-top', paddingTop );
	surface.$placeholder.css( 'padding-top', paddingTop );
	surfaceView.emit( 'position' );
	surface.scrollSelectionIntoView();
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.switchToFallbackWikitextEditor = function ( modified ) {
	let dataPromise;
	if ( modified ) {
		dataPromise = this.getWikitextDataPromiseForDoc( modified ).then( ( response ) => {
			const content = ve.getProp( response, 'visualeditoredit', 'content' );
			return { text: content };
		} );
	}
	this.overlay.switchToSourceEditor( dataPromise );
	return dataPromise;
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.save = function () {
	// Parent method
	const promise = ve.init.mw.MobileArticleTarget.super.prototype.save.apply( this, arguments );

	this.overlay.log( {
		action: 'saveAttempt'
	} );

	return promise;
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.showSaveDialog = function () {
	// Parent method
	ve.init.mw.MobileArticleTarget.super.prototype.showSaveDialog.apply( this, arguments );

	this.overlay.log( {
		action: 'saveIntent'
	} );
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.replacePageContent = function (
	html, categoriesHtml, displayTitle, lastModified /* , contentSub, sections */
) {
	// Parent method
	ve.init.mw.MobileArticleTarget.super.prototype.replacePageContent.apply( this, arguments );

	if ( lastModified ) {
		// TODO: Update the last-modified-bar with the correct info
		// eslint-disable-next-line no-jquery/no-global-selector
		$( '.last-modified-bar' ).remove();
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.saveComplete = function ( data ) {
	// Set 'saved' flag before teardown (which is called in parent method) to avoid prompts
	// This is set in this.overlay.onSaveComplete, but we can't call that until we have
	// computed the fragment.
	this.overlay.saved = true;

	// Parent method
	ve.init.mw.MobileArticleTarget.super.prototype.saveComplete.apply( this, arguments );

	const fragment = this.getSectionHashFromPage().slice( 1 );

	this.overlay.sectionId = fragment;
	this.overlay.onSaveComplete( data.newrevid, data.tempusercreatedredirect, data.tempusercreated );
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.saveFail = function ( doc, saveData, code, data ) {
	// parent method
	ve.init.mw.MobileArticleTarget.super.prototype.saveFail.apply( this, arguments );

	this.overlay.onSaveFailure( data );
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.tryTeardown = function () {
	this.overlay.onExitClick( $.Event() );
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.setupToolbar = function () {
	// Parent method
	ve.init.mw.MobileArticleTarget.super.prototype.setupToolbar.apply( this, arguments );

	this.toolbar.$element.addClass( 've-init-mw-mobileArticleTarget-toolbar' );
	this.toolbar.$popups.addClass( 've-init-mw-mobileArticleTarget-toolbar-popups' );
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.attachToolbar = function () {
	// Move the toolbar to the overlay header
	this.overlay.$el.find( '.overlay-header > .toolbar' ).append( this.toolbar.$element );
	this.toolbar.initialize();
	// MobileFrontend handles toolbar floating, but mark it as floating so we
	// calculate a height for surface padding.
	this.toolbar.float();
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.setupToolbarSaveButton = function () {
	this.toolbarSaveButton = this.toolbar.getToolGroupByName( 'save' ).items[ 0 ];
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.goToHeading = function ( headingNode ) {
	this.scrollToHeading( headingNode );
};

/**
 * Done with the editing toolbar
 */
ve.init.mw.MobileArticleTarget.prototype.done = function () {
	this.getSurface().getModel().setNullSelection();
	this.getSurface().getView().blur();
};

/* Registration */

ve.init.mw.targetFactory.register( ve.init.mw.MobileArticleTarget );
