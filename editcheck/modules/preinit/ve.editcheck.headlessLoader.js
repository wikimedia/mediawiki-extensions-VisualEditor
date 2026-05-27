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

/* global ve */

( function () {
	let requestCounter = 0;
	let modulesPromise = null;
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
	 * Load the HTML content for a page.
	 *
	 * @param {string} pageName The name of the page.
	 * @param {number} requestId The request ID.
	 * @param {string} [parsoidHtml] The Parsoid HTML content.
	 * @return {jQuery.Promise<string>} A promise that resolves with the HTML content.
	 */
	function loadHtml( pageName, requestId, parsoidHtml ) {
		let htmlPromise;
		if ( typeof parsoidHtml === 'string' ) {
			publishHeadlessProgress( `Request ${ requestId } using posted Parsoid HTML`, requestId );
			htmlPromise = Promise.resolve( parsoidHtml );
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
				return data.content;
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
			loadModules()
		] ).then( ( [ html ] ) => {
			const targetClass = ve.init.mw.ArticleTarget;

			// Bypass account checks so we get all possible suggestions. Account checks can be
			// run later for the requesting user.
			mw.editcheck.forceEnable = true;

			publishHeadlessProgress( `Request ${ requestId } parsing document`, requestId );
			const htmlDoc = targetClass.static.parseDocument( html, 'visual', null );
			const dmDoc = targetClass.static.createModelFromDom( htmlDoc, 'visual' );
			const surfaceModel = new ve.dm.Surface( dmDoc );
			publishHeadlessProgress( `Request ${ requestId } running edit checks`, requestId );

			const dummyTarget = new ve.init.mw.ArticleTarget();

			// Minimal controller stub.
			// Checks use controller for:
			//   taggedIds / taggedFragments — dismissed/tagged state (empty = nothing dismissed)
			//   suggestionsVisible — true so checks run against the whole document
			//   getTarget() — used by ExternalLinkEditCheck to test interwiki URLs
			const controller = {
				suggestionsVisible: true,
				taggedIds: {},
				taggedFragments: {},
				inBeforeSave: false,
				getTarget: () => dummyTarget
			};

			// Run suggestion-mode checks for onDocumentChange and onBranchNodeChange.
			// includeSuggestions=true causes getModifiedRanges/getAddedNodes to return
			// the entire document rather than only edited ranges, so every check
			// evaluates the full article content.
			return Promise.all( [ 'onDocumentChange', 'onBranchNodeChange' ].map(
				( listener ) => mw.editcheck.editCheckFactory.createAllActionsByListener(
					controller,
					listener,
					surfaceModel,
					true // includeSuggestions
				)
			) ).then( ( actionsByListener ) => {
				// eslint-disable-next-line es-x/no-array-prototype-flat
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
						suggestions
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

	// Start loading modules immediately
	loadModules();

	publishHeadlessResult( { status: 'idle' } );
}() );
