/*!
 * VisualEditor MediaWiki Initialization Target class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/*global EasyDeflate */

/**
 * Initialization MediaWiki target.
 *
 * @class
 * @extends ve.init.Target
 *
 * @constructor
 * @param {string} pageName Name of target page
 * @param {number} [revisionId] If the editor should load a revision of the page, pass the
 *  revision id here. Defaults to loading the latest version (see #load).
 */
ve.init.mw.Target = function VeInitMwTarget( pageName, revisionId ) {
	// Parent constructor
	ve.init.Target.call( this, { shadow: true, actions: true, floatable: true } );

	// Properties
	this.pageName = pageName;
	this.pageExists = mw.config.get( 'wgArticleId', 0 ) !== 0;

	// Sometimes we actually don't want to send a useful oldid
	// if we do, PostEdit will give us a 'page restored' message
	this.requestedRevId = revisionId;
	this.revid = revisionId || mw.config.get( 'wgCurRevisionId' );

	this.restoring = !!revisionId;
	this.editToken = mw.user.tokens.get( 'editToken' );
	this.submitUrl = ( new mw.Uri( mw.util.getUrl( this.pageName ) ) )
		.extend( { action: 'submit' } );
	this.events = new ve.init.mw.TargetEvents( this );

	this.preparedCacheKeyPromise = null;
	this.clearState();
	this.generateCitationFeatures();
};

/* Inheritance */

OO.inheritClass( ve.init.mw.Target, ve.init.Target );

/* Events */

/**
 * @event editConflict
 */

/**
 * @event save
 * @param {string} html Rendered page HTML from server
 * @param {string} categoriesHtml Rendered categories HTML from server
 * @param {number} [newid] New revision id, undefined if unchanged
 * @param {boolean} isRedirect Whether this page is now a redirect or not.
 */

/**
 * @event showChanges
 * @param {string} diff
 */

/**
 * @event noChanges
 */

/**
 * @event saveAsyncBegin
 * Fired when we're waiting for network
 */

/**
 * @event saveAsyncComplete
 * Fired when we're no longer waiting for network
 */

/**
 * @event saveErrorEmpty
 * Fired when save API returns no data object
 */

/**
 * @event saveErrorSpamBlacklist
 * Fired when save is considered spam or blacklisted
 * @param {Object} editApi
 */

/**
 * @event saveErrorAbuseFilter
 * Fired when AbuseFilter throws warnings
 * @param {Object} editApi
 */

/**
 * @event saveErrorBadToken
 * Fired on save if we have to fetch a new edit token
 *  this is mainly for analytical purposes.
 */

/**
 * @event saveErrorNewUser
 * Fired when user is logged in as a new user
 * @param {string|null} username Name of newly logged-in user, or null if anonymous
 */

/**
 * @event saveErrorCaptcha
 * Fired when saveError indicates captcha field is required
 * @param {Object} editApi
 */

/**
 * @event saveErrorUnknown
 * Fired for any other type of save error
 * @param {Object} editApi
 * @param {Object|null} data API response data
 */

/**
 * @event saveErrorPageDeleted
 * Fired when user tries to save page that was deleted after opening VE
 */

/**
 * @event saveErrorTitleBlacklist
 * Fired when the user tries to save page in violation of the TitleBlacklist
 */

/**
 * @event loadError
 * @param {string} errorTypeText
 * @param {Object|string} error
 */

/**
 * @event saveError
 * @param {jqXHR|null} jqXHR
 * @param {string} status Text status message
 * @param {Object|null} data API response data
 */

/**
 * @event showChangesError
 * @param {jqXHR|null} jqXHR
 * @param {string} status Text status message
 * @param {Mixed|null} error HTTP status text
 */

/**
 * @event serializeError
 * @param {jqXHR|null} jqXHR
 * @param {string} status Text status message
 * @param {Mixed|null} error HTTP status text
 */

/**
 * @event serializeComplete
 * Fired when serialization is complete
 */

/* Static Properties */

ve.init.mw.Target.static.citationToolsLimit = 5;

ve.init.mw.Target.static.toolbarGroups = [
	// History
	{ include: [ 'undo', 'redo' ] },
	// Format
	{
		classes: [ 've-test-toolbar-format' ],
		type: 'menu',
		indicator: 'down',
		title: OO.ui.deferMsg( 'visualeditor-toolbar-format-tooltip' ),
		include: [ { group: 'format' } ],
		promote: [ 'paragraph' ],
		demote: [ 'preformatted', 'blockquote', 'heading1' ]
	},
	// Style
	{
		classes: [ 've-test-toolbar-style' ],
		type: 'list',
		icon: 'text-style',
		indicator: 'down',
		title: OO.ui.deferMsg( 'visualeditor-toolbar-style-tooltip' ),
		include: [ { group: 'textStyle' }, 'language', 'clear' ],
		forceExpand: [ 'bold', 'italic', 'clear' ],
		promote: [ 'bold', 'italic' ],
		demote: [ 'strikethrough', 'code', 'underline', 'language', 'clear' ]
	},
	// Link
	{ include: [ 'link' ] },
	// Cite
	{
		classes: [ 've-test-toolbar-cite' ],
		type: 'list',
		label: OO.ui.deferMsg( 'visualeditor-toolbar-cite-label' ),
		indicator: 'down',
		include: [ { group: 'cite' }, 'reference', 'reference/existing' ],
		demote: [ 'reference', 'reference/existing' ]
	},
	// Structure
	{
		classes: [ 've-test-toolbar-structure' ],
		type: 'list',
		icon: 'bullet-list',
		indicator: 'down',
		include: [ { group: 'structure' } ],
		demote: [ 'outdent', 'indent' ]
	},
	// Insert
	{
		classes: [ 've-test-toolbar-insert' ],
		label: OO.ui.deferMsg( 'visualeditor-toolbar-insert' ),
		indicator: 'down',
		include: '*',
		forceExpand: [ 'media', 'transclusion', 'insertTable' ],
		promote: [ 'media', 'transclusion' ]
	},
	// Table
	{
		header: OO.ui.deferMsg( 'visualeditor-toolbar-table' ),
		type: 'list',
		icon: 'table-insert',
		indicator: 'down',
		include: [ { group: 'table' } ],
		demote: [ 'deleteTable' ]
	},
	// SpecialCharacter
	{ include: [ 'specialCharacter' ] }
];

