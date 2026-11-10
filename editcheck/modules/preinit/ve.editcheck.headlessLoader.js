/*!
 * VisualEditor EditCheck headless loader.
 *
 * Runs edit checks without opening the editor.
 * Loaded by Special:EditCheckHeadless and triggered via
	* window.veEditCheckHeadlessStart( pageName, parsoidHtml ).
 *
 * Unlike the in-editor headless path, this loads VE in the background on
 * the read page, fetches the parsoid document, creates a ve.dm.Surface, and
 * runs the checks directly without rendering any editor UI.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * @module ve.editcheck.headlessLoader
 */

/* global ve */

let requestCounter = 0;
let modulesPromise = null;
let configPageRevIdPromise = null;
let configIdPromise = null;

const CONFIG_ID_NAMESPACE = '4b64b910-21e9-5fe0-bf6c-82aac297f605'; // uuid5( NAMESPACE_DNS, 'config-id.editcheck.mediawiki.org' )
let runQueue = Promise.resolve();

/**
 * Publish the headless result to the window and fire an event.
 *
 * @param {Object} result The result object to publish.
 */
function publishHeadlessResult( result ) {
	window.veEditCheckHeadlessResult = result;
	window.dispatchEvent( new CustomEvent( 've.editcheck.headlessResult', {
		detail: result
	} ) );
}

/**
 * Publish the headless progress to the window and fire an event.
 *
 * @param {string} msg The progress message.
 * @param {number} requestId The request ID associated with the progress.
 */
function publishHeadlessProgress( msg, requestId ) {
	window.veHeadlessProgress = window.veHeadlessProgress || [];
	window.veHeadlessProgress.push( {
		t: Date.now(),
		msg,
		requestId
	} );
}

/**
 * Get the closest parsoid ID from the model node.
 *
 * @param {ve.dm.Node} node The model node.
 * @return {string|undefined} The closest ID or undefined if not found.
 */
function getClosestIdFromModel( node ) {
	while ( node ) {
		let domElements = null;
		try {
			domElements = node.getOriginalDomElements();
		} catch ( e ) {}
		if ( domElements && domElements.length > 0 ) {
			const id = domElements[ 0 ].getAttribute && domElements[ 0 ].getAttribute( 'id' );
			if ( id ) {
				return id;
			}
		}
		node = node.parent;
	}
	return undefined;
}

/**
 * Serialize a headless action into a plain object for output.
 *
 * @param {mw.editcheck.EditCheckAction} action The action to serialize.
 * @param {ve.dm.Document} dmDoc The document model for context.
 * @return {Object} The serialized action.
 */
function serializeHeadlessAction( action, dmDoc ) {
	const selection = action.fragments[ 0 ].getSelection();
	let node = dmDoc.getBranchNodeFromOffset( selection.getCoveringRange().start );
	if ( !node.getParent() ) {
		// We found the root node, we are probably at the edge of a node so
		// step inside it.
		node = dmDoc.getBranchNodeFromOffset( selection.getCoveringRange().start + 1 );
	}
	const closestId = getClosestIdFromModel( node );
	return {
		name: action.getName(),
		type: action.getType(),
		veSelection: JSON.parse( JSON.stringify( selection ) ),
		parsoidSelection: {
			closestId,
			// TODO: Use a text prefix and length to avoid storing whole paragraph
			text: action.originalText[ 0 ]
			// TODO: add text index (e.g. 2nd occurrence of 'foo' in this node)
		}
	};
}

/**
 * Load the VisualEditor modules for headless operation.
 *
 * @return {jQuery.Promise} A promise that resolves when the modules are loaded.
 */
function loadModules() {
	if ( !modulesPromise ) {
		publishHeadlessProgress( 'Loading VisualEditor modules' );
		modulesPromise = mw.libs.ve.targetLoader.loadModules( 'headless' )
			.then( () => {
				publishHeadlessProgress( 'VisualEditor modules loaded' );
			} ).catch( ( error ) => {
				publishHeadlessProgress( `Initial module load failed: ${ String( error ) }` );
				mw.log.error( 'EditCheck headless loader initial load error', error );
			} );
	}
	return modulesPromise;
}

