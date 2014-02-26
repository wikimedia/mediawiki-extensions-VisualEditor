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
		'label': OO.ui.deferMsg( 'visualeditor-toolbar-insert' ),
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
	var altTextFieldset, positionFieldset, positionField;
	// Parent method
	ve.ui.MWDialog.prototype.initialize.call( this );

	// Set up the booklet layout
	this.bookletLayout = new OO.ui.BookletLayout( {
		'$': this.$,
		'outlined': true
	} );

	this.generalSettingsPage = new OO.ui.PageLayout( 'general', { '$': this.$ } );
	this.advancedSettingsPage = new OO.ui.PageLayout( 'advanced', { '$': this.$ } );
	this.bookletLayout.addPages( [
		this.generalSettingsPage, this.advancedSettingsPage
	] );
	this.generalSettingsPage.getOutlineItem()
		.setIcon( 'parameter' )
		.setLabel( ve.msg( 'visualeditor-dialog-media-page-general' ) );
	this.advancedSettingsPage.getOutlineItem()
		.setIcon( 'parameter' )
		.setLabel( ve.msg( 'visualeditor-dialog-media-page-advanced' ) );

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

	this.altTextInput.$element.addClass( 've-ui-mwMediaEditDialog-altText' );

	// Build alt text fieldset
	altTextFieldset.$element
		.append( this.altTextInput.$element );

	// Position
	this.positionInput =  new OO.ui.ButtonSelectWidget( {
		'$': this.$
	} );
	this.positionInput.addItems( [
		new OO.ui.ButtonOptionWidget( 'left', { '$': this.$, 'label': ve.msg( 'visualeditor-dialog-media-position-left' ) } ),
		new OO.ui.ButtonOptionWidget( 'center', { '$': this.$, 'label': ve.msg( 'visualeditor-dialog-media-position-center' ) } ),
		new OO.ui.ButtonOptionWidget( 'right', { '$': this.$, 'label': ve.msg( 'visualeditor-dialog-media-position-right' ) } ),
	], 0 );

	this.positionCheckbox = new OO.ui.CheckboxInputWidget( {
		'$': this.$
	} );
	positionField = new OO.ui.FieldLayout( this.positionCheckbox, {
		'$': this.$,
		'align': 'inline',
		'label': ve.msg( 'visualeditor-dialog-media-position-checkbox' )
	} );

	positionFieldset = new OO.ui.FieldsetLayout( {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-media-position-section' ),
		'icon': 'parameter'
	} );

	// Build position fieldset
	positionFieldset.$element.append( [
		positionField.$element,
		this.positionInput.$element
	] );

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

	this.sizeErrorLabel = new OO.ui.LabelWidget( {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-media-size-originalsize-error' )
	} );

	this.sizeWidget = new ve.ui.MediaSizeWidget( {
		'$': this.$
	} );

	this.sizeSelectWidget = new OO.ui.ButtonSelectWidget( {
		'$': this.$
	} );
	this.sizeSelectWidget.addItems( [
		new OO.ui.ButtonOptionWidget( 'default', {
			'$': this.$,
			'label': ve.msg( 'visualeditor-dialog-media-size-choosedefault' )
		} ),
		new OO.ui.ButtonOptionWidget( 'custom', {
			'$': this.$,
			'label': ve.msg( 'visualeditor-dialog-media-size-choosecustom' )
		} )
	] );

	this.sizeFieldset.$element.append( [
		this.sizeSelectWidget.$element,
		this.sizeWidget.$element,
		this.sizeErrorLabel.$element
	] );
	this.sizeErrorLabel.$element.hide();

	// Get wiki default thumbnail size
	this.defaultThumbSize = mw.config.get( 'wgVisualEditorConfig' )
		.defaultUserOptions.defaultthumbsize;

	this.applyButton = new OO.ui.ButtonWidget( {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-action-apply' ),
		'flags': ['primary']
	} );

	// Events
	this.applyButton.connect( this, { 'click': [ 'close', { 'action': 'apply' } ] } );
	this.positionCheckbox.connect( this, { 'change': 'onPositionCheckboxChange' } );
	this.sizeSelectWidget.connect( this, { 'select': 'onSizeSelectWidgetSelect' } );
	this.sizeWidget.connect( this, { 'change': 'onSizeWidgetChange' } );
	this.typeInput.connect( this, { 'select': 'onTypeChange' } );

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
 * Handle change event on the sizeWidget. Switch the size select
 * from default to custom and vise versa based on the values in
 * the widget.
 */
