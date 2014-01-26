/*!
 * VisualEditor user interface MWMediaEditDialog class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

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
		'exclude': [
			{ 'group': 'format' }, { 'group': 'structure' },
			'referenceList',
			'gallery'
		],
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

ve.ui.MWMediaEditDialog.static.pasteRules = ve.extendObject(
	ve.copy( ve.init.mw.ViewPageTarget.static.pasteRules ),
	{
		'all': {
			'blacklist': OO.simpleArrayUnion(
				ve.getProp( ve.init.mw.ViewPageTarget.static.pasteRules, 'all', 'blacklist' ) || [],
				[
					// Tables (but not lists) are possible in wikitext with a leading
					// line break but we prevent creating these with the UI
					'list', 'listItem', 'definitionList', 'definitionListItem',
					'table', 'tableCaption', 'tableSection', 'tableRow', 'tableCell'
				]
			),
			// Headings are also possible, but discouraged
			'conversions': {
				'mwHeading': 'paragraph'
			}
		}
	}
);

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWMediaEditDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.MWDialog.prototype.initialize.call( this );

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
		this.sizeErrorLabel.$element
	] );
	this.sizeErrorLabel.$element.hide();

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
 * @inheritdoc
 */
ve.ui.MWMediaEditDialog.prototype.setup = function ( data ) {
	var newDoc,
		doc = this.surface.getModel().getDocument();

	// Parent method
	ve.ui.MWDialog.prototype.setup.call( this, data );

	// Properties
	this.mediaNode = this.surface.getView().getFocusedNode().getModel();
	this.captionNode = this.mediaNode.getCaptionNode();
	this.store = this.surface.getModel().getDocument().getStore();

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
			'commands': this.constructor.static.surfaceCommands,
			'pasteRules': this.constructor.static.pasteRules
		}
	);

	// Set initial size in inputs
	this.sizeWidget.setDimensions( {
		'width': this.mediaNode.getAttribute( 'width' ),
		'height': this.mediaNode.getAttribute( 'height' ),
	} );

	// Save original size for later calculations
	this.mediaNode.getImageInfo().done( ve.bind( function ( imageInfo ) {
		if ( imageInfo && imageInfo.width && imageInfo.height ) {
			var dimensions = {
				'width': imageInfo.width,
				'height': imageInfo.height
			};
			// Set the original dimensions in the widget
			this.sizeWidget.setOriginalDimensions( dimensions );

			// Bitmaps also have a maximum size of originalDimensions
			if ( imageInfo.mediatype === 'BITMAP' ) {
				this.sizeWidget.setMaxDimensions( dimensions );
			}
		} else {
			// Original dimensions couldn't be fetched. Display an error message
			this.sizeErrorLabel.$element.hide();
		}
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

/* Registration */

ve.ui.dialogFactory.register( ve.ui.MWMediaEditDialog );
