/*!
 * VisualEditor MediaWiki Initialization MobileArticleTarget class.
 *
 * @copyright 2011-2019 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki mobile article target.
 *
 * @class
 * @extends ve.init.mw.ArticleTarget
 *
 * @constructor
 * @param {VisualEditorOverlay} overlay Mobile frontend overlay
 * @param {Object} [config] Configuration options
 * @cfg {number} [section] Number of the section target should scroll to
 */
ve.init.mw.MobileArticleTarget = function VeInitMwMobileArticleTarget( overlay, config ) {
	this.overlay = overlay;
	this.$overlay = overlay.$el;
	this.$overlaySurface = overlay.$el.find( '.surface' );

	ve.newMobileContext = mw.config.get( 'wgVisualEditorConfig' ).enableNewMobileContext;

	config = config || {};
	config.toolbarConfig = $.extend( {
		actions: false
	}, config.toolbarConfig );

	// Parent constructor
	ve.init.mw.MobileArticleTarget.super.call( this, config );

	this.section = config.section;
	this.adjustContentPaddingDebounced = OO.ui.debounce( this.adjustContentPadding.bind( this ) );

	// Initialization
	this.$element.addClass( 've-init-mw-mobileArticleTarget' );
};

/* Inheritance */

OO.inheritClass( ve.init.mw.MobileArticleTarget, ve.init.mw.ArticleTarget );

/* Static Properties */

ve.init.mw.MobileArticleTarget.static.toolbarGroups = [
	// History
	{
		name: 'history',
		include: [ 'undo' ]
	},
	// Style
	{
		name: 'style',
		classes: [ 've-test-toolbar-style' ],
		type: 'list',
		icon: 'textStyle',
		title: OO.ui.deferMsg( 'visualeditor-toolbar-style-tooltip' ),
		include: [ { group: 'textStyle' }, 'language', 'clear' ],
		forceExpand: [ 'bold', 'italic', 'clear' ],
		promote: [ 'bold', 'italic' ],
		demote: [ 'strikethrough', 'code', 'underline', 'language', 'clear' ]
	},
	// Link
	{
		name: 'link',
		include: [ 'link' ]
	},
	// Placeholder for reference tools (e.g. Cite and/or Citoid)
	{
		name: 'reference'
	}
	// "Done" tool is added in setupToolbar as it not part of the
	// standard config (i.e. shouldn't be inhertied by TargetWidget)
];

ve.init.mw.MobileArticleTarget.static.trackingName = 'mobile';

// FIXME Some of these users will be on tablets, check for this
ve.init.mw.MobileArticleTarget.static.platformType = 'phone';

/* Static Methods */

// FIXME This method is overridden in the MobileFrontend extension,
// figure out a way to make it public there so that we can use it here
/**
 * @method
 */
ve.init.mw.MobileArticleTarget.static.parseSaveError = null;