/**
 * Get the revision ID of MediaWiki:Editcheck-config.json, fetched once alongside
 * the modules so it matches the config they loaded.
 *
 * @return {Promise<number|null>} Null if the page doesn't exist or the lookup failed
 */
function loadConfigPageRevId() {
	if ( !configPageRevIdPromise ) {
		configPageRevIdPromise = new mw.Api().get( {
			action: 'query',
			formatversion: 2,
			prop: 'info',
			titles: 'MediaWiki:Editcheck-config.json'
		} ).then(
			( response ) => {
				const page = response && response.query && response.query.pages && response.query.pages[ 0 ];
				return ( page && page.lastrevid ) || null;
			},
			() => null
		);
	}
	return configPageRevIdPromise;
}

/**
 * Encode a value as JSON with sorted object keys, so equal values have equal encodings.
 *
 * @param {any} value
 * @return {string}
 */
function stableStringify( value ) {
	if ( Array.isArray( value ) ) {
		return `[${ value.map( stableStringify ).join( ',' ) }]`;
	}
	if ( value && typeof value === 'object' ) {
		return `{${ Object.keys( value ).sort()
			.filter( ( key ) => value[ key ] !== undefined )
			.map( ( key ) => `${ JSON.stringify( key ) }:${ stableStringify( value[ key ] ) }` )
			.join( ',' ) }}`;
	}
	return JSON.stringify( value === undefined ? null : value );
}

/**
 * Make a name-based UUIDv5.
 *
 * @param {string} namespace Namespace UUID
 * @param {string} name
 * @return {Promise<string>}
 */
function uuidV5( namespace, name ) {
	const nsBytes = namespace.replace( /-/g, '' ).match( /../g ).map( ( h ) => parseInt( h, 16 ) );
	const nameBytes = Array.from( new TextEncoder().encode( name ) );
	return crypto.subtle.digest( 'SHA-1', new Uint8Array( nsBytes.concat( nameBytes ) ) ).then( ( digest ) => {
		const bytes = Array.from( new Uint8Array( digest ).slice( 0, 16 ) );
		// Version 5
		bytes[ 6 ] = ( bytes[ 6 ] % 16 ) + 0x50;
		// Variant 10xx
		bytes[ 8 ] = ( bytes[ 8 ] % 64 ) + 0x80;
		const hex = bytes.map( ( b ) => b.toString( 16 ).padStart( 2, '0' ) ).join( '' );
		return `${ hex.slice( 0, 8 ) }-${ hex.slice( 8, 12 ) }-${ hex.slice( 12, 16 ) }-` +
			`${ hex.slice( 16, 20 ) }-${ hex.slice( 20 ) }`;
	} );
}

/**
 * Get the ID of the effective edit check config: the resolved config of each
 * check, and the textMatch rules with imports resolved. These are loaded once,
 * so the ID is computed once.
 *
 * @return {Promise<Object>} `configId`, and when it was computed (`configComputeDt`);
 *  both are null if the config can't be read
 */
function loadConfigId() {
	if ( !configIdPromise ) {
		configIdPromise = loadModules().then( () => {
			const checks = {};
			for ( const checkName of getCheckNames() ) {
				try {
					checks[ checkName ] = mw.editcheck.editCheckFactory.create( checkName, null, {}, true ).config;
				} catch ( e ) {
					checks[ checkName ] = null;
				}
			}
			return mw.editcheck.TextMatchEditCheck.static.ensureMatchRulesLoaded().then( ( cache ) => ( {
				checks,
				textMatchRules: cache ? cache.rawMatchRules : null
			} ) );
		} ).then(
			( config ) => uuidV5( CONFIG_ID_NAMESPACE, stableStringify( config ) ).then( ( configId ) => ( {
				configId,
				configComputeDt: new Date().toISOString()
			} ) )
		).catch( ( error ) => {
			mw.log.error( 'EditCheck headless loader could not compute config ID', error );
			return { configId: null, configComputeDt: null };
		} );
	}
	return configIdPromise;
}

