/*!
 * VisualEditor MediaWiki Initialization DesktopArticleTarget class.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/* eslint-disable no-jquery/no-global-selector */

/**
 * MediaWiki desktop article target.
 *
 * @class
 * @extends ve.init.mw.ArticleTarget
 *
 * @constructor
 * @param {Object} [config]
 */
ve.init.mw.DesktopArticleTarget = function VeInitMwDesktopArticleTarget( config ) {
	// Parent constructor
	ve.init.mw.DesktopArticleTarget.super.call( this, config );

	// Parent constructor bound key event handlers, but we don't want them bound until
	// we activate; so unbind them again
	this.unbindHandlers();

	this.onWatchToggleHandler = this.onWatchToggle.bind( this );

	// Properties
	this.onBeforeUnloadFallback = null;
	this.onBeforeUnload = this.onBeforeUnload.bind( this );
	this.onUnloadHandler = this.onUnload.bind( this );
	this.activating = false;
	this.deactivating = false;
	this.deactivatingDeferred = null;
	this.recreating = false;
	this.activatingDeferred = null;
	this.toolbarSetupDeferred = null;
	this.suppressNormalStartupDialogs = false;
	this.editingTabDialog = null;
	this.welcomeDialog = null;
	this.welcomeDialogPromise = null;

	// If this is true then #transformPage / #restorePage will not call pushState
	// This is to avoid adding a new history entry for the url we just got from onpopstate
	// (which would mess up with the expected order of Back/Forwards browsing)
	this.actFromPopState = false;
	this.popState = {
		tag: 'visualeditor'
	};
	this.scrollTop = null;
	this.section = null;
	if ( $( '#wpSummary' ).length ) {
		this.initialEditSummary = $( '#wpSummary' ).val();
	} else {
		this.initialEditSummary = this.currentUrl.searchParams.get( 'summary' );
	}
	this.initialCheckboxes = $( '.editCheckboxes input' ).toArray()
		.reduce( ( initialCheckboxes, node ) => {
			initialCheckboxes[ node.name ] = node.checked;
			return initialCheckboxes;
		}, {} );

	this.tabLayout = mw.config.get( 'wgVisualEditorConfig' ).tabLayout;
	this.events = new ve.init.mw.ArticleTargetEvents( this );
	this.$originalContent = $( '<div>' ).addClass( 've-init-mw-desktopArticleTarget-originalContent' );
	this.$editableContent.addClass( 've-init-mw-desktopArticleTarget-editableContent' );

	// Initialization
	this.$element
		.addClass( 've-init-mw-desktopArticleTarget' )
		.append( this.$originalContent );

	// We replace the current state with one that's marked with our tag. This way, when users
	// use the Back button to exit the editor we can restore Read mode. This is because we want
	// to ignore foreign states in onWindowPopState. Without this, the Read state is foreign.
	// FIXME: There should be a much better solution than this.
	history.replaceState( this.popState, '', this.currentUrl );

	this.setupSkinTabs();

	window.addEventListener( 'popstate', this.onWindowPopState.bind( this ) );
};

/* Inheritance */

OO.inheritClass( ve.init.mw.DesktopArticleTarget, ve.init.mw.ArticleTarget );

/* Static Properties */

ve.init.mw.DesktopArticleTarget.static.toolbarGroups = ve.copy( ve.init.mw.DesktopArticleTarget.static.toolbarGroups );
ve.init.mw.DesktopArticleTarget.static.toolbarGroups.push(
	{
		name: 'help',
		align: 'after',
		excludeFromTargetWidget: true,
		type: 'mwHelpList',
		icon: 'help',
		indicator: null,
		title: ve.msg( 'visualeditor-help-tool' ),
		include: [ { group: 'help' } ],
		promote: [ 'mwUserGuide' ]
	},
	{
		name: 'notices',
		align: 'after',
		excludeFromTargetWidget: true,
		include: [ { group: 'notices' } ]
	},
	{
		name: 'pageMenu',
		align: 'after',
		excludeFromTargetWidget: true,
		type: 'list',
		icon: 'menu',
		indicator: null,
		title: ve.msg( 'visualeditor-pagemenu-tooltip' ),
		label: ve.msg( 'visualeditor-pagemenu-tooltip' ),
		invisibleLabel: true,
		include: [ { group: 'utility' } ],
		demote: [ 'changeDirectionality', 'findAndReplace' ]
	},
	{
		name: 'editMode',
		align: 'after',
		excludeFromTargetWidget: true,
		type: 'list',
		icon: 'edit',
		title: ve.msg( 'visualeditor-mweditmode-tooltip' ),
		label: ve.msg( 'visualeditor-mweditmode-tooltip' ),
		invisibleLabel: true,
		include: [ { group: 'editMode' } ]
	},
	{
		name: 'save',
		align: 'after',
		excludeFromTargetWidget: true,
		type: 'bar',
		include: [ { group: 'save' } ]
	}
);

ve.init.mw.DesktopArticleTarget.static.platformType = 'desktop';

/* Events */

/**
 * @event ve.init.mw.DesktopArticleTarget#deactivate
 */

/**
 * @event ve.init.mw.DesktopArticleTarget#transformPage
 */

/**
 * @event ve.init.mw.DesktopArticleTarget#restorePage
 */

/**
 * Fired when user clicks the button to open the save dialog.
 *
 * @event ve.init.mw.DesktopArticleTarget#saveWorkflowBegin
 */

/**
 * Fired when user exits the save workflow
 *
 * @event ve.init.mw.DesktopArticleTarget#saveWorkflowEnd
 */

/**
 * Fired when user initiates review changes in save workflow
 *
 * @event ve.init.mw.DesktopArticleTarget#saveReview
 */

/**
 * Fired when user initiates saving of the document
 *
 * @event ve.init.mw.DesktopArticleTarget#saveInitiated
 */

/* Methods */

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.addSurface = function ( dmDoc, config ) {
	const skinPadding = {
		// Vector-2022 content area less padding, so popups can render too close
		// to the edge of the text (T258501). The default of 10px is reduced to 3px.
		// We still need a bit of padding to keep popups from touching the sidebar.
		'vector-2022': 3,
		monobook: -10
	};
	const skin = mw.config.get( 'skin' );
	config = ve.extendObject( {
		overlayPadding: skin in skinPadding ? skinPadding[ skin ] : undefined
	}, config );
	return ve.init.mw.DesktopArticleTarget.super.prototype.addSurface.call( this, dmDoc, config );
};

