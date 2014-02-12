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

ve.ui.MWMediaEditDialog.static.title =
	OO.ui.deferMsg( 'visualeditor-dialog-media-title' );

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
	ve.copy( ve.init.mw.Target.static.pasteRules ),
	{
		'all': {
			'blacklist': OO.simpleArrayUnion(
				ve.getProp( ve.init.mw.Target.static.pasteRules, 'all', 'blacklist' ) || [],
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
	var altTextFieldset, positionFieldset;
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

	// Alt text
	altTextFieldset = new OO.ui.FieldsetLayout( {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-media-alttext-section' ),
		'icon': 'parameter'
	} );

	this.altTextInput = new OO.ui.TextInputWidget( {
		'$': this.$
	} );

	// Build alt text fieldset
	altTextFieldset.$element
		.append( this.altTextInput.$element );

	// Position
	positionFieldset = new OO.ui.FieldsetLayout( {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-media-position-section' ),
		'icon': 'parameter'
	} );
	this.positionInput =  new OO.ui.ButtonSelectWidget( {
		'$': this.$
	} );
	this.positionInput.addItems( [
		new OO.ui.ButtonOptionWidget( 'left', { '$': this.$, 'label': ve.msg( 'visualeditor-dialog-media-position-left' ) } ),
		new OO.ui.ButtonOptionWidget( 'center', { '$': this.$, 'label': ve.msg( 'visualeditor-dialog-media-position-center' ) } ),
		new OO.ui.ButtonOptionWidget( 'right', { '$': this.$, 'label': ve.msg( 'visualeditor-dialog-media-position-right' ) } ),
		new OO.ui.ButtonOptionWidget( 'none', { '$': this.$, 'label': ve.msg( 'visualeditor-dialog-media-position-none' ) } )
	], 0 );
	// Build position fieldset
	positionFieldset.$element.append( this.positionInput.$element );

	// Type
	this.typeFieldset = new OO.ui.FieldsetLayout( {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-media-type-section' ),
		'icon': 'parameter'
	} );

	this.typeInput = new OO.ui.ButtonSelectWidget( {
		'$': this.$
	} );
	this.typeInput.addItems( [
		// TODO: Inline images require a bit of further work, will be coming soon
		new OO.ui.ButtonOptionWidget( 'thumb', {
			'$': this.$,
			'label': ve.msg( 'visualeditor-dialog-media-type-thumb' )
		} ),
		new OO.ui.ButtonOptionWidget( 'frameless', {
			'$': this.$,
			'label': ve.msg( 'visualeditor-dialog-media-type-frameless' )
		} ),
		new OO.ui.ButtonOptionWidget( 'frame', {
			'$': this.$,
			'label': ve.msg( 'visualeditor-dialog-media-type-frame' )
		} ),
		new OO.ui.ButtonOptionWidget( 'border', {
			'$': this.$,
			'label': ve.msg( 'visualeditor-dialog-media-type-border' )
		} )
	] );

	// Build type fieldset
	this.typeFieldset.$element
		.append( this.typeInput.$element );

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
	this.generalSettingsPage.$element.append( [
		this.captionFieldset.$element,
		altTextFieldset.$element
	] );

	this.advancedSettingsPage.$element.append( [
		positionFieldset.$element,
		this.typeFieldset.$element,
		this.sizeFieldset.$element
	] );

	this.$body.append( this.bookletLayout.$element );
	this.$foot.append( this.applyButton.$element );
};

/**
 * @inheritdoc
 */
ve.ui.MWMediaEditDialog.prototype.setup = function ( data ) {
	var newDoc,
		dialog = this,
		doc = this.surface.getModel().getDocument(),
		mediaNodeView = this.surface.getView().getFocusedNode();

	// Parent method
	ve.ui.MWDialog.prototype.setup.call( this, data );

	// Properties
	this.mediaNode = mediaNodeView.getModel();
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

	this.sizeWidget.setPropertiesFromScalable( mediaNodeView );

	// HACK: Override properties with image-specific current size
	// Ideally, this should be dealt with in setPropertiesFromScalable
	// but the currentDimensions object of the mediaNodeView seems
	// to not be updated properly. Without this hack, the media
	// dialog presents the dimensions that the image had in the
	// beginning of the session (in the wikitext) rather than update
	// these when the image is resized either from the dialog or
	// by the resize handles.
	this.sizeWidget.setCurrentDimensions( {
		'width': this.mediaNode.getAttribute( 'width' ),
		'height': this.mediaNode.getAttribute( 'height' )
	} );

	if ( !mediaNodeView.getOriginalDimensions() ) {
		mediaNodeView.fetchDimensions()
			.done( function () {
				dialog.sizeWidget.setOriginalDimensions( mediaNodeView.getOriginalDimensions() );
				if ( mediaNodeView.getMaxDimensions() ) {
					dialog.sizeWidget.setMaxDimensions( mediaNodeView.getMaxDimensions() );
				}
			} )
			.fail( function () {
				dialog.sizeErrorLabel.$element.show();
			} );
	}
	// Set initial alt text
	this.altTextInput.setValue( this.mediaNode.getAttribute( 'alt' ) || '' );

	// Set initial position
	if ( this.mediaNode.getAttribute( 'align' ) !== undefined ) {
		this.positionInput.selectItem(
			this.positionInput.getItemFromData( this.mediaNode.getAttribute( 'align' ) )
		);
	}

	// Set image type
	if ( this.mediaNode.getAttribute( 'type' ) !== undefined ) {
		this.typeInput.selectItem(
			this.typeInput.getItemFromData( this.mediaNode.getAttribute( 'type' ) )
		);
	}

	// Initialization
	this.captionFieldset.$element.append( this.captionSurface.$element );
	this.captionSurface.initialize();
};

/**
 * @inheritdoc
 */
ve.ui.MWMediaEditDialog.prototype.teardown = function ( data ) {
	var newDoc, doc, originalAlt, attr, attrs = {},
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
		if ( this.sizeWidget.isCurrentDimensionsValid() ) {
			attrs = this.sizeWidget.getCurrentDimensions();
		}

		attr = $.trim( this.altTextInput.getValue() );
		originalAlt = this.mediaNode.getAttribute( 'alt' );
		// Allow the user to submit an empty alternate text but
		// not if there was no alternate text originally to avoid
		// dirty diffing images with empty |alt=
		if (
			// If there was no original alternate text but there
			// is a value now, update
			( originalAlt === undefined && attr ) ||
			// If original alternate text was defined, always
			// update, even if the input is empty to allow the
			// user to unset it
			originalAlt !== undefined
		) {
			attrs.alt = attr;
		}

		attr = this.positionInput.getSelectedItem();
		if ( attr ) {
			attrs.align = attr.getData();
		}

		attr = this.typeInput.getSelectedItem();
		if ( attr ) {
			attrs.type = attr.getData();
		}

		surfaceModel.change(
			ve.dm.Transaction.newFromAttributeChanges( doc, this.mediaNode.getOffset(), attrs )
		);
	}

	// Cleanup
	this.captionSurface.destroy();
	this.captionSurface = null;
	this.captionNode = null;

	// Parent method
	ve.ui.MWDialog.prototype.teardown.call( this, data );
};

/* Registration */

ve.ui.dialogFactory.register( ve.ui.MWMediaEditDialog );
