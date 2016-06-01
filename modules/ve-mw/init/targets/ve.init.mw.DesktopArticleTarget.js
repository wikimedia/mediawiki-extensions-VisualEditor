/*!
 * VisualEditor MediaWiki Initialization DesktopArticleTarget class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/*global confirm, alert */

/**
 * MediaWiki desktop article target.
 *
 * @class
 * @extends ve.init.mw.ArticleTarget
 *
 * @constructor
 * @param {Object} config Configuration options
 */
ve.init.mw.DesktopArticleTarget = function VeInitMwDesktopArticleTarget( config ) {
	var $content, $before,
		// A workaround, as default URI does not get updated after pushState (bug 72334)
		currentUri = new mw.Uri( location.href ),
		namespaceIds = mw.config.get( 'wgNamespaceIds' );

	// Parent constructor
	ve.init.mw.DesktopArticleTarget.super.call(
		this, mw.config.get( 'wgRelevantPageName' ), currentUri.query.oldid, config
	);

	// Parent constructor bound key event handlers, but we don't want them bound until
	// we activate; so unbind them again
	this.unbindHandlers();

	this.onWatchToggleHandler = this.onWatchToggle.bind( this );

	// Properties
	this.onBeforeUnloadFallback = null;
	this.onUnloadHandler = this.onUnload.bind( this );
	this.active = false;
	this.activating = false;
	this.deactivating = false;
	this.edited = false;
	this.recreating = false;
	this.activatingDeferred = null;
	this.toolbarSetupDeferred = null;
	this.checkboxFields = null;
	this.checkboxesByName = null;
	this.$otherFields = null;
	this.suppressNormalStartupDialogs = false;
	this.editingTabDialog = null;

	// If this is true then #transformPage / #restorePage will not call pushState
	// This is to avoid adding a new history entry for the url we just got from onpopstate
	// (which would mess up with the expected order of Back/Forwards browsing)
	this.actFromPopState = false;
	this.popState = {
		tag: 'visualeditor'
	};
	this.scrollTop = null;
	this.currentUri = currentUri;
	this.section = currentUri.query.vesection;
	if ( $( '#wpSummary' ).length ) {
		this.initialEditSummary = $( '#wpSummary' ).val();
	} else {
		this.initialEditSummary = currentUri.query.summary;
	}
	this.namespaceName = mw.config.get( 'wgCanonicalNamespace' );
	this.viewUri = new mw.Uri( mw.util.getUrl( this.pageName ) );
	this.isViewPage = (
		mw.config.get( 'wgAction' ) === 'view' &&
		currentUri.query.diff === undefined
	);
	this.originalDocumentTitle = document.title;
	this.tabLayout = mw.config.get( 'wgVisualEditorConfig' ).tabLayout;
	this.events = new ve.init.mw.ArticleTargetEvents( this );
	this.$originalContent = $( '<div>' ).addClass( 've-init-mw-desktopArticleTarget-originalContent' );

	if ( mw.config.get( 'wgAction' ) === 'view' ) {
		switch ( mw.config.get( 'wgNamespaceNumber' ) ) {
			case namespaceIds.category:
				// Put contents in a single wrapper
				// TODO: Fix upstream
				$content = $( '#mw-content-text > :not( .mw-category-generated )' );
				this.$editableContent = $( '<div>' ).prependTo( $( '#mw-content-text' ) ).append( $content );
				break;
			case namespaceIds.file:
				this.$editableContent = $( '#mw-imagepage-content' );
				if ( !this.$editableContent.length ) {
					// No image content, file doesn't exist, or is on Commons?
					this.$editableContent = $( '<div id="mw-imagepage-content">' );
					$before = $( '.sharedUploadNotice, #mw-imagepage-nofile' );
					if ( $before.length ) {
						$before.first().after( this.$editableContent );
					} else {
						// Nothing to anchor to, just prepend inside #mw-content-text
						$( '#mw-content-text' ).prepend( this.$editableContent );
					}
				}
				break;
			default:
				this.$editableContent = $( '#mw-content-text' );
		}
	} else {
		// TODO: Load view page content if switching from edit source
		this.$editableContent = $( '#mw-content-text' );
	}
	this.$editableContent.addClass( 've-init-mw-desktopArticleTarget-editableContent' );

	// Initialization
	this.$element
		.addClass( 've-init-mw-desktopArticleTarget' )
		.append( this.$originalContent );

	if ( history.replaceState ) {
		// We replace the current state with one that's marked with our tag. This way, when users
		// use the Back button to exit the editor we can restore Read mode. This is because we want
		// to ignore foreign states in onWindowPopState. Without this, the Read state is foreign.
		// FIXME: There should be a much better solution than this.
		history.replaceState( this.popState, document.title, currentUri );
	}

	this.setupSkinTabs();

	window.addEventListener( 'popstate', this.onWindowPopState.bind( this ) );
};

/* Inheritance */

OO.inheritClass( ve.init.mw.DesktopArticleTarget, ve.init.mw.ArticleTarget );

/* Static Properties */

ve.init.mw.DesktopArticleTarget.static.actionGroups = [
	{ include: [ 'help', 'notices' ] },
	{
		type: 'list',
		icon: 'menu',
		title: ve.msg( 'visualeditor-pagemenu-tooltip' ),
		include: [ 'meta', 'settings', 'advancedSettings', 'categories', 'languages', 'findAndReplace' ]
	},
	{ include: [ 'editModeSource' ] }
];

/**
 * Compatibility map used with jQuery.client to black-list incompatible browsers.
 *
 * @static
 * @property
 */
ve.init.mw.DesktopArticleTarget.static.compatibility = {
	// The key is the browser name returned by jQuery.client
	// The value is either null (match all versions) or a list of tuples
	// containing an inequality (<,>,<=,>=) and a version number
	whitelist: {
		firefox: [ [ '>=', 12 ] ],
		iceweasel: [ [ '>=', 10 ] ],
		safari: [ [ '>=', 7 ] ],
		chrome: [ [ '>=', 19 ] ],
		msie: [ [ '>=', 10 ] ],
		edge: [ [ '>=', 12 ] ],
		opera: [ [ '>=', 15 ] ]
	}
};

