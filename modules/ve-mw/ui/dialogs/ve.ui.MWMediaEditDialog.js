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
 * @extends ve.ui.NodeDialog
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWMediaEditDialog = function VeUiMWMediaEditDialog( config ) {
	// Parent constructor
	ve.ui.MWMediaEditDialog.super.call( this, config );

	// Properties
	this.mediaNode = null;
	this.imageModel = null;
	this.store = null;

	// Events
	this.connect( this, { 'ready': 'onReady' } );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWMediaEditDialog, ve.ui.NodeDialog );

/* Static Properties */

ve.ui.MWMediaEditDialog.static.name = 'mediaEdit';

ve.ui.MWMediaEditDialog.static.title =
	OO.ui.deferMsg( 'visualeditor-dialog-media-title' );

ve.ui.MWMediaEditDialog.static.icon = 'picture';

ve.ui.MWMediaEditDialog.static.defaultSize = 'large';

ve.ui.MWMediaEditDialog.static.modelClasses = [ ve.dm.MWBlockImageNode ];

ve.ui.MWMediaEditDialog.static.toolbarGroups = [
	// History
	{ 'include': [ 'undo', 'redo' ] },
	// No formatting
	/* {
		'type': 'menu',
		'indicator': 'down',
		'title': OO.ui.deferMsg( 'visualeditor-toolbar-format-tooltip' ),
		'include': [ { 'group': 'format' } ],
		'promote': [ 'paragraph' ],
		'demote': [ 'preformatted', 'heading1' ]
	},*/
	// Style
	{
		'type': 'list',
		'icon': 'text-style',
		'indicator': 'down',
		'title': OO.ui.deferMsg( 'visualeditor-toolbar-style-tooltip' ),
		'include': [ { 'group': 'textStyle' }, 'clear' ],
		'promote': [ 'bold', 'italic' ],
		'demote': [ 'strikethrough', 'code', 'underline', 'clear' ]
	},
	// Link
	{ 'include': [ 'link' ] },
	// Cite
	{
		'type': 'list',
		'label': 'Cite',
		'indicator': 'down',
		'include': [ { 'group': 'cite' } ]
	},
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
			{ 'group': 'format' },
			{ 'group': 'structure' },
			'referenceList',
			'gallery'
		],
		'promote': [ 'reference', 'mediaInsert' ],
		'demote': [ 'language', 'specialcharacter' ]
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
	var altTextFieldset, positionFieldset, borderField, positionField;

	// Parent method
	ve.ui.MWMediaEditDialog.super.prototype.initialize.call( this );

	this.$spinner = this.$( '<div>' ).addClass( 've-specialchar-spinner' );

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
		new OO.ui.ButtonOptionWidget( 'left', {
			'$': this.$,
			'icon': 'align-float-left',
			'label': ve.msg( 'visualeditor-dialog-media-position-left' )
		} ),
		new OO.ui.ButtonOptionWidget( 'center', {
			'$': this.$,
			'icon': 'align-center',
			'label': ve.msg( 'visualeditor-dialog-media-position-center' )
		} ),
		new OO.ui.ButtonOptionWidget( 'right', {
			'$': this.$,
			'icon': 'align-float-right',
			'label': ve.msg( 'visualeditor-dialog-media-position-right' )
		} )
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
			'icon': 'image-thumbnail',
			'label': ve.msg( 'visualeditor-dialog-media-type-thumb' )
		} ),
		new OO.ui.ButtonOptionWidget( 'frameless', {
			'$': this.$,
			'icon': 'image-frameless',
			'label': ve.msg( 'visualeditor-dialog-media-type-frameless' )
		} ),
		new OO.ui.ButtonOptionWidget( 'frame', {
			'$': this.$,
			'icon': 'image-frame',
			'label': ve.msg( 'visualeditor-dialog-media-type-frame' )
		} ),
		new OO.ui.ButtonOptionWidget( 'none', {
			'$': this.$,
			'icon': 'image-none',
			'label': ve.msg( 'visualeditor-dialog-media-type-none' )
		} )
	] );
	this.borderCheckbox = new OO.ui.CheckboxInputWidget( {
		'$': this.$
	} );
	borderField = new OO.ui.FieldLayout( this.borderCheckbox, {
		'$': this.$,
		'align': 'inline',
		'label': ve.msg( 'visualeditor-dialog-media-type-border' )
	} );

	// Build type fieldset
	this.typeFieldset.$element.append( [
		this.typeInput.$element,
		borderField.$element
	] );

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

	this.sizeWidget = new ve.ui.MediaSizeWidget( {}, {
		'$': this.$
	} );

	this.$sizeWidgetElements = this.$( '<div>' ).append( [
		this.sizeWidget.$element,
		this.sizeErrorLabel.$element
	] );
	this.sizeFieldset.$element.append( [
		this.$spinner,
		this.$sizeWidgetElements
	] );

	// Get wiki default thumbnail size
	this.defaultThumbSize = mw.config.get( 'wgVisualEditorConfig' ).defaultUserOptions.defaultthumbsize;

	// Events
	this.positionCheckbox.connect( this, { 'change': 'onPositionCheckboxChange' } );
	this.borderCheckbox.connect( this, { 'change': 'onBorderCheckboxChange' } );
	this.positionInput.connect( this, { 'choose': 'onPositionInputSelect' } );
	this.typeInput.connect( this, { 'choose': 'onTypeInputSelect' } );

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

	this.panels.addItems( [ this.bookletLayout ] );
};