/**
 * Set the container for the target, appending the target to it
 *
 * @param {jQuery} $container
 */
ve.init.mw.DesktopArticleTarget.prototype.setContainer = function ( $container ) {
	$container.append( this.$element );
	this.$container = $container;
};

/**
 * Verify that a PopStateEvent correlates to a state we created.
 *
 * @param {any} popState From PopStateEvent#state
 * @return {boolean}
 */
ve.init.mw.DesktopArticleTarget.prototype.verifyPopState = function ( popState ) {
	return popState && popState.tag === 'visualeditor';
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.setupToolbar = function ( surface ) {
	const mode = surface.getMode(),
		wasSetup = !!this.toolbar;

	ve.track( 'trace.setupToolbar.enter', { mode: mode } );

	// Parent method
	ve.init.mw.DesktopArticleTarget.super.prototype.setupToolbar.call( this, surface );

	const toolbar = this.getToolbar();

	// Allow the toolbar to start floating now if necessary
	this.onContainerScroll();

	ve.track( 'trace.setupToolbar.exit', { mode: mode } );
	if ( !wasSetup ) {
		toolbar.$element
			.addClass( 've-init-mw-desktopArticleTarget-toolbar-open' );
		if ( !toolbar.isFloating() ) {
			toolbar.$element.css( 'height', '' );
		}
		this.toolbarSetupDeferred.resolve();

		this.toolbarSetupDeferred.then( () => {
			const newSurface = this.getSurface();
			// Check the surface wasn't torn down while the toolbar was animating
			if ( newSurface ) {
				ve.track( 'trace.initializeToolbar.enter', { mode: mode } );
				this.getToolbar().initialize();
				newSurface.getView().emit( 'position' );
				newSurface.getContext().updateDimensions();
				ve.track( 'trace.initializeToolbar.exit', { mode: mode } );
				ve.track( 'trace.activate.exit', { mode: mode } );
			}
		} );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.attachToolbar = function () {
	// Set edit notices, will be shown after welcome dialog.
	// Make sure notices actually exists, because this might be a mode-switch and
	// we've already removed it.
	const editNotices = this.getEditNotices(),
		actionTools = this.toolbar.tools;
	if ( editNotices && editNotices.length && actionTools.notices ) {
		actionTools.notices.setNotices( editNotices );
	} else if ( actionTools.notices ) {
		actionTools.notices.destroy();
		actionTools.notices = null;
	}

	// Move the toolbar to top of target, before heading etc.
	// Avoid re-attaching as it breaks CSS animations
	if ( !this.toolbar.$element.parent().is( this.$element ) ) {
		this.toolbar.$element
			// Set 0 before attach (expanded in #setupToolbar)
			.css( 'height', '0' )
			.addClass( 've-init-mw-desktopArticleTarget-toolbar' );
		this.$element.prepend( this.toolbar.$element );

		// Calculate if the 'oo-ui-toolbar-narrow' class is needed (OOUI does it too late for our
		// toolbar because the methods are called in the wrong order, see T92282).
		this.toolbar.onWindowResize();
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.setupToolbarSaveButton = function () {
	this.toolbarSaveButton = this.toolbar.getToolGroupByName( 'save' ).items[ 0 ];
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.updateTabs = function () {
	mw.libs.ve.updateTabs( true, this.getDefaultMode(), this.section === 'new' );
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.loadSuccess = function () {
	// Parent method
	ve.init.mw.DesktopArticleTarget.super.prototype.loadSuccess.apply( this, arguments );

	this.wikitextFallbackLoading = false;
	// Duplicate of this code in ve.init.mw.DesktopArticleTarget.init.js
	// eslint-disable-next-line no-jquery/no-class-state
	if ( $( '#ca-edit' ).hasClass( 'visualeditor-showtabdialog' ) ) {
		$( '#ca-edit' ).removeClass( 'visualeditor-showtabdialog' );
		// Set up a temporary window manager
		const windowManager = new OO.ui.WindowManager();
		$( OO.ui.getTeleportTarget() ).append( windowManager.$element );
		this.editingTabDialog = new mw.libs.ve.EditingTabDialog();
		windowManager.addWindows( [ this.editingTabDialog ] );
		windowManager.openWindow( this.editingTabDialog )
			.closed.then( ( data ) => {
				// Detach the temporary window manager
				windowManager.destroy();

				if ( data && data.action === 'prefer-wt' ) {
					this.switchToWikitextEditor( false );
				} else if ( data && data.action === 'multi-tab' ) {
					location.reload();
				}
			} );

		// Pretend the user saw the welcome dialog before suppressing it.
		mw.libs.ve.stopShowingWelcomeDialog();
		this.suppressNormalStartupDialogs = true;
	}
};

/**
 * Handle the watch button being toggled on/off.
 *
 * @param {boolean} isWatched
 * @param {string} expiry
 * @param {string} expirySelected
 */
ve.init.mw.DesktopArticleTarget.prototype.onWatchToggle = function ( isWatched ) {
	if ( !this.active && !this.activating ) {
		return;
	}
	if ( this.checkboxesByName && this.checkboxesByName.wpWatchthis ) {
		this.checkboxesByName.wpWatchthis.setSelected(
			!!mw.user.options.get( 'watchdefault' ) ||
			( !!mw.user.options.get( 'watchcreations' ) && !this.pageExists ) ||
			isWatched
		);
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.bindHandlers = function () {
	ve.init.mw.DesktopArticleTarget.super.prototype.bindHandlers.call( this );
	if ( this.onWatchToggleHandler ) {
		mw.hook( 'wikipage.watchlistChange' ).add( this.onWatchToggleHandler );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.unbindHandlers = function () {
	ve.init.mw.DesktopArticleTarget.super.prototype.unbindHandlers.call( this );
	if ( this.onWatchToggleHandler ) {
		mw.hook( 'wikipage.watchlistChange' ).remove( this.onWatchToggleHandler );
	}
};

/**
 * Switch to edit mode.
 *
 * @param {jQuery.Promise} [dataPromise] Promise for pending request from
 *   mw.libs.ve.targetLoader#requestPageData, if any
 * @return {jQuery.Promise}
 */
ve.init.mw.DesktopArticleTarget.prototype.activate = function ( dataPromise ) {
	// We may be re-activating an old target, during which time ve.init.target
	// has been overridden.
	ve.init.target = ve.init.articleTarget;

	if ( !this.active && !this.activating ) {
		this.activating = true;
		this.activatingDeferred = ve.createDeferred();
		this.toolbarSetupDeferred = ve.createDeferred();

		$( 'html' ).addClass( 've-activating' );
		ve.promiseAll( [ this.activatingDeferred, this.toolbarSetupDeferred ] ).then( () => {
			if ( !this.suppressNormalStartupDialogs ) {
				this.maybeShowWelcomeDialog();
				this.maybeShowMetaDialog();
			}
			this.afterActivate();
		}, () => {
			$( 'html' ).removeClass( 've-activating' );
		} );

		// Handlers were unbound in constructor. Will be unbound again in teardown.
		this.bindHandlers();

		this.originalEditondbclick = mw.user.options.get( 'editondblclick' );
		mw.user.options.set( 'editondblclick', 0 );

		// User interface changes
		this.changeDocumentTitle();
		this.transformPage();

		this.load( dataPromise );
	}
	return this.activatingDeferred.promise();
};

/**
 * Edit mode has finished activating
 */
ve.init.mw.DesktopArticleTarget.prototype.afterActivate = function () {
	// eslint-disable-next-line mediawiki/class-doc
	$( 'html' )
		// Remove ve-activating when loading for the first time,
		// and when switching remove previous mode's class.
		.removeClass( 've-activating ve-active-visual ve-active-source' )
		.addClass( 've-active ve-active-' + this.getSurface().getMode() );

	// Disable TemplateStyles in the original content
	// (We do this here because toggling 've-active' class above hides it)
	this.$editableContent.find( 'style[data-mw-deduplicate^="TemplateStyles:"]' ).prop( 'disabled', true );

	this.afterSurfaceReady();

	if ( !this.editingTabDialog ) {
		if ( this.sectionTitle ) {
			this.sectionTitle.focus();
		} else {
			// We have to focus the page after hiding the original content, otherwise
			// in firefox the contentEditable container was below the view page, and
			// 'focus' scrolled the screen down.
			// Support: Firefox
			this.getSurface().getView().focus();
		}
		// Transfer and initial source range to the surface (e.g. from tempWikitextEditor)
		if ( this.initialSourceRange && this.getSurface().getMode() === 'source' ) {
			const surfaceModel = this.getSurface().getModel();
			const range = surfaceModel.getRangeFromSourceOffsets( this.initialSourceRange.from, this.initialSourceRange.to );
			surfaceModel.setLinearSelection( range );
		}
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.setSurface = function ( surface ) {
	const resetSurface = surface !== this.surface;

	if ( resetSurface ) {
		this.$editableContent.after( surface.$element );
	}

	// Parent method
	ve.init.mw.DesktopArticleTarget.super.prototype.setSurface.apply( this, arguments );

	if ( resetSurface ) {
		this.setupNewSection( surface );
	}
};

/**
 * Setup new section input for a surface, if required
 *
 * @param {ve.ui.Surface} surface
 */
ve.init.mw.DesktopArticleTarget.prototype.setupNewSection = function ( surface ) {
	if ( surface.getMode() === 'visual' && this.section === 'new' ) {
		throw new Error( 'Adding new section is not supported in visual mode' );
	}
	if ( surface.getMode() === 'source' && this.section === 'new' ) {
		if ( !this.sectionTitle ) {
			this.sectionTitle = new OO.ui.TextInputWidget( {
				$element: $( '<h2>' ),
				classes: [ 've-init-mw-desktopArticleTarget-sectionTitle' ],
				placeholder: ve.msg( 'visualeditor-section-title-placeholder' ),
				spellcheck: true
			} );
			if ( this.recovered ) {
				this.sectionTitle.setValue(
					ve.init.platform.sessionStorage.get( 've-docsectiontitle' ) || ''
				);
			}
			this.sectionTitle.connect( this, { change: 'onSectionTitleChange' } );
		}
		surface.setPlaceholder( ve.msg( 'visualeditor-section-body-placeholder' ) );
		this.$editableContent.before( this.sectionTitle.$element );

		if ( this.currentUrl.searchParams.has( 'preloadtitle' ) ) {
			this.sectionTitle.setValue( this.currentUrl.searchParams.get( 'preloadtitle' ) );
		}
		surface.once( 'destroy', this.teardownNewSection.bind( this, surface ) );
	} else {
		ve.init.platform.sessionStorage.remove( 've-docsectiontitle' );
	}
};

/**
 * Handle section title changes
 */
ve.init.mw.DesktopArticleTarget.prototype.onSectionTitleChange = function () {
	ve.init.platform.sessionStorage.set( 've-docsectiontitle', this.sectionTitle.getValue() );
	this.updateToolbarSaveButtonState();
};

/**
 * Teardown new section inputs
 *
 * @param {ve.ui.Surface} surface
 */
ve.init.mw.DesktopArticleTarget.prototype.teardownNewSection = function ( surface ) {
	surface.setPlaceholder( '' );
	if ( this.sectionTitle ) {
		this.sectionTitle.$element.remove();
		this.sectionTitle = null;
	}
};

/**
 * @inheritdoc
 *
 * A prompt will not be shown if tryTeardown() is called while activation is still in progress.
 * If tryTeardown() is called while the target is deactivating, or while it's not active and
 * not activating, nothing happens.
 */
ve.init.mw.DesktopArticleTarget.prototype.tryTeardown = function ( noPrompt, trackMechanism ) {
	if ( this.deactivating || ( !this.active && !this.activating ) ) {
		return this.teardownPromise || ve.createDeferred().resolve().promise();
	}

	// Just in case these weren't closed before
	if ( this.welcomeDialog ) {
		this.welcomeDialog.close();
	}
	if ( this.editingTabDialog ) {
		this.editingTabDialog.close();
	}
	this.editingTabDialog = null;

	// Parent method
	return ve.init.mw.DesktopArticleTarget.super.prototype.tryTeardown.call( this, noPrompt || this.activating, trackMechanism );
};

/**
 * @inheritdoc
 *
 * @param {string} [trackMechanism]
 * @fires ve.init.mw.DesktopArticleTarget#deactivate
 */
ve.init.mw.DesktopArticleTarget.prototype.teardown = function ( trackMechanism ) {
	// Event tracking
	let abortType, abortedMode;
	if ( trackMechanism ) {
		if ( this.activating ) {
			abortType = 'preinit';
		} else if ( !this.edited ) {
			abortType = 'nochange';
		} else if ( this.saving ) {
			abortType = 'abandonMidsave';
		} else {
			// switchwith and switchwithout do not go through this code path,
			// they go through switchToWikitextEditor() instead
			abortType = 'abandon';
		}
		abortedMode = this.surface ? this.surface.getMode() : this.getDefaultMode();
	}

	// Cancel activating, start deactivating
	this.deactivating = true;
	this.deactivatingDeferred = ve.createDeferred();
	this.activating = false;
	this.activatingDeferred.reject();
	$( 'html' ).addClass( 've-deactivating' ).removeClass( 've-activated ve-active' );

	this.emit( 'deactivate' );

	// Restore TemplateStyles of the original content
	// (We do this here because toggling 've-active' class above displays it)
	this.$editableContent.find( 'style[data-mw-deduplicate^="TemplateStyles:"]' ).prop( 'disabled', false );

	// User interface changes
	this.restorePage();
	this.restoreDocumentTitle();

	mw.user.options.set( 'editondblclick', this.originalEditondbclick );
	this.originalEditondbclick = undefined;

	// TODO: Use better checks to see if these restorations are required.
	if ( this.getSurface() ) {
		if ( this.active ) {
			this.teardownUnloadHandlers();
		}
	}

	// Parent method
	return ve.init.mw.DesktopArticleTarget.super.prototype.teardown.call( this ).then( () => {
		// After teardown
		this.active = false;

		// If there is a load in progress, try to abort it
		if ( this.loading && this.loading.abort ) {
			this.loading.abort();
		}

		this.clearState();
		this.initialEditSummary = new URL( location.href ).searchParams.get( 'summary' );
		this.editSummaryValue = null;

		// Move original content back out of the target
		this.$element.parent().append( this.$originalContent.children() );

		$( '.ve-init-mw-desktopArticleTarget-uneditableContent' )
			.removeClass( 've-init-mw-desktopArticleTarget-uneditableContent' );

		this.deactivating = false;
		this.deactivatingDeferred.resolve();
		$( 'html' ).removeClass( 've-deactivating' );

		// Event tracking
		if ( trackMechanism ) {
			ve.track( 'editAttemptStep', {
				action: 'abort',
				type: abortType,
				mechanism: trackMechanism,
				mode: abortedMode
			} );
		}

		if ( !this.isViewPage ) {
			const newUrl = new URL( this.viewUrl );
			if ( mw.config.get( 'wgIsRedirect' ) ) {
				newUrl.searchParams.set( 'redirect', 'no' );
			}
			location.href = newUrl;
		}
	} );
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.loadFail = function ( code, errorDetails ) {
	// Parent method
	ve.init.mw.DesktopArticleTarget.super.prototype.loadFail.apply( this, arguments );

	if ( this.wikitextFallbackLoading ) {
		// Failed twice now
		mw.log.warn( 'Failed to fall back to wikitext', code, errorDetails );
		const newUrl = new URL( this.viewUrl );
		newUrl.searchParams.set( 'action', 'edit' );
		newUrl.searchParams.set( 'veswitched', '1' );
		location.href = newUrl;
		return;
	}

	if ( !this.activating ) {
		// Load failed after activation abandoned (e.g. user pressed escape).
		// Nothing more to do.
		return;
	}

	const $confirmPromptMessage = this.extractErrorMessages( errorDetails );

	OO.ui.confirm( $confirmPromptMessage, {
		actions: [
			{ action: 'accept', label: OO.ui.msg( 'ooui-dialog-process-retry' ), flags: 'primary' },
			{ action: 'reject', label: OO.ui.msg( 'ooui-dialog-message-reject' ), flags: 'safe' }
		]
	} ).then( ( confirmed ) => {
		if ( confirmed ) {
			// Retry load
			this.load();
		} else {
			// User pressed "cancel"
			if ( this.getSurface() ) {
				// Restore the mode of the current surface
				this.setDefaultMode( this.getSurface().getMode() );
				this.activatingDeferred.reject();
			} else {
				// We're switching from read mode or the 2010 wikitext editor:
				// just give up and stay where you are
				this.tryTeardown( true );
			}
		}
	} );
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.surfaceReady = function () {
	if ( !this.activating ) {
		// Activation was aborted before we got here. Do nothing
		// TODO are there things we need to clean up?
		return;
	}

	const surface = this.getSurface();

	this.activating = false;

	// TODO: mwTocWidget should probably live in a ve.ui.MWSurface subclass
	if ( mw.config.get( 'wgVisualEditorConfig' ).enableTocWidget ) {
		surface.mwTocWidget = new ve.ui.MWTocWidget( this.getSurface() );
		surface.once( 'destroy', () => {
			surface.mwTocWidget.$element.remove();
		} );
	}

	const metaList = this.getSurface().getModel().getDocument().getMetaList();

	metaList.connect( this, {
		insert: 'onMetaItemInserted',
		remove: 'onMetaItemRemoved'
	} );
	// Rebuild the category list from the page we got from the API. This makes
	// it work regardless of whether we came here from activating on an
	// existing page, or loading via an edit URL.
	this.rebuildCategories( metaList.getItemsInGroup( 'mwCategory' ), true );

	// Parent method
	ve.init.mw.DesktopArticleTarget.super.prototype.surfaceReady.apply( this, arguments );

	const redirectMetaItems = metaList.getItemsInGroup( 'mwRedirect' );
	if ( redirectMetaItems.length ) {
		this.setFakeRedirectInterface( redirectMetaItems[ 0 ].getAttribute( 'title' ) );
	} else {
		this.setFakeRedirectInterface( null );
	}

	this.setupUnloadHandlers();

	this.activatingDeferred.resolve();
	this.events.trackActivationComplete();
};

/**
 * Update the redirect and category interfaces when a meta item is inserted into the page.
 *
 * @param {ve.dm.MetaItem} metaItem Item that was inserted
 */
ve.init.mw.DesktopArticleTarget.prototype.onMetaItemInserted = function ( metaItem ) {
	switch ( metaItem.getType() ) {
		case 'mwRedirect':
			this.setFakeRedirectInterface( metaItem.getAttribute( 'title' ) );
			break;
		case 'mwCategory': {
			const metaList = this.getSurface().getModel().getDocument().getMetaList();
			this.rebuildCategories( metaList.getItemsInGroup( 'mwCategory' ) );
			break;
		}
	}
};

/**
 * Update the redirect and category interfaces when a meta item is removed from the page.
 *
 * @param {ve.dm.MetaItem} metaItem Item that was removed
 * @param {number} offset Linear model offset that the item was at
 * @param {number} index Index within that offset the item was at
 */
ve.init.mw.DesktopArticleTarget.prototype.onMetaItemRemoved = function ( metaItem ) {
	switch ( metaItem.getType() ) {
		case 'mwRedirect':
			this.setFakeRedirectInterface( null );
			break;
		case 'mwCategory': {
			const metaList = this.getSurface().getModel().getDocument().getMetaList();
			this.rebuildCategories( metaList.getItemsInGroup( 'mwCategory' ) );
			break;
		}
	}
};

/**
 * Redisplay the category list on the page
 *
 * This is used for the preview while editing. Leaving the editor either restores the initial
 * categories, or uses the ones generated by the save API.
 *
 * @param {ve.dm.MetaItem[]} categoryItems Array of category metaitems to display
 */
ve.init.mw.DesktopArticleTarget.prototype.rebuildCategories = function ( categoryItems ) {
	this.renderCategories( categoryItems ).then( ( $categories ) => {
		// Clone the existing catlinks for any specific properties which might
		// be needed by the rest of the page. Also gives us a not-attached
		// version, which we can pass to wikipage.categories as it requests.
		const $catlinks = $( '#catlinks' ).clone().empty().removeClass( 'categories-allhidden' )
			.append( $categories.children() );
		// If all categories are hidden, we need to hide the box.
		$catlinks.toggleClass( 'catlinks-allhidden',
			$catlinks.find( '.mw-normal-catlinks' ).length === 0 &&
			// Some situations make the hidden-categories visible (a user
			// preference, and being on a category page) so rather than
			// encoding that logic here just check whether they're visible:
			// eslint-disable-next-line no-jquery/no-sizzle
			$catlinks.find( '.mw-hidden-catlinks:visible' ).length === 0
		);
		this.transformCategoryLinks( $catlinks );
		mw.hook( 'wikipage.categories' ).fire( $catlinks );
		$( '#catlinks' ).replaceWith( $catlinks );
	} );
};

/**
 * Handle clicks on the view tab.
 *
 * @param {jQuery.Event} e Mouse click event
 */
ve.init.mw.DesktopArticleTarget.prototype.onViewTabClick = function ( e ) {
	if ( ( !this.active && !this.activating ) || !ve.isUnmodifiedLeftClick( e ) ) {
		return;
	}
	this.tryTeardown( false, 'navigate-read' );
	e.preventDefault();
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.saveComplete = function ( data ) {
	// Parent method
	ve.init.mw.DesktopArticleTarget.super.prototype.saveComplete.apply( this, arguments );

	// If there is no content, then parent method will reload the whole page
	if ( !data.nocontent ) {
		// Fix permalinks
		if ( data.newrevid !== undefined ) {
			$( '#t-permalink' ).add( '#coll-download-as-rl' ).find( 'a' ).each( ( i, el ) => {
				const permalinkUrl = new URL( el.href );
				permalinkUrl.searchParams.set( 'oldid', data.newrevid );
				$( el ).attr( 'href', permalinkUrl.toString() );
			} );
		}

		if ( data.newrevid !== undefined ) {
			// (T370771) Update wgCurRevisionId and wgRevisionId (!)
			// Mirror of DiscussionTools's cb5d585b93d83f9a7b4df10a71a0d574295f861c
			mw.config.set( {
				wgCurRevisionId: data.newrevid,
				wgRevisionId: data.newrevid
			} );

			// Actually fire the postEdit hook, now that the save is complete
			require( 'mediawiki.action.view.postEdit' ).fireHook( 'saved' );
		}
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.serialize = function () {
	// Parent method
	const promise = ve.init.mw.DesktopArticleTarget.super.prototype.serialize.apply( this, arguments );

	return promise.then( null, ( error, response ) => {
		const $errorMessages = this.extractErrorMessages( response );
		OO.ui.alert( $errorMessages );

		// It's possible to get here while the save dialog has never been opened (if the user uses
		// the switch to source mode option)
		if ( this.saveDialog ) {
			this.saveDialog.popPending();
		}
	} );
};

/**
 * Handle clicks on the MwMeta button in the toolbar.
 *
 * @param {jQuery.Event} e Mouse click event
 */
ve.init.mw.DesktopArticleTarget.prototype.onToolbarMetaButtonClick = function () {
	this.getSurface().getDialogs().openWindow( 'meta' );
};

/**
 * Modify tabs in the skin to support in-place editing.
 *
 * 'Read' and 'Edit source' (when not using single edit tab) bound here,
 * 'Edit' and single edit tab are bound in mw.DesktopArticleTarget.init.
 */
ve.init.mw.DesktopArticleTarget.prototype.setupSkinTabs = function () {
	const namespaceNumber = mw.config.get( 'wgNamespaceNumber' );
	const namespaceName = mw.config.get( 'wgCanonicalNamespace' );
	const isTalkNamespace = mw.Title.isTalkNamespace( namespaceNumber );
	// Title::getNamespaceKey()
	let namespaceKey = namespaceName.toLowerCase() || 'main';
	if ( namespaceKey === 'file' ) {
		namespaceKey = 'image';
	}
	let namespaceTabId;
	// SkinTemplate::buildContentNavigationUrls()
	if ( isTalkNamespace ) {
		namespaceTabId = 'ca-talk';
	} else {
		namespaceTabId = 'ca-nstab-' + namespaceKey;
	}
	$( '#ca-view' ).add( '#' + namespaceTabId ).find( 'a' )
		.on( 'click.ve-target', this.onViewTabClick.bind( this ) );

	// Used by Extension:GuidedTour
	mw.hook( 've.skinTabSetupComplete' ).fire();
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.getSaveDialogOpeningData = function () {
	const data = ve.init.mw.DesktopArticleTarget.super.prototype.getSaveDialogOpeningData.apply( this, arguments );
	data.editSummary = this.editSummaryValue || this.initialEditSummary;
	return data;
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.teardownToolbar = function () {
	const deferred = ve.createDeferred();

	if ( !this.toolbar ) {
		return deferred.resolve().promise();
	}

	this.toolbar.$element
		.addClass( 've-init-mw-desktopArticleTarget-toolbar-preclose' )
		.css( 'height', this.toolbar.$bar[ 0 ].offsetHeight );
	requestAnimationFrame( () => {
		this.toolbar.$element
			.css( 'height', '0' )
			.addClass( 've-init-mw-desktopArticleTarget-toolbar-close' );
		this.toolbar.$element.one( 'transitionend', () => {
			// Parent method
			ve.init.mw.DesktopArticleTarget.super.prototype.teardownToolbar.call( this );
			deferred.resolve();
		} );
	} );
	return deferred.promise();
};

/**
 * Change the document title to state that we are now editing.
 */
ve.init.mw.DesktopArticleTarget.prototype.changeDocumentTitle = function () {
	const title = mw.Title.newFromText( this.getPageName() );
	const pageTitleMsg = mw.message( 'pagetitle',
		ve.msg(
			this.pageExists ? 'editing' : 'creating',
			title.getPrefixedText()
		)
	);

	// T317600
	if ( pageTitleMsg.isParseable() ) {
		// Use the real title if we loaded a view page, otherwise reconstruct it
		this.originalDocumentTitle = this.isViewPage ? document.title : ve.msg( 'pagetitle', title.getPrefixedText() );
		// Reconstruct an edit title
		document.title = pageTitleMsg.text();
	} else {
		mw.log.warn( 'VisualEditor: MediaWiki:Pagetitle contains unsupported syntax. ' +
			'https://www.mediawiki.org/wiki/Manual:Messages_API#Feature_support_in_JavaScript' );
	}
};

/**
 * Restore the original document title.
 */
ve.init.mw.DesktopArticleTarget.prototype.restoreDocumentTitle = function () {
	if ( this.originalDocumentTitle ) {
		document.title = this.originalDocumentTitle;
	}
};

/**
 * Page modifications for switching to edit mode.
 *
 * @fires ve.init.mw.DesktopArticleTarget#transformPage
 */
ve.init.mw.DesktopArticleTarget.prototype.transformPage = function () {
	this.updateTabs();
	this.emit( 'transformPage' );

	// TODO: Deprecate in favour of ve.activationComplete
	// Only used by one gadget
	mw.hook( 've.activate' ).fire();

	// Move all native content inside the target
	// Exclude notification area to work around T143837
	this.$originalContent.append(
		this.$element.siblings()
			.not( '.mw-notification-area' )
			.not( '.ve-init-mw-desktopArticleTarget-toolbarPlaceholder' )
	);

	// To preserve event handlers (e.g. HotCat) if editing is cancelled, detach the original container
	// and replace it with a clone during editing
	this.$originalCategories = $( '#catlinks' );
	this.$originalCategories.after( this.$originalCategories.clone() );
	this.$originalCategories.detach();

	// Mark every non-direct ancestor between editableContent and the container as uneditable
	let $content = this.$editableContent;
	while ( $content && $content.length && !$content.parent().is( this.$container ) ) {
		$content.prevAll( ':not( .ve-init-mw-tempWikitextEditorWidget )' ).addClass( 've-init-mw-desktopArticleTarget-uneditableContent' );
		$content.nextAll( ':not( .ve-init-mw-tempWikitextEditorWidget )' ).addClass( 've-init-mw-desktopArticleTarget-uneditableContent' );
		$content = $content.parent();
	}

	this.restoreEditTabsIfNeeded( $content );
	this.updateHistoryState();
};

/**
 * Checks the edit/view tabs have not been marked as disabled. The view tab provides a way
 * to exit the VisualEditor so its important it is not marked as uneditable.
 *
 * @param {jQuery} $content area
 */
ve.init.mw.DesktopArticleTarget.prototype.restoreEditTabsIfNeeded = function ( $content ) {
	const $viewTab = $content.find( '.ve-init-mw-desktopArticleTarget-uneditableContent #ca-view' );
	if ( $viewTab.length ) {
		$viewTab.parents( '.ve-init-mw-desktopArticleTarget-uneditableContent' ).removeClass( 've-init-mw-desktopArticleTarget-uneditableContent' );
	}
};

/**
 * Category link section transformations for switching to edit mode. Broken out
 * so it can be re-applied when displaying changes to the categories.
 *
 * @param {jQuery} $catlinks Category links container element
 */
ve.init.mw.DesktopArticleTarget.prototype.transformCategoryLinks = function ( $catlinks ) {
	// Un-disable the catlinks wrapper, but not the links
	if ( this.getSurface() && this.getSurface().getMode() === 'visual' ) {
		$catlinks.removeClass( 've-init-mw-desktopArticleTarget-uneditableContent' )
			.on( 'click.ve-target', () => {
				const windowAction = ve.ui.actionFactory.create( 'window', this.getSurface() );
				windowAction.open( 'meta', { page: 'categories' } );
				return false;
			} )
			.find( 'a' ).addClass( 've-init-mw-desktopArticleTarget-uneditableContent' );
	} else {
		$catlinks.addClass( 've-init-mw-desktopArticleTarget-uneditableContent' ).off( 'click.ve-target' );
	}
};

/**
 * Update the history state based on the editor mode
 */
ve.init.mw.DesktopArticleTarget.prototype.updateHistoryState = function () {
	const veaction = this.getDefaultMode() === 'visual' ? 'edit' : 'editsource',
		section = this.section;

	// Push veaction=edit(source) url in history (if not already present).
	// If we got here from DesktopArticleTarget.init, then it will be already present.
	if (
		!this.actFromPopState &&
		(
			this.currentUrl.searchParams.get( 'veaction' ) !== veaction ||
			this.currentUrl.searchParams.get( 'section' ) !== section
		) &&
		this.currentUrl.searchParams.get( 'action' ) !== 'edit'
	) {
		// Set the current URL
		const url = this.currentUrl;

		if ( mw.libs.ve.isSingleEditTab ) {
			url.searchParams.set( 'action', 'edit' );
			mw.config.set( 'wgAction', 'edit' );
		} else {
			url.searchParams.set( 'veaction', veaction );
			url.searchParams.delete( 'action' );
			mw.config.set( 'wgAction', 'view' );
		}
		if ( this.section !== null ) {
			url.searchParams.set( 'section', this.section );
		} else {
			url.searchParams.delete( 'section' );
		}

		history.pushState( this.popState, '', url );
	}
	this.actFromPopState = false;
};

/**
 * Page modifications for switching back to view mode.
 *
 * @fires ve.init.mw.DesktopArticleTarget#restorePage
 */
ve.init.mw.DesktopArticleTarget.prototype.restorePage = function () {
	// Restore any previous redirectMsg/redirectsub
	this.setRealRedirectInterface();
	if ( this.$originalCategories ) {
		$( '#catlinks' ).replaceWith( this.$originalCategories );
	}

	// TODO: Deprecate in favour of ve.deactivationComplete
	mw.hook( 've.deactivate' ).fire();
	this.emit( 'restorePage' );

	// Push article url into history
	if ( !this.actFromPopState ) {
		// Remove the VisualEditor query parameters
		const url = this.currentUrl;
		if ( url.searchParams.has( 'veaction' ) ) {
			url.searchParams.delete( 'veaction' );
		}
		if ( this.section !== null ) {
			// Translate into a hash for the new URL:
			// This should be after replacePageContent if this is post-save, so we can just look
			// at the headers on the page.
			const hash = this.getSectionHashFromPage();
			if ( hash ) {
				url.hash = hash;
				this.viewUrl.hash = hash;
				const target = document.getElementById( hash.slice( 1 ) );

				if ( target ) {
					// Scroll the page to the edited section
					setTimeout( () => {
						target.scrollIntoView( true );
					} );
				}
			}
			url.searchParams.delete( 'section' );
		}
		if ( url.searchParams.has( 'action' ) && $( '#wpTextbox1:not(.ve-dummyTextbox)' ).length === 0 ) {
			// If we're not overlaid on an edit page, remove action=edit
			url.searchParams.delete( 'action' );
			mw.config.set( 'wgAction', 'view' );
		}
		if ( url.searchParams.has( 'oldid' ) && !this.restoring ) {
			// We have an oldid in the query string but it's the most recent one, so remove it
			url.searchParams.delete( 'oldid' );
		}

		// Remove parameters which are only intended for the editor, not for read mode
		url.searchParams.delete( 'editintro' );
		url.searchParams.delete( 'preload' );
		url.searchParams.delete( 'preloadparams[]' );
		url.searchParams.delete( 'preloadtitle' );
		url.searchParams.delete( 'summary' );

		// If there are any other query parameters left, re-use that URL object.
		// Otherwise use the canonical style view URL (T44553, T102363).
		const keys = [];
		url.searchParams.forEach( ( val, key ) => {
			keys.push( key );
		} );
		if ( !keys.length || ( keys.length === 1 && keys[ 0 ] === 'title' ) ) {
			history.pushState( this.popState, '', this.viewUrl );
		} else {
			history.pushState( this.popState, '', url );
		}
	}
};

/**
 * @param {Event} e Native event object
 */
ve.init.mw.DesktopArticleTarget.prototype.onWindowPopState = function ( e ) {
	if ( !this.verifyPopState( e.state ) ) {
		// Ignore popstate events fired for states not created by us
		// This also filters out the initial fire in Chrome (T59901).
		return;
	}

	const oldUrl = this.currentUrl;

	this.currentUrl = new URL( location.href );
	let veaction = this.currentUrl.searchParams.get( 'veaction' );
	const action = this.currentUrl.searchParams.get( 'action' );

	if ( !veaction && action === 'edit' ) {
		veaction = this.getDefaultMode() === 'source' ? 'editsource' : 'edit';
	}

	if ( this.isModeAvailable( 'source' ) && this.active ) {
		if ( veaction === 'editsource' && this.getDefaultMode() === 'visual' ) {
			this.actFromPopState = true;
			this.switchToWikitextEditor();
		} else if ( veaction === 'edit' && this.getDefaultMode() === 'source' ) {
			this.actFromPopState = true;
			this.switchToVisualEditor();
		}
	}
	if ( !this.active && ( veaction === 'edit' || veaction === 'editsource' ) ) {
		this.actFromPopState = true;
		this.emit( 'reactivate' );
	}
	if ( this.active && veaction !== 'edit' && veaction !== 'editsource' ) {
		this.actFromPopState = true;
		// "Undo" the pop-state, as the event is not cancellable
		history.pushState( this.popState, '', oldUrl );
		this.currentUrl = oldUrl;
		this.tryTeardown( false, 'navigate-back' ).then( () => {
			// Teardown was successful, re-apply the undone state
			history.back();
		} ).always( () => {
			this.actFromPopState = false;
		} );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.replacePageContent = function (
	html, categoriesHtml, displayTitle, lastModified /* , contentSub, sections */
) {
	// Parent method
	ve.init.mw.DesktopArticleTarget.super.prototype.replacePageContent.apply( this, arguments );

	if ( lastModified ) {
		// If we were not viewing the most recent revision before (a requirement
		// for lastmod to have been added by MediaWiki), we will be now.
		if ( !$( '#footer-info-lastmod' ).length ) {
			$( '#footer-info' ).prepend(
				$( '<li>' ).attr( 'id', 'footer-info-lastmod' )
			);
		}

		// Intentionally treated as HTML
		// eslint-disable-next-line no-jquery/no-html
		$( '#footer-info-lastmod' ).html( ' ' + mw.msg(
			'lastmodifiedat',
			lastModified.date,
			lastModified.time
		) );
	}

	this.$originalCategories = null;

	// Re-set any edit section handlers now that the page content has been replaced
	mw.libs.ve.setupEditLinks();
};

/**
 * Add onunload and onbeforeunload handlers.
 */
ve.init.mw.DesktopArticleTarget.prototype.setupUnloadHandlers = function () {
	if ( window.onbeforeunload !== this.onBeforeUnload ) {
		// Remember any already set beforeunload handler
		this.onBeforeUnloadFallback = window.onbeforeunload;
		// Attach our handlers
		window.onbeforeunload = this.onBeforeUnload;
		window.addEventListener( 'unload', this.onUnloadHandler );
	}
};
/**
 * Remove onunload and onbeforunload handlers.
 */
ve.init.mw.DesktopArticleTarget.prototype.teardownUnloadHandlers = function () {
	// Restore whatever previous onbeforeunload hook existed
	window.onbeforeunload = this.onBeforeUnloadFallback;
	this.onBeforeUnloadFallback = null;
	window.removeEventListener( 'unload', this.onUnloadHandler );
};

/**
 * Show the beta dialog as needed
 */
ve.init.mw.DesktopArticleTarget.prototype.maybeShowWelcomeDialog = function () {
	const editorMode = this.getDefaultMode(),
		windowManager = this.getSurface().dialogs;

	this.welcomeDialogPromise = ve.createDeferred();

	if ( mw.libs.ve.shouldShowWelcomeDialog() ) {
		this.welcomeDialog = new mw.libs.ve.WelcomeDialog();
		windowManager.addWindows( [ this.welcomeDialog ] );
		windowManager.openWindow(
			this.welcomeDialog,
			{
				switchable: editorMode === 'source' ? this.isModeAvailable( 'visual' ) : true,
				editor: editorMode
			}
		)
			.closed.then( ( data ) => {
				this.welcomeDialogPromise.resolve();
				this.welcomeDialog = null;
				if ( data && data.action === 'switch-wte' ) {
					this.switchToWikitextEditor( false );
				} else if ( data && data.action === 'switch-ve' ) {
					this.switchToVisualEditor();
				}
			} );
		mw.libs.ve.stopShowingWelcomeDialog();
	} else {
		this.welcomeDialogPromise.reject();
	}
};

/**
 * Show the meta dialog as needed on load.
 */
ve.init.mw.DesktopArticleTarget.prototype.maybeShowMetaDialog = function () {
	if ( this.welcomeDialogPromise ) {
		// Pop out the notices when the welcome dialog is closed
		this.welcomeDialogPromise
			.always( () => {
				if (
					this.switched &&
					!mw.user.options.get( 'visualeditor-hidevisualswitchpopup' )
				) {
					// Show "switched" popup
					const popup = new mw.libs.ve.SwitchPopupWidget( 'visual' );
					this.toolbar.tools.editModeSource.toolGroup.$element.append( popup.$element );
					popup.toggle( true );
				} else if ( this.toolbar.tools.notices ) {
					// Show notices
					this.toolbar.tools.notices.getPopup().toggle( true );
				}
			} );
	}

	const redirectMetaItems = this.getSurface().getModel().getDocument().getMetaList().getItemsInGroup( 'mwRedirect' );
	if ( redirectMetaItems.length ) {
		const windowAction = ve.ui.actionFactory.create( 'window', this.getSurface() );
		windowAction.open( 'meta', { page: 'settings' } );
	}
};

/**
 * Handle before unload event.
 *
 * @return {string|undefined} Message
 */
ve.init.mw.DesktopArticleTarget.prototype.onBeforeUnload = function () {
	// Check if someone already set on onbeforeunload hook
	if ( this.onBeforeUnloadFallback ) {
		// Get the result of their onbeforeunload hook
		const fallbackResult = this.onBeforeUnloadFallback();
		// If it returned something, exit here and return their message
		if ( fallbackResult !== undefined ) {
			return fallbackResult;
		}
	}
	// Check if there's been an edit
	if (
		this.getSurface() &&
		$.contains( document, this.getSurface().$element.get( 0 ) ) &&
		this.edited &&
		!this.submitting &&
		mw.user.options.get( 'useeditwarning' )
	) {
		// Return our message
		return ve.msg( 'mw-widgets-abandonedit' );
	}
};

/**
 * Handle unload event.
 */
ve.init.mw.DesktopArticleTarget.prototype.onUnload = function () {
	if ( !this.submitting ) {
		ve.track( 'editAttemptStep', {
			action: 'abort',
			type: this.edited ? 'unknown-edited' : 'unknown',
			mechanism: 'navigate',
			mode: this.surface ? this.surface.getMode() : this.getDefaultMode()
		} );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.switchToVisualEditor = function () {
	// Parent method
	ve.init.mw.DesktopArticleTarget.super.prototype.switchToVisualEditor.apply( this, arguments );

	if ( this.isModeAvailable( 'visual' ) ) {
		ve.track( 'activity.editor-switch', { action: 'visual-desktop' } );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.switchToWikitextEditor = function () {
	// Parent method
	ve.init.mw.DesktopArticleTarget.super.prototype.switchToWikitextEditor.apply( this, arguments );

	if ( this.isModeAvailable( 'source' ) ) {
		ve.track( 'activity.editor-switch', { action: 'source-nwe-desktop' } );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.switchToWikitextSection = function () {
	// Parent method
	ve.init.mw.DesktopArticleTarget.super.prototype.switchToWikitextSection.apply( this, arguments );

	ve.track( 'activity.editor-switch', { action: 'source-nwe-desktop' } );
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.switchToFallbackWikitextEditor = function ( modified ) {
	const oldId = mw.config.get( 'wgRevisionId' ) || $( 'input[name=parentRevId]' ).val();
	const prefPromise = mw.libs.ve.setEditorPreference( 'wikitext' );

	if ( !modified ) {
		ve.track( 'activity.editor-switch', { action: 'source-desktop' } );
		ve.track( 'editAttemptStep', {
			action: 'abort',
			type: 'switchnochange',
			mechanism: 'navigate',
			mode: 'visual'
		} );
		this.submitting = true;
		return prefPromise.then( () => {
			const url = new URL( this.viewUrl );
			url.searchParams.set( 'action', 'edit' );
			// No changes, safe to stay in section mode
			if ( this.section !== null ) {
				url.searchParams.set( 'section', this.section );
			} else {
				url.searchParams.delete( 'section' );
			}
			url.searchParams.set( 'veswitched', '1' );
			if ( oldId && oldId !== mw.config.get( 'wgCurRevisionId' ) ) {
				url.searchParams.set( 'oldid', oldId );
			}
			if ( mw.libs.ve.isWelcomeDialogSuppressed() ) {
				url.searchParams.set( 'vehidebetadialog', '1' );
			}
			location.href = url.toString();
		} );
	} else {
		return this.serialize( this.getDocToSave() ).then( ( data ) => {
			ve.track( 'activity.editor-switch', { action: 'source-desktop' } );
			ve.track( 'editAttemptStep', {
				action: 'abort',
				type: 'switchwith',
				mechanism: 'navigate',
				mode: 'visual'
			} );
			this.submitWithSaveFields( { wpDiff: true, wpAutoSummary: '' }, data.content );
		} );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.reloadSurface = function ( newMode ) {
	this.activating = true;
	this.activatingDeferred = ve.createDeferred();

	// Parent method
	ve.init.mw.DesktopArticleTarget.super.prototype.reloadSurface.apply( this, arguments );

	this.activatingDeferred.then( () => {
		if ( newMode === 'source' ) {
			mw.hook( 've.wikitextInteractive' ).fire();
		}

		this.updateHistoryState();
		this.afterActivate();
		this.setupTriggerListeners();
	} );
	this.toolbarSetupDeferred.resolve();
};

/* Registration */

ve.init.mw.targetFactory.register( ve.init.mw.DesktopArticleTarget );