ve.init.mw.Target.static.importRules = {
	external: {
		blacklist: [
			// Annotations
			'link', 'textStyle/span', 'textStyle/font', 'textStyle/underline',
			// Nodes
			'inlineImage', 'blockImage', 'div', 'alienInline', 'alienBlock', 'comment'
		],
		removeOriginalDomElements: true
	},
	all: null
};

/**
 * Name of target class. Used by TargetEvents to identify which target we are tracking.
 *
 * @static
 * @property {string}
 * @inheritable
 */
ve.init.mw.Target.static.name = 'mwTarget';

/**
 * Type of integration. Used by ve.init.mw.trackSubscriber.js for event tracking.
 * @static
 * @property {string}
 * @inheritable
 */
ve.init.mw.Target.static.integrationType = 'page';

/* Static Methods */

/**
 * Take a target document with a possibly relative base URL, and modify it to be absolute.
 * The base URL of the target document is resolved using the base URL of the source document.
 * @param {HTMLDocument} targetDoc Document whose base URL should be resolved
 * @param {HTMLDocument} sourceDoc Document whose base URL should be used for resolution
 */
ve.init.mw.Target.static.fixBase = function ( targetDoc, sourceDoc ) {
	var baseNode;
	if ( !targetDoc.baseURI ) {
		baseNode = targetDoc.getElementsByTagName( 'base' )[0];
		if ( baseNode ) {
			// Modify the existing <base> tag
			baseNode.setAttribute( 'href', ve.resolveUrl( baseNode.getAttribute( 'href' ), sourceDoc ) );
		} else {
			// No <base> tag, add one
			baseNode = targetDoc.createElement( 'base' );
			baseNode.setAttribute( 'href', sourceDoc.baseURI );
			sourceDoc.head.appendChild( baseNode );
		}
	}
};

/**
 * Handle response to a successful load request.
 *
 * This method is called within the context of a target instance. If successful the DOM from the
 * server will be parsed, stored in {this.doc} and then {this.onReady} will be called.
 *
 * @static
 * @method
 * @param {Object} response API response data
 * @param {string} status Text status message
 * @fires loadError
 */
ve.init.mw.Target.onLoad = function ( response ) {
	var i, len, linkData, aboutDoc, docRevIdMatches, baseNode,
		docRevId = 0,
		data = response ? response.visualeditor : null;

	if ( typeof data.content !== 'string' ) {
		ve.init.mw.Target.onLoadError.call(
			this, 've-api', 'No HTML content in response from server'
		);
	} else {
		ve.track( 'trace.parseResponse.enter' );
		this.originalHtml = data.content;
		this.doc = ve.parseXhtml( this.originalHtml );

		// Parsoid outputs a protocol-relative <base> tag, so absolutize it
		this.constructor.static.fixBase( this.doc, document );

		// If the document has an invalid <base> tag or no <base> tag at all (new pages,
		// for example, don't have a <base> tag) then set a base URI based on wgArticlePath.
		if ( !this.doc.baseURI ) {
			// Use existing <base> tag if present
			baseNode = this.doc.getElementsByName( 'base' )[0] || this.doc.createElement( 'base' );
			baseNode.setAttribute( 'href',
				ve.resolveUrl(
					// Don't replace $1 with this.pageName, because that'll break if
					// this.pageName contains a slash
					mw.config.get( 'wgArticlePath' ).replace( '$1', '' ),
					document
				)
			);
			// If baseNode was created by us, attach it
			if ( !baseNode.parentNode ) {
				this.doc.head.appendChild( baseNode );
			}
		}

		this.remoteNotices = ve.getObjectValues( data.notices );
		this.protectedClasses = data.protectedClasses;
		this.$checkboxes = $( ve.getObjectValues( data.checkboxes ).join( '' ) );
		// Populate checkboxes with default values for minor and watch
		this.$checkboxes
			.filter( '#wpMinoredit' )
				.prop( 'checked', mw.user.options.get( 'minordefault' ) )
			.end()
			.filter( '#wpWatchthis' )
				.prop( 'checked',
					mw.user.options.get( 'watchdefault' ) ||
					( mw.user.options.get( 'watchcreations' ) && !this.pageExists ) ||
					data.watched
				);

		this.baseTimeStamp = data.basetimestamp;
		this.startTimeStamp = data.starttimestamp;
		this.revid = data.oldid;

		aboutDoc = this.doc.documentElement.getAttribute( 'about' );
		if ( aboutDoc ) {
			docRevIdMatches = aboutDoc.match( /revision\/([0-9]*)$/ );
			if ( docRevIdMatches.length >= 2 ) {
				docRevId = parseInt( docRevIdMatches[1] );
			}
		}
		if ( docRevId !== this.revid ) {
			if ( this.retriedRevIdConflict ) {
				// Retried already, just error the second time.
				ve.init.mw.Target.onLoadError.call(
					this,
					've-api',
					'Revision IDs (doc=' + docRevId + ',api=' + this.revid + ') ' +
						'returned by server do not match'
				);
			} else {
				this.retriedRevIdConflict = true;
				// TODO this retries both requests, in RESTbase mode we should only retry
				// the request that gave us the lower revid
				this.loading = false;
				// HACK: Load with explicit revid to hopefully prevent this from happening again
				if ( !this.requestedRevId ) {
					this.requestedRevId = Math.max( docRevId, this.revid );
				}
				this.load();
			}
			return;
		}

		// Populate link cache
		if ( data.links ) {
			// Format from the API: { missing: [titles], extant: true|[titles] }
			// Format expected by LinkCache: { title: { missing: true|false } }
			linkData = {};
			for ( i = 0, len = data.links.missing.length; i < len; i++ ) {
				linkData[data.links.missing[i]] = { missing: true };
			}
			if ( data.links.extant === true ) {
				// Set back to false by onReady()
				ve.init.platform.linkCache.setAssumeExistence( true );
			} else {
				for ( i = 0, len = data.links.extant.length; i < len; i++ ) {
					linkData[data.links.extant[i]] = { missing: false };
				}
			}
			ve.init.platform.linkCache.set( linkData );
		}

		ve.track( 'trace.parseResponse.exit' );
		// Everything worked, the page was loaded, continue initializing the editor
		this.onReady();
	}
};