/**
 * Handle image model alignment change
 * @param {string} alignment Image alignment
 */
ve.ui.MWMediaEditDialog.prototype.onImageModelAlignmentChange = function ( alignment ) {
	var item = alignment ? this.positionInput.getItemFromData( alignment ) : null;

	alignment = alignment || 'none';

	this.positionCheckbox.setValue( alignment !== 'none' );
	// Select the item without triggering the 'choose' event
	this.positionInput.selectItem( item );

};

/**
 * Handle image model type change
 * @param {string} alignment Image alignment
 */

ve.ui.MWMediaEditDialog.prototype.onImageModelTypeChange = function ( type ) {
	var newImageType,
		item = type ? this.typeInput.getItemFromData( type ) : null;

	this.typeInput.selectItem( item );

	this.borderCheckbox.setDisabled(
		!this.imageModel.isBorderable()
	);

	this.borderCheckbox.setValue(
		this.imageModel.isBorderable() && this.imageModel.hasBorder()
	);

	// If we switched node type (block/inline or vise versa) the 'default' value
	// should be updated
	newImageType = this.imageModel.getImageNodeType();
	if (
		this.mediaNode.type === 'mwBlockImage' &&
		newImageType === 'mwInlineImage'
	) {
		// Always reset the default alignment value if we're switching from block
		// to inline
		this.imageModel.setAlignment( 'default' );
	} else if (
		this.mediaNode.type === 'mwInlineImage' &&
		newImageType === 'mwBlockImage' &&
		this.imageModel.getAlignment() === 'none'
	) {
		// If the alignment is 'none' and we switch from inline to block
		// switch the alignment to default
		this.imageModel.setAlignment( 'default' );
	}

};

/**
 * Handle change event on the positionCheckbox element.
 *
 * @param {boolean} checked Checkbox status
 */
ve.ui.MWMediaEditDialog.prototype.onPositionCheckboxChange = function ( checked ) {
	var newPositionValue;

	// Update the image model with a default value
	if ( checked ) {
		if ( this.imageModel.getImageNodeType() === 'mwInlineImage' ) {
			newPositionValue = this.mediaNode.getDocument().getDir() === 'rtl' ? 'left' : 'right';
		} else {
			newPositionValue = this.imageModel.getDefaultDir();
		}
		this.imageModel.setAlignment( newPositionValue );
	} else {
		this.imageModel.setAlignment( 'none' );
		this.positionInput.selectItem( null );
	}

	this.positionInput.setDisabled( !checked );
};

/**
 * Handle change event on the positionCheckbox element.
 *
 * @param {boolean} checked Checkbox status
 */
ve.ui.MWMediaEditDialog.prototype.onBorderCheckboxChange = function ( checked ) {

	// Update the image model
	this.imageModel.toggleBorder( checked );
};

/**
 * Handle change event on the positionInput element.
 *
 * @param {OO.ui.ButtonOptionWidget} item Selected item
 */
ve.ui.MWMediaEditDialog.prototype.onPositionInputSelect = function ( item ) {
	var position = item ? item.getData() : 'default';

	this.imageModel.setAlignment( position );
};

