/*!
 * VisualEditor MediaWiki Initialization ViewPageTarget class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/*global confirm, alert */

/**
 * Initialization MediaWiki view page target.
 *
 * @class
 * @extends ve.init.mw.Target
 *
 * @constructor
 */
ve.init.mw.ViewPageTarget = function VeInitMwViewPageTarget() {
	// A workaround, as default URI does not get updated after pushState (bug 72334)
	var currentUri = new mw.Uri( location.href );

	// Parent constructor
	ve.init.mw.Target.call( this, mw.config.get( 'wgRelevantPageName' ), currentUri.query.oldid );

	// Parent constructor bound key event handlers, but we don't want them bound until
	// we activate; so unbind them again
	this.unbindHandlers();

	this.onWatchToggleHandler = this.onWatchToggle.bind( this );

	// Properties
	this.toolbarSaveButton = null;
	this.saveDialog = null;
	this.onBeforeUnloadFallback = null;
	this.onUnloadHandler = this.onUnload.bind( this );
	this.active = false;
	this.activating = false;
	this.deactivating = false;
	this.edited = false;
	this.recreating = false;
	this.activatingDeferred = null;
	this.toolbarSetupDeferred = null;
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
	this.currentUri = currentUri;
	this.section = currentUri.query.vesection;
	this.initialEditSummary = currentUri.query.summary;
	this.namespaceName = mw.config.get( 'wgCanonicalNamespace' );
	this.viewUri = new mw.Uri( mw.util.getUrl( this.pageName ) );
	this.veEditUri = this.viewUri.clone().extend( { veaction: 'edit' } );
	this.isViewPage = (
		mw.config.get( 'wgAction' ) === 'view' &&
		currentUri.query.diff === undefined
	);
	this.originalDocumentTitle = document.title;
	this.tabLayout = mw.config.get( 'wgVisualEditorConfig' ).tabLayout;

	// Events
	this.connect( this, {
		save: 'onSave',
		saveErrorEmpty: 'onSaveErrorEmpty',
		saveErrorSpamBlacklist: 'onSaveErrorSpamBlacklist',
		saveErrorAbuseFilter: 'onSaveErrorAbuseFilter',
		saveErrorNewUser: 'onSaveErrorNewUser',
		saveErrorCaptcha: 'onSaveErrorCaptcha',
		saveErrorUnknown: 'onSaveErrorUnknown',
		saveErrorPageDeleted: 'onSaveErrorPageDeleted',
		saveErrorTitleBlacklist: 'onSaveErrorTitleBlacklist',
		loadError: 'onLoadError',
		surfaceReady: 'onSurfaceReady',
		editConflict: 'onEditConflict',
		showChanges: 'onShowChanges',
		showChangesError: 'onShowChangesError',
		noChanges: 'onNoChanges',
		serializeError: 'onSerializeError'
	} );

	if ( history.replaceState ) {
		// This is to stop the back button breaking when it's supposed to take us back out
		// of VE. It used to only be called when venotify is used. FIXME: there should be
		// a much better solution than this.
		history.replaceState( this.popState, document.title, currentUri );
	}

	this.setupSkinTabs();

	window.addEventListener( 'popstate', this.onWindowPopState.bind( this ) );
};

/* Inheritance */

OO.inheritClass( ve.init.mw.ViewPageTarget, ve.init.mw.Target );

/* Static Properties */

/**
 * Compatibility map used with jQuery.client to black-list incompatible browsers.
 *
 * @static
 * @property
 */
ve.init.mw.ViewPageTarget.compatibility = {
	// The key is the browser name returned by jQuery.client
	// The value is either null (match all versions) or a list of tuples
	// containing an inequality (<,>,<=,>=) and a version number
	whitelist: {
		firefox: [['>=', 15]],
		iceweasel: [['>=', 10]],
		safari: [['>=', 7]],
		chrome: [['>=', 19]],
		opera: [['>=', 15]]
	}
};

/* Events */

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
 * Verify that a PopStateEvent correlates to a state we created.
 *
 * @param {Mixed} popState From PopStateEvent#state
 * @return {boolean}
 */
ve.init.mw.ViewPageTarget.prototype.verifyPopState = function ( popState ) {
	return popState && popState.tag === 'visualeditor';
};

/**
 * @inheritdoc
 */