/* Methods */

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.deactivateSurfaceForToolbar = function () {
	// Parent method
	ve.init.mw.MobileArticleTarget.super.prototype.deactivateSurfaceForToolbar.call( this );

	if ( this.wasSurfaceActive && ve.init.platform.constructor.static.isIos() ) {
		this.prevScrollPosition = this.getSurface().$scrollContainer.scrollTop();
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
		this.getSurface().$scrollContainer.scrollTop( this.prevScrollPosition );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.onContainerScroll = function () {
	var surfaceView, isActiveWithKeyboard, $header, $overlaySurface;
	// Editor may not have loaded yet, in which case `this.surface` is undefined
	surfaceView = this.surface && this.surface.getView();
	isActiveWithKeyboard = surfaceView && surfaceView.isFocused() && !surfaceView.isDeactivated();

	$header = this.overlay.$el.find( '.overlay-header-container' );
	$overlaySurface = this.$overlaySurface;

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
	this.onContainerScrollTimer = setTimeout( function () {
		var pos, viewportHeight, scrollPos, headerHeight, headerTranslateY;

		// Check if toolbar is offscreen. In a better world, this would reject all negative values
		// (pos >= 0), but getBoundingClientRect often returns funny small fractional values after
		// this function has done its job (which triggers another 'scroll' event) and before the
		// user scrolled again. If we allowed it to run, it would trigger a hilarious loop! Toolbar
		// being 1px offscreen is not a big deal anyway.
		pos = $header[ 0 ].getBoundingClientRect().top;
		if ( pos >= -1 ) {
			return;
		}

		// We don't know how much we have to scroll because we don't know how large the real
		// viewport is, but it's no larger than the layout viewport.
		viewportHeight = window.innerHeight;
		scrollPos = document.body.scrollTop;

		// Scroll down and translate the surface by the same amount, otherwise the content at new
		// scroll position visibly flashes.
		$overlaySurface.css( 'transform', 'translateY( ' + viewportHeight + 'px )' );
		document.body.scrollTop += viewportHeight;

		// (Note that the scrolling we just did will naturally trigger another 'scroll' event,
		// and run this handler again after 250ms. This is okay.)

		// Prepate to animate toolbar sliding into view
		$header.removeClass( 'toolbar-shown toolbar-shown-done' );
		headerHeight = $header[ 0 ].offsetHeight;
		headerTranslateY = Math.max( -headerHeight, pos );
		$header.css( 'transform', 'translateY( ' + headerTranslateY + 'px )' );

		// The scroll back up must be after a delay, otherwise no scrolling happens and the
		// viewports are not aligned. requestAnimationFrame() seems to minimize weird flashes
		// of white (although they still happen and I have no explanation for them).
		requestAnimationFrame( function () {
			// Scroll back up
			$overlaySurface.css( 'transform', '' );
			document.body.scrollTop = scrollPos;

			// Animate toolbar sliding into view
			$header.addClass( 'toolbar-shown' ).css( 'transform', '' );
			setTimeout( function () {
				$header.addClass( 'toolbar-shown-done' );
			}, 250 );
		} );
	}, 250 );
};

/**
 * Handle surface scroll events
 */
ve.init.mw.MobileArticleTarget.prototype.onSurfaceScroll = function () {
	var nativeSelection, range;

	if ( ve.init.platform.constructor.static.isIos() ) {
		// iOS has a bug where if you change the scroll offset of a
		// contentEditable or textarea with a cursor visible, it disappears.
		// This function works around it by removing and reapplying the selection.
		nativeSelection = this.getSurface().getView().nativeSelection;
		if ( nativeSelection.rangeCount && document.activeElement.contentEditable === 'true' ) {
			range = nativeSelection.getRangeAt( 0 );
			nativeSelection.removeAllRanges();
			nativeSelection.addRange( range );
		}
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.createSurface = function ( dmDoc, config ) {
	var surface;
	if ( this.overlay.isNewPage ) {
		config = ve.extendObject( {
			placeholder: this.overlay.options.placeholder
		}, config );
	}

	// Parent method
	surface = ve.init.mw.MobileArticleTarget
		.super.prototype.createSurface.call( this, dmDoc, config );

	surface.connect( this, { scroll: 'onSurfaceScroll' } );

	return surface;
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.setSurface = function ( surface ) {
	var changed = surface !== this.surface;

	// Parent method
	// FIXME This actually skips ve.init.mw.Target.prototype.setSurface. Why?
	ve.init.mw.Target.super.prototype.setSurface.apply( this, arguments );

	if ( changed ) {
		surface.$element.addClass( 'content' );
		this.$overlaySurface.append( surface.$element );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.surfaceReady = function () {
	var surfaceModel,
		surface = this.getSurface();

	if ( this.teardownPromise ) {
		// Loading was cancelled, the overlay is already closed at this point. Do nothing.
		// Otherwise e.g. scrolling from #goToHeading would kick in and mess things up.
		return;
	}

	// Calls scrollSelectionIntoView so must be called before parent,
	// which calls goToHeading. (T225292)
	this.adjustContentPadding();

	// Parent method
	ve.init.mw.MobileArticleTarget.super.prototype.surfaceReady.apply( this, arguments );

	surfaceModel = this.getSurface().getModel();
	surfaceModel.connect( this, {
		blur: 'onSurfaceBlur',
		focus: 'onSurfaceFocus'
	} );
	this[ surfaceModel.getSelection().isNull() ? 'onSurfaceBlur' : 'onSurfaceFocus' ]();

	this.events.trackActivationComplete();

	this.overlay.hideSpinner();

	surface.getContext().connect( this, { resize: 'adjustContentPaddingDebounced' } );

	this.maybeShowWelcomeDialog();
};

/**
 * Match the content padding to the toolbar height
 */
ve.init.mw.MobileArticleTarget.prototype.adjustContentPadding = function () {
	var surface = this.getSurface(),
		surfaceView = surface.getView(),
		toolbarHeight = this.getToolbar().$element[ 0 ].clientHeight,
		contextHeight = ve.newMobileContext ?
			surface.getContext().$element[ 0 ].clientHeight : 0;

	surface.setPadding( {
		top: toolbarHeight,
		bottom: contextHeight
	} );
	surfaceView.$attachedRootNode.css( 'padding-top', toolbarHeight );
	surface.$placeholder.css( 'padding-top', toolbarHeight );
	surfaceView.emit( 'position' );
	surface.scrollSelectionIntoView();
};

/**
 * Handle surface blur events
 */
ve.init.mw.MobileArticleTarget.prototype.onSurfaceBlur = function () {
	this.getToolbar().$group.addClass( 've-init-mw-mobileArticleTarget-editTools-hidden' );
	this.pageToolbar.$element.removeClass( 've-init-mw-mobileArticleTarget-pageToolbar-hidden' );

	if ( ve.init.platform.constructor.static.isIos() ) {
		this.getSurface().$element.css( 'padding-bottom', '' );
	}
};

/**
 * Handle surface focus events
 */
ve.init.mw.MobileArticleTarget.prototype.onSurfaceFocus = function () {
	this.getToolbar().$group.removeClass( 've-init-mw-mobileArticleTarget-editTools-hidden' );
	this.pageToolbar.$element.addClass( 've-init-mw-mobileArticleTarget-pageToolbar-hidden' );

	if ( ve.init.platform.constructor.static.isIos() ) {
		this.getSurface().$element.css( 'padding-bottom', this.$element.height() - this.getToolbar().$element.height() );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.getSaveButtonLabel = function ( startProcess ) {
	var suffix = startProcess ? '-start' : '';
	// The following messages can be used here:
	// * visualeditor-savedialog-label-publish-short
	// * visualeditor-savedialog-label-publish-short-start
	// * visualeditor-savedialog-label-save-short
	// * visualeditor-savedialog-label-save-short-start
	if ( mw.config.get( 'wgEditSubmitButtonLabelPublish' ) ) {
		return OO.ui.deferMsg( 'visualeditor-savedialog-label-publish-short' + suffix );
	}

	return OO.ui.deferMsg( 'visualeditor-savedialog-label-save-short' + suffix );
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.createTargetWidget = function ( config ) {
	// Parent method
	var targetWidget = ve.init.mw.MobileArticleTarget.super.prototype.createTargetWidget.call( this, config );

	if ( !ve.newMobileContext ) {
		targetWidget.once( 'setup', function () {
			// Append the context to the toolbar
			targetWidget.getToolbar().$bar.append( targetWidget.getSurface().getContext().$element );
		} );
	}

	return targetWidget;
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.loadFail = function ( key, text ) {
	// Parent method
	ve.init.mw.MobileArticleTarget.super.prototype.loadFail.apply( this, arguments );

	this.overlay.reportError( text );
	this.overlay.hide();
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.editSource = function () {
	var modified = this.fromEditedState || this.getSurface().getModel().hasBeenModified();

	this.switchToWikitextEditor( modified );
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.switchToWikitextEditor = function ( modified ) {
	var dataPromise;
	if ( modified ) {
		dataPromise = this.getWikitextDataPromiseForDoc( modified ).then( function ( response ) {
			var content = ve.getProp( response, 'visualeditoredit', 'content' );
			return { text: content };
		} );
	}
	this.overlay.switchToSourceEditor( dataPromise );
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.save = function () {
	// Parent method
	ve.init.mw.MobileArticleTarget.super.prototype.save.apply( this, arguments );

	this.overlay.log( {
		action: 'saveAttempt'
	} );
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
ve.init.mw.MobileArticleTarget.prototype.saveComplete = function ( html ) {
	// TODO: parsing this is expensive just for the section details. We should
	// change MobileFrontend+this to behave like desktop does and just rerender
	// the page with the provided HTML (T219420).
	var fragment = this.getSectionFragmentFromPage( $.parseHTML( html ) );
	// Parent method
	ve.init.mw.MobileArticleTarget.super.prototype.saveComplete.apply( this, arguments );

	this.overlay.sectionId = fragment;
	this.overlay.onSaveComplete();
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.saveFail = function ( doc, saveData, wasRetry, jqXHR, status, response ) {

	// parent method
	ve.init.mw.MobileArticleTarget.super.prototype.saveFail.apply( this, arguments );

	this.overlay.onSaveFailure( this.constructor.static.parseSaveError( response, status ) );
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.tryTeardown = function () {
	window.history.back();
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.load = function () {
	var surface;

	// Create dummy surface to show toolbar while loading
	// Call ve.init.Target directly to avoid firing surfaceReady
	surface = ve.init.Target.prototype.addSurface.call( this, new ve.dm.Document( [
		{ type: 'paragraph' }, { type: '/paragraph' },
		{ type: 'internalList' }, { type: '/internalList' }
	] ) );
	surface.setReadOnly( true );
	// setSurface creates dummy toolbar
	this.setSurface( surface );

	return ve.init.mw.MobileArticleTarget.super.prototype.load.apply( this, arguments );
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.setupToolbar = function ( surface ) {
	if ( !this.pageToolbar ) {
		this.pageToolbar = new ve.ui.TargetToolbar( this, { actions: true } );
	}

	this.pageToolbar.setup( [
		// Back
		{
			name: 'back',
			include: [ 'back' ]
		},
		{
			name: 'editMode',
			type: 'list',
			icon: 'edit',
			title: ve.msg( 'visualeditor-mweditmode-tooltip' ),
			include: [ 'editModeVisual', 'editModeSource' ]
		},
		{
			name: 'save',
			type: 'bar',
			include: [ 'showSave' ]
		}
	], surface );

	// Parent method
	ve.init.mw.MobileArticleTarget.super.prototype.setupToolbar.call( this, surface );

	this.pageToolbar.emit( 'updateState' );

	if ( !this.$title ) {
		this.$title = $( '<div>' ).addClass( 've-init-mw-mobileArticleTarget-title-container' ).append(
			$( '<div>' ).addClass( 've-init-mw-mobileArticleTarget-title' ).text(
				new mw.Title( this.getPageName() ).getMainText()
			)
		);
	}

	// Insert title between 'back' and 'advanced'
	this.$title.insertAfter( this.pageToolbar.items[ 0 ].$element );

	this.pageToolbar.$element.addClass( 've-init-mw-mobileArticleTarget-pageToolbar' );

	this.toolbar.$element.append( this.pageToolbar.$element );
	this.pageToolbar.initialize();

	this.pageToolbar.$group.addClass( 've-init-mw-mobileArticleTarget-pageTools' );
	this.toolbar.$group.addClass( 've-init-mw-mobileArticleTarget-editTools' );

	this.getToolbar().setup(
		this.constructor.static.toolbarGroups.concat( [
			// Done with editing toolbar
			{
				name: 'done',
				include: [ 'done' ]
			}
		] ),
		surface
	);

	this.toolbar.$element.addClass( 've-init-mw-mobileArticleTarget-toolbar' );
	if ( !ve.newMobileContext ) {
		// Append the context to the toolbar
		this.toolbar.$bar.append( surface.getContext().$element );
	}

	// Don't wait for the first surface focus/blur event to hide one of the toolbars
	this.onSurfaceBlur();
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.attachToolbar = function () {
	// Move the toolbar to the overlay header
	this.overlay.$el.find( '.overlay-header > .toolbar' ).append( this.toolbar.$element );
	this.toolbar.initialize();
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.setupToolbarSaveButton = function () {
	this.toolbarSaveButton = this.pageToolbar.getToolGroupByName( 'save' ).items[ 0 ];
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

/**
 * Back tool
 */
ve.ui.MWBackTool = function VeUiMwBackTool() {
	// Parent constructor
	ve.ui.MWBackTool.super.apply( this, arguments );
};
OO.inheritClass( ve.ui.MWBackTool, ve.ui.Tool );
ve.ui.MWBackTool.static.name = 'back';
ve.ui.MWBackTool.static.group = 'navigation';
ve.ui.MWBackTool.static.icon = 'close';
ve.ui.MWBackTool.static.title =
	OO.ui.deferMsg( 'visualeditor-backbutton-tooltip' );
ve.ui.MWBackTool.static.commandName = 'back';

/** */
ve.ui.MWBackTool.prototype.onUpdateState = function () {
	// Parent method
	ve.ui.MWBackTool.super.prototype.onUpdateState.apply( this, arguments );

	this.setActive( false );
	this.setDisabled( false );
};

ve.ui.toolFactory.register( ve.ui.MWBackTool );

/**
 * Back command
 */
ve.ui.MWBackCommand = function VeUiMWBackCommand() {
	// Parent constructor
	ve.ui.MWBackCommand.super.call( this, 'back' );
};
OO.inheritClass( ve.ui.MWBackCommand, ve.ui.Command );
ve.ui.MWBackCommand.prototype.execute = function () {
	ve.init.target.tryTeardown();
};
ve.ui.commandRegistry.register( new ve.ui.MWBackCommand() );

/**
 * Done tool
 */
ve.ui.MWDoneTool = function VeUiMWDoneTool() {
	// Parent constructor
	ve.ui.MWDoneTool.super.apply( this, arguments );
};
OO.inheritClass( ve.ui.MWDoneTool, ve.ui.Tool );
ve.ui.MWDoneTool.static.name = 'done';
ve.ui.MWDoneTool.static.group = 'navigation';
ve.ui.MWDoneTool.static.autoAddToCatchall = false;
ve.ui.MWDoneTool.static.icon = 'check';
ve.ui.MWDoneTool.static.flags = [ 'progressive' ];
ve.ui.MWDoneTool.static.title =
	OO.ui.deferMsg( 'visualeditor-donebutton-tooltip' );
ve.ui.MWDoneTool.static.commandName = 'done';
ve.ui.toolFactory.register( ve.ui.MWDoneTool );

/**
 * Done command
 */
ve.ui.MWDoneCommand = function VeUiMwDoneCommand() {
	// Parent constructor
	ve.ui.MWDoneCommand.super.call( this, 'done' );
};
OO.inheritClass( ve.ui.MWDoneCommand, ve.ui.Command );
ve.ui.MWDoneCommand.prototype.execute = function () {
	ve.init.target.done();
};
ve.ui.commandRegistry.register( new ve.ui.MWDoneCommand() );
