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
 * @extends ve.ui.LinkTargetInputWidget
 * @mixins OO.ui.LookupElement
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWLinkTargetInputWidget = function VeUiMWLinkTargetInputWidget( config ) {
	var widget = this;

	// Config initialization
	config = config || {};

	// Parent constructor
	ve.ui.LinkTargetInputWidget.call( this, config );

	// Mixin constructors
	OO.ui.LookupElement.call( this, config );

	// Properties
	this.annotation = null;

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

OO.inheritClass( ve.ui.MWLinkTargetInputWidget, ve.ui.LinkTargetInputWidget );

OO.mixinClass( ve.ui.MWLinkTargetInputWidget, OO.ui.LookupElement );

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWLinkTargetInputWidget.prototype.onLookupMenuItemChoose = function ( item ) {
	this.closeLookupMenu();
	this.setLookupsDisabled( true );
	this.setAnnotation( item.getData() );
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
	var valid;
	if ( this.annotation instanceof ve.dm.MWExternalLinkAnnotation ) {
		valid = this.annotation.getAttribute( 'href' )
			.match( /(^|\s)((https?:\/\/)?[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?)/gi );
	} else {
		valid = !!mw.Title.newFromText( this.getValue() );
	}
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
	return data.query && data.query.pages || {};
};

/**
 * Get list of menu items from a server response.
 *
 * @param {Object} data Query result
 * @returns {OO.ui.MenuOptionWidget[]} Menu items
 */
ve.ui.MWLinkTargetInputWidget.prototype.getLookupMenuOptionsFromData = function ( data ) {
	var i, len, index, pageExists, pageExistsExact, suggestionPage, linkData,
		items = [],
		suggestionPages = [],
		titleObj = mw.Title.newFromText( this.value ),
		links = {};

	for ( index in data ) {
		suggestionPage = data[index];
		links[suggestionPage.title] = {
			missing: false,
			redirect: suggestionPage.redirect !== undefined,
			disambiguation: ve.getProp( suggestionPage, 'pageprops', 'disambiguation' ) !== undefined,
			imageUrl: ve.getProp( suggestionPage, 'thumbnail', 'source' ),
			description: ve.getProp( suggestionPage, 'terms', 'description' )
		};
		suggestionPages.push( suggestionPage.title );
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

	// External link
	if ( ve.init.platform.getExternalLinkUrlProtocolsRegExp().test( this.value ) ) {
		items.push( new ve.ui.MWLinkMenuOptionWidget( {
			data: this.getExternalLinkAnnotationFromUrl( this.value ),
			classes: [ 've-ui-mwLinkTargetInputWidget-extlink' ],
			label: this.value,
			href: this.value
		} ) );
	}

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
			data: this.getInternalLinkAnnotationFromTitle( suggestionPages[i] ),
			pagename: suggestionPages[i],
			imageUrl: linkData.imageUrl,
			description: linkData.description
		} ) );
	}

	return items;
};

/**
 * @inheritdoc
 */
ve.ui.MWLinkTargetInputWidget.prototype.initializeLookupMenuSelection = function () {
	var item;

	if ( this.annotation ) {
		this.lookupMenu.selectItem( this.lookupMenu.getItemFromData( this.annotation ) );
	}

	item = this.lookupMenu.getSelectedItem();
	if ( !item ) {
		// Parent method
		OO.ui.LookupElement.prototype.initializeLookupMenuSelection.call( this );
	}

	// Update annotation to match selected item
	item = this.lookupMenu.getSelectedItem();
	if ( item ) {
		// Set annotation directly, bypassing re-setting the value of the input
		this.annotation = item.getData();
	}
};

/**
 * Set the value of the input.
 *
 * Overrides setValue to keep annotations in sync.
 *
 * @method
 * @param {string} value New value
 */
ve.ui.MWLinkTargetInputWidget.prototype.setValue = function ( value ) {
	// Keep annotation in sync with value by skipping parent and calling grandparent method
	OO.ui.TextInputWidget.prototype.setValue.call( this, value );
};

/**
 * Gets an internal link annotation.
 *
 * File: or Category: links will be prepended with a colon so they are interpreted as a links rather
 * than image inclusions or categorizations.
 *
 * @method
 * @param {string} target Page title
 * @returns {ve.dm.MWInternalLinkAnnotation}
 */
ve.ui.MWLinkTargetInputWidget.prototype.getInternalLinkAnnotationFromTitle = function ( target ) {
	var title = mw.Title.newFromText( target );

	if (
		title &&
		( title.getNamespaceId() === 6 || title.getNamespaceId() === 14 ) &&
		target[0] !== ':'
	) {
		// Prepend links to File and Category namespace with a colon
		target = ':' + target;
	}

	return new ve.dm.MWInternalLinkAnnotation( {
		type: 'link/mwInternal',
		attributes: {
			title: target,
			// bug 62816: we really need a builder for this stuff
			normalizedTitle: ve.dm.MWInternalLinkAnnotation.static.normalizeTitle( target ),
			lookupTitle: ve.dm.MWInternalLinkAnnotation.static.getLookupTitle( target )
		}
	} );
};

/**
 * Gets an external link annotation.
 *
 * @method
 * @param {string} target Web address
 * @returns {ve.dm.MWExternalLinkAnnotation}
 */
ve.ui.MWLinkTargetInputWidget.prototype.getExternalLinkAnnotationFromUrl = function ( target ) {
	return new ve.dm.MWExternalLinkAnnotation( {
		type: 'link/mwExternal',
		attributes: {
			href: target
		}
	} );
};

/**
 * Gets a target from an annotation.
 *
 * @method
 * @param {ve.dm.MWExternalLinkAnnotation|ve.dm.MWInternalLinkAnnotation} annotation Annotation
 * @returns {string} Target
 */
ve.ui.MWLinkTargetInputWidget.prototype.getTargetFromAnnotation = function ( annotation ) {
	if ( annotation instanceof ve.dm.MWExternalLinkAnnotation ) {
		return annotation.getAttribute( 'href' );
	} else if ( annotation instanceof ve.dm.MWInternalLinkAnnotation ) {
		return annotation.getAttribute( 'title' );
	}

	return '';
};

/**
 * @inheritdoc
 */
ve.ui.MWLinkTargetInputWidget.prototype.getHref = function () {
	var title;

	if ( this.annotation instanceof ve.dm.MWExternalLinkAnnotation ) {
		return this.annotation.getAttribute( 'href' );
	} else if ( this.annotation instanceof ve.dm.MWInternalLinkAnnotation ) {
		title = mw.Title.newFromText( this.annotation.getAttribute( 'title' ) );
		return title.getUrl();
	}

	return '';
};
