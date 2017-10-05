/*!
 * VisualEditor MediaWiki DiffLoader.
 *
 * @copyright 2011-2017 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Diff loader.
 *
 * @class mw.libs.ve.diffLoader
 * @singleton
 */
( function () {
	var revCache = {};

	mw.libs.ve = mw.libs.ve || {};

	mw.libs.ve.diffLoader = {

		/**
		 * Get a ve.dm.Document model from a Parsoid response
		 *
		 * @param {Object} response Parsoid response from the VisualEditor API
		 * @return {ve.dm.Document|null} Document, or null if an invalid response
		 */
		getModelFromResponse: function ( response ) {
			var doc,
				targetClass = ve.init.mw.DesktopArticleTarget,
				metadataIdRegExp = ve.init.platform.getMetadataIdRegExp(),
				data = response ? ( response.visualeditor || response.visualeditoredit ) : null;
			if ( data && typeof data.content === 'string' ) {
				doc = targetClass.static.parseDocument( data.content, 'visual' );
				// Strip RESTBase IDs
				Array.prototype.forEach.call( doc.querySelectorAll( '[id^="mw"]' ), function ( element ) {
					if ( element.id.match( metadataIdRegExp ) ) {
						element.removeAttribute( 'id' );
					}
				} );
				return targetClass.static.createModelFromDom( doc, 'visual' );
			}
			return null;
		},

		/**
		 * Fetch a specific revision from Parsoid as a DM document, and cache in memory
		 *
		 * @param {number} revId Revision ID
		 * @param {string} [pageName] Page name, defaults to wgRelevantPageName
		 * @param {jQuery.Promise} [parseDocumentModulePromise] Promise which resolves when Target#parseDocument is available
		 * @return {jQuery.Promise} Promise which resolves with a document model
		 */
		fetchRevision: function ( revId, pageName, parseDocumentModulePromise ) {
			parseDocumentModulePromise = parseDocumentModulePromise || $.Deferred().resolve().promise();
			pageName = pageName || mw.config.get( 'wgRelevantPageName' );

			revCache[ pageName ] = revCache[ pageName ] || {};
			revCache[ pageName ][ revId ] =
				revCache[ pageName ][ revId ] ||
				mw.libs.ve.targetLoader.requestParsoidData( pageName, { oldId: revId, targetName: 'diff' } ).then( function ( response ) {
					return parseDocumentModulePromise.then( function () {
						return mw.libs.ve.diffLoader.getModelFromResponse( response );
					} );
				} );

			return revCache[ pageName ][ revId ];
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
			var oldRevPromise, newRevPromise;

			parseDocumentModulePromise = parseDocumentModulePromise || $.Deferred().resolve().promise();
			oldPageName = oldPageName || mw.config.get( 'wgRelevantPageName' );

			oldRevPromise = typeof oldIdOrPromise === 'number' ? this.fetchRevision( oldIdOrPromise, oldPageName, parseDocumentModulePromise ) : oldIdOrPromise;
			newRevPromise = typeof newIdOrPromise === 'number' ? this.fetchRevision( newIdOrPromise, newPageName, parseDocumentModulePromise ) : newIdOrPromise;

			return $.when( oldRevPromise, newRevPromise, parseDocumentModulePromise ).then( function ( oldDoc, newDoc ) {
				// TODO: Differ expects newDoc to be derived from oldDoc and contain all its store data.
				// We may want to remove that assumption from the differ?
				newDoc.getStore().merge( oldDoc.getStore() );
				return function () {
					return new ve.dm.VisualDiff( oldDoc, newDoc );
				};
			} );
		}

	};
}() );
