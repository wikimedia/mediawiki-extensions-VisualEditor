/*!
 * VisualEditor MediaWiki Initialization Target class.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Initialization MediaWiki target.
 *
 * @class
 * @extends ve.init.Target
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.init.mw.Target = function VeInitMwTarget( config ) {
	// Parent constructor
	ve.init.mw.Target.super.call( this, config );

	this.active = false;
	this.pageName = mw.config.get( 'wgRelevantPageName' );
	this.editToken = mw.user.tokens.get( 'editToken' );

	// Initialization
	this.$element.addClass( 've-init-mw-target' );
};

/* Inheritance */

OO.inheritClass( ve.init.mw.Target, ve.init.Target );

/* Events */

/**
 * @event surfaceReady
 */

/* Static Properties */

/**
 * Symbolic name for this target class.
 *
 * @static
 * @property {string}
 * @inheritable
 */
ve.init.mw.Target.static.name = null;

ve.init.mw.Target.static.toolbarGroups = [
	// History
	{ include: [ 'undo', 'redo' ] },
	// Format
	{
		classes: [ 've-test-toolbar-format' ],
		type: 'menu',
		title: OO.ui.deferMsg( 'visualeditor-toolbar-format-tooltip' ),
		include: [ { group: 'format' } ],
		promote: [ 'paragraph' ],
		demote: [ 'preformatted', 'blockquote', 'heading1' ]
	},
	// Style
	{
		classes: [ 've-test-toolbar-style' ],
		type: 'list',
		icon: 'textStyle',
		title: OO.ui.deferMsg( 'visualeditor-toolbar-style-tooltip' ),
		include: [ { group: 'textStyle' }, 'language', 'clear' ],
		forceExpand: [ 'bold', 'italic', 'clear' ],
		promote: [ 'bold', 'italic' ],
		demote: [ 'strikethrough', 'code', 'underline', 'language', 'big', 'small', 'clear' ]
	},
	// Link
	{ include: [ 'link' ] },
	// Structure
	{
		classes: [ 've-test-toolbar-structure' ],
		type: 'list',
		icon: 'listBullet',
		title: OO.ui.deferMsg( 'visualeditor-toolbar-structure' ),
		include: [ { group: 'structure' } ],
		demote: [ 'outdent', 'indent' ]
	},
	// Insert
	{
		classes: [ 've-test-toolbar-insert' ],
		label: OO.ui.deferMsg( 'visualeditor-toolbar-insert' ),
		title: OO.ui.deferMsg( 'visualeditor-toolbar-insert' ),
		include: '*',
		forceExpand: [ 'media', 'transclusion', 'insertTable' ],
		promote: [ 'media', 'transclusion', 'insertTable' ]
	},
	// SpecialCharacter
	{ include: [ 'specialCharacter' ] }
];

ve.init.mw.Target.static.importRules = {
	external: {
		blacklist: [
			// Annotations
			'link/mwExternal', 'textStyle/span', 'textStyle/font', 'textStyle/underline', 'meta/language', 'textStyle/datetime',
			// Nodes
			'article', 'section', 'div', 'alienInline', 'alienBlock', 'comment'
		],
		htmlBlacklist: {
			remove: [ 'sup.reference:not( [typeof] )' ],
			unwrap: [ 'fieldset', 'legend' ]
		},
		removeOriginalDomElements: true,
		nodeSanitization: true
	},
	all: null
};

/**
 * Type of integration. Used by ve.init.mw.trackSubscriber.js for event tracking.
 *
 * @static
 * @property {string}
 * @inheritable
 */
ve.init.mw.Target.static.integrationType = null;

/**
 * Type of platform. Used by ve.init.mw.trackSubscriber.js for event tracking.
 *
 * @static
 * @property {string}
 * @inheritable
 */
ve.init.mw.Target.static.platformType = null;

/* Static Methods */

/**
 * Fix the base URL from Parsoid if necessary.
 *
 * Absolutizes the base URL if it's relative, and sets a base URL based on wgArticlePath
 * if there was no base URL at all.
 *
 * @param {HTMLDocument} doc Parsoid document
 */
ve.init.mw.Target.static.fixBase = function ( doc ) {
	ve.fixBase( doc, document, ve.resolveUrl(
		// Don't replace $1 with the page name, because that'll break if
		// the page name contains a slash
		mw.config.get( 'wgArticlePath' ).replace( '$1', '' ),
		document
	) );
};