/**
 * Handle both DOM and modules being loaded and ready.
 *
 * @fires surfaceReady
 */
ve.init.mw.Target.prototype.onReady = function () {
	var target = this;

	// We need to wait until onReady as local notices may require special messages
	this.editNotices = this.remoteNotices.concat(
		this.localNoticeMessages.map( function ( msgKey ) {
			return '<p>' + ve.init.platform.getParsedMessage( msgKey ) + '</p>';
		} )
	);

	this.loading = false;
	this.edited = false;
	this.setupSurface( this.doc, function () {
		// onLoad() may have called setAssumeExistence( true );
		ve.init.platform.linkCache.setAssumeExistence( false );
		target.emit( 'surfaceReady' );
	} );
};

/**
 * Handle an unsuccessful load request.
 *
 * This method is called within the context of a target instance.
 *
 * @static
 * @method
 * @param {string} errorTypeText Error type text from mw.Api
 * @param {Object} error Object containing xhr, textStatus and exception keys
 * @fires loadError
 */
ve.init.mw.Target.onLoadError = function ( errorText, error ) {
	this.loading = false;
	this.emit( 'loadError', errorText, error );
};

/**
 * Handle a successful save request.
 *
 * This method is called within the context of a target instance.
 *
 * @static
 * @method
 * @param {HTMLDocument} doc HTML document we tried to save
 * @param {Object} saveData Options that were used
 * @param {Object} response Response data
 * @param {string} status Text status message
 * @fires editConflict
 * @fires save
 */
ve.init.mw.Target.onSave = function ( doc, saveData, response ) {
	this.saving = false;
	var data = response.visualeditoredit;
	if ( !data ) {
		this.onSaveError( doc, saveData, null, 'Invalid response from server', response );
	} else if ( data.result !== 'success' ) {
		// Note, this could be any of db failure, hookabort, badtoken or even a captcha
		this.onSaveError( doc, saveData, null, 'Save failure', response );
	} else if ( typeof data.content !== 'string' ) {
		this.onSaveError( doc, saveData, null, 'Invalid HTML content in response from server', response );
	} else {
		this.emit(
			'save',
			data.content,
			data.categorieshtml,
			data.newrevid,
			data.isRedirect,
			data.displayTitleHtml,
			data.lastModified,
			data.contentSub
		);
	}
};

/**
 * Handle an unsuccessful save request.
 *
 * @method
 * @param {HTMLDocument} doc HTML document we tried to save
 * @param {Object} saveData Options that were used
 * @param {Object} jqXHR
 * @param {string} status Text status message
 * @param {Object|null} data API response data
 * @fires saveErrorEmpty
 * @fires saveErrorSpamBlacklist
 * @fires saveErrorAbuseFilter
 * @fires saveErrorBadToken
 * @fires saveErrorNewUser
 * @fires saveErrorCaptcha
 * @fires saveErrorUnknown
 */
