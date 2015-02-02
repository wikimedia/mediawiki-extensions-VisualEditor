/*!
 * VisualEditor UserInterface MWMediaSearchWidget class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Creates an ve.ui.MWMediaSearchWidget object.
 *
 * @class
 * @extends OO.ui.SearchWidget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @param {number} [size] Vertical size of thumbnails
 */
ve.ui.MWMediaSearchWidget = function VeUiMWMediaSearchWidget( config ) {
	// Configuration initialization
	config = ve.extendObject( {
		placeholder: ve.msg( 'visualeditor-media-input-placeholder' )
	}, config );

	// Parent constructor
	OO.ui.SearchWidget.call( this, config );

	// Properties
	this.sources = {};
	this.rowHeight = config.rowHeight || 200;
	this.$panels = config.$panels;
	this.queryTimeout = null;
	this.titles = {};
	this.queryMediaSourcesCallback = this.queryMediaSources.bind( this );
	this.promises = [];
	this.layoutQueue = [];
	this.numItems = 0;
	this.lang = config.lang || 'en';

	this.selected = null;

	this.rows = [];

	this.$noItemsMessage = this.$( '<div>' )
		.addClass( 've-ui-mwMediaSearchWidget-noresults' )
		.text( ve.msg( 'visualeditor-dialog-media-noresults' ) )
		.hide()
		.appendTo( this.$query );

	// Events
	this.$results.on( 'scroll', this.onResultsScroll.bind( this ) );
	this.results.connect( this, {
		choose: 'onResultsChoose',
		add: 'onResultsAdd',
		remove: 'onResultsRemove'
	} );

	// Initialization
	this.$element.addClass( 've-ui-mwMediaSearchWidget' );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWMediaSearchWidget, OO.ui.SearchWidget );

/* Methods */

/**
 * Set the fileRepo sources for the media search
 * @param {Object} sources The sources object
 */
ve.ui.MWMediaSearchWidget.prototype.setSources = function ( sources ) {
	this.sources = sources;
};

/**
 * Set the fileRepo sources for the media search
 * @param {Object} sources The sources object
 */
ve.ui.MWMediaSearchWidget.prototype.getSources = function () {
	return this.sources;
};

/**
 * Handle select widget select events.
 *
 * @param {string} value New value
 */
ve.ui.MWMediaSearchWidget.prototype.onQueryChange = function () {
	var i, len;

	// Parent method
	OO.ui.SearchWidget.prototype.onQueryChange.call( this );

	// Reset
	this.titles = {};
	for ( i = 0, len = this.sources.length; i < len; i++ ) {
		delete this.sources[i].gsroffset;
	}

	// Queue
	clearTimeout( this.queryTimeout );
	this.queryTimeout = setTimeout( this.queryMediaSourcesCallback, 250 );
};

/**
 * Respond to choosing result event.
 *
 * @param {OO.ui.OptionWidget} item Selected item
 */
ve.ui.MWMediaSearchWidget.prototype.onResultsChoose = function ( item ) {
	this.emit( 'choose', item.getData() );
};

/**
 * Handle results scroll events.
 *
 * @param {jQuery.Event} e Scroll event
 */
ve.ui.MWMediaSearchWidget.prototype.onResultsScroll = function () {
	var position = this.$results.scrollTop() + this.$results.outerHeight(),
		threshold = this.results.$element.outerHeight() - this.rowHeight * 3;

	// Check if we need to ask for more results
	if ( !this.query.isPending() && position > threshold ) {
		this.queryMediaSources();
	}

	this.lazyLoadResults();
};

/**
 * Lazy-load the images that are visible.
 */
ve.ui.MWMediaSearchWidget.prototype.lazyLoadResults = function () {
	var i, elementTop,
		items = this.results.getItems(),
		resultsScrollTop = this.$results.scrollTop(),
		position = resultsScrollTop + this.$results.outerHeight();
	// Lazy-load results
	for ( i = 0; i < items.length; i++ ) {
		elementTop = items[i].$element.position().top;
		if ( elementTop <= position && !items[i].hasSrc() ) {
			// Load the image
			items[i].lazyLoad();
		}
	}
};
/**
 * Query all sources for media.
 *
 * @method
 */