ve.init.mw.DesktopArticleTarget.static.platformType = 'desktop';

/* Events */

/**
 * @event deactivate
 */

/**
 * @event transformPage
 */

/**
 * @event restorePage
 */

/**
 * @event saveWorkflowBegin
 * Fired when user clicks the button to open the save dialog.
 */

/**
 * @event saveWorkflowEnd
 * Fired when user exits the save workflow
 */

/**
 * @event saveReview
 * Fired when user initiates review changes in save workflow
 */

/**
 * @event saveInitiated
 * Fired when user initiates saving of the document
 */

/* Methods */

/**
 * Set the container for the target, appending the target to it
 *
 * @param {jQuery} $container Container
 */
ve.init.mw.DesktopArticleTarget.prototype.setContainer  = function ( $container ) {
	$container.append( this.$element );
	this.$container = $container;
};

/**
 * Verify that a PopStateEvent correlates to a state we created.
 *
 * @param {Mixed} popState From PopStateEvent#state
 * @return {boolean}
 */
ve.init.mw.DesktopArticleTarget.prototype.verifyPopState = function ( popState ) {
	return popState && popState.tag === 'visualeditor';
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.setupToolbar = function ( surface ) {
	var toolbar,
		wasSetup = !!this.toolbar,
		target = this;

	ve.track( 'trace.setupToolbar.enter' );

	// Parent method
	ve.init.mw.DesktopArticleTarget.super.prototype.setupToolbar.call( this, surface );

	toolbar = this.getToolbar();

	ve.track( 'trace.setupToolbar.exit' );
	if ( !wasSetup ) {
		setTimeout( function () {
			var height = toolbar.$bar.outerHeight();
			toolbar.$element.css( 'height', height );
			setTimeout( function () {
				// Clear to allow growth during use and when resizing window
				toolbar.$element.css( 'height', '' );
				target.toolbarSetupDeferred.resolve();
			}, 400 );
		} );

		this.toolbarSetupDeferred.done( function () {
			var surface = target.getSurface();
			// Check the surface wasn't torn down while the toolbar was animating
			if ( surface ) {
				ve.track( 'trace.initializeToolbar.enter' );
				target.getToolbar().initialize();
				surface.getView().emit( 'position' );
				surface.getContext().updateDimensions();
				ve.track( 'trace.initializeToolbar.exit' );
				ve.track( 'trace.activate.exit' );
			}
		} );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.attachToolbar = function () {
	// Move the toolbar to top of target, before heading etc.
	// Avoid re-attaching as it breaks CSS animations
	if ( !this.toolbar.$element.parent().is( this.$element ) ) {
		this.toolbar.$element
			// Set 0 before attach (expanded in #setupToolbar)
			.css( 'height', '0' )
			.addClass( 've-init-mw-desktopArticleTarget-toolbar' );
		this.$element.prepend( this.toolbar.$element );
	}
};

/**
 * Set up notices for things like unknown browsers.
 * Needs to be done on each activation because localNoticeMessages is cleared in clearState.
 */
ve.init.mw.DesktopArticleTarget.prototype.setupLocalNoticeMessages = function () {
	if ( mw.config.get( 'wgTranslatePageTranslation' ) === 'source' ) {
		// Warn users if they're on a source of the Page Translation feature
		this.localNoticeMessages.push( 'visualeditor-pagetranslationwarning' );
	}

	if ( !(
		'vewhitelist' in this.currentUri.query ||
		$.client.test( this.constructor.static.compatibility.whitelist, null, true )
	) ) {
		// Show warning in unknown browsers that pass the support test
		// Continue at own risk.
		this.localNoticeMessages.push( 'visualeditor-browserwarning' );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.loadSuccess = function ( response ) {
	var $checkboxes, defaults, data, windowManager,
		target = this;

	// Parent method
	ve.init.mw.DesktopArticleTarget.super.prototype.loadSuccess.apply( this, arguments );

	// Duplicate of this code in ve.init.mw.DesktopArticleTarget.init.js
	if ( $( '#ca-edit' ).hasClass( 'visualeditor-showtabdialog' ) ) {
		$( '#ca-edit' ).removeClass( 'visualeditor-showtabdialog' );
		// Set up a temporary window manager
		windowManager = new OO.ui.WindowManager();
		$( 'body' ).append( windowManager.$element );
		this.editingTabDialog = new mw.libs.ve.EditingTabDialog();
		windowManager.addWindows( [ this.editingTabDialog ] );
		windowManager.openWindow( this.editingTabDialog )
			.then( function ( opened ) { return opened; } )
			.then( function ( closing ) { return closing; } )
			.then( function ( data ) {
				// Detach the temporary window manager
				windowManager.destroy();

				if ( data && data.action === 'prefer-wt' ) {
					target.switchToWikitextEditor( true, false );
				} else if ( data && data.action === 'multi-tab' ) {
					location.reload();
				}
			} );

		// Pretend the user saw the welcome dialog before suppressing it.
		if ( mw.user.isAnon() ) {
			try {
				localStorage.setItem( 've-beta-welcome-dialog', 1 );
			} catch ( e ) {
				$.cookie( 've-beta-welcome-dialog', 1, { path: '/', expires: 30 } );
			}
		} else {
			new mw.Api().saveOption( 'visualeditor-hidebetawelcome', '1' );
		}
		this.suppressNormalStartupDialogs = true;
	}

	data = response ? response.visualeditor : {};

	this.checkboxFields = [];
	this.checkboxesByName = {};
	this.$otherFields = $( [] );
	if ( [ 'edit', 'submit' ].indexOf( mw.util.getParamValue( 'action' ) ) !== -1 ) {
		$( '#content #firstHeading' ).text(
			mw.Title.newFromText( mw.config.get( 'wgPageName' ) ).getPrefixedText()
		);
	}

	if ( data.checkboxes ) {
		defaults = {};
		$( '.editCheckboxes input' ).each( function () {
			defaults[ this.name ] = this.checked;
		} );

		$checkboxes = $( '<div>' ).html( ve.getObjectValues( data.checkboxes ).join( '' ) );
		$checkboxes.find( 'input[type=checkbox]' ).each( function () {
			var $label, title, checkbox,
				$this = $( this ),
				name = $this.attr( 'name' ),
				id = $this.attr( 'id' );

			if ( !name ) {
				// This really shouldn't happen..
				return;
			}

			// Label with for=id
			if ( id ) {
				$label = $checkboxes.find( 'label[for=' + id + ']' );
			}
			// Label wrapped input
			if ( !$label ) {
				$label = $this.closest( 'label' );
			}
			if ( $label ) {
				title = $label.attr( 'title' );
				$label.find( 'a' ).attr( 'target', '_blank' );
			}
			checkbox = new OO.ui.CheckboxInputWidget( {
				value: $this.attr( 'value' ),
				selected: defaults[ name ] !== undefined ? defaults[ name ] : $this.prop( 'checked' )
			} );
			// HACK: CheckboxInputWidget doesn't support access keys
			checkbox.$input.attr( 'accesskey', $( this ).attr( 'accesskey' ) );
			target.checkboxFields.push(
				new OO.ui.FieldLayout( checkbox, {
					align: 'inline',
					label: $label ? $label.contents() : undefined,
					title: title
				} )
			);
			target.checkboxesByName[ name ] = checkbox;
		} );
		this.$otherFields = $checkboxes.find( 'input[type!=checkbox]' );
	}
};

/**
 * Handle the watch button being toggled on/off.
 *
 * @param {jQuery.Event} e Event object which triggered the event
 * @param {string} actionPerformed 'watch' or 'unwatch'
 */
ve.init.mw.DesktopArticleTarget.prototype.onWatchToggle = function ( e, actionPerformed ) {
	if ( !this.active && !this.activating ) {
		return;
	}
	if ( this.checkboxesByName.wpWatchthis ) {
		this.checkboxesByName.wpWatchthis.setSelected(
			!!mw.user.options.get( 'watchdefault' ) ||
			( !!mw.user.options.get( 'watchcreations' ) && !this.pageExists ) ||
			actionPerformed === 'watch'
		);
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.bindHandlers = function () {
	ve.init.mw.DesktopArticleTarget.super.prototype.bindHandlers.call( this );
	if ( this.onWatchToggleHandler ) {
		$( '#ca-watch, #ca-unwatch' ).on( 'watchpage.mw', this.onWatchToggleHandler );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.unbindHandlers = function () {
	ve.init.mw.DesktopArticleTarget.super.prototype.unbindHandlers.call( this );
	if ( this.onWatchToggleHandler ) {
		$( '#ca-watch, #ca-unwatch' ).off( 'watchpage.mw', this.onWatchToggleHandler );
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
	var surface,
		target = this;

	if ( !this.active && !this.activating ) {
		this.activating = true;
		this.activatingDeferred = $.Deferred();
		this.toolbarSetupDeferred = $.Deferred();

		$( 'html' ).removeClass( 've-loading' ).addClass( 've-activating' );
		$.when( this.activatingDeferred, this.toolbarSetupDeferred ).done( function () {
			target.afterActivate();
		} ).fail( function () {
			$( 'html' ).removeClass( 've-activating' );
		} );

		this.bindHandlers();

		this.originalEditondbclick = mw.user.options.get( 'editondblclick' );
		mw.user.options.set( 'editondblclick', 0 );

		// User interface changes
		this.transformPage();
		this.setupLocalNoticeMessages();

		this.saveScrollPosition();

		// Create dummy surface to show toolbar while loading
		surface = this.addSurface( [] );
		surface.disable();
		// setSurface creates dummy toolbar
		this.dummyToolbar = true;
		this.setSurface( surface );
		// Disconnect the tool factory listeners so the toolbar
		// doesn't start showing new tools as they load, too
		// much flickering
		this.getToolbar().getToolFactory().off( 'register' );
		// Disable all the tools
		this.getToolbar().updateToolState();

		this.load( dataPromise );
	}
	return this.activatingDeferred.promise();
};

/**
 * Edit mode has finished activating
 */
ve.init.mw.DesktopArticleTarget.prototype.afterActivate = function () {
	$( 'html' ).removeClass( 've-activating' ).addClass( 've-active' );
	if ( !this.editingTabDialog ) {
		// We have to focus the page after hiding the original content, otherwise
		// in firefox the contentEditable container was below the view page, and
		// 'focus' scrolled the screen down.
		// Support: Firefox
		this.getSurface().getView().focus();
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.setSurface = function ( surface ) {
	if ( surface !== this.surface ) {
		this.$editableContent.after( surface.$element );
	}

	// Parent method
	ve.init.mw.DesktopArticleTarget.super.prototype.setSurface.apply( this, arguments );
};

/**
 * Determines whether we want to switch to view mode or not (displaying a dialog if necessary)
 * Then, if we do, actually switches to view mode.
 *
 * A dialog will not be shown if deactivate() is called while activation is still in progress,
 * or if the noDialog parameter is set to true. If deactivate() is called while the target
 * is deactivating, or while it's not active and not activating, nothing happens.
 *
 * @param {boolean} [noDialog] Do not display a dialog
 * @param {string} [trackMechanism] Abort mechanism; used for event tracking if present
 */
ve.init.mw.DesktopArticleTarget.prototype.deactivate = function ( noDialog, trackMechanism ) {
	var target = this;
	if ( this.deactivating || ( !this.active && !this.activating ) ) {
		return;
	}

	// Just in case these weren't closed before
	if ( this.welcomeDialog ) {
		this.welcomeDialog.close();
	}
	if ( this.editingTabDialog ) {
		this.editingTabDialog.close();
	}
	this.editingTabDialog = null;

	if ( noDialog || this.activating || !this.edited ) {
		this.emit( 'deactivate' );
		this.cancel( trackMechanism );
	} else {
		this.getSurface().dialogs.openWindow( 'cancelconfirm' ).then( function ( opened ) {
			opened.then( function ( closing ) {
				closing.then( function ( data ) {
					if ( data && data.action === 'discard' ) {
						target.emit( 'deactivate' );
						target.cancel( trackMechanism );
					}
				} );
			} );
		} );
	}
};

/**
 * Switch to view mode
 *
 * @param {string} [trackMechanism] Abort mechanism; used for event tracking if present
 */
ve.init.mw.DesktopArticleTarget.prototype.cancel = function ( trackMechanism ) {
	var abortType,
		target = this,
		promises = [];

	// Event tracking
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
		ve.track( 'mwedit.abort', {
			type: abortType,
			mechanism: trackMechanism
		} );
	}

	// Cancel activating, start deactivating
	this.deactivating = true;
	this.activating = false;
	this.activatingDeferred.reject();
	$( 'html' ).addClass( 've-deactivating' ).removeClass( 've-activated ve-active' );

	// User interface changes
	if ( this.elementsThatHadOurAccessKey ) {
		this.elementsThatHadOurAccessKey.attr( 'accesskey', ve.msg( 'accesskey-save' ) );
	}
	this.restorePage();

	this.unbindHandlers();

	mw.user.options.set( 'editondblclick', this.originalEditondbclick );
	this.originalEditondbclick = undefined;

	if ( this.toolbarSaveButton ) {
		this.toolbarSaveButton = null;
	}

	// Check we got as far as setting up the surface
	if ( this.getSurface() ) {
		if ( this.active ) {
			this.teardownUnloadHandlers();
		}
		promises.push( this.teardownSurface() );
	} else if ( this.toolbar ) {
		// If a dummy toolbar was created, destroy it
		this.toolbar.destroy();
	}

	$.when.apply( null, promises ).done( function () {
		// If there is a load in progress, abort it
		if ( target.loading ) {
			target.loading.abort();
		}

		target.clearState();
		target.docToSave = null;
		target.initialEditSummary = new mw.Uri().query.summary;

		target.deactivating = false;
		$( 'html' ).removeClass( 've-deactivating' );

		// Move original content back out of the target
		target.$element.parent().append( target.$originalContent.children() );
		$( '.ve-init-mw-desktopArticleTarget-uneditableContent' )
			.off( '.ve-target' )
			.removeClass( 've-init-mw-desktopArticleTarget-uneditableContent' );

		mw.hook( 've.deactivationComplete' ).fire( target.edited );
	} );
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.loadFail = function ( errorText, error ) {
	// Parent method
	ve.init.mw.DesktopArticleTarget.super.prototype.loadFail.apply( this, arguments );

	// Don't show an error if the load was manually aborted
	// The response.status check here is to catch aborts triggered by navigation away from the page
	if (
		error &&
		Object.prototype.hasOwnProperty.call( error, 'error' ) &&
		Object.prototype.hasOwnProperty.call( error.error, 'info' )
	) {
		error = error.error.info;
	}

	if (
		errorText === 'http' &&
		( error.statusText !== 'abort' || error.xhr.status !== 504 ) &&
		confirm( ve.msg( 'visualeditor-loadwarning', 'HTTP ' + error.xhr.status ) )
	) {
		this.load();
	} else if (
		errorText === 'http' && error.xhr.status === 504 &&
		confirm( ve.msg( 'visualeditor-timeout' ) )
	) {
		if ( 'veaction' in this.currentUri.query ) {
			delete this.currentUri.query.veaction;
		}
		this.currentUri.query.action = 'edit';
		location.href = this.currentUri.toString();
	} else if (
		errorText !== 'http' &&
		typeof error === 'string' &&
		confirm( ve.msg( 'visualeditor-loadwarning', errorText + ': ' + error ) )
	) {
		this.load();
	} else {
		// Something weird happened? Deactivate
		// Not passing trackMechanism because we don't know what happened
		// and this is not a user action
		this.deactivate( true );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.surfaceReady = function () {
	var surfaceReadyTime = ve.now(),
		target = this;

	if ( !this.activating ) {
		// Activation was aborted before we got here. Do nothing
		// TODO are there things we need to clean up?
		return;
	}

	this.activating = false;

	// TODO: mwTocWidget should probably live in a ve.ui.MWSurface subclass
	if ( mw.config.get( 'wgVisualEditorConfig' ).enableTocWidget ) {
		this.getSurface().mwTocWidget = new ve.ui.MWTocWidget( this.getSurface() );
	}

	// Track how long it takes for the first transaction to happen
	this.surface.getModel().getDocument().once( 'transact', function () {
		ve.track( 'mwtiming.behavior.firstTransaction', {
			duration: ve.now() - surfaceReadyTime,
			targetName: target.constructor.static.trackingName
		} );
	} );

	this.getSurface().getModel().getMetaList().connect( this, {
		insert: 'onMetaItemInserted',
		remove: 'onMetaItemRemoved'
	} );

	// Update UI
	this.changeDocumentTitle();
	// Support: IE<=11
	// IE requires us to defer before restoring the scroll position
	setTimeout( function () {
		target.restoreScrollPosition();
	} );

	// Parent method
	ve.init.mw.DesktopArticleTarget.super.prototype.surfaceReady.apply( this, arguments );

	this.setupUnloadHandlers();
	if ( !this.suppressNormalStartupDialogs ) {
		this.maybeShowWelcomeDialog();
		this.maybeShowMetaDialog();
	}

	this.activatingDeferred.resolve();
	this.events.trackActivationComplete();

	mw.hook( 've.activationComplete' ).fire();
};

/**
 * Add the redirect header when a redirect is inserted into the page.
 *
 * @param {ve.dm.MetaItem} metaItem Item that was inserted
 */
ve.init.mw.DesktopArticleTarget.prototype.onMetaItemInserted = function ( metaItem ) {
	var title, target, $link;
	if ( metaItem.getType() === 'mwRedirect' ) {
		target = this;
		title = metaItem.getAttribute( 'title' );
		$link = $( '<a>' )
			.attr( 'title', mw.msg( 'visualeditor-redirect-description', title ) )
			.text( title );
		ve.init.platform.linkCache.styleElement( title, $link );

		// Add redirect target header
		if ( !$( '#redirectsub' ).length ) {
			$( '#contentSub' ).append(
				$( '<span>' )
					.text( mw.msg( 'redirectpagesub' ) )
					.attr( 'id', 'redirectsub' ),
				$( '<br>' )
			);
		}
		this.$originalContent.find( '.redirectMsg' ).remove();
		this.$originalContent.append( $( '<div>' )
			// Bit of a hack: Make sure any redirect note is styled
			.addClass( 'redirectMsg mw-content-' + $( 'html' ).attr( 'dir' ) )

			.addClass( 've-redirect-header' )
			.append(
				$( '<p>' ).text( mw.msg( 'redirectto' ) ),
				$( '<ul>' )
					.addClass( 'redirectText' )
					.append( $( '<li>' ).append( $link ) )
			)
			.click( function ( e ) {
				var windowAction = ve.ui.actionFactory.create( 'window', target.getSurface() );
				windowAction.open( 'meta', { page: 'settings' } );
				e.preventDefault();
			} )
		);
	}
};

/**
 * Remove the redirect header when a redirect is removed from the page.
 *
 * @param {ve.dm.MetaItem} metaItem Item that was removed
 * @param {number} offset Linear model offset that the item was at
 * @param {number} index Index within that offset the item was at
 */
ve.init.mw.DesktopArticleTarget.prototype.onMetaItemRemoved = function ( metaItem ) {
	if ( metaItem.getType() === 'mwRedirect' ) {
		this.$originalContent.find( '.redirectMsg' ).remove();
		$( '#contentSub #redirectsub, #contentSub #redirectsub + br' ).remove();
	}
};

/**
 * Handle Escape key presses.
 *
 * @param {jQuery.Event} e Keydown event
 */
ve.init.mw.DesktopArticleTarget.prototype.onDocumentKeyDown = function ( e ) {
	var target = this;

	// Parent method
	ve.init.mw.DesktopArticleTarget.super.prototype.onDocumentKeyDown.apply( this, arguments );

	if ( e.which === OO.ui.Keys.ESCAPE ) {
		setTimeout( function () {
			// Listeners should stopPropagation if they handle the escape key, but
			// also check they didn't fire after this event, as would be the case if
			// they were bound to the document.
			if ( !e.isPropagationStopped() ) {
				target.deactivate( false, 'navigate-read' );
			}
		} );
		e.preventDefault();
	}
};

/**
 * Handle clicks on the view tab.
 *
 * @method
 * @param {jQuery.Event} e Mouse click event
 */
ve.init.mw.DesktopArticleTarget.prototype.onViewTabClick = function ( e ) {
	if ( ( e.which && e.which !== 1 ) || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey ) {
		return;
	}
	this.deactivate( false, 'navigate-read' );
	e.preventDefault();
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.saveComplete = function (
	html, categoriesHtml, newid, isRedirect, displayTitle, lastModified, contentSub, modules, jsconfigvars
) {
	var newUrlParams, watchChecked;

	// Parent method
	ve.init.mw.DesktopArticleTarget.super.prototype.saveComplete.apply( this, arguments );

	if ( !this.pageExists || this.restoring ) {
		// This is a page creation or restoration, refresh the page
		this.teardownUnloadHandlers();
		newUrlParams = newid === undefined ? {} : { venotify: this.restoring ? 'restored' : 'created' };

		if ( isRedirect ) {
			newUrlParams.redirect = 'no';
		}
		location.href = this.viewUri.extend( newUrlParams );
	} else {
		// Update watch link to match 'watch checkbox' in save dialog.
		// User logged in if module loaded.
		// Just checking for mw.page.watch is not enough because in Firefox
		// there is Object.prototype.watch...
		if ( mw.page.hasOwnProperty( 'watch' ) ) {
			watchChecked = this.checkboxesByName.wpWatchthis && this.checkboxesByName.wpWatchthis.isSelected();
			mw.page.watch.updateWatchLink(
				$( '#ca-watch a, #ca-unwatch a' ),
				watchChecked ? 'unwatch' : 'watch'
			);
		}

		// If we were explicitly editing an older version, make sure we won't
		// load the same old version again, now that we've saved the next edit
		// will be against the latest version.
		// TODO: What about oldid in the url?
		this.restoring = false;

		if ( newid !== undefined ) {
			mw.config.set( {
				wgCurRevisionId: newid,
				wgRevisionId: newid
			} );
			this.revid = newid;
		}

		// Update module JS config values and notify ResourceLoader of any new
		// modules needed to be added to the page
		mw.config.set( jsconfigvars );
		mw.loader.load( modules );

		this.saveDialog.reset();
		this.replacePageContent(
			html,
			categoriesHtml,
			displayTitle,
			lastModified,
			contentSub
		);

		if ( newid !== undefined ) {
			$( '#t-permalink a, #coll-download-as-rl a' ).each( function () {
				var uri = new mw.Uri( $( this ).attr( 'href' ) );
				uri.query.oldid = newid;
				$( this ).attr( 'href', uri.toString() );
			} );
		}

		// Tear down the target now that we're done saving
		// Not passing trackMechanism because this isn't an abort action
		this.deactivate( true );
		if ( newid !== undefined ) {
			mw.hook( 'postEdit' ).fire( {
				message: ve.msg( 'postedit-confirmation-saved', mw.user )
			} );
		}
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.serializeFail = function ( jqXHR, status ) {
	// Parent method
	ve.init.mw.DesktopArticleTarget.super.prototype.serializeFail.apply( this, arguments );

	alert( ve.msg( 'visualeditor-serializeerror', status ) );

	this.getSurface().getDialogs().closeWindow( 'wikitextswitchconfirm' );

	// It's possible to get here while the save dialog has never been opened (if the user uses
	// the switch to source mode option)
	if ( this.saveDialog ) {
		this.saveDialog.popPending();
	}
};

/**
 * Handle clicks on the MwMeta button in the toolbar.
 *
 * @method
 * @param {jQuery.Event} e Mouse click event
 */
ve.init.mw.DesktopArticleTarget.prototype.onToolbarMetaButtonClick = function () {
	this.getSurface().getDialogs().openWindow( 'meta' );
};

/**
 * Open the dialog to switch to edit source mode with the current wikitext, or just do it straight
 * away if the document is unmodified. If we open the dialog, the document opacity will be set to
 * half, which can be reset with the resetDocumentOpacity function.
 *
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.editSource = function () {
	if ( !this.getSurface().getModel().hasBeenModified() && !this.fromEditedState ) {
		this.switchToWikitextEditor( true, false );
		return;
	}

	this.getSurface().getView().getDocument().getDocumentNode().$element.css( 'opacity', 0.5 );

	ve.ui.actionFactory.create( 'window', this.getSurface() )
		.open( 'wikitextswitchconfirm', { target: this } );
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.getSaveFields = function () {
	var name, fieldValues = {};

	for ( name in this.checkboxesByName ) {
		if ( this.checkboxesByName[ name ].isSelected() ) {
			fieldValues[ name ] = this.checkboxesByName[ name ].getValue();
		}
	}
	this.$otherFields.each( function () {
		var $this = $( this ),
			name = $this.prop( 'name' );
		if ( name ) {
			fieldValues[ name ] = $this.val();
		}
	} );

	return ve.extendObject(
		fieldValues,
		ve.init.mw.DesktopArticleTarget.super.prototype.getSaveFields.call( this )
	);
};

/**
 * Switch to viewing mode.
 *
 * @return {jQuery.Promise} Promise resolved when surface is torn down
 */
ve.init.mw.DesktopArticleTarget.prototype.teardownSurface = function () {
	var target = this,
		promises = [];

	// Update UI
	promises.push( this.teardownToolbar() );
	this.restoreDocumentTitle();
	if ( this.getSurface().mwTocWidget ) {
		this.getSurface().mwTocWidget.teardown();
	}

	if ( this.saveDialog ) {
		if ( this.saveDialog.isOpened() ) {
			// If the save dialog is still open (from saving) close it
			promises.push( this.saveDialog.close() );
		}
		// Release the reference
		this.saveDialog = null;
	}

	return $.when.apply( null, promises ).then( function () {
		// Destroy surface
		while ( target.surfaces.length ) {
			target.surfaces.pop().destroy();
		}
		target.active = false;
	} );
};

/**
 * Modify tabs in the skin to support in-place editing.
 * Edit tab is bound outside the module in mw.DesktopArticleTarget.init.
 *
 * @method
 */
ve.init.mw.DesktopArticleTarget.prototype.setupSkinTabs = function () {
	var target = this;
	if ( this.isViewPage ) {
		// Allow instant switching back to view mode, without refresh
		$( '#ca-view a, #ca-nstab-visualeditor a' )
			.on( 'click', this.onViewTabClick.bind( this ) );

	}
	$( '#ca-viewsource, #ca-edit' ).on( 'click', function ( e ) {
		if ( !target.active || e.which !== 1 || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey ) {
			return;
		}

		if ( target.getSurface() && !target.deactivating ) {
			target.editSource();

			if ( target.getSurface().getModel().hasBeenModified() || target.fromEditedState ) {
				e.preventDefault();
			}
		}
	} );

	mw.hook( 've.skinTabSetupComplete' ).fire();
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.attachToolbarSaveButton = function () {
	this.toolbar.$actions.append( this.toolbarSaveButton.$element );
	// Make the toolbar recalculate its sizes for narrow/wide switching.
	// This really should not be necessary.
	this.toolbar.narrowThreshold = this.toolbar.$group.width() + this.toolbar.$actions.width();
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopArticleTarget.prototype.openSaveDialog = function () {
	var windowAction = ve.ui.actionFactory.create( 'window', this.getSurface() );

	// Open the dialog
	windowAction.open( 'mwSave', {
		target: this,
		editSummary: this.initialEditSummary,
		checkboxFields: this.checkboxFields,
		checkboxesByName: this.checkboxesByName
	} );
};

/**
 * Remember the window's scroll position.
 */
ve.init.mw.DesktopArticleTarget.prototype.saveScrollPosition = function () {
	this.scrollTop = $( window ).scrollTop();
};

/**
 * Restore the window's scroll position.
 */
ve.init.mw.DesktopArticleTarget.prototype.restoreScrollPosition = function () {
	if ( this.scrollTop !== null ) {
		$( window ).scrollTop( this.scrollTop );
		this.scrollTop = null;
	}
};

/**
 * Hide the toolbar.
 *
 * @return {jQuery.Promise} Promise which resolves when toolbar is hidden
 */
ve.init.mw.DesktopArticleTarget.prototype.teardownToolbar = function () {
	var target = this,
		deferred = $.Deferred();
	this.toolbar.$element.css( 'height', this.toolbar.$bar.outerHeight() );
	setTimeout( function () {
		target.toolbar.$element.css( 'height', '0' );
		setTimeout( function () {
			target.toolbar.destroy();
			target.toolbar = null;
			deferred.resolve();
		}, 400 );
	} );
	return deferred.promise();
};

/**
 * Change the document title to state that we are now editing.
 */
ve.init.mw.DesktopArticleTarget.prototype.changeDocumentTitle = function () {
	var pageName = mw.config.get( 'wgPageName' ),
		title = mw.Title.newFromText( pageName );
	if ( title ) {
		pageName = title.getPrefixedText();
	}
	document.title = ve.msg(
		this.pageExists ? 'editing' : 'creating',
		pageName
	) + ' - ' + mw.config.get( 'wgSiteName' );
};

/**
 * Restore the original document title.
 */
ve.init.mw.DesktopArticleTarget.prototype.restoreDocumentTitle = function () {
	document.title = this.originalDocumentTitle;
};

/**
 * Page modifications for switching to edit mode.
 */
ve.init.mw.DesktopArticleTarget.prototype.transformPage = function () {
	var uri, $content;

	// Deselect current mode (e.g. "view" or "history"). In skins like monobook that don't have
	// separate tab sections for content actions and namespaces the below is a no-op.
	$( '#p-views' ).find( 'li.selected' ).removeClass( 'selected' );
	$( '#ca-ve-edit' ).addClass( 'selected' );
	this.emit( 'transformPage' );

	mw.hook( 've.activate' ).fire();

	// Move all native content inside the target
	this.$originalContent.append( this.$element.siblings() );

	// Mark every non-direct ancestor between editableContent and the container as uneditable
	$content = this.$editableContent;
	while ( $content && !$content.parent().is( this.$container ) ) {
		$content.prevAll().addClass( 've-init-mw-desktopArticleTarget-uneditableContent' );
		$content.nextAll().addClass( 've-init-mw-desktopArticleTarget-uneditableContent' );
		$content = $content.parent();
	}
	// Support IE9: Disable links
	$( '.ve-init-mw-desktopArticleTarget-uneditableContent' ).on( 'click.ve-target', function () { return false; } );

	// Push veaction=edit url in history (if not already. If we got here by a veaction=edit
	// permalink then it will be there already and the constructor called #activate)
	if (
		!this.actFromPopState &&
		history.pushState &&
		this.currentUri.query.veaction !== 'edit' &&
		this.currentUri.query.action !== 'edit'
	) {
		// Set the current URL
		uri = this.currentUri;

		if (
			mw.config.get( 'wgVisualEditorConfig' ).singleEditTab &&
			mw.user.options.get( 'visualeditor-tabs' ) !== 'multi-tab'
		) {
			uri.query.action = 'edit';
			mw.config.set( 'wgAction', 'edit' );
		} else {
			uri.query.veaction = 'edit';
			delete uri.query.action;
			mw.config.set( 'wgAction', 'view' );
		}

		history.pushState( this.popState, document.title, uri );
	}
	this.actFromPopState = false;
};

/**
 * Page modifications for switching back to view mode.
 */
ve.init.mw.DesktopArticleTarget.prototype.restorePage = function () {
	var uri, keys;

	// Skins like monobook don't have a tab for view mode and instead just have the namespace tab
	// selected. We didn't deselect the namespace tab, so we're ready after deselecting #ca-ve-edit.
	// In skins having #ca-view (like Vector), select that.
	$( '#ca-ve-edit' ).removeClass( 'selected' );
	$( '#ca-view' ).addClass( 'selected' );

	// Remove any VE-added redirectMsg
	$( '.ve-redirect-header' ).remove();

	mw.hook( 've.deactivate' ).fire();
	this.emit( 'restorePage' );

	// Push article url into history
	if ( !this.actFromPopState && history.pushState ) {
		// Remove the VisualEditor query parameters
		uri = this.currentUri;
		if ( 'veaction' in uri.query ) {
			delete uri.query.veaction;
		}
		if ( 'vesection' in uri.query ) {
			delete uri.query.vesection;
		}
		if ( 'action' in uri.query && $( '#wpTextbox1' ).length === 0 ) {
			delete uri.query.action;
			mw.config.set( 'wgAction', 'view' );
		}

		// If there are any other query parameters left, re-use that uri object.
		// Otherwise use the canonical style view url (T44553, T102363).
		keys = Object.keys( uri.query );
		if ( !keys.length || ( keys.length === 1 && keys[ 0 ] === 'title' ) ) {
			history.pushState( this.popState, document.title, this.viewUri );
		} else {
			history.pushState( this.popState, document.title, uri );
		}
	}
	this.actFromPopState = false;
};

/**
 * @param {Event} e Native event object
 */
ve.init.mw.DesktopArticleTarget.prototype.onWindowPopState = function ( e ) {
	var newUri;

	if ( !this.verifyPopState( e.state ) ) {
		// Ignore popstate events fired for states not created by us
		// This also filters out the initial fire in Chrome (bug 57901).
		return;
	}

	newUri = this.currentUri = new mw.Uri( location.href );

	if ( !this.active && newUri.query.veaction === 'edit' ) {
		this.actFromPopState = true;
		this.activate();
	}
	if ( this.active && newUri.query.veaction !== 'edit' ) {
		this.actFromPopState = true;
		this.deactivate( false, 'navigate-back' );
	}
};

/**
 * Replace the page content with new HTML.
 *
 * @method
 * @param {string} html Rendered HTML from server
 * @param {string} categoriesHtml Rendered categories HTML from server
 * @param {string} displayTitle HTML to show as the page title
 * @param {Object} lastModified Object containing user-formatted date
 *  and time strings, or undefined if we made no change.
 * @param {string} contentSub HTML to show as the content subtitle
 */
ve.init.mw.DesktopArticleTarget.prototype.replacePageContent = function (
	html, categoriesHtml, displayTitle, lastModified, contentSub
) {
	var $content = $( $.parseHTML( html ) );

	if ( lastModified ) {
		// If we were not viewing the most recent revision before (a requirement
		// for lastmod to have been added by MediaWiki), we will be now.
		if ( !$( '#footer-info-lastmod' ).length ) {
			$( '#footer-info' ).prepend(
				$( '<li>' ).attr( 'id', 'footer-info-lastmod' )
			);
		}

		$( '#footer-info-lastmod' ).html( ' ' + mw.msg(
			'lastmodifiedat',
			lastModified.date,
			lastModified.time
		) );
	}

	// Remove any VE-added redirectMsg
	$( '.redirectMsg' ).remove();

	// Re-set any single-editor edit section handlers
	if (
		$content.find( '.mw-editsection' ).length &&
		!$content.find( '.mw-editsection-visualeditor' ).length
	) {
		$content
			.find( '.mw-editsection a' )
			.on( 'click', mw.libs.ve.onEditSectionLinkClick );
	}

	mw.hook( 'wikipage.content' ).fire( this.$editableContent.empty().append( $content ) );
	if ( displayTitle ) {
		$( '#content #firstHeading' ).html( displayTitle );
	}
	$( '#catlinks' ).replaceWith( categoriesHtml );
	$( '#contentSub' ).html( contentSub );

	// Bit of a hack: Make sure any redirect note is styled
	$( '.redirectMsg' )
		.addClass( 'mw-content-' + $( 'html' ).attr( 'dir' ) )
		.addClass( 've-redirect-header' );
};

/**
 * Get the numeric index of a section in the page.
 *
 * @method
 * @param {HTMLElement} heading Heading element of section
 */
ve.init.mw.DesktopArticleTarget.prototype.getEditSection = function ( heading ) {
	var $page = $( '#mw-content-text' ),
		section = 0;
	$page.find( 'h1, h2, h3, h4, h5, h6' ).not( '#toc h2' ).each( function () {
		section++;
		if ( this === heading ) {
			return false;
		}
	} );
	return section;
};

/**
 * Store the section for which the edit link has been triggered.
 *
 * @method
 * @param {HTMLElement} heading Heading element of section
 */
ve.init.mw.DesktopArticleTarget.prototype.saveEditSection = function ( heading ) {
	this.section = this.getEditSection( heading );
};

/**
 * Add onunload and onbeforeunload handlers.
 *
 * @method
 */
ve.init.mw.DesktopArticleTarget.prototype.setupUnloadHandlers = function () {
	// Remember any already set beforeunload handler
	this.onBeforeUnloadFallback = window.onbeforeunload;
	// Attach our handlers
	window.onbeforeunload = this.onBeforeUnload.bind( this );
	window.addEventListener( 'unload', this.onUnloadHandler );
};
/**
 * Remove onunload and onbeforunload handlers.
 *
 * @method
 */
ve.init.mw.DesktopArticleTarget.prototype.teardownUnloadHandlers = function () {
	// Restore whatever previous onbeforeunload hook existed
	window.onbeforeunload = this.onBeforeUnloadFallback;
	this.onBeforeUnloadFallback = null;
	window.removeEventListener( 'unload', this.onUnloadHandler );
};

/**
 * Show the meta dialog as needed on load.
 */
ve.init.mw.DesktopArticleTarget.prototype.maybeShowMetaDialog = function () {
	var windowAction, redirectMetaItems,
		target = this;

	if ( this.welcomeDialogPromise ) {
		this.welcomeDialogPromise
			.always( function () {
				// Pop out the notices when the welcome dialog is closed
				if (
					target.switched &&
					!mw.user.options.get( 'visualeditor-hidevisualswitchpopup' )
				) {
					target.actionsToolbar.tools.editModeSource.getPopup().toggle( true );
				} else {
					target.actionsToolbar.tools.notices.getPopup().toggle( true );
				}
			} );
	}

	redirectMetaItems = this.getSurface().getModel().getMetaList().getItemsInGroup( 'mwRedirect' );
	if ( redirectMetaItems.length ) {
		this.onMetaItemInserted( redirectMetaItems[ 0 ] );

		windowAction = ve.ui.actionFactory.create( 'window', this.getSurface() );

		windowAction.open( 'meta', { page: 'settings' } );
	}
};

/**
 * Handle before unload event.
 *
 * @method
 */
ve.init.mw.DesktopArticleTarget.prototype.onBeforeUnload = function () {
	var fallbackResult;
	// Check if someone already set on onbeforeunload hook
	if ( this.onBeforeUnloadFallback ) {
		// Get the result of their onbeforeunload hook
		fallbackResult = this.onBeforeUnloadFallback();
		// If it returned something, exit here and return their message
		if ( fallbackResult !== undefined ) {
			return fallbackResult;
		}
	}
	// Check if there's been an edit
	if ( this.getSurface() && this.edited && !this.submitting && mw.user.options.get( 'useeditwarning' ) ) {
		// Return our message
		return ve.msg( 'visualeditor-viewpage-savewarning' );
	}
};

/**
 * Handle unload event.
 *
 * @method
 */
ve.init.mw.DesktopArticleTarget.prototype.onUnload = function () {
	if ( !this.submitting ) {
		ve.track( 'mwedit.abort', {
			type: this.edited ? 'unknown-edited' : 'unknown',
			mechanism: 'navigate'
		} );
	}
};

/**
 * Switches to the wikitext editor, either keeping (default) or discarding changes.
 *
 * @param {boolean} [discardChanges] Whether to discard changes or not.
 * @param {boolean} [modified] Whether there were any changes at all.
 */
ve.init.mw.DesktopArticleTarget.prototype.switchToWikitextEditor = function ( discardChanges, modified ) {
	var uri,
		oldid = this.currentUri.query.oldid || $( 'input[name=parentRevId]' ).val(),
		target = this,
		prefPromise = mw.libs.ve.setEditorPreference( 'wikitext' );

	if ( discardChanges ) {
		if ( modified ) {
			ve.track( 'mwedit.abort', { type: 'switchwithout', mechanism: 'navigate' } );
		} else {
			ve.track( 'mwedit.abort', { type: 'switchnochange', mechanism: 'navigate' } );
		}
		this.submitting = true;
		prefPromise.done( function () {
			uri = target.viewUri.clone().extend( {
				action: 'edit',
				veswitched: 1
			} );
			if ( oldid ) {
				uri.extend( { oldid: oldid } );
			}
			location.href = uri.toString();
		} );
	} else {
		this.serialize(
			this.docToSave || this.getSurface().getDom(),
			function ( wikitext ) {
				ve.track( 'mwedit.abort', { type: 'switchwith', mechanism: 'navigate' } );
				target.submitWithSaveFields( { wpDiff: 1 }, wikitext );
			}
		);
	}
};

/**
 * Resets the document opacity when we've decided to cancel switching to the wikitext editor.
 */
ve.init.mw.DesktopArticleTarget.prototype.resetDocumentOpacity = function () {
	this.getSurface().getView().getDocument().getDocumentNode().$element.css( 'opacity', 1 );
};

/* Registration */

ve.init.mw.targetFactory.register( ve.init.mw.DesktopArticleTarget );