ve.init.mw.Target.prototype.onSaveError = function ( doc, saveData, jqXHR, status, data ) {
	var api, editApi,
		target = this;
	this.saving = false;

	// Handle empty response
	if ( !data ) {
		this.emit( 'saveErrorEmpty' );
		return;
	}

	editApi = data && data.visualeditoredit && data.visualeditoredit.edit;

	// Handle spam blacklist error (either from core or from Extension:SpamBlacklist)
	if ( editApi && editApi.spamblacklist ) {
		this.emit( 'saveErrorSpamBlacklist', editApi );
		return;
	}

	// Handle warnings/errors from Extension:AbuseFilter
	// TODO: Move this to a plugin
	if ( editApi && editApi.info && editApi.info.indexOf( 'Hit AbuseFilter:' ) === 0 && editApi.warning ) {
		this.emit( 'saveErrorAbuseFilter', editApi );
		return;
	}

	// Handle token errors
	if ( data.error && data.error.code === 'badtoken' ) {
		api = new mw.Api();
		api.get( {
			// action=query&meta=userinfo and action=tokens&type=edit can't be combined
			// but action=query&meta=userinfo and action=query&prop=info can, however
			// that means we have to give it titles and deal with page ids.
			action: 'query',
			meta: 'userinfo',
			prop: 'info',
			// Try to send the normalised form so that it is less likely we get extra data like
			// data.normalised back that we don't need.
			titles: new mw.Title( target.pageName ).toText(),
			indexpageids: '',
			intoken: 'edit'
		} )
			.always( function () {
				target.emit( 'saveErrorBadToken' );
			} )
			.done( function ( data ) {
				var userMsg,
					userInfo = data.query && data.query.userinfo,
					pageInfo = data.query && data.query.pages && data.query.pageids &&
						data.query.pageids[0] && data.query.pages[ data.query.pageids[0] ],
					editToken = pageInfo && pageInfo.edittoken,
					isAnon = mw.user.isAnon();

				if ( userInfo && editToken ) {
					target.editToken = editToken;

					if (
						( isAnon && userInfo.anon !== undefined ) ||
							// Comparing id instead of name to pretect against possible
							// normalisation and against case where the user got renamed.
							mw.config.get( 'wgUserId' ) === userInfo.id
					) {
						// New session is the same user still
						target.save( doc, saveData );
					} else {
						// The now current session is a different user
						if ( userInfo.anon !== undefined ) {
							// New session is an anonymous user
							mw.config.set( {
								// wgUserId is unset for anonymous users, not set to null
								wgUserId: undefined,
								// wgUserName is explicitly set to null for anonymous users,
								// functions like mw.user.isAnon rely on this.
								wgUserName: null
							} );
							target.emit( 'saveErrorNewUser', null );
						} else {
							// New session is a different user
							mw.config.set( { wgUserId: userInfo.id, wgUserName: userInfo.name } );
							userMsg = 'visualeditor-savedialog-identify-user---' + userInfo.name;
							mw.messages.set(
								userMsg,
								mw.messages.get( 'visualeditor-savedialog-identify-user' )
									.replace( /\$1/g, userInfo.name )
							);
							target.emit( 'saveErrorNewUser', userInfo.name );
						}
					}
				}
			} );
		return;
	} else if ( data.error && data.error.code === 'editconflict' ) {
		this.emit( 'editConflict' );
		return;
	} else if ( data.error && data.error.code === 'pagedeleted' ) {
		this.emit( 'saveErrorPageDeleted' );
		return;
	} else if ( data.error && data.error.code === 'titleblacklist-forbidden-edit' ) {
		this.emit( 'saveErrorTitleBlacklist' );
		return;
	}

	// Handle captcha
	// Captcha "errors" usually aren't errors. We simply don't know about them ahead of time,
	// so we save once, then (if required) we get an error with a captcha back and try again after
	// the user solved the captcha.
	// TODO: ConfirmEdit API is horrible, there is no reliable way to know whether it is a "math",
	// "question" or "fancy" type of captcha. They all expose differently named properties in the
	// API for different things in the UI. At this point we only support the SimpleCaptcha and FancyCaptcha
	// which we very intuitively detect by the presence of a "url" property.
	if ( editApi && editApi.captcha && (
		editApi.captcha.url ||
		editApi.captcha.type === 'simple' ||
		editApi.captcha.type === 'math' ||
		editApi.captcha.type === 'question'
	) ) {
		this.emit( 'saveErrorCaptcha', editApi );
		return;
	}

	// Handle (other) unknown and/or unrecoverable errors
	this.emit( 'saveErrorUnknown', editApi, data );
};

/**
 * Handle a successful show changes request.
 *
 * @static
 * @method
 * @param {Object} response API response data
 * @param {string} status Text status message
 * @fires showChanges
 * @fires noChanges
 */
ve.init.mw.Target.onShowChanges = function ( response ) {
	var data = response.visualeditor;
	this.diffing = false;
	if ( !data && !response.error ) {
		ve.init.mw.Target.onShowChangesError.call( this, null, 'Invalid response from server', null );
	} else if ( response.error ) {
		ve.init.mw.Target.onShowChangesError.call(
			this, null, 'Unsuccessful request: ' + response.error.info, null
		);
	} else if ( data.result === 'nochanges' ) {
		this.emit( 'noChanges' );
	} else if ( data.result !== 'success' ) {
		ve.init.mw.Target.onShowChangesError.call( this, null, 'Failed request: ' + data.result, null );
	} else if ( typeof data.diff !== 'string' ) {
		ve.init.mw.Target.onShowChangesError.call(
			this, null, 'Invalid HTML content in response from server', null
		);
	} else {
		this.emit( 'showChanges', data.diff );
	}
};

/**
 * Handle errors during showChanges action.
 *
 * @static
 * @method
 * @this ve.init.mw.Target
 * @param {Object} jqXHR
 * @param {string} status Text status message
 * @param {Mixed} error HTTP status text
 * @fires showChangesError
 */
ve.init.mw.Target.onShowChangesError = function ( jqXHR, status, error ) {
	this.diffing = false;
	this.emit( 'showChangesError', jqXHR, status, error );
};

/**
 * Handle a successful serialize request.
 *
 * This method is called within the context of a target instance.
 *
 * @static
 * @method
 * @param {Object} data API response data
 * @param {string} status Text status message
 * @fires serializeComplete
 */
ve.init.mw.Target.onSerialize = function ( response ) {
	this.serializing = false;
	var data = response.visualeditor;
	if ( !data && !response.error ) {
		ve.init.mw.Target.onSerializeError.call( this, null, 'Invalid response from server', null );
	} else if ( response.error ) {
		ve.init.mw.Target.onSerializeError.call(
			this, null, 'Unsuccessful request: ' + response.error.info, null
		);
	} else if ( data.result === 'error' ) {
		ve.init.mw.Target.onSerializeError.call( this, null, 'Server error', null );
	} else if ( typeof data.content !== 'string' ) {
		ve.init.mw.Target.onSerializeError.call(
			this, null, 'No Wikitext content in response from server', null
		);
	} else {
		if ( typeof this.serializeCallback === 'function' ) {
			this.serializeCallback( data.content );
			this.emit( 'serializeComplete' );
			delete this.serializeCallback;
		}
	}
};

/**
 * Handle an unsuccessful serialize request.
 *
 * This method is called within the context of a target instance.
 *
 * @static
 * @method
 * @param {jqXHR|null} jqXHR
 * @param {string} status Text status message
 * @param {Mixed|null} error HTTP status text
 * @fires serializeError
 */
ve.init.mw.Target.onSerializeError = function ( jqXHR, status, error ) {
	this.serializing = false;
	this.emit( 'serializeError', jqXHR, status, error );
};

/* Methods */

