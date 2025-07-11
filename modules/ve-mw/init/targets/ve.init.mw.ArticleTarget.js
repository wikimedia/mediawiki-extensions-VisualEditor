/*!
 * VisualEditor MediaWiki Initialization ArticleTarget class.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/* eslint-disable no-jquery/no-global-selector */

/**
 * Initialization MediaWiki article target.
 *
 * @class
 * @extends ve.init.mw.Target
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @param {Object} [config.toolbarConfig]
 * @param {boolean} [config.register=true]
 */
ve.init.mw.ArticleTarget = function VeInitMwArticleTarget( config = {} ) {
	config.toolbarConfig = ve.extendObject( {
		shadow: true,
		actions: true,
		floatable: true
	}, config.toolbarConfig );

	// Parent constructor
	ve.init.mw.ArticleTarget.super.call( this, config );

	// Register
	if ( config.register !== false ) {
		// ArticleTargets are never destroyed, but we can't trust ve.init.target to
		// not get overridden by other targets that may get created on the page.
		ve.init.articleTarget = this;
	}

	// Properties
	this.saveDialog = null;
	this.saveDeferred = null;
	this.saveFields = {};
	this.wasSaveable = null;
	this.docToSave = null;
	this.originalDmDocPromise = null;
	this.originalHtml = null;
	this.toolbarSaveButton = null;
	this.pageExists = mw.config.get( 'wgRelevantArticleId', 0 ) !== 0;
	const enableVisualSectionEditing = mw.config.get( 'wgVisualEditorConfig' ).enableVisualSectionEditing;
	this.enableVisualSectionEditing = enableVisualSectionEditing === true || enableVisualSectionEditing === this.constructor.static.trackingName;
	this.toolbarScrollOffset = mw.config.get( 'wgVisualEditorToolbarScrollOffset', 0 );
	this.currentUrl = new URL( location.href );
	this.section = null;
	this.visibleSection = null;
	this.visibleSectionOffset = null;
	this.sectionTitle = null;
	this.editSummaryValue = null;
	this.initialEditSummary = null;
	this.initialCheckboxes = {};
	this.preSaveProcess = new OO.ui.Process();

	this.viewUrl = new URL( mw.util.getUrl( this.getPageName() ), location.href );
	this.isViewPage = (
		mw.config.get( 'wgAction' ) === 'view' &&
		!this.currentUrl.searchParams.has( 'diff' )
	);

	this.copyrightWarning = null;
	this.checkboxFields = null;
	this.checkboxesByName = null;
	this.$saveAccessKeyElements = null;

	this.$editableContent = this.getEditableContent();

	// Sometimes we actually don't want to send a useful oldid
	// if we do, PostEdit will give us a 'page restored' message
	// Use undefined instead of 0 for new documents (T262838)
	this.requestedRevId = mw.config.get( 'wgEditLatestRevision' ) ? mw.config.get( 'wgCurRevisionId' ) : mw.config.get( 'wgRevisionId' ) || undefined;
	this.currentRevisionId = mw.config.get( 'wgCurRevisionId' ) || undefined;
	this.revid = this.requestedRevId || this.currentRevisionId;

	this.edited = false;
	this.restoring = !!this.requestedRevId && this.requestedRevId !== this.currentRevisionId;
	this.pageDeletedWarning = false;
	this.events = {
		track: () => {},
		trackActivationStart: () => {},
		trackActivationComplete: () => {}
	};

	this.preparedCacheKeyPromise = null;
	this.clearState();

	// Initialization
	this.$element.addClass( 've-init-mw-articleTarget' );
};

/* Inheritance */

OO.inheritClass( ve.init.mw.ArticleTarget, ve.init.mw.Target );

/* Events */

/**
 * @event ve.init.mw.ArticleTarget#save
 * @param {Object} data Save data from the API, see ve.init.mw.ArticleTarget#saveComplete
 * Fired immediately after a save is successfully completed
 */

/**
 * @event ve.init.mw.ArticleTarget#savePreview
 */

/**
 * @event ve.init.mw.ArticleTarget#saveReview
 */

/**
 * @event ve.init.mw.ArticleTarget#saveInitiated
 */

/**
 * @event ve.init.mw.ArticleTarget#saveWorkflowBegin
 */

/**
 * @event ve.init.mw.ArticleTarget#showChanges
 */

/**
 * @event ve.init.mw.ArticleTarget#noChanges
 */

/**
 * @event ve.init.mw.ArticleTarget#saveError
 * @param {string} code Error code
 */

/**
 * @event ve.init.mw.ArticleTarget#loadError
 */

/**
 * @event ve.init.mw.ArticleTarget#showChangesError
 */

/**
 * @event ve.init.mw.ArticleTarget#serializeError
 */

/**
 * Fired when serialization is complete
 *
 * @event ve.init.mw.ArticleTarget#serializeComplete
 */

/* Static Properties */

/**
 * @inheritdoc
 */
ve.init.mw.ArticleTarget.static.name = 'article';

/**
 * @inheritdoc
 */
ve.init.mw.ArticleTarget.static.annotateImportedData = true;

/**
 * Tracking name of target class. Used by ArticleTargetEvents to identify which target we are tracking.
 *
 * @static
 * @property {string}
 * @inheritable
 */
ve.init.mw.ArticleTarget.static.trackingName = 'mwTarget';

/**
 * @inheritdoc
 */
ve.init.mw.ArticleTarget.static.integrationType = 'page';

/**
 * @inheritdoc
 */
ve.init.mw.ArticleTarget.static.platformType = 'other';

/**
 * @inheritdoc
 */
ve.init.mw.ArticleTarget.static.documentCommands = [
	...ve.init.mw.ArticleTarget.super.static.documentCommands,
	// Make help dialog triggerable from anywhere
	'commandHelp',
	// Make save commands triggerable from anywhere
	'showSave',
	'showChanges',
	'showPreview',
	'showMinoredit',
	'showWatchthis'
];

/* Static methods */

/**
 * @inheritdoc
 */
ve.init.mw.ArticleTarget.static.parseDocument = function ( documentString, mode, section, onlySection ) {
	// Add trailing linebreak to non-empty wikitext documents for consistency
	// with old editor and usability. Will be stripped on save. T156609
	if ( mode === 'source' && documentString ) {
		documentString += '\n';
	}

	// Parent method
	return ve.init.mw.ArticleTarget.super.static.parseDocument.call( this, documentString, mode, section, onlySection );
};

/**
 * Get the editable part of the page
 *
 * @return {jQuery} Editable DOM selection
 */
ve.init.mw.ArticleTarget.prototype.getEditableContent = function () {
	return $( '#mw-content-text' );
};

/**
 * Build DOM for the redirect page subtitle (#redirectsub).
 *
 * @return {jQuery}
 */
ve.init.mw.ArticleTarget.static.buildRedirectSub = function () {
	const $subMsg = mw.message( 'redirectpagesub' ).parseDom();
	// Page subtitle
	// Compare: Article::view()
	return $( '<span>' )
		.attr( 'id', 'redirectsub' )
		.append( $subMsg );
};

/**
 * Build DOM for the redirect page content header (.redirectMsg).
 *
 * @param {string} title Redirect target
 * @return {jQuery}
 */
ve.init.mw.ArticleTarget.static.buildRedirectMsg = function ( title ) {
	const $link = $( '<a>' )
		.attr( {
			href: mw.Title.newFromText( title ).getUrl(),
			title: mw.msg( 'visualeditor-redirect-description', title )
		} )
		.text( title );
	ve.init.platform.linkCache.styleElement( title, $link );

	// Page content header
	// Compare: LinkRenderer::makeRedirectHeader()
	return $( '<div>' )
		.addClass( 'redirectMsg' )
		// Hack: This is normally inside #mw-content-text, but we may insert it before, so we need this.
		// The following classes are used here:
		// * mw-content-ltr
		// * mw-content-rtl
		.addClass( 'mw-content-' + mw.config.get( 'wgVisualEditor' ).pageLanguageDir )
		.append(
			$( '<p>' ).text( mw.msg( 'redirectto' ) ),
			$( '<ul>' )
				.addClass( 'redirectText' )
				.append( $( '<li>' ).append( $link ) )
		);
};

/* Methods */

/**
 * @inheritdoc
 */
ve.init.mw.ArticleTarget.prototype.setDefaultMode = function () {
	const oldDefaultMode = this.defaultMode;
	// Parent method
	ve.init.mw.ArticleTarget.super.prototype.setDefaultMode.apply( this, arguments );

	if ( this.defaultMode !== oldDefaultMode ) {
		this.updateTabs();
		if ( mw.libs.ve.setEditorPreference ) {
			// only set up by DAT.init
			mw.libs.ve.setEditorPreference( this.defaultMode === 'visual' ? 'visualeditor' : 'wikitext' );
		}
	}
};

/**
 * Update state of editing tabs from this target
 */
ve.init.mw.ArticleTarget.prototype.updateTabs = function () {};

/**
 * Handle response to a successful load request.
 *
 * This method is called within the context of a target instance. If successful the DOM from the
 * server will be parsed, stored in {this.doc} and then {this.documentReady} will be called.
 *
 * @param {Object} response API response data
 * @param {string} status Text status message
 */
ve.init.mw.ArticleTarget.prototype.loadSuccess = function ( response ) {
	const data = response ? ( response.visualeditor || response.visualeditoredit ) : null;

	if ( !data || typeof data.content !== 'string' ) {
		this.loadFail( 've-api', { errors: [ {
			code: 've-api',
			html: mw.message( 'api-clientside-error-invalidresponse' ).parse()
		} ] } );
	} else if ( response.veMode && response.veMode !== this.getDefaultMode() ) {
		this.loadFail( 've-mode', { errors: [ {
			code: 've-mode',
			html: mw.message( 'visualeditor-loaderror-wrongmode',
				response.veMode, this.getDefaultMode() ).parse()
		} ] } );
	} else {
		this.track( 'trace.parseResponse.enter' );
		this.originalHtml = data.content;
		this.etag = data.etag;
		// We are reading from `preloaded` which comes from the VE API. If we want
		// to make the VE API non-blocking in the future we will need to handle
		// special-cases like this where the content doesn't come from RESTBase.
		this.fromEditedState = !!data.fromEditedState || !!data.preloaded;
		this.switched = data.switched;
		const mode = this.getDefaultMode();
		const section = ( mode === 'source' || this.enableVisualSectionEditing ) ? this.section : null;
		this.doc = this.constructor.static.parseDocument( this.originalHtml, mode, section );
		this.originalDmDocPromise = null;

		// Properties that don't come from the API
		this.initialSourceRange = data.initialSourceRange;
		this.recovered = data.recovered;
		this.isRedirect = false;

		// Parse data this not available in RESTBase
		if ( !this.parseMetadata( response ) ) {
			// Invalid metadata, loadFail() or load() has been called
			return;
		}

		this.track( 'trace.parseResponse.exit' );

		// Everything worked, the page was loaded, continue initializing the editor
		this.documentReady( this.doc );
	}

	if ( !this.isViewPage ) {
		$( '#firstHeading' ).text(
			mw.Title.newFromText( this.getPageName() ).getPrefixedText()
		);
	}
};

