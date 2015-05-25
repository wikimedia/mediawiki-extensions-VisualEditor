/*!
 * VisualEditor UserInterface MWTemplateTitleInputWidget class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Creates an ve.ui.MWTemplateTitleInputWidget object.
 *
 * @class
 * @extends ve.ui.MWTitleInputWidget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @cfg {number} [namespace] Namespace to prepend to queries. Defaults to template namespace.
 */
ve.ui.MWTemplateTitleInputWidget = function VeUiMWTemplateTitleInputWidget( config ) {
	// Parent constructor
	ve.ui.MWTitleInputWidget.call( this, config );

	// Properties
	this.namespace = config.namespace || mw.config.get( 'wgNamespaceIds' ).template;
	this.descriptions = {};

	// Initialization
	this.$element.addClass( 've-ui-mwTemplateTitleInputWidget' );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTemplateTitleInputWidget, ve.ui.MWTitleInputWidget );

/* Methods */

/**
 * Get a new request object of the current lookup query value.
 *
 * See the parent documentation at <https://doc.wikimedia.org/mediawiki-core/master/js/#!/api/mw.widgets.TitleInputWidget>
 *
 * @return {jQuery.Promise} jQuery AJAX object, or promise object with an .abort() method
 */
ve.ui.MWTemplateTitleInputWidget.prototype.getLookupRequest = function () {
	var xhr,
		widget = this,
		value = this.value;

	// Prefix with default namespace name
	if ( this.namespace !== null && mw.Title.newFromText( value, this.namespace ) ) {
		value = mw.Title.newFromText( value, this.namespace ).getPrefixedText();
	}

	// Dont send leading ':' to open search
	if ( value.slice( 0, 1 ) === ':' ) {
		value = value.slice( 1 );
	}

	xhr = new mw.Api().get( {
		action: 'opensearch',
		search: value,
		suggest: ''
	} );

	return xhr
		// Also get descriptions
		.then( function ( response ) {
			var xhr,
				templates = response[1];

			widget.originalResponse = response;

			if ( templates.length > 0 ) {
				xhr = new mw.Api().get( {
					action: 'templatedata',
					titles: templates.join( '|' ),
					lang: mw.config.get( 'wgUserLanguage' ),
					redirects: '1'
				} );
				return xhr.promise( { abort: xhr.abort } );
			} else {
				return $.Deferred().resolve();
			}
		} )
		.then( function ( templateDataResponse ) {
			var pageId;
			// Look for descriptions and cache them
			if ( templateDataResponse ) {
				for ( pageId in templateDataResponse.pages ) {
					if ( templateDataResponse.pages[pageId].title && !widget.descriptions[templateDataResponse.pages[pageId].title] ) {
						// Cache descriptions
						widget.descriptions[templateDataResponse.pages[pageId].title] = templateDataResponse.pages[pageId].description;
					}
				}
			}
			// Return the original response
			return widget.originalResponse;
		} )
		.promise( { abort: xhr.abort } );
};

/**
 * @inheritdoc
 */
ve.ui.MWTemplateTitleInputWidget.prototype.getLookupMenuOptionsFromData = function ( data ) {
	var i, len, title, value,
		items = [],
		matchingPages = data,
		linkCacheUpdate = {};

	// Matching pages
	if ( matchingPages && matchingPages.length ) {
		for ( i = 0, len = matchingPages.length; i < len; i++ ) {
			title = new mw.Title( matchingPages[i] );
			linkCacheUpdate[matchingPages[i]] = { missing: false };
			if ( this.namespace !== null ) {
				value = title.getRelativeText( this.namespace );
			} else {
				value = title.getPrefixedText();
			}
			items.push( new ve.ui.MWTemplateMenuOptionWidget( {
				templateName: value,
				templateDescription: this.descriptions[matchingPages[i]],
				label: value
			} ) );
		}
		ve.init.platform.linkCache.set( linkCacheUpdate );
	}

	return items;
};