/**
 * Add reference insertion tools from on-wiki data.
 *
 * By adding a definition in JSON to MediaWiki:Visualeditor-cite-tool-definition, the cite menu can
 * be populated with tools that create refrences containing a specific templates. The content of the
 * definition should be an array containing a series of objects, one for each tool. Each object must
 * contain a `name`, `icon` and `template` property. An optional `title` property can also be used
 * to define the tool title in plain text. The `name` property is a unique identifier for the tool,
 * and also provides a fallback title for the tool by being transformed into a message key. The name
 * is prefixed with `visualeditor-cite-tool-name-`, and messages can be defined on Wiki. Some common
 * messages are pre-defined for tool names such as `web`, `book`, `news` and `journal`.
 *
 * Example:
 * [ { "name": "web", "icon": "cite-web", "template": "Cite web" }, ... ]
 *
 */
ve.init.mw.Target.prototype.generateCitationFeatures = function () {
	var i, len, item, name, data, tool, tools, dialog, contextItem,
		limit = this.constructor.static.citationToolsLimit;

	if ( !ve.ui.MWCitationDialog ) {
		// Citation module isn't loaded, so skip this
		return;
	}

	/*jshint loopfunc:true */

	try {
		// Must use mw.message to avoid JSON being parsed as Wikitext
		tools = JSON.parse( mw.message( 'visualeditor-cite-tool-definition.json' ).plain() );
	} catch ( e ) { }

	if ( Array.isArray( tools ) ) {
		for ( i = 0, len = Math.min( limit, tools.length ); i < len; i++ ) {
			item = tools[i];
			data = { template: item.template };

			// Generate transclusion tool
			name = 'cite-transclusion-' + item.name;
			if ( !ve.ui.toolFactory.lookup( name ) ) {
				tool = function GeneratedMWTransclusionDialogTool( toolbar, config ) {
					ve.ui.MWTransclusionDialogTool.call( this, toolbar, config );
				};
				OO.inheritClass( tool, ve.ui.MWTransclusionDialogTool );
				tool.static.group = 'cite-transclusion';
				tool.static.name = name;
				tool.static.icon = item.icon;
				tool.static.title = item.title;
				tool.static.commandName = name;
				tool.static.template = item.template;
				tool.static.autoAddToCatchall = false;
				tool.static.autoAddToGroup = true;
				ve.ui.toolFactory.register( tool );
				ve.ui.commandRegistry.register(
					new ve.ui.Command(
						name, 'window', 'open',
						{ args: ['transclusion', data], supportedSelections: ['linear'] }
					)
				);
			}

			// Generate transclusion context item
			if ( !ve.ui.contextItemFactory.lookup( name ) ) {
				contextItem = function GeneratedMWTransclusionContextItem( toolbar, config ) {
					ve.ui.MWTransclusionContextItem.call( this, toolbar, config );
				};
				OO.inheritClass( contextItem, ve.ui.MWTransclusionContextItem );
				contextItem.static.name = name;
				contextItem.static.icon = item.icon;
				contextItem.static.label = item.title;
				contextItem.static.commandName = name;
				contextItem.static.template = item.template;
				ve.ui.contextItemFactory.register( contextItem );
			}

			// Generate citation tool
			name = 'cite-' + item.name;
			if ( !ve.ui.toolFactory.lookup( name ) ) {
				tool = function GeneratedMWCitationDialogTool( toolbar, config ) {
					ve.ui.MWCitationDialogTool.call( this, toolbar, config );
				};
				OO.inheritClass( tool, ve.ui.MWCitationDialogTool );
				tool.static.group = 'cite';
				tool.static.name = name;
				tool.static.icon = item.icon;
				tool.static.title = item.title;
				tool.static.commandName = name;
				tool.static.template = item.template;
				tool.static.autoAddToCatchall = false;
				tool.static.autoAddToGroup = true;
				ve.ui.toolFactory.register( tool );
				ve.ui.commandRegistry.register(
					new ve.ui.Command(
						name, 'window', 'open',
						{ args: [name, data], supportedSelections: ['linear'] }
					)
				);
			}

			// Generate citation context item
			if ( !ve.ui.contextItemFactory.lookup( name ) ) {
				contextItem = function GeneratedMWCitationContextItem( toolbar, config ) {
					ve.ui.MWCitationContextItem.call( this, toolbar, config );
				};
				OO.inheritClass( contextItem, ve.ui.MWCitationContextItem );
				contextItem.static.name = name;
				contextItem.static.icon = item.icon;
				contextItem.static.label = item.title;
				contextItem.static.commandName = name;
				contextItem.static.template = item.template;
				ve.ui.contextItemFactory.register( contextItem );
			}

			// Generate dialog
			if ( !ve.ui.windowFactory.lookup( name ) ) {
				dialog = function GeneratedMWCitationDialog( config ) {
					ve.ui.MWCitationDialog.call( this, config );
				};
				OO.inheritClass( dialog, ve.ui.MWCitationDialog );
				dialog.static.name = name;
				dialog.static.icon = item.icon;
				dialog.static.title = item.title;
				ve.ui.windowFactory.register( dialog );
			}
		}
	}
};

/**
 * Get HTML to send to Parsoid. This takes a document generated by the converter and
 * transplants the head tag from the old document into it, as well as the attributes on the
 * html and body tags.
 *
 * @param {HTMLDocument} newDoc Document generated by ve.dm.Converter. Will be modified.
 * @returns {string} Full HTML document
 */