ve.ui.MWMediaEditDialog.prototype.onSizeWidgetChange = function () {
	// Switch to 'custom' size
	if ( this.sizeWidget.isEmpty() ) {
		this.sizeSelectWidget.selectItem(
			this.sizeSelectWidget.getItemFromData( 'default' )
		);
	} else {
		this.sizeSelectWidget.selectItem(
			this.sizeSelectWidget.getItemFromData( 'custom' )
		);
	}
};

/**
 * Handle type change, particularly to and from 'thumb' to make
 * sure size is limited.
 */
ve.ui.MWMediaEditDialog.prototype.onTypeChange = function () {
	if ( this.typeInput.getSelectedItem().getData() === 'thumb' ) {
		// Tell the size widget to limit maxDimensions
		this.sizeWidget.setEnforcedMax( true );
	} else {
		// Don't limit the widget for other types (Wikitext doesn't)
		this.sizeWidget.setEnforcedMax( false );
	}
	// Re-validate the existing dimensions
	this.sizeWidget.validateDimensions();
};

/**
 * Handle change event on the positionCheckbox element. If an option
 * is selected, mark the checkbox
 */
ve.ui.MWMediaEditDialog.prototype.onPositionCheckboxChange = function () {
	var checked = this.positionCheckbox.getValue();

	if ( !checked ) {
		// If unchecked, remove selection
		this.positionInput.intializeSelection();
	} else {
		// If checked, choose default position
		if ( this.surface.getView().getDir() === 'ltr' ) {
			// Assume default is 'right'
			this.positionInput.selectItem(
				this.positionInput.getItemFromData( 'right' )
			);
		} else {
			// Assume default is 'left'
			this.positionInput.selectItem(
				this.positionInput.getItemFromData( 'left' )
			);
		}
	}

	this.positionInput.setDisabled( !checked );
};

/**
 * Respond to sizeSelectWidget change
 */