/**
 * Load the HTML content for a page.
 *
 * @param {string} pageName The name of the page.
 * @param {number} requestId The request ID.
 * @param {string} [parsoidHtml] The Parsoid HTML content.
 * @return {jQuery.Promise<Object>} A promise that resolves with the HTML content (`html`)
 *  and the revision rendered (`revId`), which is null for posted HTML.
 */
function loadHtml( pageName, requestId, parsoidHtml ) {
	let htmlPromise;
	if ( typeof parsoidHtml === 'string' ) {
		publishHeadlessProgress( `Request ${ requestId } using posted Parsoid HTML`, requestId );
		htmlPromise = Promise.resolve( { html: parsoidHtml, revId: null } );
	} else {
		publishHeadlessProgress( `Request ${ requestId } fetching Parsoid HTML`, requestId );
		htmlPromise = mw.libs.ve.targetLoader.requestParsoidData(
			pageName,
			{ targetName: 'editcheckheadless' },
			false,
			// noMetadata
			true
		).then( ( response ) => {
			const data = response ?
				( response.visualeditor || response.visualeditoredit ) :
				null;
			if ( !data || typeof data.content !== 'string' ) {
				throw new Error( 'Invalid or empty parsoid response' );
			}
			return { html: data.content, revId: data.oldid || null };
		} );
	}
	return htmlPromise;
}

/**
 * Load additional config metadata for a page.
 *
 * @param {string} pageName The name of the page.
 * @param {number} requestId The request ID.
 * @return {jQuery.Promise<object>} A promise that resolves with the config metadata.
 */
function loadConfig( pageName, requestId ) {
	publishHeadlessProgress( `Request ${ requestId } fetching page properties`, requestId );
	return new mw.Api().get( {
		action: 'query',
		formatversion: 2,
		prop: 'info|pageprops',
		ppprop: 'disambiguation',
		titles: pageName
	} ).then( ( response ) => {
		const page = response && response.query && response.query.pages && response.query.pages[ 0 ];
		if ( !page ) {
			throw new Error( 'Invalid page properties response' );
		}
		mw.config.set( {
			wgRelevantArticleId: page.pageid || 0,
			wgVisualEditorPageIsDisambiguation: !!( page.pageprops && 'disambiguation' in page.pageprops )
		} );
	}, () => {
		// TODO: Provide default values if API request fails?
		throw new Error( 'Failed to fetch page properties' );
	} );
}

/**
 * @return {string[]} Names of the checks that can run
 */
function getCheckNames() {
	const checkNames = [];
	[ 'onDocumentChange', 'onBranchNodeChange', 'onBeforeSave' ].forEach( ( listener ) => {
		mw.editcheck.editCheckFactory.getNamesByListener( listener ).forEach( ( checkName ) => {
			if ( !checkNames.includes( checkName ) ) {
				checkNames.push( checkName );
			}
		} );
	} );
	return checkNames;
}

/**
 * Get the resolved per-check config, keyed by check name.
 *
 * This is independent of any particular page: it is derived from the global
 * edit check configuration, so it does not require a document to be loaded.
 * The edit check modules must be loaded before calling this.
 *
 * The textMatch check additionally supports per-matchRule (matchItem) config,
 * which is exposed keyed as "textMatch/<matchItemId>".
 *
 * @return {Promise<Object>} Map of check name to a summary of its resolved config
 */