ve.init.mw.Target.prototype.getHtml = function ( newDoc ) {
	var i, len, oldDoc = this.doc;

	function copyAttributes( from, to ) {
		var i, len;
		for ( i = 0, len = from.attributes.length; i < len; i++ ) {
			to.setAttribute( from.attributes[i].name, from.attributes[i].value );
		}
	}

	// Copy the head from the old document
	for ( i = 0, len = oldDoc.head.childNodes.length; i < len; i++ ) {
		newDoc.head.appendChild( oldDoc.head.childNodes[i].cloneNode( true ) );
	}
	// Copy attributes from the old document for the html, head and body
	copyAttributes( oldDoc.documentElement, newDoc.documentElement );
	copyAttributes( oldDoc.head, newDoc.head );
	copyAttributes( oldDoc.body, newDoc.body );
	$( newDoc )
		.find(
			'div[id="myEventWatcherDiv"], ' + // Bug 51423
			'embed[type="application/iodbc"], ' + // Bug 51521
			'embed[type="application/x-datavault"], ' + // Bug 52791
			'script[id="FoxLingoJs"], ' + // Bug 52884
			'style[id="_clearly_component__css"], ' + // Bug 53252
			'div[id="sendToInstapaperResults"], ' + // Bug 61776
			'embed[id^="xunlei_com_thunder_helper_plugin"], ' + // Bug 63121
			'object[type="cosymantecnisbfw"], script[id="NortonInternetSecurityBF"], ' + // Bug 63229
			'div[id="kloutify"], ' + // Bug 67006
			'div[id^="mittoHidden"]' // Bug 68900#c1
		)
		.remove();
	// Add doctype manually
	return '<!doctype html>' + ve.serializeXhtml( newDoc );
};

/**
 * Load the editor.
 *
 * This method initiates an API request for the page data unless dataPromise is passed in,
 * in which case it waits for that promise instead.
 *
 * @param {jQuery.Promise} [dataPromise] Promise for pending request, if any
 * @returns {boolean} Loading has been started
*/
ve.init.mw.Target.prototype.load = function ( dataPromise ) {
	// Prevent duplicate requests
	if ( this.loading ) {
		return false;
	}
	this.events.timings.activationStart = ve.now();

	this.loading = dataPromise || mw.libs.ve.targetLoader.requestPageData( this.pageName, this.requestedRevId );
	this.loading
		.done( ve.init.mw.Target.onLoad.bind( this ) )
		.fail( ve.init.mw.Target.onLoadError.bind( this ) );

	return true;
};

/**
 * Clear the state of this target, preparing it to be reactivated later.
 */