ve.ui.MWMediaSearchWidget.prototype.queryMediaSources = function () {
	var i, len, source, request,
		lang = this.getLang(),
		ajaxOptions = {},
		value = this.query.getValue();

	if ( value === '' ) {
		return;
	}

	// Reset message
	this.$noItemsMessage.hide();
	// Abort previous promises if they are pending
	this.resetPromises();

	for ( i = 0, len = this.sources.length; i < len; i++ ) {
		source = this.sources[i];
		// If we don't have either 'apiurl' or 'scriptDirUrl'
		// the source is invalid, and we will skip it
		if ( source.apiurl || source.scriptDirUrl !== undefined ) {
			if ( !source.gsroffset ) {
				source.gsroffset = 0;
			}
			if ( source.local ) {
				ajaxOptions = {
					url: mw.util.wikiScript( 'api' ),
					// If the url is local use json
					dataType: 'json'
				};
			} else {
				ajaxOptions = {
					// If 'apiurl' is set, use that. Otherwise, build the url
					// from scriptDirUrl and /api.php suffix
					url: source.apiurl || ( source.scriptDirUrl + '/api.php' ),
					// If the url is not the same origin use jsonp
					dataType: 'jsonp',
					// JSON-P requests are not cached by default and get a &_=random trail.
					// While setting cache=true will still bypass cache in most case due to the
					// callback parameter, at least drop the &_=random trail which triggers
					// an API warning (invalid parameter).
					cache: true
				};
			}
			this.query.pushPending();
			request = ve.init.target.constructor.static.apiRequest( {
				action: 'query',
				generator: 'search',
				gsrsearch: value,
				gsrnamespace: 6,
				// Initial number of images
				// NOTE: If this is too high, it triggers Common's bot prevention code
				gsrlimit: 30,
				gsroffset: source.gsroffset,
				prop: 'imageinfo',
				// Language of the extmetadata details
				iiextmetadatalanguage: lang,
				iiprop: 'dimensions|url|mediatype|extmetadata|timestamp',
				iiurlheight: this.rowHeight,
				// Width of the dialog
				iiurlwidth: 600 - 30 // Take off 30px for the margins
			}, ajaxOptions )
				.done( this.onMediaQueryDone.bind( this, source ) );
			source.value = value;
			this.promises.push( request );
		}

		// When all sources are done, check to see if there are results
		$.when.apply( $, this.promises ).done( this.onAllMediaQueriesDone.bind( this ) );
	}
};

/**
 * Reset all the rows; destroy the jQuery elements and reset
 * the rows array.
 */
ve.ui.MWMediaSearchWidget.prototype.resetRows = function () {
	var i, len;

	for ( i = 0, len = this.rows.length; i < len; i++ ) {
		this.rows[i].$element.remove();
	}

	this.rows = [];
};

/**
 * Abort all api search query promises
 */
ve.ui.MWMediaSearchWidget.prototype.resetPromises = function () {
	var i;

	for ( i = 0; i < this.promises.length; i++ ) {
		this.promises[i].abort();
		this.query.popPending();
	}

	this.rowIndex = 0;
	// Empty the promise array
	this.promises = [];
	// Empty the results queue
	this.layoutQueue = [];
};

/**
 * Handle media query response events.
 *
 * @method
 * @param {Object} source Media query source
 */
ve.ui.MWMediaSearchWidget.prototype.onAllMediaQueriesDone = function () {
	this.query.popPending();

	if ( this.results.getItems().length === 0 ) {
		this.$noItemsMessage.show();
	} else {
		this.$noItemsMessage.hide();
		this.lazyLoadResults();
	}
};

/**
 * Find an available row at the end. Either we will need to create a new
 * row or use the last available row if it isn't full.
 * @return {number} Row index
 */
ve.ui.MWMediaSearchWidget.prototype.getAvailableRow = function () {
	var row,
		maxLineWidth = this.results.$element.innerWidth() - 10;

	if ( this.rows.length === 0 ) {
		row = 0;
	} else {
		row = this.rows.length - 1;
	}

	if ( !this.rows[row] ) {
		// Create new row
		this.rows[row] = {
			isFull: false,
			width: 0,
			items: [],
			$element: this.$( '<div>' )
					.addClass( 've-ui-mwMediaResultWidget-row' )
					.css( {
						width: maxLineWidth,
						overflow: 'hidden'
					} )
					.data( 'row', row )
					.attr( 'data-full', false )
		};
		// Append to results
		this.results.$element.append( this.rows[row].$element );
	} else if ( this.rows[row].isFull ) {
		row++;
		// Create new row
		this.rows[row] = {
			isFull: false,
			width: 0,
			items: [],
			$element: this.$( '<div>' )
				.addClass( 've-ui-mwMediaResultWidget-row' )
				.css( {
					width: maxLineWidth,
					overflow: 'hidden'
				} )
				.data( 'row', row )
				.attr( 'data-full', false )
		};
		// Append to results
		this.results.$element.append( this.rows[row].$element );
	}
	return row;
};

