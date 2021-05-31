/*!
 * VisualEditor UserInterface MWTemplateTitleInputWidget class.
 *
 * @copyright 2011-2020 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Creates an ve.ui.MWTemplateTitleInputWidget object.
 *
 * @class
 * @extends mw.widgets.TitleInputWidget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @cfg {number} [namespace] Namespace to prepend to queries. Defaults to template namespace.
 */
ve.ui.MWTemplateTitleInputWidget = function VeUiMWTemplateTitleInputWidget( config ) {
	config = ve.extendObject( {}, {
		namespace: mw.config.get( 'wgNamespaceIds' ).template
	}, config );

	// Parent constructor
	ve.ui.MWTemplateTitleInputWidget.super.call( this, config );

	this.showTemplateDescriptions = this.showDescriptions;
	// Clear the showDescriptions flag for subsequent requests as we implement
	// description fetch ourselves
	this.showDescriptions = false;

	// Properties
	this.descriptions = {};

	// Initialization
	this.$element.addClass( 've-ui-mwTemplateTitleInputWidget' );
};

/* Inheritance */

// FIXME: This should extend mw.widgets.TitleSearchWidget instead
OO.inheritClass( ve.ui.MWTemplateTitleInputWidget, mw.widgets.TitleInputWidget );

/* Methods */

// @inheritdoc mw.widgets.TitleWidget
ve.ui.MWTemplateTitleInputWidget.prototype.getApiParams = function ( query ) {
	var params = ve.ui.MWTemplateTitleInputWidget.super.prototype.getApiParams.call( this, query );

	// TODO: This should stay as a feature flag for 3rd-parties to fallback to prefixsearch
	if ( mw.config.get( 'wgVisualEditorConfig' ).cirrusSearchLookup ) {
		ve.extendObject( params, {
			generator: 'search',
			gsrsearch: params.gpssearch,
			// gsrsort: 'incoming_links_desc',
			gsrnamespace: params.gpsnamespace,
			gsrlimit: params.gpslimit
		} );
		// Searching for "foo *" is pointless. Don't normalize it to "foo*" either but leave it
		// unchanged. This makes the word "foo" behave the same in "foo " and "foo bar". In both
		// cases it's not considered a prefix any more.
		if ( !/\s$/.test( params.gsrsearch ) ) {
			params.gsrsearch += '*';
		}
		if ( this.showRedirectTargets ) {
			params.gsrprop = 'redirecttitle';
		}
		delete params.gpssearch;
		delete params.gpsnamespace;
		delete params.gpslimit;
	}
	return params;
};

