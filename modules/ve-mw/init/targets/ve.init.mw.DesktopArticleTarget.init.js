/*!
 * VisualEditor MediaWiki DesktopArticleTarget init.
 *
 * This file must remain as widely compatible as the base compatibility
 * for MediaWiki itself (see mediawiki/core:/resources/startup.js).
 * Avoid use of: ES5, SVG, HTML5 DOM, ContentEditable etc.
 *
 * @copyright 2011-2017 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/* eslint-ecmaVersion 3 */

/**
 * Platform preparation for the MediaWiki view page. This loads (when user needs it) the
 * actual MediaWiki integration and VisualEditor library.
 *
 * @class mw.libs.ve
 * @alternateClassName ve.init.mw.DesktopArticleTarget.init
 * @singleton
 */
( function () {
	var conf, tabMessages, uri, pageExists, viewUri, veEditUri, veEditSourceUri, isViewPage, isEditPage,
		pageCanLoadEditor, init, targetPromise, enable, tempdisable, autodisable,
		tabPreference, userPrefEnabled, userPrefPreferShow, initialWikitext, oldid,
		isLoading,
		editModes = {
			edit: 'visual'
		},
		active = false,
		targetLoaded = false,
		progressStep = 0,
		progressSteps = [
			[ 30, 3000 ],
			[ 70, 2000 ],
			[ 100, 1000 ]
		],
		plugins = [];

	function showLoading() {
		var $content, contentRect, offsetTop, windowHeight, top, bottom, middle;

		if ( isLoading ) {
			return;
		}

		isLoading = true;

		$( 'html' ).addClass( 've-activated ve-loading' );
		if ( !init.$loading ) {
			init.$loading = $(
				'<div class="ve-init-mw-desktopArticleTarget-loading-overlay">' +
					'<div class="ve-init-mw-desktopArticleTarget-progress">' +
						// Stylesheets might not have processed yet, so manually set starting width to 0
						'<div class="ve-init-mw-desktopArticleTarget-progress-bar" style="width: 0;"></div>' +
					'</div>' +
				'</div>'
			);
		}

		// Center within visible part of the target
		$content = $( '#content' );
		contentRect = $content[ 0 ].getBoundingClientRect();
		windowHeight = $( window ).height();
		top = Math.max( contentRect.top, 0 );
		bottom = Math.min( contentRect.bottom, windowHeight );
		middle = ( bottom - top ) / 2;
		offsetTop = Math.max( -contentRect.top, 0 );

		init.$loading.css( 'top', middle + offsetTop );

		$content.prepend( init.$loading );
	}

	function setLoadingProgress( target, duration ) {
		var $bar = init.$loading.find( '.ve-init-mw-desktopArticleTarget-progress-bar' ).stop();
		$bar.css( 'transition', 'width ' + duration + 'ms ease-in' );
		setTimeout( function () {
			$bar.css( 'width', target + '%' );
		} );
	}

	function incrementLoadingProgress() {
		var step = progressSteps[ progressStep ];
		if ( step ) {
			setLoadingProgress( step[ 0 ], step[ 1 ] );
			progressStep++;
		}
	}

	function resetLoadingProgress() {
		progressStep = 0;
		setLoadingProgress( 0, 0 );
	}

	function hideLoading() {
		isLoading = false;
		$( 'html' ).removeClass( 've-loading' );
		if ( init.$loading ) {
			init.$loading.detach();
		}
	}

	function parseSection( section ) {
		var parsedSection = section;
		// Section must be a number, 'new' or 'T-' prefixed
		if ( section !== 'new' && section.indexOf( 'T-' ) !== 0 ) {
			parsedSection = +section;
			if ( isNaN( parsedSection ) ) {
				parsedSection = null;
			}
		}
		return parsedSection;
	}

	/**
	 * Use deferreds to avoid loading and instantiating Target multiple times.
	 *
	 * @private
	 * @param {string} mode Target mode: 'visual' or 'source'
	 * @return {jQuery.Promise}
	 */
	function getTarget( mode, section ) {
		if ( !targetPromise ) {
			// The TargetLoader module is loaded in the bottom queue, so it should have been
			// requested already but it might not have finished loading yet
			targetPromise = mw.loader.using( 'ext.visualEditor.targetLoader' )
				.then( function () {
					mw.libs.ve.targetLoader.addPlugin( function () {
						// If the user and site modules fail, we still want to continue
						// loading, so convert failure to success

						return mw.loader.using( [ 'user', 'site' ] ).then(
							null,
							function () {
								return $.Deferred().resolve();
							}
						);
					} );
					// Add modules specific to desktop (modules shared between desktop
					// and mobile are already added by TargetLoader)
					// Note: it's safe to use .forEach() (ES5) here, because this code will
					// never be called if the browser doesn't support ES5
					[
						'ext.visualEditor.desktopArticleTarget',
						'ext.visualEditor.mwimage',
						'ext.visualEditor.mwmeta'
					].forEach( mw.libs.ve.targetLoader.addPlugin );
					// Add requested plugins
					plugins.forEach( mw.libs.ve.targetLoader.addPlugin );
					plugins = [];
					return mw.libs.ve.targetLoader.loadModules();
				} )
				.then( function () {
					var target,
						modes = [];

					if ( init.isVisualAvailable ) {
						modes.push( 'visual' );
					}

					if ( init.isWikitextAvailable ) {
						modes.push( 'source' );
					}

					target = ve.init.mw.targetFactory.create(
						conf.contentModels[ mw.config.get( 'wgPageContentModel' ) ], {
							modes: modes,
							defaultMode: mode
						}
					);
					target.setContainer( $( '#content' ) );
					targetLoaded = true;
					return target;
				}, function ( e ) {
					mw.log.warn( 'VisualEditor failed to load: ' + e );
				} );
		}

		targetPromise.then( function ( target ) {
			target.section = section;
			// Enqueue the loading of deferred modules (that is, modules which provide
			// functionality that is not needed for loading the editor).
			setTimeout( function () {
				mw.loader.load( 'easy-deflate.deflate' );
			}, 500 );
		} );

		return targetPromise;
	}

	function trackActivateStart( initData ) {
		ve.track( 'trace.activate.enter' );
		ve.track( 'mwedit.init', initData );
		mw.libs.ve.activationStart = ve.now();
	}

	function setEditorPreference( editor ) {
		var key = pageExists ? 'edit' : 'create',
			sectionKey = 'editsection';

		if ( editor !== 'visualeditor' && editor !== 'wikitext' ) {
			throw new Error( 'setEditorPreference called with invalid option: ', editor );
		}

		if (
			mw.config.get( 'wgVisualEditorConfig' ).singleEditTab &&
			tabPreference === 'remember-last'
		) {
			if ( $( '#ca-view-foreign' ).length ) {
				key += 'localdescription';
			}
			if ( editor === 'wikitext' ) {
				key += 'source';
				sectionKey += 'source';
			}

			$( '#ca-edit a' ).text( mw.msg( tabMessages[ key ] || 'edit' ) );
			$( '.mw-editsection a' ).text( mw.msg( tabMessages[ sectionKey ] || 'editsection' ) );
		}

		$.cookie( 'VEE', editor, { path: '/', expires: 30 } );
		if ( mw.user.isAnon() ) {
			return $.Deferred().resolve();
		}
		if ( mw.user.options.get( 'visualeditor-editor' ) === editor ) {
			return $.Deferred().resolve();
		}
		return new mw.Api().saveOption( 'visualeditor-editor', editor ).then( function () {
			mw.user.options.set( 'visualeditor-editor', editor );
		} );
	}

	/**
	 * Load and activate the target.
	 *
	 * If you need to call methods on the target before activate is called, call getTarget()
	 * yourself, chain your work onto that promise, and pass that chained promise in as targetPromise.
	 * E.g. `activateTarget( getTarget().then( function( target ) { target.doAThing(); } ) );`
	 *
	 * @private
	 * @param {string} mode Target mode: 'visual' or 'source'
	 * @param {number|string} [section] Section to edit (currently just source mode)
	 * @param {jQuery.Promise} [targetPromise] Promise that will be resolved with a ve.init.mw.DesktopArticleTarget
	 * @param {boolean} [modified] The page was been modified before loading (e.g. in source mode)
	 */
	function activateTarget( mode, section, targetPromise, modified ) {
		var dataPromise;
		// Only call requestPageData early if the target object isn't there yet.
		// If the target object is there, this is a second or subsequent load, and the
		// internal state of the target object can influence the load request.
		if ( !targetLoaded ) {
			// The TargetLoader module is loaded in the bottom queue, so it should have been
			// requested already but it might not have finished loading yet
			dataPromise = mw.loader.using( 'ext.visualEditor.targetLoader' )
				.then( function () {
					return mw.libs.ve.targetLoader.requestPageData(
						mode,
						mw.config.get( 'wgRelevantPageName' ),
						section,
						oldid,
						'mwTarget', // ve.init.mw.DesktopArticleTarget.static.name
						modified
					);
				} )
				.done( incrementLoadingProgress );
		}

		if ( mode === 'visual' ) {
			setEditorPreference( 'visualeditor' );
		} else {
			setEditorPreference( 'wikitext' );
		}

		showLoading();
		incrementLoadingProgress();
		active = true;

		targetPromise = targetPromise || getTarget( mode, section );
		targetPromise
			.then( function ( target ) {
				var activatePromise;
				incrementLoadingProgress();
				target.on( 'deactivate', function () {
					active = false;
				} );
				// Detach the loading bar for activation so it doesn't get moved around
				// and altered, re-attach immediately after
				init.$loading.detach();
				// If target was already loaded, ensure the mode is correct
				target.setDefaultMode( mode );
				activatePromise = target.activate( dataPromise );
				$( '#content' ).prepend( init.$loading );
				return activatePromise;
			} )
			.then( function () {
				ve.track( 'mwedit.ready' );
			} )
			.always( function () {
				hideLoading();
				resetLoadingProgress();
			} );
	}

	function activatePageTarget( mode, modified ) {
		trackActivateStart( { type: 'page', mechanism: 'click' } );

		if ( !active ) {
			if ( uri.query.action !== 'edit' && !( uri.query.veaction in editModes ) ) {
				if ( history.pushState ) {
					// Replace the current state with one that is tagged as ours, to prevent the
					// back button from breaking when used to exit VE. FIXME: there should be a better
					// way to do this. See also similar code in the DesktopArticleTarget constructor.
					history.replaceState( { tag: 'visualeditor' }, document.title, uri );
					// Set veaction to edit
					history.pushState( { tag: 'visualeditor' }, document.title, mode === 'source' ? veEditSourceUri : veEditUri );
				}

				// Update mw.Uri instance
				uri = veEditUri;
			}

			activateTarget( mode, null, undefined, modified );
		}
	}

	function getLastEditor() {
		// This logic matches VisualEditorHooks::getUserEditor
		var editor = $.cookie( 'VEE' );
		// Set editor to user's preference or site's default if …
		if (
			// … user is logged in,
			!mw.user.isAnon() ||
			// … no cookie is set, or
			!editor ||
			// value is invalid.
			!( editor === 'visualeditor' || editor === 'wikitext' )
		) {
			editor = mw.user.options.get( 'visualeditor-editor' );
		}
		return editor;
	}

	function getPreferredEditor() {
		switch ( tabPreference ) {
			case 'remember-last':
				return getLastEditor();
			case 'prefer-ve':
				return 'visualeditor';
			case 'prefer-wt':
				return 'wikitext';
			default:
				// Two tabs, no preference
				return null;
		}
	}

	conf = mw.config.get( 'wgVisualEditorConfig' );
	tabMessages = conf.tabMessages;
	uri = new mw.Uri();
	oldid = uri.query.oldid || $( 'input[name=parentRevId]' ).val();
	pageExists = !!mw.config.get( 'wgRelevantArticleId' );
	viewUri = new mw.Uri( mw.util.getUrl( mw.config.get( 'wgRelevantPageName' ) ) );
	isViewPage = mw.config.get( 'wgIsArticle' ) && !( 'diff' in uri.query );
	pageCanLoadEditor = (
		isViewPage ||
		mw.config.get( 'wgAction' ) === 'edit' ||
		mw.config.get( 'wgAction' ) === 'submit'
	);
	isEditPage = conf.singleEditTab && (
		uri.query.action === 'edit' ||
		uri.query.action === 'submit'
	);

	init = {
		blacklist: conf.blacklist,

		/**
		 * Add a plugin module or function.
		 *
		 * Plugins are run after VisualEditor is loaded, but before it is initialized. This allows
		 * plugins to add classes and register them with the factories and registries.
		 *
		 * The parameter to this function can be a ResourceLoader module name or a function.
		 *
		 * If it's a module name, it will be loaded together with the VisualEditor core modules when
		 * VE is loaded. No special care is taken to ensure that the module runs after the VE
		 * classes are loaded, so if this is desired, the module should depend on
		 * ext.visualEditor.core .
		 *
		 * If it's a function, it will be invoked once the VisualEditor core modules and any
		 * plugin modules registered through this function have been loaded, but before the editor
		 * is intialized. The function can optionally return a jQuery.Promise . VisualEditor will
		 * only be initialized once all promises returned by plugin functions have been resolved.
		 *
		 *     // Register ResourceLoader module
		 *     mw.libs.ve.addPlugin( 'ext.gadget.foobar' );
		 *
		 *     // Register a callback
		 *     mw.libs.ve.addPlugin( function ( target ) {
		 *         ve.dm.Foobar = .....
		 *     } );
		 *
		 *     // Register a callback that loads another script
		 *     mw.libs.ve.addPlugin( function () {
		 *         return $.getScript( 'http://example.com/foobar.js' );
		 *     } );
		 *
		 * @param {string|Function} plugin Module name or callback that optionally returns a promise
		 */
		addPlugin: function ( plugin ) {
			plugins.push( plugin );
		},

		setupMultiTabSkin: function () {
			init.setupMultiTabs();
			init.setupMultiSectionLinks();
		},

		setupMultiTabs: function () {
			var caVeEdit,
				action = pageExists ? 'edit' : 'create',
				pTabsId = $( '#p-views' ).length ? 'p-views' : 'p-cactions',
				$caSource = $( '#ca-viewsource' ),
				$caEdit = $( '#ca-edit' ),
				$caVeEdit = $( '#ca-ve-edit' ),
				$caEditLink = $caEdit.find( 'a' ),
				$caVeEditLink = $caVeEdit.find( 'a' ),
				reverseTabOrder = $( 'body' ).hasClass( 'rtl' ) && pTabsId === 'p-views',
				caVeEditNextnode =
					// eslint-disable-next-line no-bitwise
					( reverseTabOrder ^ conf.tabPosition === 'before' ) ?
						$caEdit.get( 0 ) :
						$caEdit.next().get( 0 );

			// HACK: Remove this when the Education Program offers a proper way to detect and disable.
			if (
				mw.config.get( 'wgNamespaceIds' ).education_program === mw.config.get( 'wgNamespaceNumber' )
			) {
				return;
			}

			if ( !$caVeEdit.length ) {
				// The below duplicates the functionality of VisualEditorHooks::onSkinTemplateNavigation()
				// in case we're running on a cached page that doesn't have these tabs yet.

				// If there is no edit tab or a view-source tab,
				// the user doesn't have permission to edit.
				if ( $caEdit.length && !$caSource.length ) {
					// Add the VisualEditor tab (#ca-ve-edit)
					caVeEdit = mw.util.addPortletLink(
						pTabsId,
						// Use url instead of '#'.
						// So that 1) one can always open it in a new tab, even when
						// onEditTabClick is bound.
						// 2) when onEditTabClick is not bound (!pageCanLoadEditor) it will
						// just work.
						veEditUri,
						tabMessages[ action ] !== null ? mw.msg( tabMessages[ action ] ) : $caEditLink.text(),
						'ca-ve-edit',
						mw.msg( 'tooltip-ca-ve-edit' ),
						mw.msg( 'accesskey-ca-ve-edit' ),
						caVeEditNextnode
					);

					$caVeEdit = $( caVeEdit );
					$caVeEditLink = $caVeEdit.find( 'a' );
				}
			} else if ( $caEdit.length && $caVeEdit.length ) {
				// Make the state of the page consistent with the config if needed
				// eslint-disable-next-line no-bitwise
				if ( reverseTabOrder ^ conf.tabPosition === 'before' ) {
					if ( $caEdit[ 0 ].nextSibling === $caVeEdit[ 0 ] ) {
						$caVeEdit.after( $caEdit );
					}
				} else {
					if ( $caVeEdit[ 0 ].nextSibling === $caEdit[ 0 ] ) {
						$caEdit.after( $caVeEdit );
					}
				}
				// eslint-enable no-bitwise
				if ( tabMessages[ action ] !== null ) {
					$caVeEditLink.text( mw.msg( tabMessages[ action ] ) );
				}
			}

			// If the edit tab is hidden, remove it.
			if ( !( init.isVisualAvailable && userPrefPreferShow ) ) {
				$caVeEdit.remove();
			} else if ( pageCanLoadEditor ) {
				// Allow instant switching to edit mode, without refresh
				$caVeEdit.on( 'click', init.onEditTabClick.bind( init, 'visual' ) );
			}
			if ( pageCanLoadEditor && init.isWikitextAvailable ) {
				$caEdit.add( '#ca-addsection' ).on( 'click', init.onEditTabClick.bind( init, 'source' ) );
			}

			// Alter the edit tab (#ca-edit)
			if ( $( '#ca-view-foreign' ).length ) {
				if ( tabMessages[ action + 'localdescriptionsource' ] !== null ) {
					$caEditLink.text( mw.msg( tabMessages[ action + 'localdescriptionsource' ] ) );
				}
			} else {
				if ( tabMessages[ action + 'source' ] !== null ) {
					$caEditLink.text( mw.msg( tabMessages[ action + 'source' ] ) );
				}
			}

			if ( init.isVisualAvailable ) {
				if ( conf.tabPosition === 'before' ) {
					$caEdit.addClass( 'collapsible' );
				} else {
					$caVeEdit.addClass( 'collapsible' );
				}
			}
		},

		setupMultiSectionLinks: function () {
			var $editsections = $( '#mw-content-text .mw-editsection' ),
				bodyDir = $( 'body' ).css( 'direction' );

			// Match direction of the user interface
			// TODO: Why is this needed? It seems to work fine without.
			if ( $editsections.css( 'direction' ) !== bodyDir ) {
				// Avoid creating inline style attributes if the inherited value is already correct
				$editsections.css( 'direction', bodyDir );
			}

			// The "visibility" css construct ensures we always occupy the same space in the layout.
			// This prevents the heading from changing its wrap when the user toggles editSourceLink.
			if ( $editsections.find( '.mw-editsection-visualeditor' ).length === 0 ) {
				// If PHP didn't build the section edit links (because of caching), build them
				$editsections.each( function () {
					var $editsection = $( this ),
						$editSourceLink = $editsection.find( 'a' ).eq( 0 ),
						$editLink = $editSourceLink.clone(),
						$divider = $( '<span>' ),
						dividerText = mw.msg( 'pipe-separator' );

					if ( tabMessages.editsectionsource !== null ) {
						$editSourceLink.text( mw.msg( tabMessages.editsectionsource ) );
					}
					if ( tabMessages.editsection !== null ) {
						$editLink.text( mw.msg( tabMessages.editsection ) );
					}
					$divider
						.addClass( 'mw-editsection-divider' )
						.text( dividerText );
					// Don't mess with section edit links on foreign file description pages
					// (bug 54259)
					if ( !$( '#ca-view-foreign' ).length ) {
						$editLink
							.attr( 'href', new mw.Uri( veEditUri ) )
							.addClass( 'mw-editsection-visualeditor' );

						if ( conf.tabPosition === 'before' ) {
							$editSourceLink.before( $editLink, $divider );
						} else {
							$editSourceLink.after( $divider, $editLink );
						}
					}
				} );
			}

			if ( pageCanLoadEditor ) {
				// Only init without refresh if we're on a view page. Though section edit links
				// are rarely shown on non-view pages, they appear in one other case, namely
				// when on a diff against the latest version of a page. In that case we mustn't
				// init without refresh as that'd initialise for the wrong rev id (bug 50925)
				// and would preserve the wrong DOM with a diff on top.
				$editsections
					.find( '.mw-editsection-visualeditor' )
						.on( 'click', init.onEditSectionLinkClick.bind( init, 'visual' ) );
				if ( init.isWikitextAvailable ) {
					$editsections
						// TOOD: Make this less fragile
						.find( 'a:not( .mw-editsection-visualeditor )' )
							.on( 'click', init.onEditSectionLinkClick.bind( init, 'source' ) );
				}
			}
		},

		/**
		 * Check whether a jQuery event represents a plain left click, without
		 * any modifiers
		 *
		 * This is a duplicate of a function in ve.utils, because this file runs
		 * before any of VE core or OOui has been loaded.
		 *
		 * @param {jQuery.Event} e The jQuery event object
		 * @return {boolean} Whether it was an unmodified left click
		 */
		isUnmodifiedLeftClick: function ( e ) {
			return e && e.which && e.which === 1 && !( e.shiftKey || e.altKey || e.ctrlKey || e.metaKey );
		},

		onEditTabClick: function ( mode, e ) {
			var section;
			if ( !init.isUnmodifiedLeftClick( e ) ) {
				return;
			}
			e.preventDefault();
			if ( isLoading ) {
				return;
			}

			section = $( e.target ).closest( '#ca-addsection' ).length ? 'new' : null;

			if ( active ) {
				targetPromise.done( function ( target ) {
					if ( mode === 'visual' && target.getDefaultMode() === 'source' ) {
						target.switchToVisualEditor();
					} else if (
						mode === 'source' && target.getDefaultMode() === 'source'
					) {
						// Requetsed section may have changed
						target.switchToWikitextSection( section );
					}
				} );
			} else {
				if ( section !== null ) {
					this.onEditSectionLinkClick( mode, e, section );
				} else {
					init.activateVe( mode );
				}
			}
		},

		activateVe: function ( mode ) {
			var wikitext = $( '#wpTextbox1' ).textSelection( 'getContents' );

			// Close any open jQuery.UI dialogs (e.g. WikiEditor's find and replace)
			if ( $.fn.dialog ) {
				$( '.ui-dialog-content' ).dialog( 'close' );
			}

			if (
				mw.config.get( 'wgAction' ) === 'submit' ||
				(
					mw.config.get( 'wgAction' ) === 'edit' &&
					wikitext !== initialWikitext
				) ||
				// switching from section editing must prompt because we can't
				// keep changes from that (yet?)
				$( 'input[name=wpSection]' ).val()
			) {
				mw.loader.using( 'ext.visualEditor.switching' ).done( function () {
					var windowManager = new OO.ui.WindowManager(),
						switchWindow = new mw.libs.ve.SwitchConfirmDialog();
					// Prompt if either we're on action=submit (the user has previewed) or
					// the wikitext hash is different to the value observed upon page load.

					$( 'body' ).append( windowManager.$element );
					windowManager.addWindows( [ switchWindow ] );
					windowManager.openWindow( switchWindow )
						.then( function ( opened ) { return opened; } )
						.then( function ( closing ) { return closing; } )
						.then( function ( data ) {
							var oldUri;
							// TODO: windowManager.destroy()?
							if ( data && data.action === 'keep' ) {
								activatePageTarget( mode, true );
							} else if ( data && data.action === 'discard' ) {
								setEditorPreference( 'visualeditor' );
								oldUri = veEditUri.clone();
								delete oldUri.query.veswitched;
								location.href = oldUri.extend( { wteswitched: 1 } );
							}
						} );
				} );
			} else {
				activatePageTarget( mode, false );
			}
		},

		/**
		 * Handle section edit links being clicked
		 *
		 * @param {string} mode Edit mode
		 * @param {jQuery.Event} e Click event
		 * @param {number|string} [section] Override edit section, taken from link URL if not specified
		 */
		onEditSectionLinkClick: function ( mode, e, section ) {
			var targetPromise,
				uri = new mw.Uri( e.target.href ),
				title = mw.Title.newFromText( uri.query.title || '' );

			if ( !init.isUnmodifiedLeftClick( e ) || !( 'action' in uri.query || 'veaction' in uri.query ) ) {
				return;
			}
			if ( title && title.getPrefixedText() !== new mw.Title( mw.config.get( 'wgRelevantPageName' ) ).getPrefixedText() ) {
				// title param doesn't match current page, let default event happen (navigate to other page)
				return true;
			}
			e.preventDefault();
			if ( isLoading ) {
				return;
			}

			trackActivateStart( { type: 'section', mechanism: 'click' } );

			if ( history.pushState && !( uri.query.veaction in editModes ) ) {
				// Replace the current state with one that is tagged as ours, to prevent the
				// back button from breaking when used to exit VE. FIXME: there should be a better
				// way to do this. See also similar code in the DesktopArticleTarget constructor.
				history.replaceState( { tag: 'visualeditor' }, document.title, uri );
				// Change the state to the href of the section link that was clicked. This saves
				// us from having to figure out the section number again.
				history.pushState( { tag: 'visualeditor' }, document.title, this.href );
			}

			if ( mode === 'visual' ) {
				// Get section based on heading count (may differ from wikitext section count)
				targetPromise = getTarget( mode ).then( function ( target ) {
					target.saveEditSection( $( e.target ).closest( 'h1, h2, h3, h4, h5, h6' ).get( 0 ) );
					return target;
				} );
			} else {
				// Use section from URL
				if ( section === undefined ) {
					section = parseSection( uri.query.section );
				}
				targetPromise = getTarget( mode, section );
			}
			activateTarget( mode, section, targetPromise );
		}
	};

	// Cast "0" (T89513)
	enable = +mw.user.options.get( 'visualeditor-enable' );
	tempdisable = +mw.user.options.get( 'visualeditor-betatempdisable' );
	autodisable = +mw.user.options.get( 'visualeditor-autodisable' );
	tabPreference = mw.user.options.get( 'visualeditor-tabs' );

	init.isSingleEditTab = conf.singleEditTab && tabPreference !== 'multi-tab';

	function isOnlyTabVE() {
		return conf.singleEditTab && getPreferredEditor() === 'visualeditor';
	}

	function isOnlyTabWikitext() {
		return conf.singleEditTab && getPreferredEditor() === 'wikitext';
	}

	// On a view page, extend the current URI so parameters like oldid are carried over
	// On a non-view page, use viewUri
	if ( init.isSingleEditTab ) {
		veEditUri = viewUri.clone().extend( { action: 'edit' } );
		delete veEditUri.query.veaction;
	} else {
		veEditUri = ( pageCanLoadEditor ? uri : viewUri ).clone().extend( { veaction: 'edit' } );
		veEditSourceUri = ( pageCanLoadEditor ? uri : viewUri ).clone().extend( { veaction: 'editsource' } );
		delete veEditUri.query.action;
		delete veEditSourceUri.query.action;
	}
	if ( oldid ) {
		veEditUri.extend( { oldid: oldid } );
	}

	// Whether VisualEditor should be available for the current user, page, wiki, mediawiki skin,
	// browser etc.
	init.isAvailable = (
		// Support check asserts that Array.prototype.indexOf is available so we can use it below
		VisualEditorSupportCheck() &&

		( ( 'vewhitelist' in uri.query ) || !$.client.test( init.blacklist, null, true ) ) &&

		// Only in supported skins
		conf.skins.indexOf( mw.config.get( 'skin' ) ) !== -1 &&

		// Not on pages which are outputs of the Translate extensions
		// TODO: Allow the Translate extension to do this itself
		mw.config.get( 'wgTranslatePageTranslation' ) !== 'translation' &&

		// Not on the edit conflict page of the TwoColumnConflict extension see T156251
		// TODO: Allow the TwoColumnConflict extension to do this itself
		mw.config.get( 'wgTwoColConflict' ) !== 'true' &&

		// Not on pages like Special:RevisionDelete
		mw.config.get( 'wgNamespaceNumber' ) !== -1
	);

	init.isVisualAvailable = (
		init.isAvailable &&

		// Only in enabled namespaces
		conf.namespaces.indexOf( new mw.Title( mw.config.get( 'wgRelevantPageName' ) ).getNamespaceId() ) !== -1 &&

		// Only for pages with a supported content model
		conf.contentModels.hasOwnProperty( mw.config.get( 'wgPageContentModel' ) )
	);

	init.isWikitextAvailable = (
		init.isAvailable &&

		// Enabled on site
		conf.enableWikitext &&

		// User preference
		mw.user.options.get( 'visualeditor-newwikitext' ) &&

		// Only on wikitext pages
		mw.config.get( 'wgPageContentModel' ) === 'wikitext'
	);

	if ( init.isWikitextAvailable ) {
		editModes.editsource = 'source';
	}

	userPrefEnabled = (
		// Allow disabling for anonymous users separately from changing the
		// default preference (bug 50000)
		!( conf.disableForAnons && mw.config.get( 'wgUserName' ) === null ) &&

		// User has 'visualeditor-enable' preference enabled (for alpha opt-in)
		// User has 'visualeditor-betatempdisable' preference disabled
		// User has 'visualeditor-autodisable' preference disabled
		enable && !tempdisable && !autodisable
	);
	userPrefPreferShow = (
		userPrefEnabled &&

		// Except when single edit tab for old wikitext
		!( conf.singleEditTab && tabPreference === 'prefer-wt' && !init.isWikitextAvailable )
	);

	// FIXME: We should do this more elegantly
	init.setEditorPreference = setEditorPreference;

	// Note: Though VisualEditor itself only needs this exposure for a very small reason
	// (namely to access init.blacklist from the unit tests...) this has become one of the nicest
	// ways to easily detect whether the VisualEditor initialisation code is present.
	//
	// The VE global was once available always, but now that platform integration initialisation
	// is properly separated, it doesn't exist until the platform loads VisualEditor core.
	//
	// Most of mw.libs.ve is considered subject to change and private.  An exception is that
	// mw.libs.ve.isVisualAvailable is public, and indicates whether the VE editor itself can be loaded
	// on this page. See above for why it may be false.
	mw.libs.ve = $.extend( mw.libs.ve || {}, init );

	if ( init.isVisualAvailable && userPrefPreferShow ) {
		$( 'html' ).addClass( 've-available' );
	} else {
		$( 'html' ).addClass( 've-not-available' );
		// Don't return here because we do want the skin setup to consistently happen
		// for e.g. "Edit" > "Edit source" even when VE is not available.
	}

	$( function () {
		var mode,
			showWikitextWelcome = true,
			section = uri.query.section !== undefined ? parseSection( uri.query.section ) : null,
			isLoggedIn = !mw.user.isAnon(),
			prefSaysShowWelcome = isLoggedIn && !mw.user.options.get( 'visualeditor-hidebetawelcome' ),
			urlSaysHideWelcome = 'hidewelcomedialog' in new mw.Uri( location.href ).query,
			welcomeDialogLocalStorageValue = null;

		if ( uri.query.action === 'edit' && $( '#wpTextbox1' ).length ) {
			initialWikitext = $( '#wpTextbox1' ).textSelection( 'getContents' );
		}

		if ( init.isAvailable ) {
			// Load the editor …
			if (
				uri.query.undo === undefined &&
				uri.query.undoafter === undefined &&
				uri.query.preload === undefined &&
				uri.query.preloadtitle === undefined &&
				uri.query.preloadparams === undefined &&
				uri.query.veswitched === undefined
				// Known-good parameters: edit, veaction, section
				// TODO: other params too? See identical list in VisualEditor.hooks.php)
			) {
				if (
					// … if on a ?veaction=edit/editsource page
					(
						isViewPage &&
						uri.query.veaction in editModes &&
						(
							uri.query.veaction === 'editsource' ||
							init.isVisualAvailable
						)
					) ||
					// … or if on ?action=edit in single edit mode and the user wants it
					(
						isEditPage &&
						(
							uri.query.wteswitched === '1' ||
							(
								tabPreference !== 'multi-tab' &&
								userPrefPreferShow &&
								// If it's a view-source situation, we don't want to show VE on-load
								!$( '#ca-viewsource' ).length &&
								(
									(
										tabPreference === 'prefer-ve' &&
										mw.config.get( 'wgAction' ) !== 'submit' &&
										init.isVisualAvailable
									) ||
									(
										tabPreference === 'prefer-wt' &&
										init.isWikitextAvailable
									) ||
									(
										tabPreference === 'remember-last' &&
										(
											(
												getLastEditor() !== 'wikitext' &&
												init.isVisualAvailable
											) ||
											init.isWikitextAvailable
										)
									)
								)
							)
						)
					)
				) {
					showWikitextWelcome = false;
					trackActivateStart( {
						type: section === null ? 'page' : 'section',
						mechanism: 'url'
					} );
					if ( isViewPage && uri.query.veaction in editModes ) {
						mode = editModes[ uri.query.veaction ];
					} else {
						if ( init.isWikitextAvailable && (
							getPreferredEditor() === 'wikitext' || (
								!init.isVisualAvailable &&
								[ 'edit', 'submit' ].indexOf( uri.query.action ) !== -1
							)
						) ) {
							mode = 'source';
						} else {
							mode = 'visual';
						}
					}
					activateTarget( mode, section );
				} else if (
					init.isVisualAvailable &&
					pageCanLoadEditor &&
					init.isSingleEditTab
				) {
					// In single edit tab mode we never have an edit tab
					// with accesskey 'v' so create one
					$( 'body' ).append(
						$( '<a>' )
							.attr( { accesskey: mw.msg( 'accesskey-ca-ve-edit' ), href: veEditUri } )
							// Accesskey fires a click event
							.on( 'click', init.onEditTabClick.bind( init, 'visual' ) )
							.hide()
					);
				}
			}

			// Add the switch button to wikitext ?action=edit or ?action=submit pages
			if (
				init.isVisualAvailable &&
				[ 'edit', 'submit' ].indexOf( mw.config.get( 'wgAction' ) ) !== -1
			) {
				mw.loader.load( 'ext.visualEditor.switching' );
				$( '#wpTextbox1' ).on( 'wikiEditor-toolbar-doneInitialSections', function () {
					mw.loader.using( 'ext.visualEditor.switching' ).done( function () {
						var $content, windowManager, editingTabDialog, showAgainCheckbox, showAgainLayout, switchButton,
							showPopup = uri.query.veswitched && !mw.user.options.get( 'visualeditor-hidesourceswitchpopup' );

						if ( showPopup ) {
							$content = $( '<p>' ).text( mw.msg( 'visualeditor-mweditmodeve-popup-body' ) );

							if ( !mw.user.isAnon() ) {
								showAgainCheckbox = new OO.ui.CheckboxInputWidget()
									.on( 'change', function ( value ) {
										var configValue = value ? '1' : '';
										new mw.Api().saveOption( 'visualeditor-hidesourceswitchpopup', configValue );
										mw.user.options.set( 'visualeditor-hidesourceswitchpopup', configValue );
									} );

								showAgainLayout = new OO.ui.FieldLayout( showAgainCheckbox, {
									align: 'inline',
									label: mw.msg( 'visualeditor-mweditmodeve-showagain' )
								} );
								$content = $content.add( showAgainLayout.$element );
							}

							switchButton = new OO.ui.PopupButtonWidget( {
								framed: false,
								icon: 'edit',
								title: mw.msg( 'visualeditor-mweditmodeve-tool' ),
								classes: [ 've-init-mw-editSwitch' ],
								popup: {
									label: mw.msg( 'visualeditor-mweditmodeve-popup-title' ),
									$content: $content,
									padded: true,
									head: true
								}
							} );

							// HACK: Disable the toggle behaviour
							switchButton.disconnect( switchButton, { click: 'onAction' } );
						} else {
							switchButton = new OO.ui.ButtonWidget( {
								framed: false,
								icon: 'edit',
								title: mw.msg( 'visualeditor-mweditmodeve-tool' ),
								classes: [ 've-init-mw-editSwitch' ]
							} );
						}

						switchButton.on( 'click', init.activateVe.bind( this, 'visual' ) );

						$( '.wikiEditor-ui-toolbar' ).prepend( switchButton.$element );

						if ( showPopup ) {
							// Show the popup after appending
							switchButton.getPopup().toggle( true );
						}

						// Duplicate of this code in ve.init.mw.DesktopArticleTarget.js
						if ( $( '#ca-edit' ).hasClass( 'visualeditor-showtabdialog' ) ) {
							$( '#ca-edit' ).removeClass( 'visualeditor-showtabdialog' );
							// Set up a temporary window manager
							windowManager = new OO.ui.WindowManager();
							$( 'body' ).append( windowManager.$element );
							editingTabDialog = new mw.libs.ve.EditingTabDialog();
							windowManager.addWindows( [ editingTabDialog ] );
							windowManager.openWindow( editingTabDialog )
								.then( function ( opened ) { return opened; } )
								.then( function ( closing ) { return closing; } )
								.then( function ( data ) {
									// Detach the temporary window manager
									windowManager.destroy();

									if ( data && data.action === 'prefer-ve' ) {
										location.href = veEditUri;
									} else if ( data && data.action === 'multi-tab' ) {
										location.reload();
									}
								} );
						}
					} );
				} );

				// Remember that the user wanted wikitext, at least this time
				mw.libs.ve.setEditorPreference( 'wikitext' );
			}

			// NWE
			if ( init.isWikitextAvailable && !isOnlyTabVE() ) {
				$(
					// Edit section links, except VE ones when both editors visible
					'.mw-editsection a:not( .mw-editsection-visualeditor ),' +
					// Edit tab
					'#ca-edit a,' +
					// Add section is currently a wikitext-only feature
					'#ca-addsection a'
				).each( function () {
					var uri = new mw.Uri( this.href );
					if ( 'action' in uri.query ) {
						delete uri.query.action;
						uri.query.veaction = 'editsource';
						$( this ).attr( 'href', uri.toString() );
					}
				} );
			}

			// Set up the tabs appropriately if the user has VE on
			if ( init.isAvailable && userPrefPreferShow ) {
				// … on two-edit-tab wikis, or single-edit-tab wikis, where the user wants both …
				if ( !init.isSingleEditTab ) {
					// … set the skin up with both tabs and both section edit links.
					init.setupMultiTabSkin();
				} else if (
					pageCanLoadEditor && (
						( init.isVisualAvailable && isOnlyTabVE() ) ||
						( init.isWikitextAvailable && isOnlyTabWikitext() )
					)
				) {
					// … on single-edit-tab wikis, where VE is the user's preferred editor
					// Handle section edit link clicks
					$( '.mw-editsection a' ).on( 'click', function ( e ) {
						// isOnlyTabVE is computed on click as it may have changed since load
						init.onEditSectionLinkClick( isOnlyTabVE() ? 'visual' : 'source', e );
					} );
					// Allow instant switching to edit mode, without refresh
					$( '#ca-edit' ).on( 'click', function ( e ) {
						init.onEditTabClick( isOnlyTabVE() ? 'visual' : 'source', e );
					} );
				}
			}
		}

		try {
			welcomeDialogLocalStorageValue = localStorage.getItem( 've-beta-welcome-dialog' );
		} catch ( e ) {}
		if (
			showWikitextWelcome &&
			mw.config.get( 'wgVisualEditorConfig' ).showBetaWelcome &&
			[ 'edit', 'submit' ].indexOf( mw.config.get( 'wgAction' ) ) !== -1 &&
			!urlSaysHideWelcome &&
			(
				prefSaysShowWelcome ||
				(
					!isLoggedIn &&
					welcomeDialogLocalStorageValue === null &&
					$.cookie( 've-beta-welcome-dialog' ) === null
				)
			)
		) {
			mw.loader.using( 'ext.visualEditor.welcome' ).done( function () {
				var windowManager = new OO.ui.WindowManager(),
					welcomeDialog = new mw.libs.ve.WelcomeDialog();
				$( 'body' ).append( windowManager.$element );
				windowManager.addWindows( [ welcomeDialog ] );
				windowManager.openWindow(
					welcomeDialog,
					{
						switchable: init.isVisualAvailable,
						editor: 'source'
					}
				)
					.then( function ( opened ) { return opened; } )
					.then( function ( closing ) { return closing; } )
					.then( function ( data ) {
						windowManager.destroy();
						if ( data && data.action === 'switch-ve' ) {
							init.activateVe( 'visual' );
						}
					} );

				if ( prefSaysShowWelcome ) {
					new mw.Api().saveOption( 'visualeditor-hidebetawelcome', '1' );
					mw.user.options.set( 'visualeditor-hidebetawelcome', '1' );
				} else if ( !isLoggedIn && !urlSaysHideWelcome ) {
					try {
						localStorage.setItem( 've-beta-welcome-dialog', 1 );
					} catch ( e ) {
						$.cookie( 've-beta-welcome-dialog', 1, { path: '/', expires: 30 } );
					}
				}
			} );
		}

		if ( uri.query.venotify ) {
			// The following messages can be used here:
			// postedit-confirmation-saved
			// postedit-confirmation-created
			// postedit-confirmation-restored
			mw.hook( 'postEdit' ).fire( {
				message: mw.msg( 'postedit-confirmation-' + uri.query.venotify, mw.user )
			} );

			delete uri.query.venotify;
			// Get rid of the ?venotify= from the URL
			if ( history.replaceState ) {
				history.replaceState( null, document.title, uri );
			}
		}
	} );
}() );
