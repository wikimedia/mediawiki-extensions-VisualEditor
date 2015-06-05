/*!
 * VisualEditor UserInterface MWLinkTargetInputWidget class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Creates an ve.ui.MWLinkTargetInputWidget object.
 *
 * @class
 * @extends OO.ui.TextInputWidget
 * @mixins OO.ui.mixin.LookupElement
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWLinkTargetInputWidget = function VeUiMWLinkTargetInputWidget( config ) {
	var widget = this;

	// Config initialization
	config = config || {};

	// Parent constructor
	ve.ui.MWLinkTargetInputWidget.super.call( this, config );

	// Mixin constructors
	OO.ui.mixin.LookupElement.call( this, config );

	// Initialization
	this.$element.addClass( 've-ui-mwLinkTargetInputWidget' );
	this.lookupMenu.$element.addClass( 've-ui-mwLinkTargetInputWidget-menu' );
	if ( mw.config.get( 'wgVisualEditor' ).usePageImages ) {
		this.lookupMenu.$element.addClass( 've-ui-mwLinkTargetInputWidget-menu-withImages' );
	}
	if ( mw.config.get( 'wgVisualEditor' ).usePageDescriptions ) {
		this.lookupMenu.$element.addClass( 've-ui-mwLinkTargetInputWidget-menu-withDescriptions' );
	}

	this.interwikiPrefixes = [];
	this.interwikiPrefixesPromise = new mw.Api().get( {
		action: 'query',
		meta: 'siteinfo',
		siprop: 'interwikimap'
	} ).done( function ( data ) {
		$.each( data.query.interwikimap, function ( index, interwiki ) {
			widget.interwikiPrefixes.push( interwiki.prefix );
		} );
	} );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWLinkTargetInputWidget, OO.ui.TextInputWidget );

OO.mixinClass( ve.ui.MWLinkTargetInputWidget, OO.ui.mixin.LookupElement );

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWLinkTargetInputWidget.prototype.onLookupMenuItemChoose = function ( item ) {
	this.closeLookupMenu();
	this.setLookupsDisabled( true );
	this.setValue( item.getData() );
	this.setLookupsDisabled( false );
};

/**
 * @inheritdoc
 */
ve.ui.MWLinkTargetInputWidget.prototype.focus = function () {
	var retval;
	// Prevent programmatic focus from opening the menu
	this.setLookupsDisabled( true );

	// Parent method
	retval = ve.ui.MWLinkTargetInputWidget.super.prototype.focus.apply( this, arguments );

	this.setLookupsDisabled( false );
	return retval;
};

/**
 * @inheritdoc
 */
ve.ui.MWLinkTargetInputWidget.prototype.isValid = function () {
	var valid = !!mw.Title.newFromText( this.getValue() );
	return $.Deferred().resolve( valid ).promise();
};

/**
 * Gets a new request object of the current lookup query value.
 *
 * @method
 * @returns {jQuery.Promise} Promise without success or fail handlers attached
 */
ve.ui.MWLinkTargetInputWidget.prototype.getLookupRequest = function () {
	var req,
		widget = this,
		promiseAbortObject = { abort: function () {
			// Do nothing. This is just so OOUI doesn't break due to abort being undefined.
		} };

	if ( mw.Title.newFromText( this.value ) ) {
		return this.interwikiPrefixesPromise.then( function () {
			var interwiki = widget.value.substring( 0, widget.value.indexOf( ':' ) );
			if (
				interwiki && interwiki !== '' &&
				widget.interwikiPrefixes.indexOf( interwiki ) !== -1
			) {
				return $.Deferred().resolve( { query: {
					pages: [{
						title: widget.value
					}]
				} } ).promise( promiseAbortObject );
			} else {
				req = new mw.Api().get( {
					action: 'query',
					generator: 'prefixsearch',
					gpssearch: widget.value,
					gpsnamespace: 0,
					gpslimit: 5,
					prop: 'info|pageprops|pageimages|pageterms',
					pithumbsize: 80,
					pilimit: 5,
					redirects: '',
					wbptterms: 'description',
					ppprop: 'disambiguation'
				} );
				promiseAbortObject.abort = req.abort.bind( req ); // todo: ew
				return req;
			}
		} ).promise( promiseAbortObject );
	} else {
		// Don't send invalid titles to the API.
		// Just pretend it returned nothing so we can show the 'invalid title' section
		return $.Deferred().resolve( {} ).promise( promiseAbortObject );
	}
};

/**
 * Get lookup cache item from server response data.
 *
 * @method
 * @param {Mixed} data Response from server
 */
ve.ui.MWLinkTargetInputWidget.prototype.getLookupCacheDataFromResponse = function ( data ) {
	return data.query || {};
};

/**
 * Get list of menu items from a server response.
 *
 * @param {Object} data Query result
 * @returns {OO.ui.MenuOptionWidget[]} Menu items
 */
ve.ui.MWLinkTargetInputWidget.prototype.getLookupMenuOptionsFromData = function ( data ) {
	var i, len, index, pageExists, pageExistsExact, suggestionPage, linkData, redirect, redirects,
		items = [],
		suggestionPages = [],
		titleObj = mw.Title.newFromText( this.value ),
		redirectsTo = {},
		links = {};

	if ( data.redirects ) {
		for ( i = 0, len = data.redirects.length; i < len; i++ ) {
			redirect = data.redirects[i];
			redirectsTo[redirect.to] = redirectsTo[redirect.to] || [];
			redirectsTo[redirect.to].push( redirect.from );
		}
	}

	for ( index in data.pages ) {
		suggestionPage = data.pages[index];
		links[suggestionPage.title] = ve.init.platform.linkCache.constructor.static.processPage( suggestionPage );
		suggestionPages.push( suggestionPage.title );

		redirects = redirectsTo[suggestionPage.title] || [];
		for ( i = 0, len = redirects.length; i < len; i++ ) {
			links[redirects[i]] = {
				missing: false,
				redirect: true,
				disambiguation: false,
				description: ve.msg( 'visualeditor-linkinspector-description-redirect', suggestionPage.title )
			};
			suggestionPages.push( redirects[i] );
		}
	}

	// If not found, run value through mw.Title to avoid treating a match as a
	// mismatch where normalisation would make them matching (bug 48476)

	pageExistsExact = suggestionPages.indexOf( this.value ) !== -1;
	pageExists = pageExistsExact || (
		titleObj && suggestionPages.indexOf( titleObj.getPrefixedText() ) !== -1
	);

	if ( !pageExists ) {
		links[this.value] = {
			missing: true, redirect: false, disambiguation: false,
			description: ve.msg( 'visualeditor-linkinspector-description-new-page' )
		};
	}

	ve.init.platform.linkCache.set( links );

	// Internal Link
	// Offer the exact text as a suggestion if the page exists
	if ( pageExists && !pageExistsExact ) {
		suggestionPages.unshift( this.value );
	}
	// Offer the exact text as a new page if the title is valid
	if ( !pageExists && titleObj ) {
		suggestionPages.push( this.value );
	}
	for ( i = 0, len = suggestionPages.length; i < len; i++ ) {
		linkData = links[suggestionPages[i]] || {};
		items.push( new ve.ui.MWInternalLinkMenuOptionWidget( {
			data: suggestionPages[i],
			imageUrl: linkData.imageUrl,
			description: linkData.description,
			icon: ve.init.platform.linkCache.constructor.static.getIconForLink( linkData ),
			query: this.value
		} ) );
	}

	return items;
};