/**
 * Create a document model from an HTML document.
 *
 * @param {HTMLDocument} doc HTML document
 * @param {string} mode Editing mode
 * @return {ve.dm.Document} Document model
 */
ve.init.mw.Target.static.createModelFromDom = function ( doc, mode ) {
	var i, l, children, data,
		conf = mw.config.get( 'wgVisualEditor' );

	if ( mode === 'source' ) {
		children = doc.body.children;
		data = [];

		// Wikitext documents are just plain text paragraphs, so we can just do a simple manual conversion.
		for ( i = 0, l = children.length; i < l; i++ ) {
			data.push( { type: 'paragraph' } );
			ve.batchPush( data, children[ i ].textContent.split( '' ) );
			data.push( { type: '/paragraph' } );
		}
		data.push( { type: 'internalList' }, { type: '/internalList' } );
		return new ve.dm.Document( data, doc, null, null, null, conf.pageLanguageCode, conf.pageLanguageDir );
	} else {
		return ve.dm.converter.getModelFromDom( doc, {
			lang: conf.pageLanguageCode,
			dir: conf.pageLanguageDir
		} );
	}
};

// Deprecated alias
ve.init.mw.Target.prototype.createModelFromDom = function () {
	return this.constructor.static.createModelFromDom.apply( this.constructor.static, arguments );
};

/**
 * @inheritdoc
 * @param {number} [section] Section
 */
ve.init.mw.Target.static.parseDocument = function ( documentString, mode, section ) {
	var doc, sectionNode;
	if ( mode === 'source' ) {
		// Parent method
		doc = ve.init.mw.Target.super.static.parseDocument.call( this, documentString, mode );
	} else {
		// Parsoid documents are XHTML so we can use parseXhtml which fixed some IE issues.
		doc = ve.parseXhtml( documentString );
		if ( section !== undefined ) {
			sectionNode = doc.body.querySelector( '[data-mw-section-id="' + section + '"]' );
			doc.body.innerHTML = '';
			if ( sectionNode ) {
				doc.body.appendChild( sectionNode );
			}
		}
		// Strip Parsoid sections
		ve.unwrapParsoidSections( doc.body );
		// Strip legacy IDs, for example in section headings
		ve.stripParsoidFallbackIds( doc.body );
	}
	// Fix relative or missing base URL if needed
	this.fixBase( doc );

	return doc;
};

/* Methods */

/**
 * Handle both DOM and modules being loaded and ready.
 *
 * @param {HTMLDocument} doc HTML document
 */
ve.init.mw.Target.prototype.documentReady = function ( doc ) {
	this.setupSurface( doc, this.surfaceReady.bind( this ) );
};

/**
 * Once surface is ready, initialize the UI
 *
 * @method
 * @fires surfaceReady
 */
ve.init.mw.Target.prototype.surfaceReady = function () {
	this.emit( 'surfaceReady' );
};

/**
 * Get HTML to send to Parsoid. This takes a document generated by the converter and
 * transplants the head tag from the old document into it, as well as the attributes on the
 * html and body tags.
 *
 * @param {HTMLDocument} newDoc Document generated by ve.dm.Converter. Will be modified.
 * @param {HTMLDocument} [oldDoc] Old document to copy attributes from.
 * @return {string} Full HTML document
 */
ve.init.mw.Target.prototype.getHtml = function ( newDoc, oldDoc ) {
	var i, len;

	function copyAttributes( from, to ) {
		var i, len;
		for ( i = 0, len = from.attributes.length; i < len; i++ ) {
			to.setAttribute( from.attributes[ i ].name, from.attributes[ i ].value );
		}
	}

	if ( oldDoc ) {
		// Copy the head from the old document
		for ( i = 0, len = oldDoc.head.childNodes.length; i < len; i++ ) {
			newDoc.head.appendChild( oldDoc.head.childNodes[ i ].cloneNode( true ) );
		}
		// Copy attributes from the old document for the html, head and body
		copyAttributes( oldDoc.documentElement, newDoc.documentElement );
		copyAttributes( oldDoc.head, newDoc.head );
		copyAttributes( oldDoc.body, newDoc.body );
	}

	// Filter out junk that may have been added by browser plugins
	$( newDoc )
		.find(
			'script, ' + // T54884, T65229, T96533, T103430
			'noscript, ' + // T144891
			'object, ' + // T65229
			'style:not( [ data-mw ] ), ' + // T55252, but allow <style data-mw/> e.g. TemplateStyles T188143
			'embed, ' + // T53521, T54791, T65121
			'img[src^="data:"], ' + // T192392
			'div[id="myEventWatcherDiv"], ' + // T53423
			'div[id="sendToInstapaperResults"], ' + // T63776
			'div[id="kloutify"], ' + // T69006
			'div[id^="mittoHidden"], ' + // T70900
			'div.donut-container' // Web of Trust (T189148)
		)
		.remove();
	// Add doctype manually
	return '<!doctype html>' + ve.serializeXhtml( newDoc );
};

