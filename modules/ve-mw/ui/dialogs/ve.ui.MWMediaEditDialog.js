/*!
 * VisualEditor user interface MWMediaEditDialog class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/*global mw */

/**
 * Dialog for editing MediaWiki media objects.
 *
 * @class
 * @extends ve.ui.MWDialog
 *
 * @constructor
 * @param {ve.ui.WindowSet} windowSet Window set this dialog is part of
 * @param {Object} [config] Configuration options
 */
ve.ui.MWMediaEditDialog = function VeUiMWMediaEditDialog( windowSet, config ) {
	// Parent constructor
	ve.ui.MWDialog.call( this, windowSet, config );

	// Properties
	this.mediaNode = null;
	this.captionNode = null;
	this.store = null;
	this.filename = null;
};

/* Inheritance */

OO.inheritClass( ve.ui.MWMediaEditDialog, ve.ui.MWDialog );

/* Static Properties */

ve.ui.MWMediaEditDialog.static.name = 'mediaEdit';

ve.ui.MWMediaEditDialog.static.titleMessage = 'visualeditor-dialog-media-title';

ve.ui.MWMediaEditDialog.static.icon = 'picture';

ve.ui.MWMediaEditDialog.static.toolbarGroups = [
	// History
	{ 'include': [ 'undo', 'redo' ] },
	// No formatting
	/* {
		'type': 'menu',
		'indicator': 'down',
		'include': [ { 'group': 'format' } ],
		'promote': [ 'paragraph' ],
		'demote': [ 'preformatted', 'heading1' ]
	},*/
	// Style
	{
		'type': 'list',
		'icon': 'text-style',
		'indicator': 'down',
		'include': [ { 'group': 'textStyle' }, 'clear' ],
		'promote': [ 'bold', 'italic' ],
		'demote': [ 'strikethrough', 'code',  'underline', 'clear' ]
	},
	// Link
	{ 'include': [ 'link' ] },
	// No structure
	/* {
		'type': 'bar',
		'include': [ 'number', 'bullet', 'outdent', 'indent' ]
	},*/
	// Insert
	{
		'label': 'visualeditor-toolbar-insert',
		'indicator': 'down',
		'include': '*',
		'exclude': [ { 'group': 'format' }, { 'group': 'structure' }, 'referenceList' ],
		'demote': [ 'specialcharacter' ]
	}
];

ve.ui.MWMediaEditDialog.static.surfaceCommands = [
	'undo',
	'redo',
	'bold',
	'italic',
	'link',
	'clear',
	'underline',
	'subscript',
	'superscript',
	'pasteSpecial'
];

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWMediaEditDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.MWDialog.prototype.initialize.call( this );

	// TODO: Create a ve-wide spinner class instead of the local
	// classes using spinners
	this.$spinner = this.$( '<div>' ).addClass( 've-specialchar-spinner' );

	// Set up the booklet layout
	this.bookletLayout = new OO.ui.BookletLayout( {
		'$': this.$,
		'outlined': true
	} );

	this.generalSettingsPage = new OO.ui.PageLayout( 'general', {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-media-page-general' ),
		'icon': 'parameter'
	} );

	this.advancedSettingsPage = new OO.ui.PageLayout( 'advanced', {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-media-page-advanced' ),
		'icon': 'parameter'
	} );

	this.bookletLayout.addPages( [
		this.generalSettingsPage, this.advancedSettingsPage
	] );

	// Define fieldsets for image settings

	// Caption
	this.captionFieldset = new OO.ui.FieldsetLayout( {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-media-content-section' ),
		'icon': 'parameter'
	} );

	// Size
	this.sizeFieldset = new OO.ui.FieldsetLayout( {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-media-size-section' ),
		'icon': 'parameter'
	} );

	this.sizeErrorLabel = new OO.ui.InputLabelWidget( {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-media-size-originalsize-error' )
	} );

	this.sizeWidget = new ve.ui.MediaSizeWidget( {
		'$': this.$
	} );

	this.sizeFieldset.$element.append( [
		this.sizeWidget.$element,
		this.sizeErrorLabel.$element,
		this.$spinner
	] );
	this.sizeErrorLabel.$element.hide();
	this.$spinner.hide();

	this.applyButton = new OO.ui.ButtonWidget( {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-action-apply' ),
		'flags': ['primary']
	} );

	// Events
	this.applyButton.connect( this, { 'click': [ 'close', { 'action': 'apply' } ] } );

	// Initialization
	this.generalSettingsPage.$element.append( this.captionFieldset.$element );
	this.advancedSettingsPage.$element.append( this.sizeFieldset.$element );

	this.$body.append( this.bookletLayout.$element );
	this.$foot.append( this.applyButton.$element );
};

/**
 * Get the original size of the media object from the API, if it exists
 * @returns {jQuery.Promise}
 */
ve.ui.MWMediaEditDialog.prototype.getOriginalDimensions = function () {
	var index = this.store.indexOfHash( this.constructor.static.getSizeHash( this.filename ) ),
		deferred = $.Deferred();

	if ( index ) {
		// The image size is already cached
		deferred.resolve( this.store.value( index ) );
	} else {
		// Look for the media size through the API
		$.ajax( {
			'url': mw.util.wikiScript( 'api' ),
			'data': {
				'action': 'query',
				'prop': 'imageinfo',
				'indexpageids': '1',
				'iiprop': 'size|mediatype',
				'format': 'json',
				'titles': this.filename
			},
			'dataType': 'json',
			'type': 'POST',
			// Wait up to 100 seconds before giving up
			'timeout': 100000,
			'cache': false
		} )
		.done( function ( resp ) {
			var imginfo = resp.query.pages[ resp.query.pageids[0] ];

			// Resolve with the size parameters
			deferred.resolve( {
				'height': imginfo.imageinfo[0].height,
				'width': imginfo.imageinfo[0].width,
				'mediatype': imginfo.imageinfo[0].mediatype
			} );
		} )
		.fail( function () {
			deferred.resolve( false );
		} );
	}
	return deferred.promise();
};

