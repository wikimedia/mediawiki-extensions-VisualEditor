/*!
 * VisualEditor user interface MediaInsertDialog class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/*global mw */

/**
 * Dialog for inserting MediaWiki media objects.
 *
 * @class
 * @extends ve.ui.MWDialog
 *
 * @constructor
 * @param {ve.ui.WindowSet} windowSet Window set this dialog is part of
 * @param {Object} [config] Configuration options
 */
ve.ui.MWMediaInsertDialog = function VeUiMWMediaInsertDialog( windowSet, config ) {
	// Configuration initialization
	config = ve.extendObject( { 'footless': true }, config );

	// Parent constructor
	ve.ui.MWDialog.call( this, windowSet, config );

	// Properties
	this.item = null;
	this.sources = {};
};

/* Inheritance */

OO.inheritClass( ve.ui.MWMediaInsertDialog, ve.ui.MWDialog );

/* Static Properties */

ve.ui.MWMediaInsertDialog.static.name = 'mediaInsert';

ve.ui.MWMediaInsertDialog.static.title =
	OO.ui.deferMsg( 'visualeditor-dialog-media-insert-title' );

ve.ui.MWMediaInsertDialog.static.icon = 'picture';

/* Methods */

/**
 * Handle search result selection.
 *
 * @param {ve.ui.MWMediaResultWidget|null} item Selected item
 */
ve.ui.MWMediaInsertDialog.prototype.onSearchSelect = function ( item ) {
	this.item = item;
	if ( item ) {
		this.close( { 'action': 'insert' } );
	}
};

/**
 * @inheritdoc
 */
ve.ui.MWMediaInsertDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.MWDialog.prototype.initialize.call( this );

	this.defaultThumbSize = mw.config.get( 'wgVisualEditorConfig' )
		.defaultUserOptions.defaultthumbsize;

	// Widget
	this.search = new ve.ui.MWMediaSearchWidget( {
		'$': this.$
	} );

	// Initialization
	this.search.$element.addClass( 've-ui-mwMediaInsertDialog-select' );

	// Events
	this.search.connect( this, { 'select': 'onSearchSelect' } );

	this.$spinner = this.$( '<div>' ).addClass( 've-specialchar-spinner' );
	this.$body.append( this.$spinner );
	this.$body.append( this.search.$element );

};

/**
 * @inheritdoc
 */
ve.ui.MWMediaInsertDialog.prototype.setup = function ( data ) {
	// Parent method
	ve.ui.MWDialog.prototype.setup.call( this, data );

	// Show a spinner while we check for file repos.
	// this will only be done once per session.
	//
	// This is in .setup rather than .initialize so that
	// the user has visual indication (spinner) during the
	// ajax request
	this.$spinner.show();
	this.search.$element.hide();

	// Get the repos from the API first
	// The ajax request will only be done once per session
	this.getFileRepos().done( ve.bind( function ( repos ) {
		if ( repos ) {
			this.sources = repos;
			this.search.setSources( this.sources );
		}
		// Done, hide the spinner
		this.$spinner.hide();

		// Show the search and query the media sources
		this.search.$element.show();
		this.search.queryMediaSources();

		// Initialization
		// This must be done only after there are proper
		// sources defined
		this.search.getQuery().$input.focus().select();
		this.search.getResults().selectItem();
		this.search.getResults().highlightItem();
	}, this ) );
};

/**
 * Get the object of file repos to use for the media search
 * @returns {jQuery.Promise}
 */
ve.ui.MWMediaInsertDialog.prototype.getFileRepos = function () {
	var deferred = $.Deferred();

	// We will only ask for the ajax call if this.sources
	// isn't already set up
	if ( ve.isEmptyObject( this.sources ) ) {
		// Take sources from api.php?action=query&meta=filerepoinfo&format=jsonfm
		// The decision whether to take 'url' or 'apiurl' per each repository is made
		// in the MWMediaSearchWidget depending on whether it is local and has apiurl
		// defined at all.
		ve.init.mw.Target.static.apiRequest( {
			'action': 'query',
			'meta': 'filerepoinfo'
		} )
		.done( function ( resp ) {
			deferred.resolve( resp.query.repos );
		} )
		.fail( function () {
			deferred.resolve( [ {
				'url': mw.util.wikiScript( 'api' ),
				'local': true
			} ] );
		} );
	} else {
		// There was no need to ask for the resources again
		// return false so we can skip setting the sources
		deferred.resolve( false );
	}

	return deferred.promise();

};

/**
 * @inheritdoc
 */
ve.ui.MWMediaInsertDialog.prototype.teardown = function ( data ) {
	var info, thumbheight, thumbwidth;
	// Data initialization
	data = data || {};

	if ( data.action === 'insert' ) {
		info = this.item.imageinfo[0];
		// Calculate proper size according to default thumb size limit
		if ( info.width > info.height ) {
			thumbwidth = this.defaultThumbSize;
			thumbheight = Math.round( ( info.height / info.width ) * thumbwidth );
		} else {
			thumbheight = this.defaultThumbSize;
			thumbwidth = Math.round( ( info.width / info.height ) * thumbheight );
		}
		this.surface.getModel().getFragment().collapseRangeToEnd().insertContent( [
			{
				'type': 'mwBlockImage',
				'attributes': {
					'type': 'thumb',
					'align': 'default',
					//'href': info.descriptionurl,
					'href': './' + this.item.title,
					'src': info.thumburl,
					'width': thumbwidth,
					'height': thumbheight,
					'resource': './' + this.item.title,
					'defaultSize': true
				}
			},
			{ 'type': 'mwImageCaption' },
			{ 'type': '/mwImageCaption' },
			{ 'type': '/mwBlockImage' }
		] ).collapseRangeToEnd().select();
	}

	// Parent method
	ve.ui.MWDialog.prototype.teardown.call( this, data );
};

/* Registration */

ve.ui.dialogFactory.register( ve.ui.MWMediaInsertDialog );