ve.ui.MWMediaEditDialog.prototype.onSizeSelectWidgetSelect = function () {
	if ( this.sizeSelectWidget.getSelectedItem().getData() === 'default' ) {
		// Reset so placeholders appear
		this.sizeWidget.setCurrentDimensions( {
			'width': 0,
			'height': 0
		} );
	} else {
		// Fill the values as actual values into the size widget
		this.sizeWidget.setCurrentDimensions(
			this.sizeWidget.getPlaceholderDimensions()
		);
	}
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
		newDoc = new ve.dm.Document( [
			{ 'type': 'paragraph', 'internal': { 'generated': 'wrapper' } },
			{ 'type': '/paragraph' },
			{ 'type': 'internalList' },
			{ 'type': '/internalList' }
		] );
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

	this.initialDimensions = ve.copy( mediaNodeView.currentDimensions );
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
				dialog.sizeWidget.setEnforcedMax( false );
				if ( mediaNodeView.getMaxDimensions() ) {
					dialog.sizeWidget.setMaxDimensions( mediaNodeView.getMaxDimensions() );
					if ( dialog.mediaNode.getAttribute( 'type' ) === 'thumb' ) {
						// Tell the size widget to limit maxDimensions to image's original dimensions
						dialog.sizeWidget.setEnforcedMax( true );
					}
				}
			} )
			.fail( function () {
				dialog.sizeErrorLabel.$element.show();
			} );
	} else {
		if (
			this.mediaNode.getAttribute( 'type' ) === 'thumb' &&
			this.sizeWidget.getMaxDimensions()
		) {
			// Tell the size widget to limit maxDimensions to image's original dimensions
			this.sizeWidget.setEnforcedMax( true );
		} else {
			this.sizeWidget.setEnforcedMax( false );
		}
	}

	// Set initial alt text
	this.altTextInput.setValue( this.mediaNode.getAttribute( 'alt' ) || '' );

	// Set initial position
	if (
		!this.mediaNode.getAttribute( 'align' ) ||
		this.mediaNode.getAttribute( 'align' ) === 'none'
	) {
		this.positionCheckbox.setValue( false );
		this.positionInput.setDisabled( true );
		this.positionInput.intializeSelection();
	} else {
		this.positionCheckbox.setValue( true );
		this.positionInput.setDisabled( false );
		if ( this.mediaNode.getAttribute( 'align' ) === 'default' ) {
			// Assume wiki default according to wiki dir
			if ( this.surface.getView().getDir() === 'ltr' ) {
				// Assume default is 'right'
				this.positionInput.selectItem(
					this.positionInput.getItemFromData( 'right' )
				);
			} else {
				// Assume default is 'left'
				this.positionInput.selectItem(
					this.positionInput.getItemFromData( 'left' )
				);
			}
		} else {
			this.positionInput.selectItem(
				this.positionInput.getItemFromData( this.mediaNode.getAttribute( 'align' ) )
			);
		}
	}

	// Set image type
	this.typeInput.intializeSelection();
	if ( this.mediaNode.getAttribute( 'type' ) !== undefined ) {
		this.typeInput.selectItem(
			this.typeInput.getItemFromData( this.mediaNode.getAttribute( 'type' ) )
		);
	}

	// Initialize size
	if ( this.mediaNode.getAttribute( 'defaultSize' ) ) {
		this.sizeSelectWidget.intializeSelection(
			this.sizeSelectWidget.getItemFromData( 'default' )
		);
		// Current size will be used for placeholders
		this.sizeWidget.setPlaceholderDimensions( {
			'width': this.mediaNode.getAttribute( 'width' ),
			'height': this.mediaNode.getAttribute( 'height' )
		} );
		// Use placeholders
		this.sizeWidget.setCurrentDimensions( {
			'width': 0,
			'height': 0
		} );
	} else {
		// Set placeholders for the default bounding box
		if ( this.mediaNode.getAttribute( 'width' ) > this.mediaNode.getAttribute( 'height' ) ) {
			this.sizeWidget.setPlaceholderDimensions( {
				'width': this.defaultThumbSize,
			} );
		} else {
			this.sizeWidget.setPlaceholderDimensions( {
				'height': this.defaultThumbSize
			} );
		}

		this.sizeSelectWidget.intializeSelection(
			this.sizeSelectWidget.getItemFromData( 'custom' )
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

		if ( this.sizeSelectWidget.getSelectedItem().getData() === 'default' ) {
			// Set the size attributes to the placeholder values
			attrs = this.sizeWidget.getPlaceholderDimensions();
			attrs.defaultSize = true;
		} else {
			// Change attributes only if the values are valid
			if ( this.sizeWidget.isCurrentDimensionsValid() ) {
				if ( this.sizeWidget.isEmpty() ) {
					// use placeholder values
					attrs = this.sizeWidget.getPlaceholderDimensions();
				} else {
					attrs = this.sizeWidget.getCurrentDimensions();
				}
				attrs.defaultSize = false;
			}
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

		if ( !this.positionCheckbox.getValue() ) {
			// Only change to 'none' if alignment was originally
			// set to anything else
			if (
				this.mediaNode.getAttribute( 'align' ) &&
				this.mediaNode.getAttribute( 'align' ) !== 'none'
			) {
				attrs.align = 'none';
			}
		} else {
			attr = this.positionInput.getSelectedItem().getData();
			// If alignment was originally default and is still
			// set to the default position according to the wiki
			// content direction, do not change it
			if (
				(
					this.mediaNode.getAttribute( 'align' ) === 'default' &&
					(
						this.surface.getView().getDir() === 'ltr' &&
						attr !== 'right'
					) ||
					(
						this.surface.getView().getDir() === 'rtl' &&
						attr !== 'left'
					)
				) ||
				this.mediaNode.getAttribute( 'align' ) !== 'default'
			) {
				attrs.align = attr;
			}
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