ve.init.mw.Target.prototype.clearState = function () {
	this.clearPreparedCacheKey();
	this.loading = false;
	this.saving = false;
	this.diffing = false;
	this.serializing = false;
	this.submitting = false;
	this.baseTimeStamp = null;
	this.startTimeStamp = null;
	this.doc = null;
	this.originalHtml = null;
	this.editNotices = null;
	this.$checkboxes = null;
	this.remoteNotices = [];
	this.localNoticeMessages = [];
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
 * @returns {jQuery.Promise} Abortable promise, resolved with the cache key.
 */
ve.init.mw.Target.prototype.prepareCacheKey = function ( doc ) {
	var xhr, html,
		start = ve.now(),
		deferred = $.Deferred(),
		target = this;

	if ( this.preparedCacheKeyPromise && this.preparedCacheKeyPromise.doc === doc ) {
		return this.preparedCacheKeyPromise;
	}
	this.clearPreparedCacheKey();

	html = EasyDeflate.deflate( this.getHtml( doc ) );

	xhr = new mw.Api().post(
		{
			action: 'visualeditor',
			paction: 'serializeforcache',
			html: html,
			page: this.pageName,
			oldid: this.revid
		},
		{ contentType: 'multipart/form-data' }
	)
		.done( function ( response ) {
			var trackData = { duration: ve.now() - start };
			if ( response.visualeditor && typeof response.visualeditor.cachekey === 'string' ) {
				target.events.track( 'performance.system.serializeforcache', trackData );
				deferred.resolve( response.visualeditor.cachekey );
			} else {
				target.events.track( 'performance.system.serializeforcache.nocachekey', trackData );
				deferred.reject();
			}
		} )
		.fail( function () {
			target.events.track( 'performance.system.serializeforcache.fail', { duration: ve.now() - start } );
			deferred.reject();
		} );

	this.preparedCacheKeyPromise = deferred.promise( {
		abort: xhr.abort,
		html: html,
		doc: doc
	} );
	return this.preparedCacheKeyPromise;
};

/**
 * Get the prepared wikitext, if any. Same as prepareWikitext() but does not initiate a request
 * if one isn't already pending or finished. Instead, it returns a rejected promise in that case.
 *
 * @param {HTMLDocument} doc Document to serialize
 * @returns {jQuery.Promise} Abortable promise, resolved with the cache key.
 */
ve.init.mw.Target.prototype.getPreparedCacheKey = function ( doc ) {
	var deferred;
	if ( this.preparedCacheKeyPromise && this.preparedCacheKeyPromise.doc === doc ) {
		return this.preparedCacheKeyPromise;
	}
	deferred = $.Deferred();
	deferred.reject();
	return deferred.promise();
};

/**
 * Clear the promise for the prepared wikitext cache key, and abort it if it's still in progress.
 */
ve.init.mw.Target.prototype.clearPreparedCacheKey = function () {
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
 * @param {HTMLDocument} doc Document to submit
 * @param {Object} options POST parameters to send. Do not include 'html', 'cachekey' or 'format'.
 * @param {string} [eventName] If set, log an event when the request completes successfully. The
 *  full event name used will be 'performance.system.{eventName}.withCacheKey' or .withoutCacheKey
 *  depending on whether or not a cache key was used.
 * @returns {jQuery.Promise}
 */
ve.init.mw.Target.prototype.tryWithPreparedCacheKey = function ( doc, options, eventName ) {
	var data,
		preparedCacheKey = this.getPreparedCacheKey( doc ),
		target = this;

	data = ve.extendObject( {}, options, { format: 'json' } );

	function ajaxRequest( cachekey, isRetried ) {
		var start = ve.now(),
			fullEventName;

		if ( typeof cachekey === 'string' ) {
			data.cachekey = cachekey;
		} else {
			// Getting a cache key failed, fall back to sending the HTML
			data.html = preparedCacheKey && preparedCacheKey.html || EasyDeflate.deflate( target.getHtml( doc ) );
			// If using the cache key fails, we'll come back here with cachekey still set
			delete data.cachekey;
		}
		return new mw.Api().post( data, { contentType: 'multipart/form-data' } )
			.then(
				function ( response, jqxhr ) {
					var eventData = {
						bytes: $.byteLength( jqxhr.responseText ),
						duration: ve.now() - start
					};

					// Log data about the request if eventName was set
					if ( eventName ) {
						fullEventName = 'performance.system.' + eventName +
							( typeof cachekey === 'string' ? '.withCacheKey' : '.withoutCacheKey' );
						target.events.track( fullEventName, eventData );
					}
					return jqxhr;
				},
				function ( errorName, errorObject ) {
					var eventData;
					if ( errorObject && errorObject.xhr ) {
						eventData = {
							bytes: $.byteLength( errorObject.xhr.responseText ),
							duration: ve.now() - start
						};

						if ( eventName ) {
							if ( errorName === 'badcachekey' ) {
								fullEventName = 'performance.system.' + eventName + '.badCacheKey';
							} else {
								fullEventName = 'performance.system.' + eventName + '.withoutCacheKey';
							}
							target.events.track( fullEventName, eventData );
						}
					}
					// This cache key is evidently bad, clear it
					target.clearPreparedCacheKey();
					if ( !isRetried ) {
						// Try again without a cache key
						return ajaxRequest( null, true );
					} else {
						// Failed twice in a row, must be some other error - let caller handle it.
						// FIXME Can't just `return this` because all callers are broken.
						return $.Deferred().reject( null, errorName, errorObject ).promise();
					}
				}
			);
	}

	// If we successfully get prepared wikitext, then invoke ajaxRequest() with the cache key,
	// otherwise invoke it without.
	return preparedCacheKey.then( ajaxRequest, ajaxRequest );
};

/**
 * Post DOM data to the Parsoid API.
 *
 * This method performs an asynchronous action and uses a callback function to handle the result.
 *
 *     target.save( dom, { summary: 'test', minor: true, watch: false } );
 *
 * @method
 * @param {HTMLDocument} doc Document to save
 * @param {Object} options Saving options. All keys are passed through, including unrecognized ones.
 *  - {string} summary Edit summary
 *  - {boolean} minor Edit is a minor edit
 *  - {boolean} watch Watch the page
 * @returns {boolean} Saving has been started
*/
ve.init.mw.Target.prototype.save = function ( doc, options ) {
	var data;
	// Prevent duplicate requests
	if ( this.saving ) {
		return false;
	}

	data = ve.extendObject( {}, options, {
		action: 'visualeditoredit',
		page: this.pageName,
		oldid: this.revid,
		basetimestamp: this.baseTimeStamp,
		starttimestamp: this.startTimeStamp,
		token: this.editToken
	} );

	this.saving = this.tryWithPreparedCacheKey( doc, data, 'save' )
		.done( ve.init.mw.Target.onSave.bind( this, doc, data ) )
		.fail( this.onSaveError.bind( this, doc, data ) );

	return true;
};

/**
 * Post DOM data to the Parsoid API to retrieve wikitext diff.
 *
 * @method
 * @param {HTMLDocument} doc Document to compare against (via wikitext)
 * @returns {boolean} Diffing has been started
*/
ve.init.mw.Target.prototype.showChanges = function ( doc ) {
	if ( this.diffing ) {
		return false;
	}
	this.diffing = this.tryWithPreparedCacheKey( doc, {
		action: 'visualeditor',
		paction: 'diff',
		page: this.pageName,
		oldid: this.revid
	}, 'diff' )
		.done( ve.init.mw.Target.onShowChanges.bind( this ) )
		.fail( ve.init.mw.Target.onShowChangesError.bind( this ) );

	return true;
};

/**
 * Post wikitext to MediaWiki.
 *
 * This method performs a synchronous action and will take the user to a new page when complete.
 *
 *     target.submit( wikitext, { wpSummary: 'test', wpMinorEdit: 1, wpSave: 1 } );
 *
 * @method
 * @param {string} wikitext Wikitext to submit
 * @param {Object} fields Other form fields to add (e.g. wpSummary, wpWatchthis, etc.). To actually
 *  save the wikitext, add { wpSave: 1 }. To go to the diff view, add { wpDiff: 1 }.
 * @returns {boolean} Submitting has been started
*/
ve.init.mw.Target.prototype.submit = function ( wikitext, fields ) {
	// Prevent duplicate requests
	if ( this.submitting ) {
		return false;
	}
	// Save DOM
	this.submitting = true;
	var key,
		$form = $( '<form method="post" enctype="multipart/form-data" style="display: none;"></form>' ),
		params = ve.extendObject( {
			format: 'text/x-wiki',
			model: 'wikitext',
			oldid: this.requestedRevId,
			wpStarttime: this.startTimeStamp,
			wpEdittime: this.baseTimeStamp,
			wpTextbox1: wikitext,
			wpEditToken: this.editToken
		}, fields );
	// Add params as hidden fields
	for ( key in params ) {
		$form.append( $( '<input>' ).attr( { type: 'hidden', name: key, value: params[key] } ) );
	}
	// Submit the form, mimicking a traditional edit
	// Firefox requires the form to be attached
	$form.attr( 'action', this.submitUrl ).appendTo( 'body' ).submit();
	return true;
};

/**
 * Get Wikitext data from the Parsoid API.
 *
 * This method performs an asynchronous action and uses a callback function to handle the result.
 *
 *     target.serialize(
 *         dom,
 *         function ( wikitext ) {
 *             // Do something with the loaded DOM
 *         }
 *     );
 *
 * @method
 * @param {HTMLDocument} doc Document to serialize
 * @param {Function} callback Function to call when complete, accepts error and wikitext arguments
 * @returns {boolean} Serializing has been started
*/
ve.init.mw.Target.prototype.serialize = function ( doc, callback ) {
	// Prevent duplicate requests
	if ( this.serializing ) {
		return false;
	}
	this.serializeCallback = callback;
	this.serializing = this.tryWithPreparedCacheKey( doc, {
		action: 'visualeditor',
		paction: 'serialize',
		page: this.pageName,
		oldid: this.revid
	}, 'serialize' )
		.done( ve.init.mw.Target.onSerialize.bind( this ) )
		.fail( ve.init.mw.Target.onSerializeError.bind( this ) );
	return true;
};

/**
 * Get list of edit notices.
 *
 * @returns {Object|null} List of edit notices or null if none are loaded
 */
ve.init.mw.Target.prototype.getEditNotices = function () {
	return this.editNotices;
};

// FIXME: split out view specific functionality, emit to subclass

/**
 * Switch to editing mode.
 *
 * @method
 * @param {HTMLDocument} doc HTML DOM to edit
 * @param {Function} [callback] Callback to call when done
 */
ve.init.mw.Target.prototype.setupSurface = function ( doc, callback ) {
	var target = this;
	setTimeout( function () {
		// Build model
		ve.track( 'trace.convertModelFromDom.enter' );
		var dmDoc = ve.dm.converter.getModelFromDom(
			doc,
			null,
			mw.config.get( 'wgVisualEditor' ).pageLanguageCode,
			mw.config.get( 'wgVisualEditor' ).pageLanguageDir
		);
		ve.track( 'trace.convertModelFromDom.exit' );
		// Build DM tree now (otherwise it gets lazily built when building the CE tree)
		ve.track( 'trace.buildModelTree.enter' );
		dmDoc.buildNodeTree();
		ve.track( 'trace.buildModelTree.exit' );
		setTimeout( function () {
			// Clear dummy surfaces
			target.clearSurfaces();

			// Create ui.Surface (also creates ce.Surface and dm.Surface and builds CE tree)
			ve.track( 'trace.createSurface.enter' );
			var surface = target.addSurface( dmDoc ),
				surfaceView = surface.getView(),
				$documentNode = surfaceView.getDocument().getDocumentNode().$element;
			ve.track( 'trace.createSurface.exit' );

			surface.$element
				.addClass( 've-init-mw-viewPageTarget-surface' )
				.addClass( target.protectedClasses )
				.appendTo( target.$element );

			// Apply mw-body-content to the view (ve-ce-surface).
			// Not to surface (ve-ui-surface), since that contains both the view
			// and the overlay container, and we don't want inspectors to
			// inherit skin typography styles for wikipage content.
			surfaceView.$element.addClass( 'mw-body-content' );
			$documentNode.addClass(
				// Add appropriately mw-content-ltr or mw-content-rtl class
				'mw-content-' + mw.config.get( 'wgVisualEditor' ).pageLanguageDir
			);

			target.setSurface( surface );

			setTimeout( function () {
				// Initialize surface
				ve.track( 'trace.initializeSurface.enter' );
				surface.getContext().toggle( false );

				target.active = true;
				// Now that the surface is attached to the document and ready,
				// let it initialize itself
				surface.initialize();
				ve.track( 'trace.initializeSurface.exit' );
				setTimeout( callback );
			} );
		} );
	} );
};

/**
 * Move the cursor in the editor to section specified by this.section.
 * Do nothing if this.section is undefined.
 *
 * @method
 */
ve.init.mw.Target.prototype.restoreEditSection = function () {
	if ( this.section !== undefined && this.section > 0 ) {
		var surfaceView = this.getSurface().getView(),
			$documentNode = surfaceView.getDocument().getDocumentNode().$element,
			$section = $documentNode.find( 'h1, h2, h3, h4, h5, h6' ).eq( this.section - 1 ),
			headingNode = $section.data( 'view' );

		if ( $section.length && new mw.Uri().query.summary === undefined ) {
			this.initialEditSummary = '/* ' +
				ve.graphemeSafeSubstring( $section.text(), 0, 244 ) + ' */ ';
		}

		if ( headingNode ) {
			this.goToHeading( headingNode );
		}

		this.section = undefined;
	}
};

/**
 * Move the cursor to a given heading and scroll to it.
 *
 * @method
 * @param {ve.ce.HeadingNode} headingNode Heading node to scroll to
 */
ve.init.mw.Target.prototype.goToHeading = function ( headingNode ) {
	var nextNode, offset,
		target = this,
		offsetNode = headingNode,
		surfaceModel = this.getSurface().getView().getModel(),
		lastHeadingLevel = -1;

	// Find next sibling which isn't a heading
	while ( offsetNode instanceof ve.ce.HeadingNode && offsetNode.getModel().getAttribute( 'level' ) > lastHeadingLevel ) {
		lastHeadingLevel = offsetNode.getModel().getAttribute( 'level' );
		// Next sibling
		nextNode = offsetNode.parent.children[offsetNode.parent.children.indexOf( offsetNode ) + 1];
		if ( !nextNode ) {
			break;
		}
		offsetNode = nextNode;
	}
	offset = surfaceModel.getDocument().data.getNearestContentOffset(
		offsetNode.getModel().getOffset(), 1
	);
	// onDocumentFocus is debounced, so wait for that to happen before setting
	// the model selection, otherwise it will get reset
	this.getSurface().getView().once( 'focus', function () {
		surfaceModel.setLinearSelection( new ve.Range( offset ) );
		target.scrollToHeading( headingNode );
	} );
};

/**
 * Scroll to a given heading in the document.
 *
 * @method
 * @param {ve.ce.HeadingNode} headingNode Heading node to scroll to
 */
ve.init.mw.Target.prototype.scrollToHeading = function ( headingNode ) {
	var $window = $( OO.ui.Element.static.getWindow( this.$element ) );

	$window.scrollTop( headingNode.$element.offset().top - this.getToolbar().$element.height() );
};