ve.init.mw.ViewPageTarget.prototype.setupToolbar = function ( surface ) {
	var toolbar,
		wasSetup = !!this.toolbar,
		target = this;

	ve.track( 'trace.setupToolbar.enter' );

	// Parent method
	ve.init.mw.Target.prototype.setupToolbar.call( this, surface );

	toolbar = this.getToolbar();

	ve.track( 'trace.setupToolbar.exit' );
	if ( !wasSetup ) {
		setTimeout( function () {
			var height = toolbar.$bar.outerHeight();
			toolbar.$element.css( 'height', height );
			toolbar.$element.one( 'transitionend', function () {
				// Clear to allow growth during use and when resizing window
				toolbar.$element.css( 'height', '' );
				target.toolbarSetupDeferred.resolve();
			} );
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
ve.init.mw.ViewPageTarget.prototype.attachToolbar = function () {
	// Move the toolbar to top of target, before heading etc.
	// Avoid re-attaching as it breaks CSS animations
	if ( !this.toolbar.$element.parent().is( this.$element ) ) {
		this.toolbar.$element
			// Set 0 before attach (expanded in #setupToolbar)
			.css( 'height', '0' )
			.addClass( 've-init-mw-viewPageTarget-toolbar' );
		this.$element.prepend( this.toolbar.$element );
	}
};

/**
 * Set up notices for things like unknown browsers.
 * Needs to be done on each activation because localNoticeMessages is cleared in clearState.
 */
ve.init.mw.ViewPageTarget.prototype.setupLocalNoticeMessages = function () {
	if ( mw.config.get( 'wgTranslatePageTranslation' ) === 'source' ) {
		// Warn users if they're on a source of the Page Translation feature
		this.localNoticeMessages.push( 'visualeditor-pagetranslationwarning' );
	}

	if ( !(
		'vewhitelist' in this.currentUri.query ||
		$.client.test( ve.init.mw.ViewPageTarget.compatibility.whitelist, null, true )
	) ) {
		// Show warning in unknown browsers that pass the support test
		// Continue at own risk.
		this.localNoticeMessages.push( 'visualeditor-browserwarning' );
	}
};

/**
 * Handle the watch button being toggled on/off.
 * @param {jQuery.Event} e Event object whih triggered the event
 * @param {string} actionPerformed 'watch' or 'unwatch'
 */
ve.init.mw.ViewPageTarget.prototype.onWatchToggle = function ( e, actionPerformed ) {
	if ( !this.active && !this.activating ) {
		return;
	}
	this.$checkboxes.filter( '#wpWatchthis' )
		.prop( 'checked',
			mw.user.options.get( 'watchdefault' ) ||
			( mw.user.options.get( 'watchcreations' ) && !this.pageExists ) ||
			actionPerformed === 'watch'
		);
};

/**
 * @inheritdoc
 */
ve.init.mw.ViewPageTarget.prototype.bindHandlers = function () {
	ve.init.mw.ViewPageTarget.super.prototype.bindHandlers.call( this );
	if ( this.onWatchToggleHandler ) {
		$( '#ca-watch, #ca-unwatch' ).on( 'watchpage.mw', this.onWatchToggleHandler );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.ViewPageTarget.prototype.unbindHandlers = function () {
	ve.init.mw.ViewPageTarget.super.prototype.unbindHandlers.call( this );
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
ve.init.mw.ViewPageTarget.prototype.activate = function ( dataPromise ) {
	var surface,
		pageTarget = this;

	if ( !this.active && !this.activating ) {
		this.activating = true;
		this.activatingDeferred = $.Deferred();
		this.toolbarSetupDeferred = $.Deferred();

		this.maybeShowWelcomeDialog();

		$( 'html' ).removeClass( 've-loading' ).addClass( 've-activating' );
		$.when( this.activatingDeferred, this.toolbarSetupDeferred ).always( function () {
			$( 'html' ).removeClass( 've-activating' ).addClass( 've-active' );
			// We have to focus the page after hiding the original content, otherwise
			// in firefox the contentEditable container was below the view page, and
			// 'focus' scrolled the screen down.
			pageTarget.getSurface().getView().focus();
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
ve.init.mw.ViewPageTarget.prototype.deactivate = function ( noDialog, trackMechanism ) {
	var target = this;
	if ( this.deactivating || ( !this.active && !this.activating ) ) {
		return;
	}

	// Just in case this wasn't closed before
	if ( this.welcomeDialog ) {
		this.welcomeDialog.close();
	}

	if ( noDialog || this.activating || !this.edited ) {
		this.cancel( trackMechanism );
	} else {
		this.getSurface().dialogs.openWindow( 'cancelconfirm' ).then( function ( opened ) {
			opened.then( function ( closing ) {
				closing.then( function ( data ) {
					if ( data && data.action === 'discard' ) {
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
ve.init.mw.ViewPageTarget.prototype.cancel = function ( trackMechanism ) {
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

	this.deactivating = true;
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
		// If deactivate is called before a successful load, then the save button has not yet been
		// fully set up so disconnecting it would throw an error when trying call methods on the
		// button property (bug 46456)
		this.toolbarSaveButton.disconnect( this );
		this.toolbarSaveButton.$element.detach();
		this.getToolbar().$actions.empty();
	}

	// Check we got as far as setting up the surface
	if ( this.active ) {
		this.tearDownUnloadHandlers();
		// If we got as far as setting up the surface, tear that down
		promises.push( this.tearDownSurface() );
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
		target.activating = false;
		target.activatingDeferred.reject();
		$( 'html' ).removeClass( 've-deactivating' );

		// Move remaining elements back out of the target
		target.$element.parent().append( target.$element.children() );

		mw.hook( 've.deactivationComplete' ).fire( target.edited );
	} );
};

/**
 * Handle failed DOM load event.
 *
 * @method
 * @param {string} errorTypeText
 * @param {string} error
 */
ve.init.mw.ViewPageTarget.prototype.onLoadError = function ( errorText, error ) {
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
		// TODO: how does this handle load errors triggered from
		// calling this.loading.abort()?
		this.activating = false;
		// Not passing trackMechanism because we don't know what happened
		// and this is not a user action
		this.deactivate( true );
	}
};

/**
 * Once surface is ready ready, init UI
 *
 * @method
 */
ve.init.mw.ViewPageTarget.prototype.onSurfaceReady = function () {
	var surfaceReadyTime = ve.now(),
		target = this;

	if ( !this.activating ) {
		// Activation was aborted before we got here. Do nothing
		// TODO are there things we need to clean up?
		return;
	}

	this.activating = false;
	this.getSurface().getModel().connect( this, {
		history: 'updateToolbarSaveButtonState'
	} );

	// TODO: mwTocWidget should probably live in a ve.ui.MWSurface subclass
	if ( mw.config.get( 'wgVisualEditorConfig' ).enableTocWidget ) {
		this.getSurface().mwTocWidget = new ve.ui.MWTocWidget( this.getSurface() );
	}

	// Track how long it takes for the first transaction to happen
	this.surface.getModel().getDocument().once( 'transact', function () {
		ve.track( 'mwtiming.behavior.firstTransaction', {
			duration: ve.now() - surfaceReadyTime,
			targetName: target.constructor.static.name
		} );
	} );

	// Update UI
	this.changeDocumentTitle();

	this.setupToolbarSaveButton();
	this.attachToolbarSaveButton();
	this.restoreScrollPosition();
	this.restoreEditSection();
	this.setupUnloadHandlers();
	this.maybeShowMetaDialog();

	this.activatingDeferred.resolve();

	mw.hook( 've.activationComplete' ).fire();
};

/**
 * Handle Escape key presses.
 * @param {jQuery.Event} e Keydown event
 */
ve.init.mw.ViewPageTarget.prototype.onDocumentKeyDown = function ( e ) {
	// Parent method
	ve.init.mw.ViewPageTarget.super.prototype.onDocumentKeyDown.apply( this, arguments );

	var target = this;

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
ve.init.mw.ViewPageTarget.prototype.onViewTabClick = function ( e ) {
	if ( ( e.which && e.which !== 1 ) || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey ) {
		return;
	}
	this.deactivate( false, 'navigate-read' );
	e.preventDefault();
};

/**
 * Handle successful DOM save event.
 *
 * @method
 * @param {string} html Rendered page HTML from server
 * @param {string} categoriesHtml Rendered categories HTML from server
 * @param {number} newid New revision id, undefined if unchanged
 * @param {boolean} isRedirect Whether this page is a redirect or not
 * @param {string} displayTitle What HTML to show as the page title
 * @param {Object} lastModified Object containing user-formatted date
    and time strings, or undefined if we made no change.
 */
ve.init.mw.ViewPageTarget.prototype.onSave = function (
	html, categoriesHtml, newid, isRedirect, displayTitle, lastModified, contentSub
) {
	var newUrlParams, watchChecked;
	this.saveDeferred.resolve();
	if ( !this.pageExists || this.restoring ) {
		// This is a page creation or restoration, refresh the page
		this.tearDownUnloadHandlers();
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
		if ( mw.page.watch && mw.page.watch.updateWatchLink ) {
			watchChecked = this.saveDialog.$saveOptions
				.find( '.ve-ui-mwSaveDialog-checkboxes' )
					.find( '#wpWatchthis' )
					.prop( 'checked' );
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

		this.setupSectionEditLinks();
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
ve.init.mw.ViewPageTarget.prototype.onSaveError = function () {
	this.pageDeletedWarning = false;
	ve.init.mw.ViewPageTarget.super.prototype.onSaveError.apply( this, arguments );
};

/**
 * Update save dialog message on general error
 *
 * @method
 */
ve.init.mw.ViewPageTarget.prototype.onSaveErrorEmpty = function () {
	this.showSaveError( ve.msg( 'visualeditor-saveerror', 'Empty server response' ), false /* prevents reapply */ );
};

/**
 * Update save dialog message on spam blacklist error
 *
 * @method
 * @param {Object} editApi
 */
ve.init.mw.ViewPageTarget.prototype.onSaveErrorSpamBlacklist = function ( editApi ) {
	this.showSaveError(
		ve.msg( 'spamprotectiontext' ) + ' ' +
			ve.msg(
				'spamprotectionmatch', mw.language.listToText( editApi.spamblacklist.split( '|' ) )
			),
		false // prevents reapply
	);
};

/**
 * Update save dialog message on abuse filter error
 *
 * @method
 * @param {Object} editApi
 */
ve.init.mw.ViewPageTarget.prototype.onSaveErrorAbuseFilter = function ( editApi ) {
	this.showSaveError( $( $.parseHTML( editApi.warning ) ) );
	// Don't disable the save button. If the action is not disallowed the user may save the
	// edit by pressing Save again. The AbuseFilter API currently has no way to distinguish
	// between filter triggers that are and aren't disallowing the action.
};

/**
 * Update save dialog message on title blacklist error
 *
 * @method
 */
ve.init.mw.ViewPageTarget.prototype.onSaveErrorTitleBlacklist = function () {
	this.showSaveError( mw.msg( 'visualeditor-saveerror-titleblacklist' ) );
};

/**
 * Update save dialog when token fetch indicates another user is logged in
 *
 * @method
 * @param {string|null} username Name of newly logged-in user, or null if anonymous
 */
ve.init.mw.ViewPageTarget.prototype.onSaveErrorNewUser = function ( username ) {
	var badToken, userMsg;
	badToken = document.createTextNode( mw.msg( 'visualeditor-savedialog-error-badtoken' ) + ' ' );
	// mediawiki.jqueryMsg has a bug with [[User:$1|$1]] (bug 51388)
	if ( username === null ) {
		userMsg = 'visualeditor-savedialog-identify-anon';
	} else {
		userMsg = 'visualeditor-savedialog-identify-user---' + username;
	}
	this.showSaveError(
		$( badToken ).add( $.parseHTML( mw.message( userMsg ).parse() ) )
	);
};

/**
 * Update save dialog on captcha error
 *
 * @method
 * @param {Object} editApi
 */
ve.init.mw.ViewPageTarget.prototype.onSaveErrorCaptcha = function ( editApi ) {
	var $captchaDiv = $( '<div>' ),
		$captchaParagraph = $( '<p>' );

	this.captcha = {
		input: new OO.ui.TextInputWidget(),
		id: editApi.captcha.id
	};
	$captchaDiv.append( $captchaParagraph );
	$captchaParagraph.append(
		$( '<strong>' ).text( mw.msg( 'captcha-label' ) ),
		document.createTextNode( mw.msg( 'colon-separator' ) )
	);
	if ( editApi.captcha.url ) { // FancyCaptcha
		$captchaParagraph.append(
			$( $.parseHTML( mw.message( 'fancycaptcha-edit' ).parse() ) )
				.filter( 'a' ).attr( 'target', '_blank' ).end()
		);
		$captchaDiv.append(
			$( '<img>' ).attr( 'src', editApi.captcha.url )
		);
	} else if ( editApi.captcha.type === 'simple' || editApi.captcha.type === 'math' ) {
		// SimpleCaptcha and MathCaptcha
		$captchaParagraph.append(
			mw.message( 'captcha-edit' ).parse(),
			'<br>',
			document.createTextNode( editApi.captcha.question )
		);
	} else if ( editApi.captcha.type === 'question' ) {
		// QuestyCaptcha
		$captchaParagraph.append(
			mw.message( 'questycaptcha-edit' ).parse(),
			'<br>',
			editApi.captcha.question
		);
	}

	$captchaDiv.append( this.captcha.input.$element );

	// ProcessDialog's error system isn't great for this yet.
	this.saveDialog.clearMessage( 'api-save-error' );
	this.saveDialog.showMessage( 'api-save-error', $captchaDiv );
	this.saveDialog.popPending();
};

/**
 * Update save dialog message on unknown error
 *
 * @method
 * @param {Object} editApi
 * @param {Object|null} data API response data
 */
ve.init.mw.ViewPageTarget.prototype.onSaveErrorUnknown = function ( editApi, data ) {
	this.showSaveError(
		$( document.createTextNode(
			( editApi && editApi.info ) ||
			( data.error && data.error.info ) ||
			( editApi && editApi.code ) ||
			( data.error && data.error.code ) ||
			'Unknown error'
		) ),
		false // prevents reapply
	);
};

/**
 * Update save dialog message on page deleted error
 *
 * @method
 */
ve.init.mw.ViewPageTarget.prototype.onSaveErrorPageDeleted = function () {
	var continueLabel = mw.msg( 'ooui-dialog-process-continue' );

	this.pageDeletedWarning = true;
	this.showSaveError( mw.msg( 'visualeditor-recreate', continueLabel ), true, true );
};

/**
 * Handle MWSaveDialog retry events
 * So we can handle trying to save again after page deletion warnings
 */
ve.init.mw.ViewPageTarget.prototype.onSaveRetry = function () {
	if ( this.pageDeletedWarning ) {
		this.recreating = true;
		this.pageExists = false;
	}
};

/**
 * Update save dialog api-save-error message
 *
 * @method
 * @param {string|jQuery|Node[]} msg Message content (string of HTML, jQuery object or array of
 *  Node objects)
 * @param {boolean} [allowReapply=true] Whether or not to allow the user to reapply.
 *  Reset when swapping panels. Assumed to be true unless explicitly set to false.
 * @param {boolean} [warning=false] Whether or not this is a warning.
 */
ve.init.mw.ViewPageTarget.prototype.showSaveError = function ( msg, allowReapply, warning ) {
	this.saveDeferred.reject( [ new OO.ui.Error( msg, { recoverable: allowReapply, warning: warning } ) ] );
};

/**
 * Handle Show changes event.
 *
 * @method
 * @param {string} diffHtml
 */
ve.init.mw.ViewPageTarget.prototype.onShowChanges = function ( diffHtml ) {
	// Invalidate the viewer diff on next change
	this.getSurface().getModel().getDocument().once( 'transact',
		this.saveDialog.clearDiff.bind( this.saveDialog )
	);
	this.saveDialog.setDiffAndReview( diffHtml );
};

/**
 * Handle failed show changes event.
 *
 * @method
 * @param {Object} jqXHR
 * @param {string} status Text status message
 */
ve.init.mw.ViewPageTarget.prototype.onShowChangesError = function ( jqXHR, status ) {
	alert( ve.msg( 'visualeditor-differror', status ) );
	this.saveDialog.popPending();
};

/**
 * Called if a call to target.serialize() failed.
 *
 * @method
 * @param {jqXHR|null} jqXHR
 * @param {string} status Text status message
 */
ve.init.mw.ViewPageTarget.prototype.onSerializeError = function ( jqXHR, status ) {
	alert( ve.msg( 'visualeditor-serializeerror', status ) );

	// It's possible to get here while the save dialog has never been opened (if the user uses
	// the switch to source mode option)
	if ( this.saveDialog ) {
		this.saveDialog.popPending();
	}
};

/**
 * Handle edit conflict event.
 *
 * @method
 */
ve.init.mw.ViewPageTarget.prototype.onEditConflict = function () {
	this.saveDialog.popPending();
	this.saveDialog.swapPanel( 'conflict' );
};

/**
 * Handle failed show changes event.
 *
 * @method
 */
ve.init.mw.ViewPageTarget.prototype.onNoChanges = function () {
	this.saveDialog.popPending();
	this.saveDialog.swapPanel( 'nochanges' );
	this.saveDialog.getActions().setAbilities( { approve: true } );
};

/**
 * Handle clicks on the save button in the toolbar.
 *
 * @method
 * @param {jQuery.Event} e Mouse click event
 */
ve.init.mw.ViewPageTarget.prototype.onToolbarSaveButtonClick = function () {
	if ( this.edited || this.restoring ) {
		this.showSaveDialog();
	}
};

/**
 * Handle clicks on the MwMeta button in the toolbar.
 *
 * @method
 * @param {jQuery.Event} e Mouse click event
 */
ve.init.mw.ViewPageTarget.prototype.onToolbarMetaButtonClick = function () {
	this.getSurface().getDialogs().openWindow( 'meta' );
};

/**
 * Re-evaluate whether the toolbar save button should be disabled or not.
 */
ve.init.mw.ViewPageTarget.prototype.updateToolbarSaveButtonState = function () {
	var isDisabled;

	this.edited = this.getSurface().getModel().hasBeenModified();
	// Disable the save button if we have no history
	isDisabled = !this.edited && !this.restoring;
	this.toolbarSaveButton.setDisabled( isDisabled );
	mw.hook( 've.toolbarSaveButton.stateChanged' ).fire( isDisabled );
};

/**
 * Handle clicks on the review button in the save dialog.
 *
 * @method
 * @fires saveReview
 */
ve.init.mw.ViewPageTarget.prototype.onSaveDialogReview = function () {
	if ( !this.saveDialog.$reviewViewer.find( 'table, pre' ).length ) {
		this.emit( 'saveReview' );
		this.saveDialog.getActions().setAbilities( { approve: false } );
		this.saveDialog.pushPending();
		if ( this.pageExists ) {
			// Has no callback, handled via target.onShowChanges
			this.showChanges( this.docToSave );
		} else {
			this.serialize( this.docToSave, this.onSaveDialogReviewComplete.bind( this ) );
		}
	} else {
		this.saveDialog.swapPanel( 'review' );
	}
};

/**
 * Handle completed serialize request for diff views for new page creations.
 *
 * @method
 * @param {string} wikitext
 */
ve.init.mw.ViewPageTarget.prototype.onSaveDialogReviewComplete = function ( wikitext ) {
	// Invalidate the viewer wikitext on next change
	this.getSurface().getModel().getDocument().once( 'transact',
		this.saveDialog.clearDiff.bind( this.saveDialog )
	);
	this.saveDialog.setDiffAndReview( $( '<pre>' ).text( wikitext ) );
};

/**
 * Try to save the current document.
 * @fires saveInitiated
 * @param {jQuery.Deferred} saveDeferred Deferred object to resolve/reject when the save
 *  succeeds/fails.
 */
ve.init.mw.ViewPageTarget.prototype.saveDocument = function ( saveDeferred ) {
	if ( this.deactivating ) {
		return false;
	}

	var saveOptions = this.getSaveOptions();
	this.emit( 'saveInitiated' );

	// Reset any old captcha data
	if ( this.captcha ) {
		this.saveDialog.clearMessage( 'captcha' );
		delete this.captcha;
	}

	if (
		+mw.user.options.get( 'forceeditsummary' ) &&
		saveOptions.summary === '' &&
		!this.saveDialog.messages.missingsummary
	) {
		this.saveDialog.showMessage(
			'missingsummary',
			// Wrap manually since this core message already includes a bold "Warning:" label
			$( '<p>' ).append( ve.init.platform.getParsedMessage( 'missingsummary' ) ),
			{ wrap: false }
		);
		this.saveDialog.popPending();
	} else {
		this.save( this.docToSave, saveOptions );
		this.saveDeferred = saveDeferred;
	}
};

/**
 * Open the dialog to switch to edit source mode with the current wikitext, or just do it straight
 * away if the document is unmodified. If we open the dialog, the document opacity will be set to
 * half, which can be reset with the resetDocumentOpacity function.
 *
 * @method
 */
ve.init.mw.ViewPageTarget.prototype.editSource = function () {
	if ( !this.getSurface().getModel().hasBeenModified() ) {
		this.switchToWikitextEditor( true );
		return;
	}

	this.getSurface().getView().getDocument().getDocumentNode().$element.css( 'opacity', 0.5 );

	this.getSurface().getDialogs().openWindow( 'wikitextswitchconfirm', { target: this } );
};

/**
 * Handle clicks on the resolve conflict button in the conflict dialog.
 *
 * @method
 */
ve.init.mw.ViewPageTarget.prototype.onSaveDialogResolveConflict = function () {
	// Get Wikitext from the DOM, and set up a submit call when it's done
	this.serialize(
		this.docToSave,
		this.submitWithSaveFields.bind( this, { wpSave: 1 } )
	);
};

/**
 * Get save form fields from the save dialog form.
 * @returns {Object} Form data for submission to the MediaWiki action=edit UI
 */
ve.init.mw.ViewPageTarget.prototype.getSaveFields = function () {
	var fields = {};
	this.$checkboxes
		.each( function () {
			var $this = $( this );
			// We can't just use $this.val() because .val() always returns the value attribute of
			// a checkbox even when it's unchecked
			if ( $this.prop( 'name' ) && ( $this.prop( 'type' ) !== 'checkbox' || $this.prop( 'checked' ) ) ) {
				fields[$this.prop( 'name' )] = $this.val();
			}
		} );
	ve.extendObject( fields, {
		wpSummary: this.saveDialog ? this.saveDialog.editSummaryInput.getValue() : this.initialEditSummary,
		wpCaptchaId: this.captcha && this.captcha.id,
		wpCaptchaWord: this.captcha && this.captcha.input.getValue()
	} );
	if ( this.recreating ) {
		fields.wpRecreate = true;
	}
	return fields;
};

/**
 * Invoke #submit with the data from #getSaveFields
 * @param {Object} fields Fields to add in addition to those from #getSaveFields
 * @param {string} wikitext Wikitext to submit
 * @returns {boolean} Whether submission was started
 */
ve.init.mw.ViewPageTarget.prototype.submitWithSaveFields = function ( fields, wikitext ) {
	return this.submit( wikitext, $.extend( this.getSaveFields(), fields ) );
};

/**
 * Get edit API options from the save dialog form.
 * @returns {Object} Save options for submission to the MediaWiki API
 */
ve.init.mw.ViewPageTarget.prototype.getSaveOptions = function () {
	var key, options = this.getSaveFields(),
		fieldMap = {
			wpSummary: 'summary',
			wpMinoredit: 'minor',
			wpWatchthis: 'watch',
			wpCaptchaId: 'captchaid',
			wpCaptchaWord: 'captchaword'
		};

	for ( key in fieldMap ) {
		if ( options[key] !== undefined ) {
			options[fieldMap[key]] = options[key];
			delete options[key];
		}
	}

	return options;
};

/**
 * Switch to viewing mode.
 *
 * @return {jQuery.Promise} Promise resolved when surface is torn down
 */
ve.init.mw.ViewPageTarget.prototype.tearDownSurface = function () {
	var target = this,
		promises = [];

	// Update UI
	promises.push( this.tearDownToolbar(), this.tearDownDebugBar() );
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
 * Edit tab is bound outside the module in mw.ViewPageTarget.init.
 *
 * @method
 */
ve.init.mw.ViewPageTarget.prototype.setupSkinTabs = function () {
	var target = this;
	if ( this.isViewPage ) {
		// Allow instant switching back to view mode, without refresh
		$( '#ca-view a, #ca-nstab-visualeditor a' )
			.click( this.onViewTabClick.bind( this ) );

		$( '#ca-viewsource, #ca-edit' ).click( function ( e ) {
			if ( !target.active || e.which !== 1 || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey ) {
				return;
			}

			if ( target.getSurface() && !target.deactivating ) {
				target.editSource();

				if ( target.getSurface().getModel().hasBeenModified() ) {
					e.preventDefault();
				}
			}
		} );
	}

	mw.hook( 've.skinTabSetupComplete' ).fire();
};

/**
 * Modify page content to make section edit links activate the editor.
 * Dummy replaced by init.js so that we can call it again from #onSave after
 * replacing the page contents with the new html.
 */
ve.init.mw.ViewPageTarget.prototype.setupSectionEditLinks = null;

/**
 * Add content and event bindings to toolbar save button.
 */
ve.init.mw.ViewPageTarget.prototype.setupToolbarSaveButton = function () {
	this.toolbarSaveButton = new OO.ui.ButtonWidget( {
		label: ve.msg( 'visualeditor-toolbar-savedialog' ),
		flags: [ 'progressive', 'primary' ],
		disabled: !this.restoring
	} );

	// NOTE (phuedx, 2014-08-20): This class is used by the firsteditve guided
	// tour to attach a guider to the "Save page" button.
	this.toolbarSaveButton.$element.addClass( 've-ui-toolbar-saveButton' );

	if ( ve.msg( 'accesskey-save' ) !== '-' && ve.msg( 'accesskey-save' ) !== '' ) {
		// FlaggedRevs tries to use this - it's useless on VE pages because all that stuff gets hidden, but it will still conflict so get rid of it
		this.elementsThatHadOurAccessKey = $( '[accesskey="' + ve.msg( 'accesskey-save' ) + '"]' ).removeAttr( 'accesskey' );
		this.toolbarSaveButton.$button.attr( 'accesskey', ve.msg( 'accesskey-save' ) );
	}

	this.updateToolbarSaveButtonState();

	this.toolbarSaveButton.connect( this, { click: 'onToolbarSaveButtonClick' } );
};

/**
 * Add the save button to the user interface.
 */
ve.init.mw.ViewPageTarget.prototype.attachToolbarSaveButton = function () {
	var $actionTools = $( '<div>' ),
		$pushButtons = $( '<div>' );

	this.actionsToolbar = new ve.ui.TargetToolbar( this );

	this.actionsToolbar.setup( [
		{ include: [ 'help', 'notices' ] },
		{
			type: 'list',
			icon: 'menu',
			title: ve.msg( 'visualeditor-pagemenu-tooltip' ),
			include: [ 'meta', 'settings', 'advancedSettings', 'categories', 'languages', 'editModeSource', 'findAndReplace' ]
		}
	], this.getSurface() );

	$actionTools
		.addClass( 've-init-mw-viewPageTarget-toolbar-utilities' )
		.append( this.actionsToolbar.$element );

	$pushButtons
		.addClass( 've-init-mw-viewPageTarget-toolbar-actions' )
		.append( this.toolbarSaveButton.$element );

	this.toolbar.$actions.append( $actionTools, $pushButtons );
	// Make the toolbar recalculate its sizes for narrow/wide switching.
	// This really should not be necessary.
	this.toolbar.narrowThreshold = this.toolbar.$group.width() + this.toolbar.$actions.width();
};

/**
 * Show the save dialog.
 *
 * @fires saveWorkflowBegin
 */
ve.init.mw.ViewPageTarget.prototype.showSaveDialog = function () {
	var target = this;
	this.emit( 'saveWorkflowBegin' );
	this.getSurface().getDialogs().getWindow( 'mwSave' ).done( function ( win ) {
		var currentWindow = target.getSurface().getContext().getInspectors().getCurrentWindow();
		target.origSelection = target.getSurface().getModel().getSelection();

		// Make sure any open inspectors are closed
		if ( currentWindow ) {
			currentWindow.close();
		}

		// Preload the serialization
		if ( !target.docToSave ) {
			target.docToSave = ve.dm.converter.getDomFromModel( target.getSurface().getModel().getDocument() );
		}
		target.prepareCacheKey( target.docToSave );

		if ( !target.saveDialog ) {
			target.saveDialog = win;

			// Connect to save dialog
			target.saveDialog.connect( target, {
				save: 'saveDocument',
				review: 'onSaveDialogReview',
				resolve: 'onSaveDialogResolveConflict',
				retry: 'onSaveRetry'
			} );
			// Setup edit summary and checkboxes
			target.saveDialog.setEditSummary( target.initialEditSummary );
			target.saveDialog.setupCheckboxes( target.$checkboxes );
		}

		target.getSurface().getDialogs().openWindow(
			target.saveDialog,
			{ dir: target.getSurface().getModel().getDocument().getLang() }
		).done( function ( opened ) {
			// Call onSaveDialogClose() when the save dialog starts closing
			opened.always( target.onSaveDialogClose.bind( target ) );
		} );
	} );
};

/**
 * Handle dialog close events.
 *
 * @fires saveWorkflowEnd
 */
ve.init.mw.ViewPageTarget.prototype.onSaveDialogClose = function () {
	var target = this;

	function clear() {
		target.docToSave = null;
		target.clearPreparedCacheKey();
	}

	// Clear the cached HTML and cache key once the document changes
	if ( this.getSurface() ) {
		this.getSurface().getModel().getDocument().once( 'transact', clear );
	} else {
		clear();
	}

	this.getSurface().getModel().setSelection( this.origSelection );
	this.emit( 'saveWorkflowEnd' );
};

/**
 * Remember the window's scroll position.
 */
ve.init.mw.ViewPageTarget.prototype.saveScrollPosition = function () {
	this.scrollTop = $( window ).scrollTop();
};

/**
 * Restore the window's scroll position.
 */
ve.init.mw.ViewPageTarget.prototype.restoreScrollPosition = function () {
	if ( this.scrollTop ) {
		$( window ).scrollTop( this.scrollTop );
		this.scrollTop = null;
	}
};

/**
 * Hide the toolbar.
 *
 * @return {jQuery.Promise} Promise which resolves when toolbar is hidden
 */
ve.init.mw.ViewPageTarget.prototype.tearDownToolbar = function () {
	var target = this,
		deferred = $.Deferred();
	this.toolbar.$element.css( 'height', this.toolbar.$bar.outerHeight() );
	setTimeout( function () {
		target.toolbar.$element.css( 'height', '0' );
		target.toolbar.$element.one( 'transitionend', function () {
			target.toolbar.destroy();
			target.toolbar = null;
			deferred.resolve();
		} );
	} );
	return deferred.promise();
};

/**
 * Hide the debug bar.
 *
 * @return {jQuery.Promise} Promise which resolves when debug bar is hidden
 */
ve.init.mw.ViewPageTarget.prototype.tearDownDebugBar = function () {
	var target = this;
	if ( this.debugBar ) {
		return this.debugBar.$element.slideUp( 'fast' ).promise().then( function () {
			target.debugBar.$element.remove();
			target.debugBar = null;
		} );
	}
	return $.Deferred().resolve().promise();
};

/**
 * Change the document title to state that we are now editing.
 */
ve.init.mw.ViewPageTarget.prototype.changeDocumentTitle = function () {
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
ve.init.mw.ViewPageTarget.prototype.restoreDocumentTitle = function () {
	document.title = this.originalDocumentTitle;
};

/**
 * Page modifications for switching to edit mode.
 */
ve.init.mw.ViewPageTarget.prototype.transformPage = function () {
	var uri;

	// Deselect current mode (e.g. "view" or "history"). In skins like monobook that don't have
	// separate tab sections for content actions and namespaces the below is a no-op.
	$( '#p-views' ).find( 'li.selected' ).removeClass( 'selected' );
	$( '#ca-ve-edit' ).addClass( 'selected' );

	mw.hook( 've.activate' ).fire();

	// Move all native content inside the target
	this.$element.append( this.$element.siblings() );

	// Push veaction=edit url in history (if not already. If we got here by a veaction=edit
	// permalink then it will be there already and the constructor called #activate)
	if ( !this.actFromPopState && history.pushState && this.currentUri.query.veaction !== 'edit' ) {
		// Set the current URL
		uri = this.currentUri;
		uri.query.veaction = 'edit';

		history.pushState( this.popState, document.title, uri );
	}
	this.actFromPopState = false;
};

/**
 * Page modifications for switching back to view mode.
 */
ve.init.mw.ViewPageTarget.prototype.restorePage = function () {
	var uri;

	// Skins like monobook don't have a tab for view mode and instead just have the namespace tab
	// selected. We didn't deselect the namespace tab, so we're ready after deselecting #ca-ve-edit.
	// In skins having #ca-view (like Vector), select that.
	$( '#ca-ve-edit' ).removeClass( 'selected' );
	$( '#ca-view' ).addClass( 'selected' );

	mw.hook( 've.deactivate' ).fire();

	// Push non-veaction=edit url in history
	if ( !this.actFromPopState && history.pushState ) {
		// Remove the veaction query parameter
		uri = this.currentUri;
		if ( 'veaction' in uri.query ) {
			delete uri.query.veaction;
		}
		if ( 'vesection' in uri.query ) {
			delete uri.query.vesection;
		}

		// If there are other query parameters, set the url to the current url (with veaction removed).
		// Otherwise use the canonical style view url (bug 42553).
		if ( ve.getObjectValues( uri.query ).length ) {
			history.pushState( this.popState, document.title, uri );
		} else {
			history.pushState( this.popState, document.title, this.viewUri );
		}
	}
	this.actFromPopState = false;
};

/**
 * @param {Event} e Native event object
 */
ve.init.mw.ViewPageTarget.prototype.onWindowPopState = function ( e ) {
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
 * @param {string} displayTitle What HTML to show as the page title
 * @param {Object} lastModified Object containing user-formatted date
    and time strings, or undefined if we made no change.
 * @param {string} contentSub What HTML to show as the content subtitle
 */
ve.init.mw.ViewPageTarget.prototype.replacePageContent = function (
	html, categoriesHtml, displayTitle, lastModified, contentSub
) {
	var $editableContent, $imgContent,
		$content = $( $.parseHTML( html ) );

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

	$imgContent = $( '#mw-imagepage-content' );
	if ( $imgContent.length ) {
		// On file pages, we only want to replace the (local) description.
		$editableContent = $imgContent;
	} else if ( $( '#mw-pages' ).length ) {
		// It would be nice if MW core did this for us...
		if ( !$( '#ve-cat-description' ).length ) {
			$( '#mw-content-text > :not(div:has(#mw-pages))' ).wrapAll(
				$( '<div>' )
					.attr( 'id', 've-cat-description' )
			);
		}
		$editableContent = $( '#ve-cat-description' );
	} else {
		$editableContent = $( '#mw-content-text' );
	}

	mw.hook( 'wikipage.content' ).fire( $editableContent.empty().append( $content ) );
	if ( displayTitle ) {
		$( '#content > #firstHeading > span:first' ).html( displayTitle );
	}
	$( '#catlinks' ).replaceWith( categoriesHtml );
	$( '#contentSub' ).html( contentSub );
};

/**
 * Get the numeric index of a section in the page.
 *
 * @method
 * @param {HTMLElement} heading Heading element of section
 */
ve.init.mw.ViewPageTarget.prototype.getEditSection = function ( heading ) {
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
ve.init.mw.ViewPageTarget.prototype.saveEditSection = function ( heading ) {
	this.section = this.getEditSection( heading );
};

/**
 * Add onunload and onbeforeunload handlesr.
 *
 * @method
 */
ve.init.mw.ViewPageTarget.prototype.setupUnloadHandlers = function () {
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
ve.init.mw.ViewPageTarget.prototype.tearDownUnloadHandlers = function () {
	// Restore whatever previous onbeforeunload hook existed
	window.onbeforeunload = this.onBeforeUnloadFallback;
	this.onBeforeUnloadFallback = null;
	window.removeEventListener( 'unload', this.onUnloadHandler );
};

/**
 * Show the beta dialog as needed
 */
ve.init.mw.ViewPageTarget.prototype.maybeShowWelcomeDialog = function () {
	var usePrefs, prefSaysShow, urlSaysHide, windowManager,
		target = this;

	this.welcomeDialogPromise = $.Deferred();

	if ( mw.config.get( 'wgVisualEditorConfig' ).showBetaWelcome ) {
		// Set up a temporary window manager
		windowManager = new OO.ui.WindowManager( {
			classes: [
			've-init-mw-viewPageTarget-windowManager',
			've-init-mw-viewPageTarget-windowManager-welcome'
		]
		} );
		$( 'body' ).append( windowManager.$element );
		this.welcomeDialog = new ve.ui.MWBetaWelcomeDialog();
		windowManager.addWindows( [ this.welcomeDialog ] );

		// Only use the preference value if the user is logged-in.
		// If the user is anonymous, we can't save the preference
		// after showing the dialog. And we don't intend to use this
		// preference to influence anonymous users (use the config
		// variable for that; besides the pref value would be stale if
		// the wiki uses static html caching).
		usePrefs = !mw.user.isAnon();
		prefSaysShow = usePrefs && !mw.user.options.get( 'visualeditor-hidebetawelcome' );
		urlSaysHide = 'vehidebetadialog' in this.currentUri.query;

		if (
			!urlSaysHide &&
			(
				prefSaysShow ||
				(
					!usePrefs &&
					localStorage.getItem( 've-beta-welcome-dialog' ) === null &&
					$.cookie( 've-beta-welcome-dialog' ) === null
				)
			)
		) {
			windowManager.openWindow( this.welcomeDialog )
				.then( function ( opened ) {
					return opened;
				} )
				.then( function ( closing ) {
					return closing;
				} )
				.then( function () {
					// Detach the temporary window manager
					windowManager.destroy();
					target.welcomeDialogPromise.resolve();
				} );
		} else {
			this.welcomeDialogPromise.resolve();
		}

		if ( prefSaysShow ) {
			new mw.Api().postWithToken( 'options', {
				action: 'options',
				change: 'visualeditor-hidebetawelcome=1'
			} );

		// No need to set a cookie every time for logged-in users that have already
		// set the hidebetawelcome=1 preference, but only if this isn't a one-off
		// view of the page via the hiding GET parameter.
		} else if ( !usePrefs && !urlSaysHide ) {
			try {
				localStorage.setItem( 've-beta-welcome-dialog', 1 );
			} catch ( e ) {
				$.cookie( 've-beta-welcome-dialog', 1, { path: '/', expires: 30 } );
			}
		}
	} else {
		this.welcomeDialogPromise.reject();
	}
};

/**
 * Show the meta dialog as needed on load.
 */
ve.init.mw.ViewPageTarget.prototype.maybeShowMetaDialog = function () {
	var target = this;

	this.welcomeDialogPromise
		.always( function () {
			// Pop out the notices when the welcome dialog is closed
			target.actionsToolbar.tools.notices.getPopup().toggle( true );
		} );

	if ( this.getSurface().getModel().metaList.getItemsInGroup( 'mwRedirect' ).length ) {
		this.getSurface().getDialogs().openWindow( 'meta', {
			page: 'settings',
			fragment: this.getSurface().getModel().getFragment()
		} );
	}
};

/**
 * Handle before unload event.
 *
 * @method
 */
ve.init.mw.ViewPageTarget.prototype.onBeforeUnload = function () {
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
ve.init.mw.ViewPageTarget.prototype.onUnload = function () {
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
 */
ve.init.mw.ViewPageTarget.prototype.switchToWikitextEditor = function ( discardChanges ) {
	var target = this;
	if ( discardChanges ) {
		ve.track( 'mwedit.abort', { type: 'switchwithout', mechanism: 'navigate' } );
		this.submitting = true;
		location.href = this.viewUri.clone().extend( {
			action: 'edit',
			veswitched: 1
		} ).toString();
	} else {
		this.serialize(
			this.docToSave || ve.dm.converter.getDomFromModel( this.getSurface().getModel().getDocument() ),
			function ( wikitext ) {
				ve.track( 'mwedit.abort', { type: 'switchwith', mechanism: 'navigate' } );
				target.submitWithSaveFields( { wpDiff: 1, veswitched: 1 }, wikitext );
			}
		);
	}
};

/**
 * Resets the document opacity when we've decided to cancel switching to the wikitext editor.
 */
ve.init.mw.ViewPageTarget.prototype.resetDocumentOpacity = function () {
	this.getSurface().getView().getDocument().getDocumentNode().$element.css( 'opacity', 1 );
};