/**
 * @inheritdoc
 */
ve.ui.MWMediaEditDialog.prototype.setup = function ( data ) {
	var attrs, newDoc, originalSize, resource,
		dimensions = {},
		doc = this.surface.getModel().getDocument();

	// Parent method
	ve.ui.MWDialog.prototype.setup.call( this, data );

	// Properties
	this.mediaNode = this.surface.getView().getFocusedNode().getModel();
	this.captionNode = this.mediaNode.getCaptionNode();
	this.store = this.surface.getModel().getDocument().getStore();

	// Strip the raw filename up to the 'File:' namespage
	resource = this.mediaNode.getAttribute( 'resource' );
	this.filename = resource.substring( resource.indexOf( 'File:' ) );

	if ( this.captionNode && this.captionNode.getLength() > 0 ) {
		newDoc = doc.cloneFromRange( this.captionNode.getRange() );
	} else {
		newDoc = [
			{ 'type': 'paragraph', 'internal': { 'generated': 'wrapper' } },
			{ 'type': '/paragraph' },
			{ 'type': 'internalList' },
			{ 'type': '/internalList' }
		];
	}

	this.captionSurface = new ve.ui.SurfaceWidget(
		newDoc,
		{
			'$': this.$,
			'tools': this.constructor.static.toolbarGroups,
			'commands': this.constructor.static.surfaceCommands
		}
	);

	attrs = this.mediaNode.getAttributes();

	// Show the spinner
	this.$spinner.show();

	// Save original size for later calculations
	this.getOriginalDimensions().done( ve.bind( function ( sizeObj ) {
		if ( sizeObj && sizeObj.width && sizeObj.height ) {
			// Set the original dimensions in the widget
			this.sizeWidget.setOriginalDimensions( {
				'width': sizeObj.width,
				'height': sizeObj.height
			} );

			// Check if we need to limit the size
			if ( sizeObj.mediatype === 'BITMAP' ) {
				// Set the max dimensions
				this.sizeWidget.setMaxDimensions( {
					'width': sizeObj.width,
					'height': sizeObj.height
				} );
			}

			// Cache the originalSize and mediatype
			originalSize = {
				'height': sizeObj.height,
				'width': sizeObj.width,
				'mediatype': sizeObj.mediatype
			};
			this.store.index( originalSize, this.constructor.static.getSizeHash( this.filename ) );
		} else {
			// Original dimensions couldn't be fetched. Display an error message
			this.sizeErrorLabel.$element.hide();
		}

		// Set initial size in inputs
		dimensions = {};
		if ( attrs.height !== undefined && Number( attrs.height ) > 0 ) {
			dimensions.height = attrs.height;
		}
		if ( attrs.width !== undefined && Number( attrs.width ) > 0 ) {
			dimensions.width = attrs.width;
		}
		this.sizeWidget.setDimensions( dimensions );

		this.$spinner.hide();
	}, this ) );

	// Initialization
	this.captionFieldset.$element.append( this.captionSurface.$element );
	this.captionSurface.initialize();
};

/**
 * @inheritdoc
 */
ve.ui.MWMediaEditDialog.prototype.teardown = function ( data ) {
	var newDoc, doc, attrs = {},
		surfaceModel = this.surface.getModel();

	// Data initialization
	data = data || {};

	if ( data.action === 'apply' ) {
		newDoc = this.captionSurface.getSurface().getModel().getDocument();
		doc = surfaceModel.getDocument();
		if ( !this.captionNode ) {
			// Insert a new caption at the beginning of the image node
			surfaceModel.getFragment()
				.adjustRange( 1 )
				.collapseRangeToStart()
				.insertContent( [ { 'type': 'mwImageCaption' }, { 'type': '/mwImageCaption' } ] );
			this.captionNode = this.mediaNode.getCaptionNode();
		}
		// Replace the contents of the caption
		surfaceModel.change(
			ve.dm.Transaction.newFromRemoval( doc, this.captionNode.getRange(), true )
		);
		surfaceModel.change(
			ve.dm.Transaction.newFromDocumentInsertion( doc, this.captionNode.getRange().start, newDoc )
		);

		// Change attributes only if the values are valid
		if ( this.sizeWidget.isValid() ) {
			attrs = this.sizeWidget.getDimensions();
		}

		surfaceModel.change(
			ve.dm.Transaction.newFromAttributeChanges( doc, this.mediaNode.getOffset(), attrs )
		);
	}

	// Clean size values
	this.sizeWidget.clear();

	// Cleanup
	this.captionSurface.destroy();
	this.captionSurface = null;
	this.captionNode = null;

	// Parent method
	ve.ui.MWDialog.prototype.teardown.call( this, data );
};

/* Static methods */

/**
 * Get the store hash for the original dimensions of a given filename
 *
 * @param {string} filename Filename
 * @returns {string} Store hash
 */
ve.ui.MWMediaEditDialog.static.getSizeHash = function ( filename ) {
	return 'MWOriginalSize:' + filename;
};

/* Registration */

ve.ui.dialogFactory.register( ve.ui.MWMediaEditDialog );