function getCheckConfigs() {
	const configs = {};
	const getModeConfigValue = mw.editcheck.BaseEditCheck.static.getModeConfigValue;
	const summarize = ( config ) => ( {
		account: getModeConfigValue( config.account, true ),
		minimumEditCount: getModeConfigValue( config.minimumEditCount, true ),
		maximumEditCount: getModeConfigValue( config.maximumEditCount, true )
	} );

	const promises = [];
	getCheckNames().forEach( ( checkName ) => {
		let check;
		try {
			check = mw.editcheck.editCheckFactory.create( checkName, null, {}, true );
		} catch ( e ) {
			// Ignore checks that fail to construct
			configs[ checkName ] = summarize( {} );
			return;
		}
		configs[ checkName ] = summarize( check.config );

		// textMatch matchRules
		if ( check instanceof mw.editcheck.TextMatchEditCheck ) {
			promises.push(
				check.constructor.static.ensureMatchRulesLoaded().then( ( cache ) => {
					check.instantiateMatchRules( cache.rawMatchRules );
					for ( const matchRule of check.matchRules ) {
						configs[ `${ checkName }/${ matchRule.id }` ] = summarize( matchRule.config );
					}
				} )
			);
		}
	} );

	return Promise.all( promises ).then( () => configs );
}

/**
 * Run the headless VisualEditor for a page.
 *
 * @param {string} pageNameRaw The page name from user input.
 * @param {number} requestId The request ID.
 * @param {string} [parsoidHtml] The Parsoid HTML content.
 * @return {Promise<object>} A promise that resolves with the result.
 */