/**
 * Handle change event on the typeInput element.
 *
 * @param {OO.ui.ButtonOptionWidget} item Selected item
 */
ve.ui.MWMediaEditDialog.prototype.onTypeInputSelect = function ( item ) {
	var type = item ? item.getData() : 'default';

	this.imageModel.setType( type );
};

/**
 * @inheritdoc
 */
ve.ui.MWMediaEditDialog.prototype.setup = function ( data ) {
	var doc = this.getFragment().getSurface().getDocument();

	// Parent method
	ve.ui.MWMediaEditDialog.super.prototype.setup.call( this, data );

	// Properties
	this.mediaNode = this.getFragment().getSelectedNode();
	// Image model
	this.imageModel = ve.dm.MWImageModel.static.newFromImageNode( this.mediaNode );
	// Events
	this.imageModel.connect( this, {
		'alignmentChange': 'onImageModelAlignmentChange',
		'typeChange': 'onImageModelTypeChange'
	} );

	this.store = doc.getStore();
	// Set up the caption surface
	this.captionSurface = new ve.ui.SurfaceWidget(
		this.imageModel.getCaptionDocument(),
		{
			'$': this.$,
			'tools': this.constructor.static.toolbarGroups,
			'commands': this.constructor.static.surfaceCommands,
			'pasteRules': this.constructor.static.pasteRules
		}
	);

	// Size widget
	this.$spinner.hide();
	this.sizeErrorLabel.$element.hide();
	this.sizeWidget.setScalable( this.imageModel.getScalable() );

	// Initialize size
	this.sizeWidget.setSizeType(
		this.imageModel.isDefaultSize() ?
		'default' :
		'custom'
	);

	// Set initial alt text
	this.altTextInput.setValue(
		this.imageModel.getAltText()
	);

	// Set initial alignment
	this.positionInput.setDisabled(
		!this.imageModel.isAligned()
	);
	this.positionCheckbox.setValue(
		this.imageModel.isAligned()
	);
	this.positionInput.chooseItem(
		this.imageModel.isAligned() ?
		this.positionInput.getItemFromData(
			this.imageModel.getAlignment()
		) :
		null
	);

	// Border flag
	this.borderCheckbox.setDisabled(
		!this.imageModel.isBorderable()
	);
	this.borderCheckbox.setValue(
		this.imageModel.isBorderable() && this.imageModel.hasBorder()
	);

	// Type select
	this.typeInput.chooseItem(
		this.typeInput.getItemFromData(
			this.imageModel.getType() || 'none'
		)
	);

	// Initialization
	this.captionFieldset.$element.append( this.captionSurface.$element );
	this.captionSurface.initialize();
};

/**
 * Handle window ready events
 */
ve.ui.MWMediaEditDialog.prototype.onReady = function () {
	// Focus the caption surface
	this.captionSurface.focus();
};

/**
 * @inheritdoc
 */
ve.ui.MWMediaEditDialog.prototype.teardown = function ( data ) {
	// Cleanup
	this.imageModel.disconnect( this );

	this.captionSurface.destroy();
	this.captionSurface = null;
	this.captionNode = null;
	// Reset the considerations for the scalable
	// in the image node
	this.mediaNode.updateType();

	// Parent method
	ve.ui.MWMediaEditDialog.super.prototype.teardown.call( this, data );
};

/**
 * @inheritdoc
 */
ve.ui.MWMediaEditDialog.prototype.applyChanges = function () {
	var surfaceModel = this.getFragment().getSurface();

	// Update from the form
	this.imageModel.setAltText(
		this.altTextInput.getValue()
	);

	this.imageModel.setCaptionDocument(
		this.captionSurface.getSurface().getModel().getDocument()
	);

	// Check if the image node changed from inline to block or
	// vise versa
	if ( this.mediaNode.type !== this.imageModel.getImageNodeType() ) {
		// Remove the old image
		surfaceModel.change(
			ve.dm.Transaction.newFromRemoval(
				surfaceModel.getDocument(),
				this.mediaNode.getOuterRange()
			)
		);
		// Insert the new image
		this.imageModel.insertImageNode( this.getFragment() );
	} else {
		// Update current node
		this.imageModel.updateImageNode( surfaceModel );
	}

	// Parent method
	return ve.ui.MWMediaEditDialog.super.prototype.applyChanges.call( this );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWMediaEditDialog );
