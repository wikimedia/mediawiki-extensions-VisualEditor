/*!
 * VisualEditor MediaWiki Initialization Target class.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Initialization MediaWiki target.
 *
 * @class
 * @extends ve.init.Target
 *
 * @constructor
 * @param {Object} config
 * @param {string[]} [config.surfaceClasses=[]] Surface classes to apply
 */
ve.init.mw.Target = function VeInitMwTarget( config ) {
	this.surfaceClasses = config.surfaceClasses || [];

	// Parent constructor
	ve.init.mw.Target.super.call( this, config );

	this.active = false;
	this.pageName = mw.config.get( 'wgRelevantPageName' );
	this.recovered = false;
	// TEMPORARY (T433034): recovered session needs an old-hash migration on restore
	this.hashMigration = false;
	this.fromEditedState = false;
	this.originalHtml = null;

	// Initialization
	this.$element.addClass( 've-init-mw-target' );
};

/* Inheritance */

OO.inheritClass( ve.init.mw.Target, ve.init.Target );

/* Events */

/**
 * Fired when the target has been torn down
 *
 * @event ve.init.mw.Target#teardown
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
	{
		name: 'history',
		include: [ { group: 'history' } ]
	},
	{
		name: 'format',
		type: 'menu',
		title: OO.ui.deferMsg( 'visualeditor-toolbar-format-tooltip' ),
		include: [ { group: 'format' } ],
		promote: [ 'paragraph' ],
		demote: [ 'preformatted', 'blockquote', 'heading1' ]
	},
	{
		name: 'style',
		type: 'list',
		icon: 'textStyle',
		title: OO.ui.deferMsg( 'visualeditor-toolbar-style-tooltip' ),
		label: OO.ui.deferMsg( 'visualeditor-toolbar-style-tooltip' ),
		invisibleLabel: true,
		include: [ { group: 'textStyle' } ],
		forceExpand: [ 'bold', 'italic', 'clear' ],
		promote: [ 'bold', 'italic', 'superscript', 'subscript' ],
		demote: [ 'clear' ]
	},
	{
		name: 'link',
		include: [ 'link' ]
	},
	{
		name: 'structure',
		type: 'list',
		icon: 'listBullet',
		title: OO.ui.deferMsg( 'visualeditor-toolbar-structure' ),
		label: OO.ui.deferMsg( 'visualeditor-toolbar-structure' ),
		invisibleLabel: true,
		include: [ { group: 'structure' } ],
		demote: [ 'outdent', 'indent' ]
	},
	{
		name: 'insert',
		label: OO.ui.deferMsg( 'visualeditor-toolbar-insert' ),
		title: OO.ui.deferMsg( 'visualeditor-toolbar-insert' ),
		narrowConfig: {
			invisibleLabel: true,
			icon: 'add'
		},
		include: '*',
		forceExpand: [ 'media', 'transclusion', 'insertTable' ],
		promote: [ 'media', 'transclusion', 'insertTable' ]
	},
	{
		name: 'specialCharacter',
		include: [ 'specialCharacter' ]
	}
];

ve.init.mw.Target.static.importRules = ve.copy( ve.init.mw.Target.static.importRules );

ve.init.mw.Target.static.importRules.external.removeOriginalDomElements = true;

ve.init.mw.Target.static.importRules.external.blacklist = ve.extendObject( {
	// Annotations
	'textStyle/underline': true,
	'meta/language': true,
	'textStyle/datetime': true,
	'link/mwExternal': !mw.config.get( 'wgVisualEditorConfig' ).allowExternalLinkPaste,
	// Node
	article: true,
	section: true
}, ve.init.mw.Target.static.importRules.external.blacklist );

ve.init.mw.Target.static.importRules.external.htmlBlacklist.remove = ve.extendObject( {
	// TODO: Create a plugin system for extending the blacklist, so this code
	// can be moved to the Cite extension.
	// Remove reference numbers copied from MW read mode (T150418)
	'sup.reference:not( [typeof] )': true,
	// ...sometimes we need a looser match if the HTML has been mangled
	// in a third-party editor e.g. LibreOffice (T232461)
	'a[ href *= "#cite_note" ]': true
}, ve.init.mw.Target.static.importRules.external.htmlBlacklist.remove );

// This is required to prevent an invalid insertion (as mwHeading can only be at the root) (T339155)
// TODO: This should be handled by the DM based on ve.dm.MWHeadingNode.static.suggestedParentNodeTypes,
// rather than just throwing an exception.
// This would also not prevent pasting from a VE standalone editor as that is considered
// an internal paste.
ve.init.mw.Target.static.importRules.external.htmlBlacklist.unwrap = ve.extendObject( {
	'li h1, li h2, li h3, li h4, li h5, li h6': true,
	'blockquote h1, blockquote h2, blockquote h3, blockquote h4, blockquote h5, blockquote h6': true
}, ve.init.mw.Target.static.importRules.external.htmlBlacklist.unwrap );

/**
 * Type of integration. Used for event tracking.
 *
 * @static
 * @property {string}
 * @inheritable
 */
ve.init.mw.Target.static.integrationType = null;

/**
 * Type of platform. Used for event tracking.
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
 * @inheritdoc
 */
ve.init.mw.Target.static.createModelFromDom = function ( doc, mode, options ) {
	const conf = mw.config.get( 'wgVisualEditor' );

	options = ve.extendObject( {
		lang: conf.pageLanguageCode,
		dir: conf.pageLanguageDir
	}, options );

	// Parent method
	return ve.init.mw.Target.super.static.createModelFromDom.call( this, doc, mode, options );
};

// Deprecated alias
ve.init.mw.Target.prototype.createModelFromDom = function () {
	return this.constructor.static.createModelFromDom.apply( this.constructor.static, arguments );
};

/**
 * @inheritdoc
 * @param {string} documentString
 * @param {string} mode
 * @param {string|null} [section] Section. Use null to unwrap all sections.
 * @param {boolean} [onlySection=false] Only return the requested section, otherwise returns the
 *  whole document with just the requested section still wrapped (visual mode only).
 * @return {HTMLDocument|string} HTML document, or document string (source mode)
 */
ve.init.mw.Target.static.parseDocument = function ( documentString, mode, section, onlySection ) {
	let doc;
	if ( mode === 'source' ) {
		// Parent method
		doc = ve.init.mw.Target.super.static.parseDocument.call( this, documentString, mode );
	} else {
		doc = ve.createDocumentFromHtml( documentString );
		if ( section !== undefined ) {
			if ( onlySection ) {
				const sectionNode = doc.body.querySelector( '[data-mw-section-id="' + section + '"]' );
				doc.body.innerHTML = '';
				if ( sectionNode ) {
					doc.body.appendChild( sectionNode );
				}
			} else {
				// Strip Parsoid sections
				mw.libs.ve.unwrapParsoidSections( doc.body, section );
			}
		}
		// Strip legacy IDs, for example in section headings
		mw.libs.ve.stripParsoidFallbackIds( doc.body );
		// Re-duplicate deduplicated TemplateStyles, for correct rendering when editing a section or
		// when templates are removed during the edit
		mw.libs.ve.reduplicateStyles( doc.body );
		// Fix relative or missing base URL if needed
		this.fixBase( doc );
		// Test: Remove tags injected by plugins during parse (T298147)
		Array.prototype.forEach.call( doc.querySelectorAll( 'script' ), ( element ) => {
			function truncate( text, l ) {
				return text.length > l ? text.slice( 0, l ) + '…' : text;
			}
			const errorMessage = 'DOM content matching deny list found during parse:\n' + truncate( element.outerHTML, 100 ) +
				'\nContext:\n' + truncate( element.parentNode.outerHTML, 200 );
			mw.log.error( errorMessage );
			const err = new Error( errorMessage );
			err.name = 'VeDomDenyListWarning';
			mw.errorLogger.logError( err, 'error.visualeditor' );
			element.parentNode.removeChild( element );
		} );
	}

	return doc;
};

/* Methods */

/**
 * Handle both DOM and modules being loaded and ready.
 *
 * @param {HTMLDocument|string} doc HTML document or source text
 */
ve.init.mw.Target.prototype.documentReady = function ( doc ) {
	this.setupSurface( doc );
};

/**
 * Once surface is ready, initialize the UI
 *
 * @fires ve.init.Target#surfaceReady
 */
ve.init.mw.Target.prototype.surfaceReady = function () {
	this.emit( 'surfaceReady' );
};

/**
 * @deprecated Moved to mw.libs.ve.targetSaver.getHtml
 * @param {HTMLDocument} newDoc
 * @param {HTMLDocument} [oldDoc]
 * @return {string}
 */
ve.init.mw.Target.prototype.getHtml = function ( newDoc, oldDoc ) {
	OO.ui.warnDeprecation( 've.init.mw.Target#getHtml is deprecated. Use mw.libs.ve.targetSaver.getHtml.' );
	return mw.libs.ve.targetSaver.getHtml( newDoc, oldDoc );
};

/**
 * Track an event
 *
 * @param {string} name Event name
 */
ve.init.mw.Target.prototype.track = function () {};

/**
 * Get a list of CSS classes to be added to surfaces, and target widget surfaces
 *
 * @return {string[]} CSS classes
 */
ve.init.mw.Target.prototype.getSurfaceClasses = function () {
	return this.surfaceClasses;
};

/**
 * @inheritdoc
 */
ve.init.mw.Target.prototype.createTargetWidget = function ( config ) {
	return new ve.ui.MWTargetWidget( ve.extendObject( {
		// Reset to visual mode for target widgets
		modes: [ 'visual' ],
		defaultMode: 'visual',
		toolbarGroups: this.toolbarGroups.filter( ( group ) => !group.excludeFromTargetWidget &&
			// Deprecated: Don't rely on alignment to exclude from target widgets, use
			// excludeFromTargetWidget instead.
			group.align !== 'after' ),
		surfaceClasses: this.getSurfaceClasses()
	}, config ) );
};

/**
 * @inheritdoc
 */
ve.init.mw.Target.prototype.createSurface = function ( dmDoc, config = {} ) {
	if ( config && config.mode === 'source' ) {
		const importRules = ve.copy( this.constructor.static.importRules );
		importRules.all = importRules.all || {};
		// Preserve empty linebreaks on paste in source editor
		importRules.all.keepEmptyContentBranches = true;
		config = this.getSurfaceConfig( ve.extendObject( {}, config, {
			importRules
		} ) );
		return new ve.ui.MWWikitextSurface( this, dmDoc, config );
	}

	return new ve.ui.MWSurface( this, dmDoc, this.getSurfaceConfig( config ) );
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
		dataTransferHandlerFactory: config.mode === 'source' ? ve.ui.wikitextDataTransferHandlerFactory : ve.ui.dataTransferHandlerFactory,
		classes: this.getSurfaceClasses()
	}, config ) );
};

/**
 * Switch to editing mode.
 *
 * @param {HTMLDocument|string} doc HTML document or source text
 */
ve.init.mw.Target.prototype.setupSurface = function ( doc ) {
	setTimeout( () => {
		// Build model
		this.track( 'trace.convertModelFromDom.enter' );
		const dmDoc = this.constructor.static.createModelFromDom( doc, this.getDefaultMode() );
		this.track( 'trace.convertModelFromDom.exit' );

		// Build DM tree now (otherwise it gets lazily built when building the CE tree)
		this.track( 'trace.buildModelTree.enter' );
		dmDoc.buildNodeTree();
		this.track( 'trace.buildModelTree.exit' );

		setTimeout( () => {
			this.addSurface( dmDoc );
		} );
	} );
};

/**
 * @inheritdoc
 */
