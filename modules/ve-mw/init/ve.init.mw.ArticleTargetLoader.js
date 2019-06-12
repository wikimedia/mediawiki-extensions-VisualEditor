/*!
 * VisualEditor MediaWiki ArticleTargetLoader.
 *
 * @copyright 2011-2019 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Target loader.
 *
 * Light-weight loader that loads ResourceLoader modules for VisualEditor
 * and HTML and page data from the API. Also handles plugin registration.
 *
 * @class mw.libs.ve.targetLoader
 * @singleton
 */
( function () {
	var prefName, prefValue,
		uri = new mw.Uri(),
		namespaces = mw.config.get( 'wgNamespaceIds' ),
		conf = mw.config.get( 'wgVisualEditorConfig' ),
		pluginCallbacks = [],
		modules = [ 'ext.visualEditor.articleTarget' ]
			// Add modules from $wgVisualEditorPluginModules
			.concat( conf.pluginModules.filter( mw.loader.getState ) );

	// Provide the new wikitext editor
	if (
		conf.enableWikitext &&
		(
			mw.user.options.get( 'visualeditor-newwikitext' ) ||
			uri.query.veaction === 'editsource'
		) &&
		mw.loader.getState( 'ext.visualEditor.mwwikitext' )
	) {
		modules.push( 'ext.visualEditor.mwwikitext' );
	}

	// Load signature tool if *any* namespace supports it.
	// It will be shown disabled on namespaces that don't support it.
	if (
		Object.keys( namespaces ).some( function ( name ) {
			return mw.Title.wantSignaturesNamespace( namespaces[ name ] );
		} )
	) {
		modules.push( 'ext.visualEditor.mwsignature' );
	}

	// Add preference modules
	for ( prefName in conf.preferenceModules ) {
		prefValue = mw.user.options.get( prefName );
		// Check "0" (T89513)
		if ( prefValue && prefValue !== '0' ) {
			modules.push( conf.preferenceModules[ prefName ] );
		}
	}

	mw.libs.ve = mw.libs.ve || {};

	mw.libs.ve.targetLoader = {
		/**
		 * Add a plugin module or callback.
		 *
		 * If a module name is passed, that module will be loaded alongside the other modules.
		 *
		 * If a callback is passed, it will be executed after the modules have loaded. The callback
		 * may optionally return a jQuery.Promise; if it does, loading won't be complete until
		 * that promise is resolved.
		 *
		 * @param {string|Function} plugin Plugin module name or callback
		 */
		addPlugin: function ( plugin ) {
			if ( typeof plugin === 'string' ) {
				modules.push( plugin );
			} else {
				pluginCallbacks.push( plugin );
			}
		},

		/**
		 * Load modules needed for VisualEditor, as well as plugins.
		 *
		 * This loads the base VE modules as well as any registered plugin modules.
		 * Once those are loaded, any registered plugin callbacks are executed,
		 * and we wait for all promises returned by those callbacks to resolve.
		 *
		 * @param {string} mode Initial editor mode, for tracking
		 * @return {jQuery.Promise} Promise resolved when the loading process is complete
		 */
		loadModules: function ( mode ) {
			ve.track( 'trace.moduleLoad.enter', { mode: mode } );
			return mw.loader.using( modules )
				.then( function () {
					ve.track( 'trace.moduleLoad.exit', { mode: mode } );
					pluginCallbacks.push( ve.init.platform.getInitializedPromise.bind( ve.init.platform ) );
					// Execute plugin callbacks and collect promises
					return $.when.apply( $, pluginCallbacks.map( function ( callback ) {
						return callback();
					} ) );
				} );
		},

		/**
		 * Request the page data and various metadata from the MediaWiki API (which will use
		 * Parsoid or RESTBase).
		 *
		 * @param {string} mode Target mode: 'visual' or 'source'
		 * @param {string} pageName Page name to request, in prefixed DB key form (underscores instead of spaces)
		 * @param {Object} [options] Options
		 * @param {boolean} [options.sessionStore] Store result in session storage (by page+mode+section) for auto-save
		 * @param {number|null|string} [options.section] Section to edit; number, null or 'new' (currently just source mode)
		 * @param {number} [options.oldId] Old revision ID. Current if omitted.
		 * @param {string} [options.targetName] Optional target name for tracking
		 * @param {boolean} [options.modified] The page was been modified before loading (e.g. in source mode)
		 * @param {string} [options.wikitext] Wikitext to convert to HTML. The original document is fetched if undefined.
		 * @param {string} [preload] Name of a page to use as preloaded content if pageName is empty
		 * @param {Array} [preloadparams] Parameters to substitute into preload if it's used
		 * @return {jQuery.Promise} Abortable promise resolved with a JSON object
		 */
		requestPageData: function ( mode, pageName, options ) {
			var sessionState, request, section, dataPromise, apiRequest, enableVisualSectionEditing;

			options = options || {};
			apiRequest = mode === 'source' ?
				this.requestWikitext.bind( this, pageName, options ) :
				this.requestParsoidData.bind( this, pageName, options );

			if ( options.sessionStore ) {
				try {
					// ve.init.platform.getSessionObject is not available yet
					sessionState = JSON.parse( mw.storage.session.get( 've-docstate' ) );
				} catch ( e ) {}

				if ( sessionState ) {
					request = sessionState.request || {};
					// Check true section editing is in use
					enableVisualSectionEditing = conf.enableVisualSectionEditing;
					section = request.mode === 'source' || enableVisualSectionEditing === true || enableVisualSectionEditing === options.targetName ?
						options.section : null;
					// Check the requested page, mode and section match the stored one
					if (
						request.pageName === pageName &&
						request.mode === mode &&
						request.section === section
						// NB we don't cache by oldid so that cached results can be recovered
						// even if the page has been since edited
					) {
						dataPromise = $.Deferred().resolve( {
							visualeditor: $.extend(
								{ content: mw.storage.session.get( 've-dochtml' ) },
								sessionState.response,
								{ recovered: true }
							)
						} ).promise();
						// If the document hasn't been edited since the user first loaded it, recover
						// their changes automatically.
						if ( sessionState.response.oldid === mw.config.get( 'wgCurRevisionId' ) ) {
							return dataPromise;
						} else {
							// Otherwise, prompt them if they want to recover, or reload the document
							// to see the latest version
							// This prompt will throw off all of our timing data, so just disable tracking
							// for this session
							ve.track = function () {};
							return mw.loader.using( 'oojs-ui-windows' ).then( function () {
								return OO.ui.confirm( mw.msg( 'visualeditor-autosave-modified-prompt-message' ), {
									title: mw.msg( 'visualeditor-autosave-modified-prompt-title' ),
									actions: [
										{ action: 'accept', label: mw.msg( 'visualeditor-autosave-modified-prompt-accept' ), flags: [ 'primary', 'progressive' ] },
										{ action: 'reject', label: mw.msg( 'visualeditor-autosave-modified-prompt-reject' ), flags: 'destructive' }
									] }
								).then( function ( confirmed ) {
									if ( confirmed ) {
										return dataPromise;
									} else {
										// If they requested the latest version, invalidate the autosave state
										mw.storage.session.remove( 've-docstate' );
										return apiRequest();
									}
								} );
							} );
						}
					}
				}
			}

			return apiRequest();
		},

		/**
		 * Request the page HTML and various metadata from the MediaWiki API (which will use
		 * Parsoid or RESTBase).
		 *
		 * @param {string} pageName See #requestPageData
		 * @param {Object} [options] See #requestPageData
		 * @return {jQuery.Promise} Abortable promise resolved with a JSON object
		 */
		requestParsoidData: function ( pageName, options ) {
			var start, apiXhr, restbaseXhr, apiPromise, restbasePromise, dataPromise, pageHtmlUrl, headers, data,
				section = options.section !== undefined ? options.section : null,
				useRestbase = ( conf.fullRestbaseUrl || conf.restbaseUrl ) && section === null,
				switched = false,
				fromEditedState = false;

			options = options || {};
			data = {
				action: 'visualeditor',
				paction: useRestbase ? 'metadata' : 'parse',
				page: pageName,
				uselang: mw.config.get( 'wgUserLanguage' ),
				editintro: uri.query.editintro,
				preload: options.preload,
				preloadparams: options.preloadparams,
				formatversion: 2
			};

			// Only request the API to explicitly load the currently visible revision if we're restoring
			// from oldid. Otherwise we should load the latest version. This prevents us from editing an
			// old version if an edit was made while the user was viewing the page and/or the user is
			// seeing (slightly) stale cache.
			if ( options.oldId !== undefined ) {
				data.oldid = options.oldId;
			}
			// Load DOM
			start = ve.now();
			ve.track( 'trace.apiLoad.enter', { mode: 'visual' } );

			if ( !useRestbase && options.wikitext !== undefined ) {
				// Non-RESTBase custom wikitext parse
				data.paction = 'parse';
				data.stash = true;
				switched = true;
				fromEditedState = options.modified;
				data.wikitext = options.wikitext;
				data.section = options.section;
				data.oldid = options.oldId;
				apiXhr = new mw.Api().post( data );
			} else {
				apiXhr = new mw.Api().get( data );
			}
			apiPromise = apiXhr.then( function ( data, jqxhr ) {
				ve.track( 'trace.apiLoad.exit', { mode: 'visual' } );
				ve.track( 'mwtiming.performance.system.apiLoad', {
					bytes: require( 'mediawiki.String' ).byteLength( jqxhr.responseText ),
					duration: ve.now() - start,
					cacheHit: /hit/i.test( jqxhr.getResponseHeader( 'X-Cache' ) ),
					targetName: options.targetName,
					mode: 'visual'
				} );
				if ( data.visualeditor ) {
					data.visualeditor.switched = switched;
					data.visualeditor.fromEditedState = fromEditedState;
				}
				return data;
			} );

			if ( useRestbase ) {
				ve.track( 'trace.restbaseLoad.enter', { mode: 'visual' } );

				headers = {
					// Should be synchronised with ApiVisualEditor.php
					Accept: 'text/html; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/HTML/2.0.0"',
					'Accept-Language': mw.config.get( 'wgVisualEditor' ).pageLanguageCode,
					'Api-User-Agent': 'VisualEditor-MediaWiki/' + mw.config.get( 'wgVersion' )
				};

				// Convert specified Wikitext to HTML
				if (
					// wikitext can be an empty string
					options.wikitext !== undefined &&
					// eslint-disable-next-line no-jquery/no-global-selector
					!$( '[name=wpSection]' ).val()
				) {
					if ( conf.fullRestbaseUrl ) {
						pageHtmlUrl = conf.fullRestbaseUrl + 'v1/transform/wikitext/to/html/';
					} else {
						pageHtmlUrl = conf.restbaseUrl.replace( 'v1/page/html/', 'v1/transform/wikitext/to/html/' );
					}
					switched = true;
					fromEditedState = options.modified;
					window.onbeforeunload = null;
					$( window ).off( 'beforeunload' );
					restbaseXhr = $.ajax( {
						url: pageHtmlUrl + encodeURIComponent( pageName ) +
							( data.oldid === undefined ? '' : '/' + data.oldid ),
						type: 'POST',
						data: {
							title: pageName,
							wikitext: options.wikitext,
							stash: 'true'
						},
						headers: headers,
						dataType: 'text'
					} );
				} else {
					// Fetch revision
					if ( conf.fullRestbaseUrl ) {
						pageHtmlUrl = conf.fullRestbaseUrl + 'v1/page/html/';
					} else {
						pageHtmlUrl = conf.restbaseUrl;
					}
					restbaseXhr = $.ajax( {
						url: pageHtmlUrl + encodeURIComponent( pageName ) +
							( data.oldid === undefined ? '' : '/' + data.oldid ) +
							'?redirect=false&stash=true',
						type: 'GET',
						headers: headers,
						dataType: 'text'
					} );
				}
				restbasePromise = restbaseXhr.then(
					function ( data, status, jqxhr ) {
						ve.track( 'trace.restbaseLoad.exit', { mode: 'visual' } );
						ve.track( 'mwtiming.performance.system.restbaseLoad', {
							bytes: require( 'mediawiki.String' ).byteLength( jqxhr.responseText ),
							duration: ve.now() - start,
							targetName: options.targetName,
							mode: 'visual'
						} );
						return [ data, jqxhr.getResponseHeader( 'etag' ) ];
					},
					function ( xhr, code, _ ) {
						if ( xhr.status === 404 ) {
							// Page does not exist, so let the user start with a blank document.
							return $.Deferred().resolve( [ '', undefined ] ).promise();
						} else {
							mw.log.warn( 'RESTBase load failed: ' + xhr.statusText );
							return $.Deferred().reject( code, xhr, _ ).promise();
						}
					}
				);

				dataPromise = $.when( apiPromise, restbasePromise )
					.then( function ( apiData, restbaseData ) {
						if ( apiData.visualeditor ) {
							if ( restbaseData[ 0 ] || !apiData.visualeditor.content ) {
								// If we have actual content loaded, use it.
								// Otherwise, allow fallback content if present.
								// If no fallback content, this will give us an empty string for
								// content, which is desirable.
								apiData.visualeditor.content = restbaseData[ 0 ];
								apiData.visualeditor.etag = restbaseData[ 1 ];
							}
							apiData.visualeditor.switched = switched;
							apiData.visualeditor.fromEditedState = fromEditedState;
						}
						return apiData;
					} )
					.promise( { abort: function () {
						apiXhr.abort();
						restbaseXhr.abort();
					} } );
			} else {
				dataPromise = apiPromise.promise( { abort: apiXhr.abort } );
			}

			return dataPromise.then( function ( resp ) {
				resp.veMode = 'visual';
				return resp;
			} );
		},

		/**
		 * Request the page wikitext and various metadata from the MediaWiki API.
		 *
		 * @param {string} pageName See #requestPageData
		 * @param {Object} [options] See #requestPageData
		 * @return {jQuery.Promise} Abortable promise resolved with a JSON object
		 */
		requestWikitext: function ( pageName, options ) {
			var data, dataPromise;

			options = options || {};
			data = {
				action: 'visualeditor',
				paction: 'wikitext',
				page: pageName,
				uselang: mw.config.get( 'wgUserLanguage' ),
				editintro: uri.query.editintro,
				preload: options.preload,
				preloadparams: options.preloadparams,
				formatversion: 2
			};

			// section should never really be undefined, but check just in case
			if ( options.section !== null && options.section !== undefined ) {
				data.section = options.section;
			}

			if ( options.oldId !== undefined ) {
				data.oldid = options.oldId;
			}

			dataPromise = new mw.Api().get( data );
			return dataPromise.then( function ( resp ) {
				resp.veMode = 'source';
				return resp;
			} );
		}
	};
}() );