function runHeadlessForPage( pageNameRaw, requestId, parsoidHtml ) {
	publishHeadlessProgress( `Preparing request for ${ pageNameRaw }`, requestId );
	const title = mw.Title.newFromText( pageNameRaw );
	if ( !title ) {
		throw new Error( `Invalid page title: ${ pageNameRaw }` );
	}
	const pageName = title.getPrefixedDb();

	publishHeadlessResult( {
		status: 'initializing',
		requestId,
		pageName
	} );
	publishHeadlessProgress( `Request ${ requestId } initialized for ${ pageName }`, requestId );

	mw.config.set( {
		wgRelevantPageName: pageName,
		wgPageName: pageName,
		wgNamespaceNumber: title.getNamespaceId()
		// wgRelevantArticleId and wgVisualEditorPageIsDisambiguation will be set in loadConfig
	} );

	return Promise.all( [
		loadHtml( pageName, requestId, parsoidHtml ),
		loadConfig( pageName, requestId ),
		loadModules(),
		loadConfigPageRevId(),
		loadConfigId()
	] ).then( ( [ { html, revId }, , , configPageRevId, { configId, configComputeDt } ] ) => {
		const targetClass = ve.init.mw.ArticleTarget;

		// Bypass account checks so we get all possible suggestions. Account checks can be
		// run later for the requesting user.
		mw.editcheck.forceEnable = true;

		publishHeadlessProgress( `Request ${ requestId } parsing document`, requestId );
		const htmlDoc = targetClass.static.parseDocument( html, 'visual', null );
		const getMeta = ( attribute, value ) => {
			const meta = htmlDoc.querySelector( `meta[${ attribute }="${ value }"]` );
			return ( meta && meta.getAttribute( 'content' ) ) || null;
		};
		const source = {
			revId,
			renderId: getMeta( 'http-equiv', 'x-mediawiki-render-id' ),
			contentLanguage: getMeta( 'http-equiv', 'content-language' ),
			htmlVersion: getMeta( 'property', 'mw:htmlVersion' ),
			revDt: getMeta( 'property', 'dc:modified' ),
			revSha1: getMeta( 'property', 'mw:revisionSHA1' ),
			configPageRevId,
			configId,
			configComputeDt
		};
		// Parsoid links are relative (e.g. href="./Foo") and rely on the document's
		// <base href> to resolve. VE's getTargetDataFromHref() resolves them against
		// document.baseURI to recognise internal links. Some headless engines (e.g.
		// Lightpanda) don't apply the (VE-inserted) <base> element to either
		// document.baseURI or anchor.href, so internal links go unrecognised and
		// link-based checks (duplicateLink, disambiguation, yearLink) silently
		// produce nothing. Resolve each relative href against the <base> element's
		// href explicitly and store the absolute form, which makes link resolution
		// base-independent. This is a no-op in engines that honour <base> (the
		// resolved value is unchanged).
		const baseElement = htmlDoc.querySelector( 'base[href]' );
		if ( baseElement ) {
			const baseHref = new URL( baseElement.getAttribute( 'href' ), htmlDoc.baseURI ).href;
			Array.prototype.forEach.call( htmlDoc.querySelectorAll( 'a[href]' ), ( a ) => {
				let resolved;
				try {
					resolved = new URL( a.getAttribute( 'href' ), baseHref ).href;
				} catch ( e ) {
					return;
				}
				ve.setAttributeSafe( a, 'href', resolved, a.getAttribute( 'href' ) );
			} );
		}
		const dmDoc = targetClass.static.createModelFromDom( htmlDoc, 'visual' );
		const surfaceModel = new ve.dm.Surface( dmDoc );
		publishHeadlessProgress( `Request ${ requestId } running edit checks`, requestId );

		const dummyTarget = new ve.init.mw.ArticleTarget();

		// No tags, so nothing is dismissed. ExternalLinkEditCheck uses the target to test interwiki URLs.
		const state = {
			target: dummyTarget,
			suggestionsVisible: true
		};

		// Run suggestion-mode checks for onDocumentChange and onBranchNodeChange.
		// includeSuggestions=true causes getModifiedRanges/getAddedNodes to return
		// the entire document rather than only edited ranges, so every check
		// evaluates the full article content.
		return Promise.all( [ 'onDocumentChange', 'onBranchNodeChange' ].map(
			( listener ) => mw.editcheck.editCheckFactory.createAllActionsByListener(
				state,
				listener,
				surfaceModel,
				true // includeSuggestions
			)
		) ).then( ( actionsByListener ) => {
			const suggestions = actionsByListener.flat().map( ( action ) => serializeHeadlessAction( action, dmDoc ) );
			const suggestionCounts = {};
			for ( const s of suggestions ) {
				suggestionCounts[ s.name ] = ( suggestionCounts[ s.name ] || 0 ) + 1;
				suggestionCounts[ '*' ] = ( suggestionCounts[ '*' ] || 0 ) + 1;
			}
			publishHeadlessProgress(
				`Request ${ requestId } finished with ${ suggestionCounts[ '*' ] || 0 } suggestions`,
				requestId
			);
			const result = {
				status: 'ready',
				requestId,
				pageName,
				data: {
					suggestionCounts,
					suggestions,
					source,
					software: { name: 'VisualEditor', version: mw.config.get( 'wgVersion' ) }
				}
			};
			publishHeadlessResult( result );
			return result;
		} );
	} ).catch( ( error ) => {
		publishHeadlessProgress( `Request ${ requestId } failed: ${ String( error ) }`, requestId );
		const result = {
			status: 'error',
			requestId,
			pageName,
			error: String( error )
		};
		publishHeadlessResult( result );
		mw.log.error( 'EditCheck headless loader error', error );
		throw error;
	} );
}

window.veEditCheckHeadlessStart = function ( pageName, parsoidHtml ) {
	const requestId = ++requestCounter;
	const runPromise = runQueue.then( () => runHeadlessForPage( pageName, requestId, parsoidHtml ) );
	runQueue = runPromise.catch( () => {} );
	return requestId;
};

window.veEditCheckHeadlessGetConfigs = function () {
	return loadModules().then( () => getCheckConfigs() );
};

// Start loading modules immediately
loadModules();
loadConfigPageRevId();
loadConfigId();

publishHeadlessResult( { status: 'idle' } );