/**
 * Parse document metadata from the API response
 *
 * @param {Object} response API response data
 * @return {boolean} Whether metadata was loaded successfully. If true, you should call
 *   loadSuccess(). If false, either that loadFail() has been called or we're retrying via load().
 */
ve.init.mw.ArticleTarget.prototype.parseMetadata = function ( response ) {
	const data = response ? ( response.visualeditor || response.visualeditoredit ) : null;

	if ( !data ) {
		this.loadFail( 've-api', { errors: [ {
			code: 've-api',
			html: mw.message( 'api-clientside-error-invalidresponse' ).parse()
		} ] } );
		return false;
	}

	this.remoteNotices = ve.getObjectValues( data.notices );
	this.protectedClasses = data.protectedClasses;

	this.baseTimeStamp = data.basetimestamp;
	this.startTimeStamp = data.starttimestamp;
	this.revid = data.oldid || undefined;
	this.preloaded = !!data.preloaded;

	this.copyrightWarning = data.copyrightWarning;

	this.checkboxesDef = data.checkboxesDef;
	this.checkboxesMessages = data.checkboxesMessages;
	mw.messages.set( data.checkboxesMessages );

	this.canEdit = data.canEdit;
	this.wouldautocreate = data.wouldautocreate;

	// When docRevId is `undefined` it indicates that the page doesn't exist
	let docRevId;
	const aboutDoc = this.doc.documentElement && this.doc.documentElement.getAttribute( 'about' );
	if ( aboutDoc ) {
		const docRevIdMatches = aboutDoc.match( /revision\/([0-9]*)$/ );
		if ( docRevIdMatches.length >= 2 ) {
			docRevId = parseInt( docRevIdMatches[ 1 ] );
		}
	}
	// There is no docRevId in source mode (doc is just a string), new visual documents, or when
	// switching from source mode with changes.
	if ( this.getDefaultMode() === 'visual' && !( this.switched && this.fromEditedState ) && docRevId !== this.revid ) {
		if ( this.retriedRevIdConflict ) {
			// Retried already, just error the second time.
			this.loadFail( 've-api', { errors: [ {
				code: 've-api',
				html: mw.message( 'visualeditor-loaderror-revidconflict',
					String( docRevId ), String( this.revid ) ).parse()
			} ] } );
		} else {
			this.retriedRevIdConflict = true;
			// TODO this retries both requests, in RESTbase mode we should only retry
			// the request that gave us the lower revid
			this.loading = null;
			// HACK: Load with explicit revid to hopefully prevent this from happening again
			this.requestedRevId = Math.max( docRevId || 0, this.revid );
			this.load();
		}
		return false;
	} else {
		// Set this to false after a successful load, so we don't immediately give up
		// if a subsequent load mismatches again
		this.retriedRevIdConflict = false;
	}

	// Save dialog doesn't exist yet, so create an overlay for the widgets, and
	// append it to the save dialog later.
	this.$saveDialogOverlay = $( '<div>' ).addClass( 'oo-ui-window-overlay' );
	const checkboxes = mw.libs.ve.targetLoader.createCheckboxFields( this.checkboxesDef, { $overlay: this.$saveDialogOverlay } );
	this.checkboxFields = checkboxes.checkboxFields;
	this.checkboxesByName = checkboxes.checkboxesByName;

	this.checkboxFields.forEach( ( field ) => {
		// TODO: This method should be upstreamed or moved so that targetLoader
		// can use it safely.
		ve.targetLinksToNewWindow( field.$label[ 0 ] );
	} );

	return true;
};

/**
 * @inheritdoc
 */
ve.init.mw.ArticleTarget.prototype.documentReady = function () {
	// We need to wait until documentReady as local notices may require special messages
	this.editNotices = this.remoteNotices.concat(
		this.localNoticeMessages.map( ( msgKey ) => '<p>' + ve.init.platform.getParsedMessage( msgKey ) + '</p>' )
	);

	this.loading = null;
	this.edited = this.fromEditedState;

	// Parent method
	ve.init.mw.ArticleTarget.super.prototype.documentReady.apply( this, arguments );
};

/**
 * @inheritdoc
 */
ve.init.mw.ArticleTarget.prototype.surfaceReady = function () {
	const accessKeyPrefix = $.fn.updateTooltipAccessKeys.getAccessKeyPrefix().replace( /-/g, '+' ),
		accessKeyModifiers = new ve.ui.Trigger( accessKeyPrefix + '-' ).modifiers,
		surfaceModel = this.getSurface().getModel();

	// loadSuccess() may have called setAssumeExistence( true );
	ve.init.platform.linkCache.setAssumeExistence( false );
	surfaceModel.connect( this, {
		history: 'updateToolbarSaveButtonState'
	} );

	// Handle cancel events, i.e. pressing <escape>
	this.getSurface().connect( this, {
		cancel: 'onSurfaceCancel'
	} );

	// Iterate over the trigger registry and resolve any access key conflicts
	for ( const name in ve.ui.triggerRegistry.registry ) {
		const triggers = ve.ui.triggerRegistry.registry[ name ];
		for ( let i = 0; i < triggers.length; i++ ) {
			if ( ve.compare( triggers[ i ].modifiers, accessKeyModifiers ) ) {
				this.disableAccessKey( triggers[ i ].primary );
			}
		}
	}

	if ( !mw.config.get( 'wgVisualEditorConfig' ).enableHelpCompletion ) {
		this.getSurface().commandRegistry.unregister( 'openHelpCompletions' );
		this.getSurface().commandRegistry.unregister( 'openHelpCompletionsTrigger' );
	}

	if ( !this.canEdit ) {
		this.getSurface().setReadOnly( true );
	} else {
		// TODO: If the user rejects joining the collab session, start auto-save
		if ( !this.currentUrl.searchParams.has( 'collabSession' ) ) {
			// Auto-save
			this.initAutosave();
		}

		setTimeout( () => {
			mw.libs.ve.targetSaver.preloadDeflate();
		}, 500 );
	}

	// Parent method
	ve.init.mw.ArticleTarget.super.prototype.surfaceReady.apply( this, arguments );

	mw.hook( 've.activationComplete' ).fire();
};

/**
 * Handle surface cancel events
 */
ve.init.mw.ArticleTarget.prototype.onSurfaceCancel = function () {
	this.tryTeardown( false, 'navigate-read' );
};

/**
 * Runs after the surface has been made ready and visible
 *
 * Implementing sub-classes must call this method.
 */
ve.init.mw.ArticleTarget.prototype.afterSurfaceReady = function () {
	this.restoreEditSection();
};

/**
 * @inheritdoc
 */
ve.init.mw.ArticleTarget.prototype.storeDocState = function ( html ) {
	const mode = this.getSurface().getMode();
	this.getSurface().getModel().storeDocState( {
		request: {
			pageName: this.getPageName(),
			mode: mode,
			// Check true section editing is in use
			section: ( mode === 'source' || this.enableVisualSectionEditing ) ? this.section : null
		},
		response: {
			// --------------------------------------------------------------------------------
			// This should match the API result in ApiVisualEditor.php and ArticleTarget#getWikitextDataPromiseForDoc
			// --------------------------------------------------------------------------------
			basetimestamp: this.baseTimeStamp,
			// `blockinfo` is not used by this client
			canEdit: this.canEdit,
			checkboxesDef: this.checkboxesDef,
			checkboxesMessages: this.checkboxesMessages,
			// `content` is not needed here, we store `html` instead
			copyrightWarning: this.copyrightWarning,
			etag: this.etag,
			fromEditedState: this.fromEditedState, // extra
			notices: this.remoteNotices,
			oldid: this.revid,
			preloaded: this.preloaded,
			protectedClasses: this.protectedClasses,
			// `result` is not used
			starttimestamp: this.startTimeStamp,
			switched: this.switched,
			wouldautocreate: this.wouldautocreate
		}
	}, html );
};

/**
 * Disable an access key by removing the attribute from any element containing it
 *
 * @param {string} key Access key
 */
ve.init.mw.ArticleTarget.prototype.disableAccessKey = function ( key ) {
	$( '[accesskey=' + key + ']' ).each( ( i, el ) => {
		const $el = $( el );

		$el
			.attr( 'data-old-accesskey', $el.attr( 'accesskey' ) )
			.removeAttr( 'accesskey' );
	} );
};

/**
 * Re-enable all access keys
 */
ve.init.mw.ArticleTarget.prototype.restoreAccessKeys = function () {
	$( '[data-old-accesskey]' ).each( ( i, el ) => {
		const $el = $( el );

		$el
			.attr( 'accesskey', $el.attr( 'data-old-accesskey' ) )
			.removeAttr( 'data-old-accesskey' );
	} );
};

/**
 * Handle an unsuccessful load request.
 *
 * This method is called within the context of a target instance.
 *
 * @param {string} code Error code from mw.Api
 * @param {Object} errorDetails API response
 * @fires ve.init.mw.ArticleTarget#loadError
 */