ve.init.mw.Target.prototype.addSurface = function () {
	// Clear dummy surfaces
	// TODO: Move to DesktopArticleTarget
	this.clearSurfaces();

	// Create ui.Surface (also creates ce.Surface and dm.Surface and builds CE tree)
	this.track( 'trace.createSurface.enter' );
	// Parent method
	const surface = ve.init.mw.Target.super.prototype.addSurface.apply( this, arguments );
	// Add classes specific to surfaces attached directly to the target,
	// as opposed to TargetWidget surfaces
	if ( !surface.inTargetWidget ) {
		surface.$element.addClass( 've-init-mw-target-surface' );
	}
	this.track( 'trace.createSurface.exit' );

	this.setSurface( surface );

	setTimeout( () => {
		// Initialize surface
		this.track( 'trace.initializeSurface.enter' );

		this.active = true;
		// Now that the surface is attached to the document and ready,
		// let it initialize itself
		surface.initialize();

		this.track( 'trace.initializeSurface.exit' );
		this.surfaceReady();
	} );

	return surface;
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
 * Minimal MD5 (UTF-8 input, hex output), matching the spark-md5 library's output.
 *
 * TEMPORARY (T433034): only exists to reproduce pre-cyrb64 autosave hashes; remove
 * with #migrateAutosaveHashStore.
 *
 * @param {string} str String to hash
 * @return {string} 32-digit hex MD5
 */
ve.init.mw.Target.static.legacyMd5 = function ( str ) {
	/* eslint-disable no-bitwise, max-statements-per-line */
	const bytes = Array.from( new TextEncoder().encode( str ) );
	const bitLen = bytes.length * 8;
	bytes.push( 0x80 );
	while ( bytes.length % 64 !== 56 ) {
		bytes.push( 0 );
	}
	for ( let i = 0; i < 8; i++ ) {
		bytes.push( Math.floor( bitLen / Math.pow( 2, 8 * i ) ) & 0xFF );
	}
	const shift = [
		7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
		5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
		4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
		6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
	];
	const sines = [];
	for ( let i = 0; i < 64; i++ ) {
		sines[ i ] = Math.floor( Math.abs( Math.sin( i + 1 ) ) * 4294967296 ) | 0;
	}
	let a0 = 0x67452301, b0 = 0xEFCDAB89, c0 = 0x98BADCFE, d0 = 0x10325476;
	for ( let chunk = 0; chunk < bytes.length; chunk += 64 ) {
		const words = [];
		for ( let i = 0; i < 16; i++ ) {
			const j = chunk + i * 4;
			words[ i ] = bytes[ j ] | ( bytes[ j + 1 ] << 8 ) | ( bytes[ j + 2 ] << 16 ) | ( bytes[ j + 3 ] << 24 );
		}
		let a = a0, b = b0, c = c0, d = d0;
		for ( let i = 0; i < 64; i++ ) {
			let f, g;
			if ( i < 16 ) {
				f = ( b & c ) | ( ~b & d ); g = i;
			} else if ( i < 32 ) {
				f = ( d & b ) | ( ~d & c ); g = ( 5 * i + 1 ) % 16;
			} else if ( i < 48 ) {
				f = b ^ c ^ d; g = ( 3 * i + 5 ) % 16;
			} else {
				f = c ^ ( b | ~d ); g = ( 7 * i ) % 16;
			}
			f = ( f + a + sines[ i ] + words[ g ] ) | 0;
			a = d; d = c; c = b;
			b = ( b + ( ( f << shift[ i ] ) | ( f >>> ( 32 - shift[ i ] ) ) ) ) | 0;
		}
		a0 = ( a0 + a ) | 0; b0 = ( b0 + b ) | 0; c0 = ( c0 + c ) | 0; d0 = ( d0 + d ) | 0;
	}
	const hex = ( x ) => {
		let out = '';
		for ( let i = 0; i < 4; i++ ) {
			out += ( ( x >>> ( i * 8 ) ) & 0xFF ).toString( 16 ).padStart( 2, '0' );
		}
		return out;
	};
	return hex( a0 ) + hex( b0 ) + hex( c0 ) + hex( d0 );
	/* eslint-enable no-bitwise, max-statements-per-line */
};

/**
 * Alias every store value under the key it had with the previous (MD5) hashing
 * algorithm, so autosave changes serialized before the cyrb64 switch still resolve.
 *
 * TEMPORARY (T433034): remove once no old-format sessions remain.
 *
 * @param {ve.dm.HashValueStore} store Store to add legacy hash aliases to
 */
ve.init.mw.Target.static.migrateAutosaveHashStore = function ( store ) {
	const legacyHash = ( stringified ) => 'h' + ve.init.mw.Target.static.legacyMd5( stringified ).slice( 0, 16 );
	const alias = ( legacyKey, value ) => {
		if ( !Object.prototype.hasOwnProperty.call( store.hashStore, legacyKey ) ) {
			store.hashStore[ legacyKey ] = value;
			store.hashes.push( legacyKey );
		}
	};
	// Nodes hashed their full serialization, annotations a shallow clone; cover both
	const domLegacyKeys = ( dom ) => [
		legacyHash( dom.map( ve.getNodeHtml ).join( '' ) ),
		legacyHash( dom.map( ( node ) => node.cloneNode( false ).outerHTML ).join( '' ) )
	];
	// Snapshot, as we push new keys onto store.hashes
	store.hashes.slice().forEach( ( hash ) => {
		const value = store.value( hash );
		const element = ( value && value.element ) || value;
		if ( Array.isArray( value ) && value[ 0 ] && value[ 0 ].nodeType !== undefined ) {
			domLegacyKeys( value ).forEach( ( key ) => alias( key, value ) );
		} else if ( element && element.originalDomElementsHash !== undefined ) {
			// The key embeds originalDomElementsHash, itself remapped, so rebuild it
			const origDom = store.value( element.originalDomElementsHash );
			if ( Array.isArray( origDom ) ) {
				domLegacyKeys( origDom ).forEach( ( origKey ) => {
					const legacyElement = ve.copy( element );
					legacyElement.originalDomElementsHash = origKey;
					alias( legacyHash( OO.getHash( legacyElement ) ), value );
				} );
			}
		} else {
			alias( legacyHash( OO.getHash( element ) ), value );
		}
	} );
};

/**
 * Initialise autosave, recovering changes if applicable
 *
 * @param {Object} [config] Configuration options
 * @param {boolean} [config.suppressNotification=false] Don't notify the user if changes are recovered
 * @param {string} [config.docId] Document ID for storage grouping
 * @param {ve.init.SafeStorage} [config.storage] Storage interface
 * @param {number} [config.storageExpiry] Storage expiry time in seconds (optional)
 */
ve.init.mw.Target.prototype.initAutosave = function ( config = {} ) {
	const surfaceModel = this.getSurface().getModel();

	if ( config.docId ) {
		surfaceModel.setAutosaveDocId( config.docId );
	}

	if ( config.storage ) {
		surfaceModel.setStorage( config.storage, config.storageExpiry );
	}

	if ( this.recovered ) {
		// Restore auto-saved transactions if document state was recovered
		try {
			if ( this.hashMigration ) {
				// Old-format (MD5) session: alias the store so its references resolve
				this.constructor.static.migrateAutosaveHashStore( surfaceModel.getDocument().getStore() );
			}
			surfaceModel.restoreChanges();
			if ( this.hashMigration ) {
				// Re-snapshot at the current format so we don't migrate again
				this.storeDocState();
			}
			if ( !config.suppressNotification ) {
				ve.init.platform.notify(
					ve.msg( 'visualeditor-autosave-recovered-text' ),
					ve.msg( 'visualeditor-autosave-recovered-title' )
				);
			}
		} catch ( e ) {
			mw.log.warn( e );
			ve.init.platform.notify(
				ve.msg( 'visualeditor-autosave-not-recovered-text' ),
				ve.msg( 'visualeditor-autosave-not-recovered-title' ),
				{ type: 'error' }
			);
		}
	} else {
		// ...otherwise store this document state for later recovery
		if ( this.fromEditedState ) {
			// Store immediately if the document was previously edited
			// (e.g. in a different mode)
			this.storeDocState( this.originalHtml );
		} else {
			// Only store after the first change if this is an unmodified document
			surfaceModel.once( 'undoStackChange', () => {
				// Check the surface hasn't been destroyed
				if ( this.getSurface() ) {
					this.storeDocState( this.originalHtml );
				}
			} );
		}
	}
	// Start auto-saving transactions
	surfaceModel.startStoringChanges();
	// TODO: Listen to autosaveFailed event to notify user
};

/**
 * Store a snapshot of the current document state.
 *
 * @param {string} [html] Document HTML, will generate from current state if not provided
 */
ve.init.mw.Target.prototype.storeDocState = function ( html ) {
	const mode = this.getSurface().getMode();
	// Stamp the format version so recovery can detect stale sessions (e.g. after a
	// hash-algorithm change). ArticleTarget adds this via its own richer override.
	this.getSurface().getModel().storeDocState( {
		mode,
		formatVersion: mw.libs.ve.autosaveDocStateVersion
	}, html );
};

/**
 * Clear any stored document state
 */
ve.init.mw.Target.prototype.clearDocState = function () {
	if ( this.getSurface() ) {
		this.getSurface().getModel().removeDocStateAndChanges();
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.Target.prototype.teardown = function () {
	// If target is closed cleanly (after save or deliberate close) then remove autosave state
	this.clearDocState();

	// Parent method
	return ve.init.mw.Target.super.prototype.teardown.call( this ).then( () => {
		this.emit( 'teardown' );
	} );
};

/**
 * Refresh our knowledge about the logged-in user.
 *
 * This should be called in response to a user assertion error, to look up
 * the new user name, and update the current user variables in mw.config.
 *
 * @param {ve.dm.Document} [doc] Document to associate with the API request
 * @return {jQuery.Promise} Promise resolved with new username, or null if anonymous
 */
ve.init.mw.Target.prototype.refreshUser = function ( doc ) {
	return this.getContentApi( doc ).get( {
		action: 'query',
		meta: 'userinfo'
	} ).then( ( data ) => {
		const userInfo = data.query && data.query.userinfo;

		if ( userInfo.anon !== undefined ) {
			// New session is an anonymous user
			mw.config.set( {
				// wgUserId is unset for anonymous users, not set to null
				wgUserId: undefined,
				// wgUserName is explicitly set to null for anonymous users,
				// functions like mw.user.isAnon rely on this.
				wgUserName: null
			} );

			// Call this only after clearing wgUserId, otherwise it does nothing
			return mw.user.acquireTempUserName();
		} else {
			// New session is a logged in user (or a temporary user)
			mw.config.set( {
				wgUserId: userInfo.id,
				wgUserName: userInfo.name
			} );

			return mw.user.getName();
		}
	} );
};

/**
 * Get a wikitext fragment from a document
 *
 * @param {ve.dm.Document} doc
 * @param {boolean} [useRevision=true] Whether to use the revision ID + ETag
 * @return {jQuery.Promise} Abortable promise which resolves with a wikitext string
 */
ve.init.mw.Target.prototype.getWikitextFragment = function ( doc, useRevision ) {
	// Shortcut for empty document
	if ( !doc.data.hasContent() ) {
		return ve.createDeferred().resolve( '' );
	}

	const params = {
		action: 'visualeditoredit',
		paction: 'serialize',
		html: mw.libs.ve.targetSaver.getHtml(
			ve.dm.converter.getDomFromModel( doc )
		),
		page: this.getPageName()
	};

	if ( useRevision === undefined || useRevision ) {
		params.oldid = this.revid;
		params.etag = this.etag;
	}

	const xhr = this.getContentApi( doc ).postWithToken( 'csrf',
		params,
		{ contentType: 'multipart/form-data' }
	);

	return xhr.then( ( response ) => {
		if ( response.visualeditoredit ) {
			return response.visualeditoredit.content;
		}
		return ve.createDeferred().reject();
	} ).promise( { abort: xhr.abort } );
};

/**
 * Parse a fragment of wikitext into HTML
 *
 * @param {string} wikitext
 * @param {boolean} pst Perform pre-save transform
 * @param {ve.dm.Document} [doc] Parse for a specific document, defaults to current surface's
 * @param {Object} [ajaxOptions]
 * @return {jQuery.Promise} Abortable promise
 */
ve.init.mw.Target.prototype.parseWikitextFragment = function ( wikitext, pst, doc, ajaxOptions = {} ) {
	const api = this.getContentApi( doc );
	const abortable = api.makeAbortablePromise( ajaxOptions );

	// Acquire a temporary user username before previewing or diffing, so that signatures and
	// user-related magic words display the temp user instead of IP user in the preview. (T331397)
	let tempUserNamePromise;
	if ( pst ) {
		tempUserNamePromise = mw.user.acquireTempUserName();
	} else {
		tempUserNamePromise = ve.createDeferred().resolve( null );
	}

	return tempUserNamePromise
		.then( () => api.post( {
			action: 'visualeditor',
			paction: 'parsefragment',
			page: this.getPageName( doc ),
			wikitext,
			pst
		}, ajaxOptions ) )
		.promise( abortable );
};

/**
 * Get the page name associated with a specific document
 *
 * @param {ve.dm.Document} [doc] Document, defaults to current surface's
 * @return {string} Page name
 */
ve.init.mw.Target.prototype.getPageName = function () {
	return this.pageName;
};

/**
 * Get an API object associated with the wiki where the document
 * content is hosted.
 *
 * This would be overridden if editing content on another wiki.
 *
 * @param {ve.dm.Document} [doc] API for a specific document, should default to document of current surface.
 * @param {Object} [options] API options
 * @param {Object} [options.parameters] Default query parameters for all API requests. Defaults
 *  include action=query, format=json, and formatversion=2 if not specified otherwise.
 * @return {mw.Api}
 */
ve.init.mw.Target.prototype.getContentApi = function ( doc, options = {} ) {
	options.parameters = ve.extendObject( { formatversion: 2 }, options.parameters );
	return new mw.Api( options );
};

/**
 * Get an API object associated with the local wiki.
 *
 * For example you would always use getLocalApi for actions
 * associated with the current user.
 *
 * @param {Object} [options] API options
 * @return {mw.Api}
 */
ve.init.mw.Target.prototype.getLocalApi = function ( options = {} ) {
	options.parameters = ve.extendObject( { formatversion: 2 }, options.parameters );
	return new mw.Api( options );
};

const interwikiMapPromiseCache = {};

// TODO: Deduplicate this with mw.widgets.TitleWidget.prototype.getInterwikiMapPromise
function getInterwikiMapPromise( api ) {
	const key = api.defaults.ajax.url;
	if ( !interwikiMapPromiseCache[ key ] ) {
		// Cache client-side for a day since this info is mostly static
		const oneDay = 60 * 60 * 24;
		interwikiMapPromiseCache[ key ] = api.get( {
			action: 'query',
			meta: 'siteinfo',
			siprop: 'interwikimap',
			maxage: oneDay,
			smaxage: oneDay,
			// Workaround T97096 by setting uselang=content
			uselang: 'content'
		} ).then( ( data ) => data.query.interwikimap );
		// Do not cache errors
		interwikiMapPromiseCache[ key ].catch( () => {
			delete interwikiMapPromiseCache[ key ];
		} );
	}
	return interwikiMapPromiseCache[ key ];
}

/**
 * Check if a URL is an interwiki link.
 *
 * @param {string} url URL to check
 * @return {jQuery.Promise<boolean>} Promise resolving to true if the URL is an interwiki link, false otherwise
 */
ve.init.mw.Target.prototype.isInterwikiUrl = function ( url ) {
	return getInterwikiMapPromise( this.getContentApi() ).then(
		( interwikiMap ) => interwikiMap.some(
			( iw ) => mw.libs.ve.getRegexFromUrlPattern( iw.url ).test( url )
		)
	);
};
