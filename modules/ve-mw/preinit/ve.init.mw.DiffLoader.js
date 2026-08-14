/*!
 * VisualEditor MediaWiki DiffLoader.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/* global ve */

/**
 * Diff loader.
 *
 * @class mw.libs.ve.diffLoader
 * @singleton
 * @hideconstructor
 */
( function () {
	const revCache = {};

	mw.libs.ve = mw.libs.ve || {};

	mw.libs.ve.diffLoader = {
		/**
		 * Get a ve.dm.Document model from Parsoid HTML
		 *
		 * @param {string|null} html Parsoid HTML
		 * @param {string|null} section Section. Null for the whole document.
		 * @return {ve.dm.Document|null} Document, or null if the HTML is missing
		 */
		getModelFromHtml: function ( html, section ) {
			// This method is only called after actually loading these, see `parseDocumentModulePromise`
			const targetClass = ve.init.mw.ArticleTarget;
			if ( typeof html !== 'string' ) {
				return null;
			}
			// A diff needs no section IDs on its headings, so for a whole document the wrappers
			// can come off the string, which is far cheaper than unwrapping them in the DOM.
			// The stripped string still goes through parseDocument, which then finds no sections
			// to unwrap but keeps doing the rest: TemplateStyles, fallback IDs, base URL, and
			// the script deny list.
			const stripped = section === null ? mw.libs.ve.stripParsoidSections( html ) : null;
			// The section is selected from the parsed document, so the whole document is fetched.
			const doc = targetClass.static.parseDocument(
				stripped !== null ? stripped : html, 'visual', section, section !== null
			);
			mw.libs.ve.stripRestbaseIds( doc );
			return targetClass.static.createModelFromDom( doc, 'visual' );
		},

		/**
		 * Get a ve.dm.Document model from a Parsoid response
		 *
		 * @param {Object} response Parsoid response from the VisualEditor API
		 * @param {string|null} section Section. Null for the whole document.
		 * @return {ve.dm.Document|null} Document, or null if an invalid response
		 */
		getModelFromResponse: function ( response, section ) {
			const data = response ? ( response.visualeditor || response.visualeditoredit ) : null;
			return this.getModelFromHtml( data ? data.content : null, section );
		},

		/**
		 * Fetch a specific revision from Parsoid as a DM document, and cache in memory
		 *
		 * @param {number} revId Revision ID
		 * @param {string} [pageName] Unused. The revision ID identifies the content on its own.
		 * @param {string|null} [section=null] Section. Null for the whole document.
		 * @param {jQuery.Promise} [parseDocumentModulePromise] Promise which resolves when Target#parseDocument is available
		 * @return {jQuery.Promise} Promise which resolves with a document model
		 */
		fetchRevision: function ( revId, pageName, section, parseDocumentModulePromise ) {
			parseDocumentModulePromise = parseDocumentModulePromise || $.Deferred().resolve().promise();
			section = section !== undefined ? section : null;

			const cacheKey = revId + ( section !== null ? '/' + section : '' );

			if ( !revCache[ cacheKey ] ) {
				const start = ve.now();
				ve.track( 'trace.apiLoad.enter', { mode: 'visual' } );

				// A diff never saves, so it needs neither the metadata nor the server-side stash
				// that action=visualeditor builds. This route returns the same Parsoid HTML, and
				// unlike action=visualeditor it is cacheable, so it responds several times faster.
				revCache[ cacheKey ] = new mw.Rest().get( '/v1/revision/' + revId + '/html' ).then(
					( html ) => {
						ve.track( 'trace.apiLoad.exit', { mode: 'visual' } );
						mw.track( 'stats.mediawiki_ve_performance_system_apiLoad_seconds',
							ve.now() - start, { target: 'diff' } );
						return parseDocumentModulePromise.then(
							() => mw.libs.ve.diffLoader.getModelFromHtml( html, section )
						);
					},
					( ...args ) => {
						// Clear promise. Do not cache errors.
						delete revCache[ cacheKey ];
						// Let caller handle the error code
						return $.Deferred().reject( ...args );
					}
				);
			}

			return revCache[ cacheKey ];
		},

		/**
		 * Get a visual diff generator promise
		 *
		 * @param {number|jQuery.Promise} oldIdOrPromise Old revision ID, or document model promise
		 * @param {number|jQuery.Promise} newIdOrPromise New revision ID, or document model promise
		 * @param {jQuery.Promise} [parseDocumentModulePromise] Promise which resolves when Target#parseDocument is available
		 * @param {string} [oldPageName] Old revision's page name, defaults to wgRelevantPageName
		 * @param {string} [newPageName] New revision's page name, defaults to oldPageName
		 * @return {jQuery.Promise} Promise which resolves with a ve.dm.VisualDiff generator function
		 */
		getVisualDiffGeneratorPromise: function ( oldIdOrPromise, newIdOrPromise, parseDocumentModulePromise, oldPageName, newPageName ) {
			parseDocumentModulePromise = parseDocumentModulePromise || $.Deferred().resolve().promise();
			oldPageName = oldPageName || mw.config.get( 'wgRelevantPageName' );

			const oldRevPromise = typeof oldIdOrPromise === 'number' ? this.fetchRevision( oldIdOrPromise, oldPageName, null, parseDocumentModulePromise ) : oldIdOrPromise;
			const newRevPromise = typeof newIdOrPromise === 'number' ? this.fetchRevision( newIdOrPromise, newPageName, null, parseDocumentModulePromise ) : newIdOrPromise;

			return $.when( oldRevPromise, newRevPromise, parseDocumentModulePromise ).then( ( oldDoc, newDoc ) => {
				// TODO: Differ expects newDoc to be derived from oldDoc and contain all its store data.
				// We may want to remove that assumption from the differ?
				newDoc.getStore().merge( oldDoc.getStore() );
				return () => new ve.dm.VisualDiff( oldDoc, newDoc );
			} );
		}

	};
}() );