/**
 * Respond to add results event in the results widget.
 * Override the way SelectWidget and GroupElement append the items
 * into the group so we can append them in groups of rows.
 * @param {ve.ui.MWMediaResultWidget[]} items An array of item elements
 */
ve.ui.MWMediaSearchWidget.prototype.onResultsAdd = function ( items ) {
	var search = this;

	// Add method to a queue; this queue will only run when the widget
	// is visible
	this.layoutQueue.push( function () {
		var i, j, ilen, jlen, itemWidth, row, effectiveWidth, resizeFactor,
			maxLineWidth = search.results.$element.innerWidth() - 10;

		// Go over the added items
		row = search.getAvailableRow();
		for ( i = 0, ilen = items.length; i < ilen; i++ ) {
			// TODO: Figure out a better way to calculate the margins
			// between images (for now, hard-coded as 6)
			itemWidth = items[i].$element.outerWidth() + 6;
			// Add items to row until it is full
			if ( search.rows[row].width + itemWidth >= maxLineWidth ) {
				// Mark this row as full
				search.rows[row].isFull = true;
				search.rows[row].$element.attr( 'data-full', true );
				// Resize all images in the row to fit the width
				effectiveWidth = search.rows[row].width;
				resizeFactor = maxLineWidth / effectiveWidth;
				for ( j = 0, jlen = search.rows[row].items.length; j < jlen; j++ ) {
					search.rows[row].items[j].resizeThumb( resizeFactor );
				}
				// find another row
				row = search.getAvailableRow();
			}
			// Append to row
			search.rows[row].width += itemWidth;
			// Store reference to the item
			search.rows[row].items.push( items[i] );
			items[i].setRow( row );
			// Append the item
			search.rows[row].$element.append( items[i].$element );
		}

		// If we have less than 4 rows, call for more images
		if ( search.rows.length < 4 ) {
			search.queryMediaSources();
		}
	} );
	this.runLayoutQueue();
};

/**
 * Run layout methods from the queue only if the element is visible.
 */
ve.ui.MWMediaSearchWidget.prototype.runLayoutQueue = function () {
	var i, len;

	if ( this.$element.is( ':visible' ) ) {
		for ( i = 0, len = this.layoutQueue.length; i < len; i++ ) {
			this.layoutQueue.pop()();
		}
	}
};

/**
 * Respond to removing results event in the results widget.
 * Clear the relevant rows.
 * @param {OO.ui.OptionWidget[]} items Removed items
 */
ve.ui.MWMediaSearchWidget.prototype.onResultsRemove = function ( items ) {
	if ( items.length > 0 ) {
		// In the case of the media search widget, if any items are removed
		// all are removed (new search)
		this.resetRows();
	}
};

/**
 * Handle media query load events.
 *
 * @method
 * @param {Object} source Media query source
 * @param {Object} data Media query response
 */
ve.ui.MWMediaSearchWidget.prototype.onMediaQueryDone = function ( source, data ) {
	if ( !data.query || !data.query.pages ) {
		return;
	}

	var page, title,
		items = [],
		pages = data.query.pages,
		value = this.query.getValue();

	if ( value === '' || value !== source.value ) {
		return;
	}

	if ( data['query-continue'] && data['query-continue'].search ) {
		source.gsroffset = data['query-continue'].search.gsroffset;
	}

	for ( page in pages ) {
		// Verify that imageinfo exists
		// In case it does not, skip the image to avoid errors in
		// ve.ui.MWMediaResultWidget
		if ( pages[page].imageinfo && pages[page].imageinfo.length > 0 ) {
			title = new mw.Title( pages[page].title ).getMainText();
			if ( !Object.prototype.hasOwnProperty.call( this.titles, title ) ) {
				this.titles[title] = true;
				items.push(
					new ve.ui.MWMediaResultWidget( {
						$: this.$,
						data: pages[page],
						size: this.rowHeight,
						maxSize: this.results.$element.width() / 3
					} )
				);
			}
		}
	}

	this.results.addItems( items );
};

/**
 * Set language for the search results.
 * @param {string} lang Language
 */
ve.ui.MWMediaSearchWidget.prototype.setLang = function ( lang ) {
	this.lang = lang;
};

/**
 * Get language for the search results.
 * @returns {string} lang Language
 */
ve.ui.MWMediaSearchWidget.prototype.getLang = function () {
	return this.lang;
};