/**
 * Track an event
 *
 * @param {string} name Event name
 */
ve.init.mw.Target.prototype.track = function () {};

/**
 * @inheritdoc
 */
ve.init.mw.Target.prototype.createTargetWidget = function ( config ) {
	if ( this.getSurface().getMode() === 'source' ) {
		// Reset to visual mode for target widgets
		return new ve.ui.MWTargetWidget( ve.extendObject( {
			commandRegistry: ve.ui.commandRegistry,
			sequenceRegistry: ve.ui.sequenceRegistry,
			dataTransferHandlerFactory: ve.ui.dataTransferHandlerFactory
		}, config ) );
	} else {
		return new ve.ui.MWTargetWidget( config );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.Target.prototype.createSurface = function ( dmDoc, config ) {
	var importRules, surface, documentView;

	if ( config && config.mode === 'source' ) {
		importRules = ve.copy( this.constructor.static.importRules );
		importRules.all = importRules.all || {};
		// Preserve empty linebreaks on paste in source editor
		importRules.all.keepEmptyContentBranches = true;
		config = this.getSurfaceConfig( ve.extendObject( {}, config, {
			importRules: importRules
		} ) );
		return new ve.ui.MWWikitextSurface( dmDoc, config );
	}

	// Parent method
	surface = ve.init.mw.Target.super.prototype.createSurface.apply( this, arguments );

	documentView = surface.getView().getDocument();

	// T164790
	documentView.getDocumentNode().$element.addClass( 'mw-parser-output' );

	function onLangChange() {
		// Add appropriately mw-content-ltr or mw-content-rtl class
		documentView.getDocumentNode().$element
			.removeClass( 'mw-content-ltr mw-content-rtl' )
			.addClass( 'mw-content-' + documentView.getDir() );
	}

	documentView.on( 'langChange', onLangChange );
	onLangChange();

	return surface;
};

/**
 * @inheritdoc
 */
ve.init.mw.Target.prototype.getSurfaceConfig = function ( config ) {
	// If we're not asking for a specific mode's config, use the default mode.
	config = ve.extendObject( { mode: this.defaultMode }, config );
	return ve.init.mw.Target.super.prototype.getSurfaceConfig.call( this, ve.extendObject( {
		// Provide the wikitext versions of the registries, if we're using source mode
		commandRegistry: config.mode === 'source' ? ve.ui.wikitextCommandRegistry : ve.ui.commandRegistry,
		sequenceRegistry: config.mode === 'source' ? ve.ui.wikitextSequenceRegistry : ve.ui.sequenceRegistry,
		dataTransferHandlerFactory: config.mode === 'source' ? ve.ui.wikitextDataTransferHandlerFactory : ve.ui.dataTransferHandlerFactory
	}, config ) );
};

/**
 * Switch to editing mode.
 *
 * @method
 * @param {HTMLDocument} doc HTML document
 * @param {Function} [callback] Callback to call when done
 */
ve.init.mw.Target.prototype.setupSurface = function ( doc, callback ) {
	var target = this;
	setTimeout( function () {
		// Build model
		var dmDoc;

		target.track( 'trace.convertModelFromDom.enter' );
		dmDoc = target.constructor.static.createModelFromDom( doc, target.getDefaultMode() );
		target.track( 'trace.convertModelFromDom.exit' );

		// Build DM tree now (otherwise it gets lazily built when building the CE tree)
		target.track( 'trace.buildModelTree.enter' );
		dmDoc.buildNodeTree();
		target.track( 'trace.buildModelTree.exit' );

		setTimeout( function () {
			var surface;
			// Clear dummy surfaces
			target.clearSurfaces();

			// Create ui.Surface (also creates ce.Surface and dm.Surface and builds CE tree)
			target.track( 'trace.createSurface.enter' );
			surface = target.addSurface( dmDoc );
			// Add classes specific to surfaces attached directly to the target,
			// as opposed to TargetWidget surfaces
			surface.$element.addClass( 've-init-mw-target-surface' );
			target.track( 'trace.createSurface.exit' );

			target.dummyToolbar = false;

			target.setSurface( surface );

			setTimeout( function () {
				// Initialize surface
				target.track( 'trace.initializeSurface.enter' );

				target.active = true;
				// Now that the surface is attached to the document and ready,
				// let it initialize itself
				surface.initialize();

				target.track( 'trace.initializeSurface.exit' );
				setTimeout( callback );
			} );
		} );
	} );
};

/**
 * @inheritdoc
 */
ve.init.mw.Target.prototype.setSurface = function ( surface ) {
	if ( !surface.$element.parent().length ) {
		this.$element.append( surface.$element );
	}

	// Parent method
	ve.init.mw.Target.super.prototype.setSurface.apply( this, arguments );
};

/**
 * Refresh our stored edit/csrf token
 *
 * This should be called in response to a badtoken error, to resolve whether the
 * token was expired / the user changed. If the user did change, this updates
 * the current user.
 *
 * @return {jQuery.Promise} Promise resolved with whether we switched users
 */
ve.init.mw.Target.prototype.refreshEditToken = function () {
	var api = new mw.Api(),
		deferred = $.Deferred(),
		target = this;
	api.get( {
		action: 'query',
		meta: 'tokens|userinfo',
		type: 'csrf'
	} )
		.done( function ( data ) {
			var
				userInfo = data.query && data.query.userinfo,
				editToken = data.query && data.query.tokens && data.query.tokens.csrftoken,
				isAnon = mw.user.isAnon();

			if ( userInfo && editToken ) {
				target.editToken = editToken;

				if (
					( isAnon && userInfo.anon !== undefined ) ||
						// Comparing id instead of name to protect against possible
						// normalisation and against case where the user got renamed.
						mw.config.get( 'wgUserId' ) === userInfo.id
				) {
					// New session is the same user still
					deferred.resolve( false );
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
					} else {
						// New session is a different user
						mw.config.set( { wgUserId: userInfo.id, wgUserName: userInfo.name } );
					}
					deferred.resolve( true );
				}
			} else {
				deferred.reject();
			}
		} )
		.fail( function () {
			deferred.reject();
		} );
	return deferred.promise();
};

/**
 * Get a wikitext fragment from a document
 *
 * @param {ve.dm.Document} doc Document
 * @param {boolean} [useRevision=true] Whether to use the revision ID + ETag
 * @param {boolean} [isRetry=false] Whether this call is retrying a prior call
 * @return {jQuery.Promise} Abortable promise which resolves with a wikitext string
 */
ve.init.mw.Target.prototype.getWikitextFragment = function ( doc, useRevision, isRetry ) {
	var promise, xhr,
		target = this,
		params = {
			action: 'visualeditoredit',
			token: this.editToken,
			paction: 'serialize',
			html: ve.dm.converter.getDomFromModel( doc ).body.innerHTML,
			page: this.pageName
		};

	// Optimise as a no-op
	if ( params.html === '' ) {
		return $.Deferred().resolve( '' );
	}

	if ( useRevision === undefined || useRevision ) {
		params.oldid = this.revid;
		params.etag = this.etag;
	}

	xhr = new mw.Api().post(
		params,
		{ contentType: 'multipart/form-data' }
	);

	promise = xhr.then( function ( response ) {
		if ( response.visualeditoredit ) {
			return response.visualeditoredit.content;
		}
		return $.Deferred().reject();
	}, function ( error ) {
		if ( error === 'badtoken' && !isRetry ) {
			return target.refreshEditToken().then( function () {
				return target.getWikitextFragment( doc, useRevision, true );
			} );
		}
	} );

	promise.abort = function () {
		xhr.abort();
	};

	return promise;
};

/**
 * Parse a fragment of wikitext into HTML
 *
 * @param {string} wikitext Wikitext
 * @param {boolean} pst Perform pre-save transform
 * @param {ve.dm.Document} [doc] Parse for a specific document
 * @return {jQuery.Promise} Abortable promise
 */
ve.init.mw.Target.prototype.parseWikitextFragment = function ( wikitext, pst ) {
	return new mw.Api().post( {
		action: 'visualeditor',
		paction: 'parsefragment',
		page: this.pageName,
		wikitext: wikitext,
		pst: pst
	} );
};