ve.init.mw.ArticleTarget.prototype.loadFail = function () {
	this.loading = null;
	this.emit( 'loadError' );
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
 * @param {Array} sections Section data to display in the TOC
 */
ve.init.mw.ArticleTarget.prototype.replacePageContent = function (
	html, categoriesHtml, displayTitle, lastModified, contentSub, sections
) {
	// eslint-disable-next-line no-jquery/no-append-html
	this.$editableContent.find( '.mw-parser-output' ).first().replaceWith( html );
	mw.hook( 'wikipage.content' ).fire( this.$editableContent );

	if ( displayTitle ) {
		// eslint-disable-next-line no-jquery/no-html
		$( '#firstHeading' ).html( displayTitle );
	}

	// Categories are only shown in AMC on mobile
	if ( $( '#catlinks' ).length ) {
		const $categories = $( $.parseHTML( categoriesHtml ) );
		mw.hook( 'wikipage.categories' ).fire( $categories );
		$( '#catlinks' ).replaceWith( $categories );
	}

	mw.util.clearSubtitle();
	mw.util.addSubtitle( contentSub );

	this.setRealRedirectInterface();

	mw.hook( 'wikipage.tableOfContents' ).fire( sections );
};

/**
 * Handle successful DOM save event.
 *
 * @param {Object} data Save data from the API
 * @param {boolean} data.nocontent Indicates that page HTML and related properties were omitted
 * @param {string} data.content Rendered page HTML from server
 * @param {string} data.categorieshtml Rendered categories HTML from server
 * @param {number} data.newrevid New revision id, undefined if unchanged
 * @param {boolean} data.isRedirect Whether this page is a redirect or not
 * @param {string} data.displayTitleHtml What HTML to show as the page title
 * @param {Object} data.lastModified Object containing user-formatted date
 *  and time strings, or undefined if we made no change.
 * @param {string} data.contentSub HTML to show as the content subtitle
 * @param {Array} data.modules The modules to be loaded on the page
 * @param {Object} data.jsconfigvars The mw.config values needed on the page
 * @param {Array} data.sections Section data to display in the TOC
 * @param {boolean} data.tempusercreated True if we just became logged in as a temporary user
 * @param {string} data.tempusercreatedredirect URL to visit to finish creating temp account
 * @fires ve.init.mw.ArticleTarget#save
 */
ve.init.mw.ArticleTarget.prototype.saveComplete = function ( data ) {
	this.editSummaryValue = null;
	this.initialEditSummary = null;

	this.saveDeferred.resolve();
	this.emit( 'save', data );

	// This is a page creation, a restoration, or we loaded the editor from a non-view page,
	// or we just became logged in as a temporary user: refresh the page.
	if ( data.nocontent || data.tempusercreated ) {
		// Teardown the target, ensuring auto-save data is cleared
		this.teardown().then( () => {
			if ( data.newrevid !== undefined ) {
				let action;
				if ( this.restoring ) {
					action = 'restored';
				} else if ( !this.pageExists ) {
					action = 'created';
				} else {
					action = 'saved';
				}
				require( 'mediawiki.action.view.postEdit' ).fireHookOnPageReload( action, data.tempusercreated );
			}

			if ( data.tempusercreatedredirect ) {
				location.href = data.tempusercreatedredirect;
			} else {
				const newUrl = new URL( this.viewUrl );
				if ( data.newrevid !== undefined ) {
					// For GrowthExperiments
					newUrl.searchParams.set( 'venotify', 'saved' );
				}
				if ( data.isRedirect ) {
					newUrl.searchParams.set( 'redirect', 'no' );
				}
				location.href = newUrl;
			}
		} );
	} else {
		// Update watch link to match 'watch checkbox' in save dialog.
		// User logged in if module loaded.
		if ( mw.loader.getState( 'mediawiki.page.watch.ajax' ) === 'ready' ) {
			const watch = require( 'mediawiki.page.watch.ajax' );

			watch.updatePageWatchStatus(
				data.watched,
				data.watchlistexpiry
			);
		}

		// If we were explicitly editing an older version, make sure we won't
		// load the same old version again, now that we've saved the next edit
		// will be against the latest version.
		// If there is an ?oldid= parameter in the URL, this will cause restorePage() to remove it.
		this.restoring = false;

		// Clear requestedRevId in case it was set by a retry or something; after saving
		// we don't want to go back into oldid mode anyway
		this.requestedRevId = undefined;

		if ( data.newrevid !== undefined ) {
			mw.config.set( {
				wgCurRevisionId: data.newrevid,
				wgRevisionId: data.newrevid
			} );
			this.revid = data.newrevid;
			this.currentRevisionId = data.newrevid;
		}

		// Update module JS config values and notify ResourceLoader of any new
		// modules needed to be added to the page
		mw.config.set( data.jsconfigvars );
		mw.loader.load( data.modules );

		mw.config.set( {
			wgIsRedirect: !!data.isRedirect
		} );

		if ( this.saveDialog ) {
			this.saveDialog.reset();
		}

		this.replacePageContent(
			data.content,
			data.categorieshtml,
			data.displayTitleHtml,
			data.lastModified,
			data.contentSub,
			data.sections
		);

		// Tear down the target now that we're done saving
		// Not passing trackMechanism because this isn't an abort action
		this.tryTeardown( true );
	}
};

/**
 * Handle an unsuccessful save request.
 *
 * @param {HTMLDocument} doc HTML document we tried to save
 * @param {Object} saveData Options that were used
 * @param {string} code Error code
 * @param {Object|null} data Full API response data, or XHR error details
 * @fires ve.init.mw.ArticleTarget#saveError
 */
ve.init.mw.ArticleTarget.prototype.saveFail = function ( doc, saveData, code, data ) {
	this.pageDeletedWarning = false;

	let handled = false;
	// Handle empty response
	if ( !data ) {
		this.showSaveError( this.extractErrorMessages( null ) );
		handled = true;
	}

	if ( !handled && data.errors ) {
		for ( let i = 0; i < data.errors.length; i++ ) {
			const error = data.errors[ i ];

			if ( error.code === 'assertanonfailed' || error.code === 'assertuserfailed' || error.code === 'assertnameduserfailed' ) {
				this.refreshUser().then( ( username ) => {
					// Reattempt the save after successfully refreshing the
					// user, but only if it's a temporary account (T345975)
					if ( error.code === 'assertanonfailed' && mw.util.isTemporaryUser( username ) ) {
						this.startSave( this.getSaveOptions() );
					} else {
						this.saveErrorNewUser( username );
					}
				}, () => {
					this.showSaveError( this.extractErrorMessages( data ) );
				} );
				handled = true;
			} else if ( error.code === 'editconflict' ) {
				this.editConflict();
				handled = true;
			} else if ( error.code === 'pagedeleted' ) {
				this.pageDeletedWarning = true;
				// The API error message 'apierror-pagedeleted' is poor, make our own
				this.showSaveError( mw.msg( 'visualeditor-recreate', mw.msg( 'ooui-dialog-process-continue' ) ), true );
				handled = true;
			} else if ( error.code === 'hookaborted' ) {
				this.saveErrorHookAborted( data );
				handled = true;
			} else if ( error.code === 'readonly' ) {
				this.showSaveError( this.extractErrorMessages( data ), true );
				handled = true;
			}
		}
	}

	if ( !handled ) {
		const saveErrorHandlerFactory = ve.init.mw.saveErrorHandlerFactory;
		for ( const name in saveErrorHandlerFactory.registry ) {
			const handler = saveErrorHandlerFactory.lookup( name );
			if ( handler.static.matchFunction( data ) ) {
				handler.static.process( data, this );
				handled = true;
			}
		}
	}

	// Handle (other) unknown and/or unrecoverable errors
	if ( !handled ) {
		this.showSaveError( this.extractErrorMessages( data ) );
		handled = true;
	}

	let errorCodes;
	if ( data.errors ) {
		errorCodes = OO.unique( data.errors.map( ( err ) => err.code ) ).join( ',' );
	} else if ( ve.getProp( data, 'visualeditoredit', 'edit', 'captcha' ) ) {
		// Eww
		errorCodes = 'captcha';
	} else {
		errorCodes = 'http-' + ( ( data.xhr && data.xhr.status ) || 0 );
	}
	this.emit( 'saveError', errorCodes );
};

/**
 * Show a save process error message
 *
 * @param {string|jQuery|Node[]} msg Message content (string of HTML, jQuery object or array of
 *  Node objects)
 * @param {boolean} [warning=false] Whether or not this is a warning.
 */
ve.init.mw.ArticleTarget.prototype.showSaveError = function ( msg, warning ) {
	this.saveDeferred.reject( [ new OO.ui.Error( msg, { warning: warning } ) ] );
};

/**
 * Extract the error messages from an erroneous API response
 *
 * @param {Object} data API response data
 * @return {jQuery}
 */
ve.init.mw.ArticleTarget.prototype.extractErrorMessages = function ( data ) {
	const $errorMsgs = ( new mw.Api() ).getErrorMessage( data );
	// Warning, this assumes there are only Element nodes in the jQuery set
	$errorMsgs.toArray().forEach( ve.targetLinksToNewWindow );
	return $errorMsgs;
};

/**
 * Handle hook abort save error. Intended to be overridden by extensions implementing the
 * VisualEditorApiVisualEditorEditPreSave hook.
 *
 * @param {Object} data API response data
 */
ve.init.mw.ArticleTarget.prototype.saveErrorHookAborted = function ( data ) {
	this.showSaveError( this.extractErrorMessages( data ) );
};

/**
 * Handle assert error indicating another user is logged in.
 *
 * @param {string|null} username Name of newly logged-in user, or a temporary account name,
 *   or null if logged-out and temporary accounts are disabled
 */
ve.init.mw.ArticleTarget.prototype.saveErrorNewUser = function ( username ) {
	const $msg = mw.message(
		username === null ?
			'visualeditor-savedialog-identify-anon' :
			mw.util.isTemporaryUser( username ) ?
				'visualeditor-savedialog-identify-temp' :
				'visualeditor-savedialog-identify-user',
		username
	).parseDom();

	this.showSaveError( $msg, true );
};

/**
 * Handle an edit conflict
 */
ve.init.mw.ArticleTarget.prototype.editConflict = function () {
	this.saveDialog.popPending();
	this.saveDialog.swapPanel( 'conflict' );
};

/**
 * Handle clicks on the review button in the save dialog.
 *
 * @fires ve.init.mw.ArticleTarget#saveReview
 */
ve.init.mw.ArticleTarget.prototype.onSaveDialogReview = function () {
	if ( !this.saveDialog.hasDiff ) {
		this.emit( 'saveReview' );
		this.saveDialog.pushPending();
		// Acquire a temporary user username before diffing, so that signatures and
		// user-related magic words display the temp user instead of IP user in the diff. (T331397)
		mw.user.acquireTempUserName().then( () => {
			if ( this.pageExists ) {
				// Has no callback, handled via this.showChangesDiff
				this.showChanges( this.getDocToSave() );
			} else {
				this.serialize( this.getDocToSave() ).then( ( data ) => {
					this.onSaveDialogReviewComplete( data.content );
				} );
			}
		} );
	} else {
		this.saveDialog.swapPanel( 'review' );
	}
};

/**
 * Handle clicks on the show preview button in the save dialog.
 *
 * @fires ve.init.mw.ArticleTarget#savePreview
 */
ve.init.mw.ArticleTarget.prototype.onSaveDialogPreview = function () {
	const api = this.getContentApi();

	if ( !this.saveDialog.$previewViewer.children().length ) {
		this.emit( 'savePreview' );
		this.saveDialog.pushPending();

		const params = {};

		const sectionTitle = this.sectionTitle && this.sectionTitle.getValue();
		if ( sectionTitle ) {
			params.section = 'new';
			params.sectiontitle = sectionTitle;
		}
		if ( mw.config.get( 'wgUserVariant' ) ) {
			params.variant = mw.config.get( 'wgUserVariant' );
		}

		// Acquire a temporary user username before previewing, so that signatures and
		// user-related magic words display the temp user instead of IP user in the preview. (T331397)
		mw.user.acquireTempUserName().then( () => api.post( ve.extendObject( params, {
			action: 'parse',
			title: this.getPageName(),
			text: this.getDocToSave(),
			pst: true,
			preview: true,
			sectionpreview: this.section !== null,
			disableeditsection: true,
			uselang: mw.config.get( 'wgUserLanguage' ),
			useskin: mw.config.get( 'skin' ),
			mobileformat: OO.ui.isMobile(),
			prop: [ 'text', 'categorieshtml', 'displaytitle', 'subtitle', 'modules', 'jsconfigvars' ]
		} ) ) ).then( ( response ) => {
			this.saveDialog.showPreview( response );
		}, ( errorCode, details ) => {
			this.saveDialog.showPreview( this.extractErrorMessages( details ) );
		} ).always( () => {
			this.bindSaveDialogClearDiff();
		} );
	} else {
		this.saveDialog.swapPanel( 'preview' );
	}
};

/**
 * Clear the save dialog's diff cache when the document changes
 */
ve.init.mw.ArticleTarget.prototype.bindSaveDialogClearDiff = function () {
	// Invalidate the viewer wikitext on next change
	this.getSurface().getModel().getDocument().once( 'transact',
		this.saveDialog.clearDiff.bind( this.saveDialog )
	);
	if ( this.sectionTitle ) {
		this.sectionTitle.once( 'change', this.saveDialog.clearDiff.bind( this.saveDialog ) );
	}
};

/**
 * Handle completed serialize request for diff views for new page creations.
 *
 * @param {string} wikitext
 */
ve.init.mw.ArticleTarget.prototype.onSaveDialogReviewComplete = function ( wikitext ) {
	this.bindSaveDialogClearDiff();
	this.saveDialog.setDiffAndReview(
		ve.createDeferred().resolve( $( '<pre>' ).text( wikitext ) ).promise(),
		this.getVisualDiffGeneratorPromise(),
		this.getSurface().getModel().getDocument().getHtmlDocument()
	);
};

/**
 * Get a visual diff object for the current document state
 *
 * @return {jQuery.Promise} Promise resolving with a generator for a ve.dm.VisualDiff visual diff
 */
ve.init.mw.ArticleTarget.prototype.getVisualDiffGeneratorPromise = function () {
	return mw.loader.using( 'ext.visualEditor.diffLoader' ).then( () => {
		const mode = this.getSurface().getMode();

		if ( !this.originalDmDocPromise ) {
			if ( mode === 'source' ) {
				// Always load full doc in source mode for correct reference diffing (T260008)
				this.originalDmDocPromise = mw.libs.ve.diffLoader.fetchRevision( this.revid, this.getPageName() );
			} else {
				if ( !this.fromEditedState ) {
					const dmDoc = this.constructor.static.createModelFromDom( this.doc, 'visual' );
					let dmDocOrNode;
					if ( this.section !== null && this.enableVisualSectionEditing ) {
						dmDocOrNode = dmDoc.getNodesByType( 'section' )[ 0 ];
					} else {
						dmDocOrNode = dmDoc;
					}
					this.originalDmDocPromise = ve.createDeferred().resolve( dmDocOrNode ).promise();
				} else {
					this.originalDmDocPromise = mw.libs.ve.diffLoader.fetchRevision( this.revid, this.getPageName(), this.section );
				}
			}
		}

		if ( mode === 'source' ) {
			// Acquire a temporary user username before diffing, so that signatures and
			// user-related magic words display the temp user instead of IP user in the diff. (T331397)
			const newRevPromise = mw.user.acquireTempUserName().then( () => this.getContentApi().post( {
				action: 'visualeditor',
				paction: 'parse',
				page: this.getPageName(),
				wikitext: this.getSurface().getDom(),
				section: this.section,
				stash: 0,
				pst: true
			} ) ).then(
				// Source mode always fetches the whole document, so set section=null to unwrap sections
				( response ) => mw.libs.ve.diffLoader.getModelFromResponse( response, null )
			);

			return mw.libs.ve.diffLoader.getVisualDiffGeneratorPromise( this.originalDmDocPromise, newRevPromise );
		} else {
			return this.originalDmDocPromise.then(
				( originalDmDoc ) => () => new ve.dm.VisualDiff( originalDmDoc, this.getSurface().getModel().getDocument().getAttachedRoot() )
			);
		}
	} );
};

/**
 * Handle clicks on the resolve conflict button in the conflict dialog.
 */
ve.init.mw.ArticleTarget.prototype.onSaveDialogResolveConflict = function () {
	const fields = { wpSave: 1 };

	if ( this.getSurface().getMode() === 'source' && this.section !== null ) {
		// TODO: This should happen in #getSaveFields, check if moving it there breaks anything
		fields.section = this.section;
	}
	// Get Wikitext from the DOM, and set up a submit call when it's done
	this.serialize( this.getDocToSave() ).then( ( data ) => {
		this.submitWithSaveFields( fields, data.content );
	} );
};

/**
 * Handle dialog retry events
 * So we can handle trying to save again after page deletion warnings
 */
ve.init.mw.ArticleTarget.prototype.onSaveDialogRetry = function () {
	if ( this.pageDeletedWarning ) {
		this.recreating = true;
		this.pageExists = false;
	}
};

/**
 * Load the editor.
 *
 * This method initiates an API request for the page data unless dataPromise is passed in,
 * in which case it waits for that promise instead.
 *
 * @param {jQuery.Promise} [dataPromise] Promise for pending request, if any
 * @return {jQuery.Promise} Data promise
 */
ve.init.mw.ArticleTarget.prototype.load = function ( dataPromise ) {
	if ( this.getDefaultMode() === 'visual' && this.section === 'new' ) {
		throw new Error( 'Adding new section is not supported in visual mode' );
	}
	// Prevent duplicate requests
	if ( this.loading ) {
		return this.loading;
	}
	this.events.trackActivationStart( mw.libs.ve.activationStart );
	mw.libs.ve.activationStart = null;

	const url = new URL( location.href );
	dataPromise = dataPromise || mw.libs.ve.targetLoader.requestPageData( this.getDefaultMode(), this.getPageName(), {
		sessionStore: true,
		section: this.section,
		oldId: this.requestedRevId,
		targetName: this.constructor.static.trackingName,
		editintro: url.searchParams.get( 'editintro' ),
		preload: url.searchParams.get( 'preload' ),
		preloadparams: mw.util.getArrayParam( 'preloadparams', url.searchParams )
	} );

	this.loading = dataPromise;
	dataPromise.then(
		this.loadSuccess.bind( this ),
		this.loadFail.bind( this )
	);

	return dataPromise;
};

/**
 * Clear the state of this target, preparing it to be reactivated later.
 */
ve.init.mw.ArticleTarget.prototype.clearState = function () {
	this.restoreAccessKeys();
	this.clearPreparedCacheKey();
	this.loading = null;
	this.saving = null;
	this.clearDiff();
	this.serializing = false;
	this.submitting = false;
	this.baseTimeStamp = null;
	this.startTimeStamp = null;
	this.checkboxes = null;
	this.initialSourceRange = null;
	this.doc = null;
	this.originalDmDocPromise = null;
	this.originalHtml = null;
	this.toolbarSaveButton = null;
	this.section = null;
	this.visibleSection = null;
	this.visibleSectionOffset = null;
	this.editNotices = [];
	this.remoteNotices = [];
	this.localNoticeMessages = [];
	this.recovered = false;
	this.teardownPromise = null;
};

/**
 * Get a document to save, cached until the surface is modified
 *
 * The default implementation returns an HTMLDocument, but other targets
 * may use a different document model (e.g. plain text for source mode).
 *
 * @return {Object} Document to save
 */
ve.init.mw.ArticleTarget.prototype.getDocToSave = function () {
	if ( !this.docToSave ) {
		this.docToSave = this.createDocToSave();
		// Cache clearing events
		const surface = this.getSurface();
		surface.getModel().getDocument().once( 'transact', this.clearDocToSave.bind( this ) );
		surface.once( 'destroy', this.clearDocToSave.bind( this ) );
	}
	return this.docToSave;
};

/**
 * Create a document to save
 *
 * @return {Object} Document to save
 */
ve.init.mw.ArticleTarget.prototype.createDocToSave = function () {
	return this.getSurface().getDom();
};

/**
 * Clear the document to save from the cache
 */
ve.init.mw.ArticleTarget.prototype.clearDocToSave = function () {
	this.docToSave = null;
	this.clearPreparedCacheKey();
};

/**
 * Serialize the current document and store the result in the serialization cache on the server.
 *
 * This function returns a promise that is resolved once serialization is complete, with the
 * cache key passed as the first parameter.
 *
 * If there's already a request pending for the same (reference-identical) HTMLDocument, this
 * function will not initiate a new request but will return the promise for the pending request.
 * If a request for the same document has already been completed, this function will keep returning
 * the same promise (which will already have been resolved) until clearPreparedCacheKey() is called.
 *
 * @param {HTMLDocument} doc Document to serialize
 */
ve.init.mw.ArticleTarget.prototype.prepareCacheKey = function ( doc ) {
	const start = ve.now();

	if ( this.getSurface().getMode() === 'source' ) {
		return;
	}

	if ( this.preparedCacheKeyPromise && this.preparedCacheKeyPromise.doc === doc ) {
		return;
	}
	this.clearPreparedCacheKey();

	let xhr;
	let aborted = false;
	this.preparedCacheKeyPromise = mw.libs.ve.targetSaver.deflateDoc( doc, this.doc )
		.then( ( deflatedHtml ) => {
			if ( aborted ) {
				return ve.createDeferred().reject();
			}
			xhr = this.getContentApi().postWithToken( 'csrf',
				{
					action: 'visualeditoredit',
					paction: 'serializeforcache',
					html: deflatedHtml,
					page: this.getPageName(),
					oldid: this.revid,
					etag: this.etag
				},
				{ contentType: 'multipart/form-data' }
			);
			return xhr.then(
				( response ) => {
					const trackData = { duration: ve.now() - start };
					if ( response.visualeditoredit && typeof response.visualeditoredit.cachekey === 'string' ) {
						this.events.track( 'performance.system.serializeforcache', trackData );
						return {
							cacheKey: response.visualeditoredit.cachekey,
							// Pass the HTML for retries.
							html: deflatedHtml
						};
					} else {
						this.events.track( 'performance.system.serializeforcache.nocachekey', trackData );
						return ve.createDeferred().reject();
					}
				},
				() => {
					this.events.track( 'performance.system.serializeforcache.fail', { duration: ve.now() - start } );
					return ve.createDeferred().reject();
				}
			);
		} )
		.promise( {
			abort: () => {
				if ( xhr ) {
					xhr.abort();
				}
				aborted = true;
			},
			doc: doc
		} );
};

/**
 * Get the prepared wikitext, if any. Same as prepareWikitext() but does not initiate a request
 * if one isn't already pending or finished. Instead, it returns a rejected promise in that case.
 *
 * @param {HTMLDocument} doc Document to serialize
 * @return {jQuery.Promise} Abortable promise, resolved with a plain object containing `cacheKey`,
 * and `html` for retries.
 */
ve.init.mw.ArticleTarget.prototype.getPreparedCacheKey = function ( doc ) {
	if ( this.preparedCacheKeyPromise && this.preparedCacheKeyPromise.doc === doc ) {
		return this.preparedCacheKeyPromise;
	}
	return ve.createDeferred().reject().promise();
};

/**
 * Clear the promise for the prepared wikitext cache key, and abort it if it's still in progress.
 */
ve.init.mw.ArticleTarget.prototype.clearPreparedCacheKey = function () {
	if ( this.preparedCacheKeyPromise ) {
		this.preparedCacheKeyPromise.abort();
		this.preparedCacheKeyPromise = null;
	}
};

/**
 * Try submitting an API request with a cache key for prepared wikitext, falling back to submitting
 * HTML directly if there is no cache key present or pending, or if the request for the cache key
 * fails, or if using the cache key fails with a badcachekey error.
 *
 * This function will use mw.Api#postWithToken to retry automatically when encountering a 'badtoken'
 * error.
 *
 * @param {HTMLDocument|string} doc Document to submit or string in source mode
 * @param {Object} extraData POST parameters to send. Do not include 'html', 'cachekey' or 'format'.
 * @param {string} [eventName] If set, log an event when the request completes successfully. The
 *  full event name used will be 'performance.system.{eventName}.withCacheKey' or .withoutCacheKey
 *  depending on whether or not a cache key was used.
 * @return {jQuery.Promise} Promise which resolves/rejects when saving is complete/fails
 */
ve.init.mw.ArticleTarget.prototype.tryWithPreparedCacheKey = function ( doc, extraData, eventName ) {
	if ( this.getSurface().getMode() === 'source' ) {
		const data = ve.copy( extraData );

		// TODO: This should happen in #getSaveOptions, check if moving it there breaks anything
		if ( this.section !== null ) {
			data.section = this.section;
		}
		if ( this.sectionTitle ) {
			data.sectiontitle = this.sectionTitle.getValue();
			data.summary = undefined;
		}

		return mw.libs.ve.targetSaver.postWikitext(
			doc,
			data,
			{ api: this.getContentApi() }
		);
	}

	// getPreparedCacheKey resolves with { cacheKey: ..., html: ... } or rejects.
	// After modification it never rejects, just resolves with { html: ... } instead
	const htmlOrCacheKeyPromise = this.getPreparedCacheKey( doc ).then(
		// Success, use promise as-is.
		null,
		// Fail, get deflatedHtml promise
		() => mw.libs.ve.targetSaver.deflateDoc( doc, this.doc ).then( ( html ) => ( { html: html } ) ) );

	return htmlOrCacheKeyPromise.then( ( htmlOrCacheKey ) => mw.libs.ve.targetSaver.postHtml(
		htmlOrCacheKey.html,
		htmlOrCacheKey.cacheKey,
		extraData,
		{
			onCacheKeyFail: this.clearPreparedCacheKey.bind( this ),
			api: this.getContentApi(),
			track: this.events.track.bind( this.events ),
			eventName: eventName,
			now: ve.now
		}
	) );
};

/**
 * Handle the save dialog's save event
 *
 * Validates the inputs then starts the save process
 *
 * @param {jQuery.Deferred} saveDeferred Deferred object to resolve/reject when the save
 *  succeeds/fails.
 * @fires ve.init.mw.ArticleTarget#saveInitiated
 */
ve.init.mw.ArticleTarget.prototype.onSaveDialogSave = function ( saveDeferred ) {
	if ( this.deactivating ) {
		return;
	}

	const saveOptions = this.getSaveOptions();

	if (
		+mw.user.options.get( 'forceeditsummary' ) &&
		( saveOptions.summary === '' || saveOptions.summary === this.initialEditSummary ) &&
		!this.saveDialog.messages.missingsummary
	) {
		this.saveDialog.showMessage(
			'missingsummary',
			new OO.ui.HtmlSnippet( ve.init.platform.getParsedMessage( 'missingsummary' ) )
		);
		this.saveDialog.popPending();
	} else {
		this.emit( 'saveInitiated' );
		this.startSave( saveOptions );
		this.saveDeferred = saveDeferred;
	}
};

/**
 * Start the save process
 *
 * @param {Object} saveOptions Save options
 */
ve.init.mw.ArticleTarget.prototype.startSave = function ( saveOptions ) {
	this.save( this.getDocToSave(), saveOptions );
};

/**
 * Get save form fields from the save dialog form.
 *
 * @return {Object} Form data for submission to the MediaWiki action=edit UI
 */
ve.init.mw.ArticleTarget.prototype.getSaveFields = function () {
	const fields = {};

	if ( this.section === 'new' ) {
		// MediaWiki action=edit UI doesn't have separate parameters for edit summary and new section
		// title. The edit summary parameter is supposed to contain the section title, and the real
		// summary is autogenerated.
		fields.wpSummary = this.sectionTitle ? this.sectionTitle.getValue() : '';
	} else {
		fields.wpSummary = this.saveDialog ?
			this.saveDialog.editSummaryInput.getValue() :
			( this.editSummaryValue || this.initialEditSummary );
	}

	let name;
	// Extra save fields added by extensions
	for ( name in this.saveFields ) {
		fields[ name ] = this.saveFields[ name ]();
	}

	if ( this.recreating ) {
		fields.wpRecreate = true;
	}

	for ( name in this.checkboxesByName ) {
		// DropdownInputWidget or CheckboxInputWidget
		if ( !this.checkboxesByName[ name ].isSelected || this.checkboxesByName[ name ].isSelected() ) {
			fields[ name ] = this.checkboxesByName[ name ].getValue();
		}
	}

	return fields;
};

/**
 * Invoke #submit with the data from #getSaveFields
 *
 * @param {Object} fields Fields to add in addition to those from #getSaveFields
 * @param {string} wikitext Wikitext to submit
 * @return {boolean} Whether submission was started
 */
ve.init.mw.ArticleTarget.prototype.submitWithSaveFields = function ( fields, wikitext ) {
	return this.submit( wikitext, ve.extendObject( this.getSaveFields(), fields ) );
};

/**
 * Get edit API options from the save dialog form.
 *
 * @return {Object} Save options for submission to the MediaWiki API
 */
ve.init.mw.ArticleTarget.prototype.getSaveOptions = function () {
	const options = this.getSaveFields(),
		fieldMap = {
			wpSummary: 'summary',
			wpMinoredit: 'minor',
			wpWatchthis: 'watchlist',
			wpWatchlistExpiry: 'watchlistexpiry',
			wpCaptchaId: 'captchaid',
			wpCaptchaWord: 'captchaword'
		};

	for ( const key in fieldMap ) {
		if ( options[ key ] !== undefined ) {
			options[ fieldMap[ key ] ] = options[ key ];
			delete options[ key ];
		}
	}

	options.watchlist = 'watchlist' in options ? 'watch' : 'unwatch';

	return options;
};

/**
 * Post DOM data to the Parsoid API.
 *
 * This method performs an asynchronous action and uses a callback function to handle the result.
 *
 *     this.save( dom, { summary: 'test', minor: true, watch: false } );
 *
 * @param {HTMLDocument} doc Document to save
 * @param {Object} options Saving options. All keys are passed through, including unrecognized ones.
 *  - {string} summary Edit summary
 *  - {boolean} minor Edit is a minor edit
 *  - {boolean} watch Watch the page
 * @return {jQuery.Promise} Save promise, see mw.libs.ve.targetSaver.postHtml
 */
ve.init.mw.ArticleTarget.prototype.save = function ( doc, options ) {
	// Prevent duplicate requests
	if ( this.saving ) {
		return this.saving;
	}

	const data = ve.extendObject( {}, options, {
		page: this.getPageName(),
		oldid: this.revid,
		basetimestamp: this.baseTimeStamp,
		starttimestamp: this.startTimeStamp,
		etag: this.etag,
		assert: mw.user.isAnon() ? 'anon' : 'user',
		assertuser: mw.user.getName() || undefined
	} );

	if ( !this.pageExists || this.restoring || !this.isViewPage ) {
		// This is a page creation, a restoration, or we loaded the editor from a non-view page.
		// We can't update the interface to reflect this new state, so we're going to reload the whole page.
		// Therefore we don't need the new revision's HTML content in the API response.
		data.nocontent = true;
	}

	if ( this.wouldautocreate ) {
		// This means that we might need to redirect to an opaque URL,
		// so we must set up query parameters we want ahead of time.
		// TODO: `this.isRedirect` is only set in visual mode, not in source mode
		data.returntoquery = this.isRedirect ? 'redirect=no' : '';
		data.returntoanchor = this.getSectionHashFromPage();
	}

	const config = mw.config.get( 'wgVisualEditorConfig' );

	const taglist = data.vetags ? data.vetags.split( ',' ) : [];

	if ( config.useChangeTagging ) {
		taglist.push(
			this.getSurface().getMode() === 'source' ? 'visualeditor-wikitext' : 'visualeditor'
		);
	}

	if (
		this.getSurface().getMode() === 'visual' &&
		mw.config.get( 'wgVisualEditorConfig' ).editCheckTagging
	) {
		const documentModel = this.getSurface().getModel().getDocument();
		// New content needing a reference
		if ( mw.editcheck.hasAddedContentNeedingReference( documentModel ) ) {
			taglist.push( 'editcheck-references' );
		}
		// New content, regardless of if it needs a reference
		if ( mw.editcheck.hasAddedContentNeedingReference( documentModel, true ) ) {
			taglist.push( 'editcheck-newcontent' );
		}
	}

	data.vetags = taglist.join( ',' );

	const promise = this.saving = this.tryWithPreparedCacheKey( doc, data, 'save' );
	promise.then(
		this.saveComplete.bind( this ),
		this.saveFail.bind( this, doc, data )
	).always( () => {
		this.saving = null;
	} );

	return promise;
};

/**
 * Show changes in the save dialog
 *
 * @param {Object} doc Document
 */
ve.init.mw.ArticleTarget.prototype.showChanges = function ( doc ) {
	// Invalidate the viewer diff on next change
	this.getSurface().getModel().getDocument().once( 'transact', () => {
		this.clearDiff();
	} );
	this.saveDialog.setDiffAndReview(
		this.getWikitextDiffPromise( doc ),
		this.getVisualDiffGeneratorPromise(),
		this.getSurface().getModel().getDocument().getHtmlDocument()
	);
};

/**
 * Clear all state associated with the diff
 */
ve.init.mw.ArticleTarget.prototype.clearDiff = function () {
	if ( this.saveDialog ) {
		this.saveDialog.clearDiff();
	}
	this.wikitextDiffPromise = null;
};

/**
 * Post DOM data to the Parsoid API to retrieve wikitext diff.
 *
 * @param {HTMLDocument} doc Document to compare against (via wikitext)
 * @return {jQuery.Promise} Promise which resolves with the wikitext diff, or rejects with an error
 * @fires ve.init.mw.ArticleTarget#showChanges
 * @fires ve.init.mw.ArticleTarget#showChangesError
 */
ve.init.mw.ArticleTarget.prototype.getWikitextDiffPromise = function ( doc ) {
	if ( !this.wikitextDiffPromise ) {
		this.wikitextDiffPromise = this.tryWithPreparedCacheKey( doc, {
			paction: 'diff',
			page: this.getPageName(),
			oldid: this.revid,
			etag: this.etag
		}, 'diff' ).then( ( data ) => {
			if ( !data.diff ) {
				this.emit( 'noChanges' );
			}
			return data.diff;
		} );
		this.wikitextDiffPromise.then(
			this.emit.bind( this, 'showChanges' ),
			this.emit.bind( this, 'showChangesError' )
		);
	}
	return this.wikitextDiffPromise;
};

/**
 * Post wikitext to MediaWiki.
 *
 * This method performs a synchronous action and will take the user to a new page when complete.
 *
 *     this.submit( wikitext, { wpSummary: 'test', wpMinorEdit: 1, wpSave: 1 } );
 *
 * @param {string} wikitext Wikitext to submit
 * @param {Object} fields Other form fields to add (e.g. wpSummary, wpWatchthis, etc.). To actually
 *  save the wikitext, add { wpSave: 1 }. To go to the diff view, add { wpDiff: 1 }.
 * @return {boolean} Submitting has been started
 */
ve.init.mw.ArticleTarget.prototype.submit = function ( wikitext, fields ) {
	// Prevent duplicate requests
	if ( this.submitting ) {
		return false;
	}
	// Clear autosave now that we don't expect to need it again.
	// FIXME: This isn't transactional, so if the save fails we're left with no recourse.
	this.clearDocState();
	// Save DOM
	this.submitting = true;
	const $form = $( '<form>' ).attr( { method: 'post', enctype: 'multipart/form-data' } ).addClass( 'oo-ui-element-hidden' );
	const params = ve.extendObject( {
		format: 'text/x-wiki',
		model: 'wikitext',
		oldid: this.requestedRevId,
		wpStarttime: this.startTimeStamp,
		wpEdittime: this.baseTimeStamp,
		wpTextbox1: wikitext,
		wpEditToken: mw.user.tokens.get( 'csrfToken' ),
		// MediaWiki function-verification parameters, mostly relevant to the
		// classic editpage, but still required here:
		wpUnicodeCheck: 'ℳ𝒲♥𝓊𝓃𝒾𝒸ℴ𝒹ℯ',
		wpUltimateParam: true
	}, fields );
	// Add params as hidden fields
	for ( const key in params ) {
		$form.append( $( '<input>' ).attr( { type: 'hidden', name: key, value: params[ key ] } ) );
	}
	// Submit the form, mimicking a traditional edit
	// Firefox requires the form to be attached
	const submitUrl = mw.util.getUrl( this.getPageName(), {
		action: 'submit',
		veswitched: '1'
	} );
	$form.attr( 'action', submitUrl ).appendTo( 'body' ).trigger( 'submit' );
	return true;
};

/**
 * Get Wikitext data from the Parsoid API.
 *
 * This method performs an asynchronous action and uses a callback function to handle the result.
 *
 *     this.serialize( doc ).then( ( data ) => {
 *         // Do something with data.content (wikitext)
 *     } );
 *
 * @param {HTMLDocument} doc Document to serialize
 * @param {Function} [callback] Optional callback to run after.
 *  Deprecated in favor of using the returned promise.
 * @return {jQuery.Promise} Serialize promise, see mw.libs.ve.targetSaver.postHtml
 */
ve.init.mw.ArticleTarget.prototype.serialize = function ( doc, callback ) {
	// Prevent duplicate requests
	if ( this.serializing ) {
		return this.serializing;
	}
	const promise = this.serializing = this.tryWithPreparedCacheKey( doc, {
		paction: 'serialize',
		page: this.getPageName(),
		oldid: this.revid,
		etag: this.etag
	}, 'serialize' );
	promise.then(
		this.emit.bind( this, 'serializeComplete' ),
		this.emit.bind( this, 'serializeError' )
	).always( () => {
		this.serializing = null;
	} );

	if ( callback ) {
		OO.ui.warnDeprecation( 'Passing a callback to ve.init.mw.ArticleTarget#serialize is deprecated. Use the returned promise instead.' );
		promise.then( ( data ) => {
			callback.call( this, data.content );
		} );
	}

	return promise;
};

/**
 * Get list of edit notices.
 *
 * @return {Array} List of edit notices
 */
ve.init.mw.ArticleTarget.prototype.getEditNotices = function () {
	return this.editNotices;
};

// FIXME: split out view specific functionality, emit to subclass

/**
 * @inheritdoc
 */
ve.init.mw.ArticleTarget.prototype.track = function ( name ) {
	const mode = this.surface ? this.surface.getMode() : this.getDefaultMode();
	ve.track( name, { mode: mode } );
};

/**
 * @inheritdoc
 */
ve.init.mw.ArticleTarget.prototype.createSurface = function ( dmDoc, config = {} ) {
	const sections = dmDoc.getNodesByType( 'section' );
	let attachedRoot;
	if ( sections.length && sections.length === 1 ) {
		attachedRoot = sections[ 0 ];
		if ( !attachedRoot.isSurfaceable() ) {
			throw new Error( 'Not a surfaceable node' );
		}
	}

	// Parent method
	const surface = ve.init.mw.ArticleTarget.super.prototype.createSurface.call(
		this,
		dmDoc,
		ve.extendObject( { attachedRoot: attachedRoot }, config )
	);

	return surface;
};

/**
 * @inheritdoc
 */
ve.init.mw.ArticleTarget.prototype.getSurfaceClasses = function () {
	const classes = ve.init.mw.ArticleTarget.super.prototype.getSurfaceClasses.call( this );
	return [ ...classes, 'mw-body-content' ];
};

/**
 * @inheritdoc
 */
ve.init.mw.ArticleTarget.prototype.getSurfaceConfig = function ( config ) {
	return ve.init.mw.ArticleTarget.super.prototype.getSurfaceConfig.call( this, ve.extendObject( {
		// Don't null selection on blur when editing a document.
		// Do use it in new section mode as there are multiple inputs
		// on the surface (header+content).
		nullSelectionOnBlur: this.section === 'new',
		classes: this.getSurfaceClasses()
			// The following classes are used here:
			// * mw-textarea-proteced
			// * mw-textarea-cproteced
			// * mw-textarea-sproteced
			.concat( this.protectedClasses )
			// addClass doesn't like empty strings
			.filter( ( c ) => c )
	}, config ) );
};

/**
 * @inheritdoc
 */
ve.init.mw.ArticleTarget.prototype.teardown = function () {
	if ( !this.teardownPromise ) {
		const surface = this.getSurface();

		// Restore access keys
		if ( this.$saveAccessKeyElements ) {
			this.$saveAccessKeyElements.attr( 'accesskey', ve.msg( 'accesskey-save' ) );
			this.$saveAccessKeyElements = null;
		}
		if ( surface ) {
			// Disconnect history listener
			surface.getModel().disconnect( this );
		}

		let saveDialogPromise = ve.createDeferred().resolve().promise();
		if ( this.saveDialog ) {
			if ( this.saveDialog.isOpened() ) {
				// If the save dialog is still open (from saving) close it
				saveDialogPromise = this.saveDialog.close().closed;
			}
			// Release the reference
			this.saveDialog = null;
		}

		// Parent method
		this.teardownPromise = ve.init.mw.ArticleTarget.super.prototype.teardown.call( this ).then( () => saveDialogPromise.then( () => {
			mw.hook( 've.deactivationComplete' ).fire( this.edited );
		} ) );
	}
	return this.teardownPromise;
};

/**
 * Try to tear down the target, but leave ready for re-activation later
 *
 * Will first prompt the user if required, then call #teardown.
 *
 * @param {boolean} [noPrompt] Do not display a prompt to the user
 * @param {string} [trackMechanism] Abort mechanism; used for event tracking if present
 * @return {jQuery.Promise} Promise which resolves when the target has been torn down, rejects if the target won't be torn down
 */
ve.init.mw.ArticleTarget.prototype.tryTeardown = function ( noPrompt, trackMechanism ) {
	if ( !noPrompt && this.edited && mw.user.options.get( 'useeditwarning' ) ) {
		return this.getSurface().dialogs.openWindow( 'abandonedit' )
			.closed.then( ( data ) => {
				if ( data && data.action === 'discard' ) {
					return this.teardown( trackMechanism );
				}
				return ve.createDeferred().reject().promise();
			} );
	} else {
		return this.teardown( trackMechanism );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.ArticleTarget.prototype.setupToolbar = function () {
	// Parent method
	ve.init.mw.ArticleTarget.super.prototype.setupToolbar.apply( this, arguments );

	this.setupToolbarSaveButton();
	this.updateToolbarSaveButtonState();

	if ( this.saveDialog ) {
		this.editSummaryValue = this.saveDialog.editSummaryInput.getValue();
		this.saveDialog.disconnect( this );
		this.saveDialog = null;
	}
};

/**
 * Getting the message for the toolbar / save dialog save / publish button
 *
 * @param {boolean} [startProcess] Use version of the label for starting that process, i.e. with an ellipsis after it
 * @param {boolean} [forceShort] Force the short version of the label, always used on mobile
 * @return {Function|string} An i18n message or resolveable function
 */
ve.init.mw.ArticleTarget.prototype.getSaveButtonLabel = function ( startProcess, forceShort ) {
	const suffix = startProcess ? '-start' : '';

	if ( forceShort || OO.ui.isMobile() ) {
		// The following messages can be used here:
		// * visualeditor-savedialog-label-publish-short
		// * visualeditor-savedialog-label-publish-short-start
		// * visualeditor-savedialog-label-save-short
		// * visualeditor-savedialog-label-save-short-start
		if ( mw.config.get( 'wgEditSubmitButtonLabelPublish' ) ) {
			return OO.ui.deferMsg( 'visualeditor-savedialog-label-publish-short' + suffix );
		}

		return OO.ui.deferMsg( 'visualeditor-savedialog-label-save-short' + suffix );
	}

	// The following messages can be used here
	// * publishpage
	// * publishpage-start
	// * publishchanges
	// * publishchanges-start
	// * savearticle
	// * savearticle-start
	// * savechanges
	// * savechanges-start
	if ( mw.config.get( 'wgEditSubmitButtonLabelPublish' ) ) {
		return OO.ui.deferMsg( ( !this.pageExists ? 'publishpage' : 'publishchanges' ) + suffix );
	}

	return OO.ui.deferMsg( ( !this.pageExists ? 'savearticle' : 'savechanges' ) + suffix );
};

/**
 * Setup the toolbarSaveButton property to point to the save tool
 *
 * @method
 * @abstract
 */
ve.init.mw.ArticleTarget.prototype.setupToolbarSaveButton = null;

/**
 * Re-evaluate whether the article can be saved
 *
 * @return {boolean} The article can be saved
 */
ve.init.mw.ArticleTarget.prototype.isSaveable = function () {
	const surface = this.getSurface();
	if ( !surface ) {
		// Called before we're attached, so meaningless; abandon for now
		return false;
	}

	this.edited =
		// Document was edited before loading
		this.fromEditedState ||
		// Document was edited
		surface.getModel().hasBeenModified() ||
		// Section title (if it exists) was edited
		( !!this.sectionTitle && this.sectionTitle.getValue() !== '' );

	return this.edited || this.restoring;
};

/**
 * Update the toolbar save button to reflect if the article can be saved
 */
ve.init.mw.ArticleTarget.prototype.updateToolbarSaveButtonState = function () {
	// This should really be an emit( 'updateState' ) but that would cause
	// every tool to be updated on every transaction.
	this.toolbarSaveButton.onUpdateState();

	const isSaveable = this.isSaveable();
	if ( isSaveable !== this.wasSaveable ) {
		this.emit( 'toolbarSaveButtonStateChanged' );
		this.wasSaveable = isSaveable;
	}
};

/**
 * Get the pre-save process, which is executed before opening the save dialog
 *
 * If the process rejects, the save dialog is not opened.
 *
 * @return {OO.ui.Process}
 */
ve.init.mw.ArticleTarget.prototype.getPreSaveProcess = function () {
	return this.preSaveProcess;
};

/**
 * Show a save dialog
 *
 * @param {string} [action] Window action to trigger after opening
 * @param {string} [checkboxName] Checkbox to toggle after opening
 *
 * @fires ve.init.mw.ArticleTarget#saveWorkflowBegin
 */
ve.init.mw.ArticleTarget.prototype.showSaveDialog = function ( action, checkboxName ) {
	let firstLoad = false;

	if ( !this.isSaveable() || this.saveDialogIsOpening ) {
		return;
	}

	const currentWindow = this.getSurface().getDialogs().getCurrentWindow();
	if ( currentWindow && currentWindow.constructor.static.name === 'mwSave' && ( action === 'save' || action === null ) ) {
		// The current window is the save dialog, and we've gotten here via
		// the save action. Trigger a save. We're doing this here instead of
		// relying on an accesskey on the save button, because that has some
		// cross-browser issues that makes it not work in Firefox.
		currentWindow.executeAction( 'save' );
		return;
	}

	this.saveDialogIsOpening = true;

	mw.hook( 've.preSaveProcess' ).deprecate( 'Use target.getPreSaveProcess() instead.' ).fire( this.preSaveProcess, this );

	this.emit( 'saveWorkflowBegin' );

	this.preSaveProcess.execute().then( () => {
		if ( this.deactivating || !this.active ) {
			// It's possible to trigger deactivating VE during the
			// preSaveProcess (e.g. by clicking the "read" tab), and in that
			// case we should immediately discard what we're doing.
			return;
		}
		// Preload the serialization
		this.prepareCacheKey( this.getDocToSave() );

		// Get the save dialog
		this.getSurface().getDialogs().getWindow( 'mwSave' ).then( ( win ) => {
			const windowAction = ve.ui.actionFactory.create( 'window', this.getSurface() );

			if ( !this.saveDialog ) {
				this.saveDialog = win;
				firstLoad = true;

				// Connect to save dialog
				this.saveDialog.connect( this, {
					save: 'onSaveDialogSave',
					review: 'onSaveDialogReview',
					preview: 'onSaveDialogPreview',
					resolve: 'onSaveDialogResolveConflict',
					retry: 'onSaveDialogRetry',
					// The array syntax is a way to call `this.emit( 'saveWorkflowEnd' )`.
					close: [ 'emit', 'saveWorkflowEnd' ],
					changePanel: [ 'emit', 'saveWorkflowChangePanel' ]
				} );

				// Attach custom overlay
				this.saveDialog.$element.append( this.$saveDialogOverlay );
			}

			const data = this.getSaveDialogOpeningData();

			if (
				( action === 'review' && !data.canReview ) ||
				( action === 'preview' && !data.canPreview )
			) {
				this.saveDialogIsOpening = false;
				return;
			}

			if ( firstLoad ) {
				for ( const name in this.checkboxesByName ) {
					if ( this.initialCheckboxes[ name ] !== undefined ) {
						this.checkboxesByName[ name ].setSelected( this.initialCheckboxes[ name ] );
					}
				}
			}

			let checkbox;
			if ( checkboxName && ( checkbox = this.checkboxesByName[ checkboxName ] ) ) {
				const isSelected = !checkbox.isSelected();
				// Wait for native access key change to happen
				setTimeout( () => {
					checkbox.setSelected( isSelected );
				} );
			}

			// When calling review/preview action, switch to those panels immediately
			if ( action === 'review' || action === 'preview' ) {
				data.initialPanel = action;
			}

			// Open the dialog
			const openPromise = windowAction.open( 'mwSave', data, action );
			if ( openPromise ) {
				openPromise.always( () => {
					this.saveDialogIsOpening = false;
				} );
			}
		} );
	}, () => {
		this.saveDialogIsOpening = false;
	} );
};

/**
 * Get opening data to pass to the save dialog
 *
 * @return {Object} Opening data
 */
ve.init.mw.ArticleTarget.prototype.getSaveDialogOpeningData = function () {
	const mode = this.getSurface().getMode();
	return {
		canPreview: mode === 'source',
		canReview: !( mode === 'source' && this.section === 'new' ),
		sectionTitle: this.sectionTitle && this.sectionTitle.getValue(),
		saveButtonLabel: this.getSaveButtonLabel(),
		copyrightWarning: this.copyrightWarning,
		checkboxFields: this.checkboxFields,
		checkboxesByName: this.checkboxesByName
	};
};

/**
 * Move the cursor in the editor to section specified by this.section.
 * Do nothing if this.section is undefined.
 */
ve.init.mw.ArticleTarget.prototype.restoreEditSection = function () {
	const section = this.section !== null ? this.section : this.visibleSection;
	const surface = this.getSurface();
	const mode = surface.getMode();

	if (
		mode === 'source' ||
		( this.enableVisualSectionEditing && this.section !== null )
	) {
		this.$scrollContainer.scrollTop( 0 );
	}

	if ( section === null || section === 'new' || section === '0' || section === 'T-0' ) {
		return;
	}

	const setExactScrollOffset = this.section === null && this.visibleSection !== null && this.visibleSectionOffset !== null,
		// User clicked section edit link with visual section editing not available:
		// Take them to the top of the section using goToHeading
		goToStartOfHeading = this.section !== null && !this.enableVisualSectionEditing,
		setEditSummary = this.section !== null;

	let headingText;
	if ( mode === 'visual' ) {
		const dmDoc = surface.getModel().getDocument();
		// In mw.libs.ve.unwrapParsoidSections we copy the data-mw-section-id from the section element
		// to the heading. Iterate over headings to find the one with the correct attribute
		// in originalDomElements.
		const headingModel = dmDoc.getNodesByType( 'mwHeading' ).find( ( heading ) => {
			const domElements = heading.getOriginalDomElements( dmDoc.getStore() );
			return domElements && domElements.length && domElements[ 0 ].nodeType === Node.ELEMENT_NODE &&
				domElements[ 0 ].getAttribute( 'data-mw-section-id' ) === section;
		} );
		if ( headingModel ) {
			const headingView = surface.getView().getDocument().getDocumentNode().getNodeFromOffset( headingModel.getRange().start );
			if ( setEditSummary && !new URL( location.href ).searchParams.has( 'summary' ) ) {
				headingText = headingView.$element.text();
			}
			if ( setExactScrollOffset ) {
				this.scrollToHeading( headingView, this.visibleSectionOffset );
			} else if ( goToStartOfHeading ) {
				this.goToHeading( headingView );
			}
		}
	} else if ( mode === 'source' && setEditSummary ) {
		// With elements of extractSectionTitle + stripSectionName TODO:
		// Arguably, we should just throw this through the API and then do
		// the same extract-text pass we do in visual mode. Would save us
		// having to think about wikitext here.
		headingText = surface.getModel().getDocument().data.getText(
			false,
			surface.getModel().getDocument().getDocumentNode().children[ 0 ].getRange()
		)
			// Extract the title
			.replace( /^\s*=+\s*(.*?)\s*=+\s*$/, '$1' )
			// Remove links
			.replace( /\[\[:?([^[|]+)\|([^[]+)\]\]/g, '$2' )
			.replace( /\[\[:?([^[]+)\|?\]\]/g, '$1' )
			.replace( new RegExp( '\\[(?:' + ve.init.platform.getUnanchoredExternalLinkUrlProtocolsRegExp().source + ')([^ ]+?) ([^\\[]+)\\]', 'ig' ), '$3' )
			// Cheap HTML removal
			.replace( /<[^>]+?>/g, '' );
	}
	if ( headingText ) {
		this.initialEditSummary =
			'/* ' +
			ve.graphemeSafeSubstring( headingText, 0, 244 ) +
			' */ ';
	}
};

/**
 * Move the cursor to a given heading and scroll to it.
 *
 * @param {ve.ce.HeadingNode} headingNode Heading node to scroll to
 */
ve.init.mw.ArticleTarget.prototype.goToHeading = function ( headingNode ) {
	const surface = this.getSurface(),
		surfaceView = surface.getView();

	let offsetNode = headingNode,
		lastHeadingLevel = -1;
	let nextNode;
	// Find next sibling which isn't a heading
	while ( offsetNode instanceof ve.ce.HeadingNode && offsetNode.getModel().getAttribute( 'level' ) > lastHeadingLevel ) {
		lastHeadingLevel = offsetNode.getModel().getAttribute( 'level' );
		// Next sibling
		nextNode = offsetNode.parent.children[ offsetNode.parent.children.indexOf( offsetNode ) + 1 ];
		if ( !nextNode ) {
			break;
		}
		offsetNode = nextNode;
	}
	const startOffset = offsetNode.getModel().getOffset();

	function setSelection() {
		surfaceView.selectRelativeSelectableContentOffset( startOffset, 1 );
	}

	if ( surfaceView.isFocused() ) {
		setSelection();
		// Focussing the document triggers showSelection which calls scrollIntoView
		// which uses a jQuery animation, so make sure this is aborted.
		$( OO.ui.Element.static.getClosestScrollableContainer( surfaceView.$element[ 0 ] ) ).stop( true );
	} else {
		// onDocumentFocus is debounced, so wait for that to happen before setting
		// the model selection, otherwise it will get reset
		surfaceView.once( 'focus', setSelection );
	}
	this.scrollToHeading( headingNode );
};

/**
 * Scroll to a given heading in the document.
 *
 * @param {ve.ce.HeadingNode} headingNode Heading node to scroll to
 * @param {number} [headingOffset=0] Set the top offset of the heading to a specific amount, relative
 *  to the surface viewport.
 */
ve.init.mw.ArticleTarget.prototype.scrollToHeading = function ( headingNode, headingOffset ) {
	this.$scrollContainer.scrollTop(
		headingNode.$element.offset().top - parseInt( headingNode.$element.css( 'margin-top' ) ) -
		( this.getSurface().padding.top + ( headingOffset || 0 ) ) );
};

/**
 * Get the URL hash for the current section's ID using the page's HTML.
 *
 * TODO: Do this in a less skin-dependent way
 *
 * @return {string} URL hash with leading '#', or empty string if not found
 */
ve.init.mw.ArticleTarget.prototype.getSectionHashFromPage = function () {
	// Assume there are section edit links, as the user just did a section edit. This also means
	// that the section numbers line up correctly, as not every H_ tag is a numbered section.
	const $sections = this.$editableContent.find( '.mw-editsection' );

	let section;
	if ( this.section === 'new' ) {
		// A new section is appended to the end, so take the last one.
		section = $sections.length;
	} else {
		section = this.section;
	}
	if ( section > 0 ) {
		// Compatibility with pre-T13555 markup
		const $section = $sections.eq( section - 1 )
			.closest( '.mw-heading, h1, h2, h3, h4, h5, h6' )
			.find( 'h1, h2, h3, h4, h5, h6, .mw-headline' );

		if ( $section.length && $section.attr( 'id' ) ) {
			return '#' + $section.attr( 'id' );
		}
	}
	return '';
};

/**
 * Switches to the wikitext editor, either keeping (default) or discarding changes.
 *
 * @param {boolean} [modified] Whether there were any changes at all, will be evaluated if not provided
 */
ve.init.mw.ArticleTarget.prototype.switchToWikitextEditor = function ( modified ) {
	if ( modified === undefined ) {
		modified = this.fromEditedState || this.getSurface().getModel().hasBeenModified();
	}
	// When switching with changes we always pass the full page as changes in visual section mode
	// can still affect the whole document (e.g. removing a reference)
	if ( modified ) {
		this.section = null;
	}

	if ( this.isModeAvailable( 'source' ) ) {
		if ( !modified ) {
			this.reloadSurface( 'source' );
		} else {
			const dataPromise = this.getWikitextDataPromiseForDoc( modified );
			this.reloadSurface( 'source', dataPromise );
		}
	} else {
		this.switchToFallbackWikitextEditor( modified );
	}
};

// Deprecated alias
ve.init.mw.ArticleTarget.prototype.editSource = function () {
	OO.ui.warnDeprecation( 'ArticleTarget#editSource: Use #switchToWikitextEditor instead.' );
	this.switchToWikitextEditor( ...arguments );
};

/**
 * Get a data promise for wikitext editing based on the current doc state
 *
 * @param {boolean} modified Whether there were any changes
 * @return {jQuery.Promise} Data promise
 */
ve.init.mw.ArticleTarget.prototype.getWikitextDataPromiseForDoc = function ( modified ) {
	return this.serialize( this.getDocToSave() ).then( ( data ) => {
		// HACK - add parameters the API doesn't provide for a VE->WT switch
		// --------------------------------------------------------------------------------
		// This should match the API result in ApiVisualEditor.php and ArticleTarget#storeDocState
		// --------------------------------------------------------------------------------
		data.basetimestamp = this.baseTimeStamp;
		// `blockinfo` is not used by this client
		data.canEdit = this.canEdit;
		data.checkboxesDef = this.checkboxesDef;
		data.checkboxesMessages = this.checkboxesMessages; // needed in case we end up autosaving with this data
		// `content` is already set
		data.copyrightWarning = this.copyrightWarning;
		data.etag = this.etag;
		data.fromEditedState = modified; // this replaces data.preloaded
		data.notices = this.remoteNotices;
		data.oldid = this.revid;
		data.protectedClasses = this.protectedClasses;
		// `result` is not used
		data.starttimestamp = this.startTimeStamp;
		data.wouldautocreate = this.wouldautocreate;
		// Wrap up like a response object as that is what dataPromise is expected to be
		return { visualeditoredit: data };
	} );
};

/**
 * Switches to the fallback wikitext editor, either keeping (default) or discarding changes.
 *
 * @param {boolean} [modified=false] Whether there were any changes at all.
 * @return {jQuery.Promise} Promise which rejects if the switch fails
 */
ve.init.mw.ArticleTarget.prototype.switchToFallbackWikitextEditor = function () {
	return ve.createDeferred().resolve().promise();
};

/**
 * Switch to the visual editor.
 */
ve.init.mw.ArticleTarget.prototype.switchToVisualEditor = function () {
	if ( !this.edited ) {
		this.reloadSurface( 'visual' );
		return;
	}

	const url = new URL( location.href );
	const dataPromise = mw.libs.ve.targetLoader.requestParsoidData( this.getPageName(), {
		oldId: this.revid,
		targetName: this.constructor.static.trackingName,
		modified: this.edited,
		wikitext: this.getDocToSave(),
		section: this.section,
		editintro: url.searchParams.get( 'editintro' ),
		preload: url.searchParams.get( 'preload' ),
		preloadparams: mw.util.getArrayParam( 'preloadparams', url.searchParams )
	} );

	this.reloadSurface( 'visual', dataPromise );
};

/**
 * Switch to a different wikitext section
 *
 * @param {string|null} section Section to switch to: a number, 'T-'-prefixed number, 'new'
 *   or null (whole document)
 * @param {boolean} [noPrompt=false] Switch without prompting (changes will be lost either way)
 */
ve.init.mw.ArticleTarget.prototype.switchToWikitextSection = function ( section, noPrompt ) {
	if ( section === this.section ) {
		return;
	}
	let promise;
	if ( !noPrompt && this.edited && mw.user.options.get( 'useeditwarning' ) ) {
		promise = this.getSurface().dialogs.openWindow( 'abandonedit' )
			.closed.then( ( data ) => data && data.action === 'discard' );
	} else {
		promise = ve.createDeferred().resolve( true ).promise();
	}
	promise.then( ( confirmed ) => {
		if ( confirmed ) {
			// Section has changed and edits have been discarded, so edit summary is no longer valid
			// TODO: Preserve summary if document changes can be preserved
			if ( this.saveDialog ) {
				this.saveDialog.reset();
			}
			// TODO: If switching to a non-null section, get the new section title
			this.initialEditSummary = null;
			this.section = section;
			this.reloadSurface( 'source' );
			this.updateTabs();
		}
	} );
};

/**
 * Reload the target surface in the new editor mode
 *
 * @param {string} newMode New mode
 * @param {jQuery.Promise} [dataPromise] Data promise, if any
 */
ve.init.mw.ArticleTarget.prototype.reloadSurface = function ( newMode, dataPromise ) {
	this.setDefaultMode( newMode );
	this.clearDiff();
	const promise = this.load( dataPromise );
	this.getSurface().createProgress(
		promise,
		ve.msg( newMode === 'source' ? 'visualeditor-mweditmodesource-progress' : 'visualeditor-mweditmodeve-progress' ),
		true /* non-cancellable */
	);
};

/**
 * Display the given redirect subtitle and redirect page content header on the page.
 *
 * @param {jQuery} $sub Redirect subtitle, see #buildRedirectSub
 * @param {jQuery} $msg Redirect page content header, see #buildRedirectMsg
 */
ve.init.mw.ArticleTarget.prototype.updateRedirectInterface = function ( $sub, $msg ) {
	// For the subtitle, replace the real one with ours.
	// This is more complicated than it should be because we have to fiddle with the <br>.
	const $currentSub = $( '#redirectsub' );
	if ( $currentSub.length ) {
		if ( $sub.length ) {
			$currentSub.replaceWith( $sub );
		} else {
			$currentSub.prev().filter( 'br' ).remove();
			$currentSub.remove();
		}
	} else {
		const $subtitle = $( '#contentSub' );
		if ( $sub.length ) {
			if ( $subtitle.children().length ) {
				$subtitle.append( $( '<br>' ) );
			}
			$subtitle.append( $sub );
		}
	}

	if ( $msg.length ) {
		$msg
			// We need to be able to tell apart the real one and our fake one
			.addClass( 've-redirect-header' )
			.on( 'click', ( e ) => {
				const windowAction = ve.ui.actionFactory.create( 'window', this.getSurface() );
				windowAction.open( 'meta', { page: 'settings' } );
				e.preventDefault();
			} );
	}
	// For the content header, the real one is hidden, insert ours before it.
	const $currentMsg = $( '.ve-redirect-header' );
	if ( $currentMsg.length ) {
		$currentMsg.replaceWith( $msg );
	} else {
		// Hack: This is normally inside #mw-content-text, but that's hidden while editing.
		$( '#mw-content-text' ).before( $msg );
	}
};

/**
 * Set temporary redirect interface to match the current state of redirection in the editor.
 *
 * @param {string|null} title Current redirect target, or null if none
 */
ve.init.mw.ArticleTarget.prototype.setFakeRedirectInterface = function ( title ) {
	this.isRedirect = !!title;
	this.updateRedirectInterface(
		title ? this.constructor.static.buildRedirectSub() : $(),
		title ? this.constructor.static.buildRedirectMsg( title ) : $()
	);
};

/**
 * Set the redirect interface to match the page's redirect state.
 */
ve.init.mw.ArticleTarget.prototype.setRealRedirectInterface = function () {
	this.updateRedirectInterface(
		mw.config.get( 'wgIsRedirect' ) ? this.constructor.static.buildRedirectSub() : $(),
		// Remove our custom content header - the original one in #mw-content-text will be shown
		$()
	);
};

/**
 * Render a list of categories
 *
 * Duplicate items are not shown.
 *
 * @param {ve.dm.MetaItem[]} categoryItems Array of category metaitems to display
 * @return {jQuery.Promise} A promise which will be resolved with the rendered categories
 */
ve.init.mw.ArticleTarget.prototype.renderCategories = function ( categoryItems ) {
	const promises = [],
		categories = { hidden: {}, normal: {} };
	categoryItems.forEach( ( categoryItem, index ) => {
		const attributes = ve.copy( ve.getProp( categoryItem, 'element', 'attributes' ) );
		attributes.index = index;
		promises.push( ve.init.platform.linkCache.get( attributes.category ).then( ( result ) => {
			const group = result.hidden ? categories.hidden : categories.normal;
			// In case of duplicates, first entry wins (like in MediaWiki)
			if ( !group[ attributes.category ] || group[ attributes.category ].index > attributes.index ) {
				group[ attributes.category ] = attributes;
			}
		} ) );
	} );
	return ve.promiseAll( promises ).then( () => {
		const $output = $( '<div>' ).addClass( 'catlinks' );
		function renderPageLink( page ) {
			const title = mw.Title.newFromText( page ),
				$link = $( '<a>' ).attr( 'rel', 'mw:WikiLink' ).attr( 'href', title.getUrl() ).text( title.getMainText() );
			// Style missing links. The data should already have been fetched
			// as part of the earlier processing of categoryItems.
			ve.init.platform.linkCache.styleElement( title.getPrefixedText(), $link, false );
			return $link;
		}
		function renderPageLinks( pages ) {
			const $list = $( '<ul>' );
			for ( let i = 0; i < pages.length; i++ ) {
				const $link = renderPageLink( pages[ i ] );
				$list.append( $( '<li>' ).append( $link ) );
			}
			return $list;
		}
		function categorySort( group, a, b ) {
			return group[ a ].index - group[ b ].index;
		}
		const categoriesNormal = Object.keys( categories.normal );
		if ( categoriesNormal.length ) {
			categoriesNormal.sort( categorySort.bind( null, categories.normal ) );
			const $normal = $( '<div>' ).addClass( 'mw-normal-catlinks' );
			const $pageLink = renderPageLink( ve.msg( 'pagecategorieslink' ) ).text( ve.msg( 'pagecategories', categoriesNormal.length ) );
			const $pageLinks = renderPageLinks( categoriesNormal );
			$normal.append(
				$pageLink,
				$( document.createTextNode( ve.msg( 'colon-separator' ) ) ),
				$pageLinks
			);
			$output.append( $normal );
		}
		const categoriesHidden = Object.keys( categories.hidden );
		if ( categoriesHidden.length ) {
			categoriesHidden.sort( categorySort.bind( null, categories.hidden ) );
			const $hidden = $( '<div>' ).addClass( 'mw-hidden-catlinks' );
			if ( mw.user.options.get( 'showhiddencats' ) ) {
				$hidden.addClass( 'mw-hidden-cats-user-shown' );
			} else if ( mw.config.get( 'wgNamespaceIds' ).category === mw.config.get( 'wgNamespaceNumber' ) ) {
				$hidden.addClass( 'mw-hidden-cats-ns-shown' );
			} else {
				$hidden.addClass( 'mw-hidden-cats-hidden' );
			}
			const $hiddenPageLinks = renderPageLinks( categoriesHidden );
			$hidden.append(
				$( document.createTextNode( ve.msg( 'hidden-categories', categoriesHidden.length ) ) ),
				$( document.createTextNode( ve.msg( 'colon-separator' ) ) ),
				$hiddenPageLinks
			);
			$output.append( $hidden );
		}
		return $output;
	} );
};

// Used in tryTeardown
ve.ui.windowFactory.register( mw.widgets.AbandonEditDialog );