// @inheritdoc mw.widgets.TitleInputWidget
ve.ui.MWTemplateTitleInputWidget.prototype.getLookupRequest = function () {
	var widget = this,
		originalResponse,
		templateDataMessage = mw.message( 'templatedata-doc-subpage' ),
		templateDataInstalled = templateDataMessage.exists(),
		templateDocPageFragment = '/' + templateDataMessage.text(),
		promise = ve.ui.MWTemplateTitleInputWidget.super.prototype.getLookupRequest.call( this );

	/**
	 * @param {Object} response
	 * @param {Object} [newPage]
	 */
	function unshiftPages( response, newPage ) {
		response.query.pages.forEach( function ( page ) {
			page.index++;
		} );
		if ( newPage && newPage.title ) {
			newPage.index = 1;
			response.query.pages.unshift( newPage );
		}
	}

	promise = promise
		.then( function ( response ) {
			// TODO: Remove when not in Beta any more
			if ( !mw.config.get( 'wgVisualEditorConfig' ).cirrusSearchLookup ) {
				return response;
			}

			var query = widget.getQueryValue(),
				title = mw.Title.newFromText( query, widget.namespace );
			// No point in trying anything when the title is invalid
			if ( !response.query || !title ) {
				return response;
			}

			var lowerTitle = title.getPrefixedText().toLowerCase(),
				metadata = response.query.redirects || [],
				foundMatchingMetadata = metadata.some( function ( redirect ) {
					return redirect.from.toLowerCase() === lowerTitle;
				} );
			if ( foundMatchingMetadata ) {
				// Redirects will be carefully positioned later in TitleWidget.getOptionsFromData()
				return response;
			}

			var i,
				matchingRedirects = response.query.pages.filter( function ( page ) {
					return page.redirecttitle && page.redirecttitle.toLowerCase() === lowerTitle;
				} );
			if ( matchingRedirects.length ) {
				for ( i = matchingRedirects.length; i--; ) {
					var redirect = matchingRedirects[ i ];
					// Offer redirects as separate options when the user's input is an exact match
					unshiftPages( response, {
						pageid: redirect.pageid,
						ns: redirect.ns,
						title: redirect.redirecttitle
					} );
				}
				return response;
			}

			var matchingTitles = response.query.pages.filter( function ( page ) {
				return page.title.toLowerCase() === lowerTitle;
			} );
			if ( matchingTitles.length ) {
				for ( i = matchingTitles.length; i--; ) {
					// Make sure exact matches are at the very top
					unshiftPages( response );
					matchingTitles[ i ].index = 1;
				}
				return response;
			}

			// TODO: Do an extra HTTP request to guarantee exact matches are in the list
			return response;
		} )
		.promise( { abort: function () {} } );

	if ( !this.showTemplateDescriptions ) {
		return promise;
	}

	return promise
		.then( function ( response ) {
			var xhr, pageId, redirIndex,
				redirects = ( response.query && response.query.redirects ) || {},
				origPages = ( response.query && response.query.pages ) || {},
				newPages = [],
				titles;

			// Build a new array to replace response.query.pages, ensuring everything goes into
			// the order defined by the page's index key, instead of whatever random order the
			// browser would let you iterate over the old object in.
			for ( pageId in origPages ) {
				if ( 'index' in origPages[ pageId ] ) {
					newPages[ origPages[ pageId ].index - 1 ] = origPages[ pageId ];
				} else {
					// Watch out for cases where the index is specified on the redirect object
					// rather than the page object.
					for ( redirIndex in redirects ) {
						if ( redirects[ redirIndex ].to === origPages[ pageId ].title ) {
							newPages[ redirects[ redirIndex ].index - 1 ] = origPages[ pageId ];
							break;
						}
					}
				}
			}

			// T54448: Filter out matches which end in /doc or as configured on-wiki
			if ( templateDataInstalled ) {
				newPages = newPages.filter( function ( page ) {
					// Can't use String.endsWith() as that's ES6.
					// page.title.endsWith( templateDocPageFragment )
					return page.title.slice( 0 - templateDocPageFragment.length ) !== templateDocPageFragment;
				} );
			} else {
				// Even if not filtering /doc, collapse the sparse array
				newPages = newPages.filter( function ( page ) {
					return page;
				} );
			}

			titles = newPages.map( function ( page ) {
				return page.title;
			} );

			ve.setProp( response, 'query', 'pages', newPages );
			originalResponse = response; // lie!

			// Also get descriptions
			// FIXME: This should go through MWTransclusionModel rather than duplicate.
			if ( titles.length > 0 ) {
				xhr = widget.getApi().get( {
					action: 'templatedata',
					format: 'json',
					formatversion: 2,
					titles: titles,
					redirects: !!widget.showRedirects,
					includeMissingTitles: '1',
					lang: mw.config.get( 'wgUserLanguage' )
				} );
				return xhr.promise( { abort: xhr.abort } );
			}
		} )
		.then( function ( templateDataResponse ) {
			var index, page, missingTitle,
				pages = ( templateDataResponse && templateDataResponse.pages ) || {};
			// Look for descriptions and cache them
			for ( index in pages ) {
				page = pages[ index ];

				if ( page.missing ) {
					// Remmeber templates that don't exist in the link cache
					// { title: { missing: true|false }
					missingTitle = {};
					missingTitle[ page.title ] = { missing: true };
					ve.init.platform.linkCache.setMissing( missingTitle );
				} else if ( !page.notemplatedata ) {
					// Cache descriptions
					widget.descriptions[ page.title ] = page.description;
				}
			}
			// Return the original response
			return originalResponse;
		}, function () {
			// API request failed; most likely, we're on a wiki which doesn't have TemplateData.
			return originalResponse;
		} )
		.promise( { abort: function () {} } );
};

// @inheritdoc mw.widgets.TitleWidget
ve.ui.MWTemplateTitleInputWidget.prototype.getOptionWidgetData = function ( title, data ) {
	return ve.extendObject(
		ve.ui.MWTemplateTitleInputWidget.super.prototype.getOptionWidgetData.apply( this, arguments ),
		{
			description: this.descriptions[ title ],
			redirecttitle: data.originalData.redirecttitle
		}
	);
};

// @inheritdoc mw.widgets.TitleWidget
ve.ui.MWTemplateTitleInputWidget.prototype.createOptionWidget = function ( data ) {
	var widget = ve.ui.MWTemplateTitleInputWidget.super.prototype.createOptionWidget.call( this, data );

	if ( data.redirecttitle ) {
		// Same conditions as in mw.widgets.TitleWidget.getOptionWidgetData()
		var title = new mw.Title( data.redirecttitle ),
			text = this.namespace !== null && this.relative ?
				title.getRelativeText( this.namespace ) :
				data.redirecttitle;

		var $desc = widget.$element.find( '.mw-widget-titleOptionWidget-description' );
		if ( !$desc.length ) {
			$desc = $( '<span>' )
				.addClass( 'mw-widget-titleOptionWidget-description' )
				.appendTo( widget.$element );
		}
		$desc.prepend( $( '<div>' )
			.addClass( 've-ui-mwTemplateTitleInputWidget-redirectedfrom' )
			.text( mw.msg( 'redirectedfrom', text ) ) );
	}

	return widget;
};
