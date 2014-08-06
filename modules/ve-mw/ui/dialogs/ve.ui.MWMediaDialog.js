/*!
 * VisualEditor user interface MWMediaDialog class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for inserting and editing MediaWiki media.
 *
 * @class
 * @extends ve.ui.NodeDialog
 *
 * @constructor
 * @param {OO.ui.WindowManager} manager Manager of window
 * @param {Object} [config] Configuration options
 */
ve.ui.MWMediaDialog = function VeUiMWMediaDialog( manager, config ) {
	// Parent constructor
	ve.ui.MWMediaDialog.super.call( this, manager, config );

	// Properties
	this.imageModel = null;
	this.store = null;
	this.fileRepoPromise = null;
	this.pageTitle = '';

	this.$element.addClass( 've-ui-mwMediaDialog' );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWMediaDialog, ve.ui.NodeDialog );

/* Static Properties */

ve.ui.MWMediaDialog.static.name = 'media';

ve.ui.MWMediaDialog.static.title =
	OO.ui.deferMsg( 'visualeditor-dialog-media-title' );

ve.ui.MWMediaDialog.static.icon = 'picture';

ve.ui.MWMediaDialog.static.size = 'large';

ve.ui.MWMediaDialog.static.actions = [
	{
		'action': 'apply',
		'label': OO.ui.deferMsg( 'visualeditor-dialog-action-apply' ),
		'flags': 'primary',
		'modes': 'edit'
	},
	{
		'action': 'insert',
		'label': OO.ui.deferMsg( 'visualeditor-dialog-media-insert-button' ),
		'flags': [ 'primary', 'constructive' ],
		'modes': 'insert'
	},
	{
		'action': 'change',
		'label': OO.ui.deferMsg( 'visualeditor-dialog-media-change-image' ),
		'modes': [ 'edit', 'insert' ]
	},
	{
		'label': OO.ui.deferMsg( 'visualeditor-dialog-action-cancel' ),
		'flags': 'safe',
		'modes': [ 'edit', 'insert', 'select' ]
	},
	{
		'action': 'back',
		'label': OO.ui.deferMsg( 'visualeditor-dialog-media-goback' ),
		'flags': 'safe',
		'modes': 'change'
	}
];

ve.ui.MWMediaDialog.static.modelClasses = [ ve.dm.MWBlockImageNode, ve.dm.MWInlineImageNode ];

ve.ui.MWMediaDialog.static.toolbarGroups = [
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
		'include': [ { 'group': 'textStyle' }, 'language', 'clear' ],
		'promote': [ 'bold', 'italic' ],
		'demote': [ 'strikethrough', 'code', 'underline', 'language', 'clear' ]
	},
	// Link
	{ 'include': [ 'link' ] },
	// Cite
	{
		'type': 'list',
		'label': OO.ui.deferMsg( 'visualeditor-toolbar-cite-label' ),
		'indicator': 'down',
		'include': [ { 'group': 'cite' }, 'reference', 'reference/existing' ],
		'demote': [ 'reference', 'reference/existing' ]
	},
	// No structure
	/* {
		'type': 'list',
		'icon': 'bullet-list',
		'indicator': 'down',
		'include': [ { 'group': 'structure' } ],
		'demote': [ 'outdent', 'indent' ]
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
		'promote': [ 'media', 'transclusion' ],
		'demote': [ 'specialcharacter' ]
	}
];

ve.ui.MWMediaDialog.static.surfaceCommands = [
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

/**
 * Get the paste rules for the surface widget in the dialog
 *
 * @see ve.dm.ElementLinearData#sanitize
 * @return {Object} Paste rules
 */
ve.ui.MWMediaDialog.static.getPasteRules = function () {
	return ve.extendObject(
		ve.copy( ve.init.target.constructor.static.pasteRules ),
		{
			'all': {
				'blacklist': OO.simpleArrayUnion(
					ve.getProp( ve.init.target.constructor.static.pasteRules, 'all', 'blacklist' ) || [],
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
};

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWMediaDialog.prototype.getBodyHeight = function () {
	return 400;
};

/**
 * @inheritdoc
 */
ve.ui.MWMediaDialog.prototype.initialize = function () {
	var altTextFieldset, positionFieldset, borderField, positionField,
		alignLeftButton, alignCenterButton, alignRightButton, alignButons;

	// Parent method
	ve.ui.MWMediaDialog.super.prototype.initialize.call( this );

	this.$spinner = this.$( '<div>' ).addClass( 've-specialchar-spinner' );

	this.panels = new OO.ui.StackLayout( { '$': this.$ } );

	// Set up the booklet layout
	this.bookletLayout = new OO.ui.BookletLayout( {
		'$': this.$,
		'outlined': true
	} );

	this.mediaSearchPanel = new OO.ui.PanelLayout( {
		'$': this.$,
		'scrollable': true
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

	// Define the media search page
	this.search = new ve.ui.MWMediaSearchWidget( { '$': this.$ } );

	this.$body.append( this.search.$spinner );

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

	this.altTextInput.$element.addClass( 've-ui-mwMediaDialog-altText' );

	// Build alt text fieldset
	altTextFieldset.$element
		.append( this.altTextInput.$element );

	// Position
	this.positionInput =  new OO.ui.ButtonSelectWidget( {
		'$': this.$
	} );

	alignLeftButton = new OO.ui.ButtonOptionWidget( 'left', {
		'$': this.$,
		'icon': 'align-float-left',
		'label': ve.msg( 'visualeditor-dialog-media-position-left' )
	} );
	alignCenterButton = new OO.ui.ButtonOptionWidget( 'center', {
		'$': this.$,
		'icon': 'align-center',
		'label': ve.msg( 'visualeditor-dialog-media-position-center' )
	} );
	alignRightButton = new OO.ui.ButtonOptionWidget( 'right', {
		'$': this.$,
		'icon': 'align-float-right',
		'label': ve.msg( 'visualeditor-dialog-media-position-right' )
	} );

	alignButons = ( this.frame.getDir() === 'ltr' ) ?
		[ alignLeftButton, alignCenterButton, alignRightButton ] :
		[ alignRightButton, alignCenterButton, alignLeftButton ];

	this.positionInput.addItems( alignButons, 0 );

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

	// Events
	this.positionCheckbox.connect( this, { 'change': 'onPositionCheckboxChange' } );
	this.borderCheckbox.connect( this, { 'change': 'onBorderCheckboxChange' } );
	this.positionInput.connect( this, { 'choose': 'onPositionInputChoose' } );
	this.typeInput.connect( this, { 'choose': 'onTypeInputChoose' } );
	this.search.connect( this, { 'select': 'onSearchSelect' } );
	this.altTextInput.connect( this, { 'change': 'setChanged' } );

	// Panel classes
	this.mediaSearchPanel.$element.addClass( 've-ui-mwMediaDialog-panel-search' );
	this.bookletLayout.$element.addClass( 've-ui-mwMediaDialog-panel-settings' );
	this.$body.append( this.panels.$element );

	// Initialization
	this.mediaSearchPanel.$element.append( this.search.$element );
	this.generalSettingsPage.$element.append( [
		this.captionFieldset.$element,
		altTextFieldset.$element
	] );

	this.advancedSettingsPage.$element.append( [
		positionFieldset.$element,
		this.typeFieldset.$element,
		this.sizeFieldset.$element
	] );

	this.panels.addItems( [ this.mediaSearchPanel, this.bookletLayout ] );
};

/**
 * Handle search result selection.
 *
 * @param {ve.ui.MWMediaResultWidget|null} item Selected item
 */
ve.ui.MWMediaDialog.prototype.onSearchSelect = function ( item ) {
	var attrs, info, dimensions;

	if ( item ) {
		info = item.imageinfo[0];
		attrs = {
			// Per https://www.mediawiki.org/w/?diff=931265&oldid=prev
			'href': './' + item.title,
			'src': info.thumburl,
			'resource': './' + item.title,
			'mediaType': info.mediatype
		};

		if ( !this.imageModel ) {
			// Image model doesn't exist yet, which means we are creating
			// a brand new node to insert
			attrs.type = 'thumb';
			attrs.align = 'default';
			attrs.width = info.thumbwidth;
			attrs.height = info.thumbheight;
			attrs.defaultSize = true;
		} else {
			// Image model already exists, so we just need to create a new
			// image based on the parameters that already exist
			dimensions = this.imageModel.getScalable().getCurrentDimensions();

			attrs.type = this.imageModel.getType();
			attrs.align = this.imageModel.getAlignment();
			attrs.width = dimensions.width;
			attrs.height = dimensions.height;
			if ( this.imageModel.getAltText() ) {
				attrs.alt = this.imageModel.getAltText();
			}
		}

		this.setImageModel( attrs );

		this.setChanged();
		this.switchPanels( 'edit' );
	}
};

/**
 * Handle image model alignment change
 * @param {string} alignment Image alignment
 */
ve.ui.MWMediaDialog.prototype.onImageModelAlignmentChange = function ( alignment ) {
	var item;
	alignment = alignment || 'none';

	item = alignment !== 'none' ? this.positionInput.getItemFromData( alignment ) : null;

	// Select the item without triggering the 'choose' event
	this.positionInput.selectItem( item );

	this.positionCheckbox.setValue( alignment !== 'none' );
	this.setChanged();
};

/**
 * Handle image model type change
 * @param {string} alignment Image alignment
 */

ve.ui.MWMediaDialog.prototype.onImageModelTypeChange = function ( type ) {
	var item = type ? this.typeInput.getItemFromData( type ) : null;

	this.typeInput.selectItem( item );

	this.borderCheckbox.setDisabled(
		!this.imageModel.isBorderable()
	);

	this.borderCheckbox.setValue(
		this.imageModel.isBorderable() && this.imageModel.hasBorder()
	);
	this.setChanged();
};

/**
 * Handle change event on the positionCheckbox element.
 *
 * @param {boolean} checked Checkbox status
 */
ve.ui.MWMediaDialog.prototype.onPositionCheckboxChange = function ( checked ) {
	var newPositionValue,
		currentModelAlignment = this.imageModel.getAlignment();

	this.positionInput.setDisabled( !checked );
	this.setChanged();
	// Only update the model if the current value is different than that
	// of the image model
	if (
		( currentModelAlignment === 'none' && checked ) ||
		( currentModelAlignment !== 'none' && !checked )
	) {
		if ( checked ) {
			// Picking a floating alignment value will create a block image
			// no matter what the type is, so in here we want to calculate
			// the default alignment of a block to set as our initial alignment
			// in case the checkbox is clicked but there was no alignment set
			// previously.
			newPositionValue = this.imageModel.getDefaultDir( 'mwBlockImage' );
			this.imageModel.setAlignment( newPositionValue );
		} else {
			// If we're unchecking the box, always set alignment to none and unselect the position widget
			this.imageModel.setAlignment( 'none' );
		}
	}
};

/**
 * Handle change event on the positionCheckbox element.
 *
 * @param {boolean} checked Checkbox status
 */
ve.ui.MWMediaDialog.prototype.onBorderCheckboxChange = function ( checked ) {
	// Only update if the value is different than the model
	if ( this.imageModel.hasBorder() !== checked ) {
		// Update the image model
		this.imageModel.toggleBorder( checked );
		this.setChanged();
	}
};

/**
 * Handle change event on the positionInput element.
 *
 * @param {OO.ui.ButtonOptionWidget} item Selected item
 */
ve.ui.MWMediaDialog.prototype.onPositionInputChoose = function ( item ) {
	var position = item ? item.getData() : 'default';

	// Only update if the value is different than the model
	if ( this.imageModel.getAlignment() !== position ) {
		this.imageModel.setAlignment( position );
		this.setChanged();
	}
};

/**
 * Handle change event on the typeInput element.
 *
 * @param {OO.ui.ButtonOptionWidget} item Selected item
 */
ve.ui.MWMediaDialog.prototype.onTypeInputChoose = function ( item ) {
	var type = item ? item.getData() : 'default';

	// Only update if the value is different than the model
	if ( this.imageModel.getType() !== type ) {
		this.imageModel.setType( type );
		this.setChanged();
	}

	// If type is 'frame', disable the size input widget completely
	this.sizeWidget.setDisabled( type === 'frame' );
};

/**
 * When changes occur, enable the apply button.
 */
ve.ui.MWMediaDialog.prototype.setChanged = function () {
	// TODO: Set up a better and deeper test of whether the new
	// image parameters are different than the original image
	this.actions.setAbilities( { 'insert': true, 'apply': true } );
};

/**
 * Get the object of file repos to use for the media search
 *
 * @returns {jQuery.Promise}
 */
ve.ui.MWMediaDialog.prototype.getFileRepos = function () {
	var defaultSource = [ {
			'url': mw.util.wikiScript( 'api' ),
			'local': true
		} ];

	if ( !this.fileRepoPromise ) {
		this.fileRepoPromise = ve.init.target.constructor.static.apiRequest( {
			'action': 'query',
			'meta': 'filerepoinfo'
		} ).then(
			function ( resp ) {
				return resp.query.repos || defaultSource;
			},
			function () {
				return $.Deferred().resolve( defaultSource );
			}
		);
	}

	return this.fileRepoPromise;
};

/**
 * @inheritdoc
 */
ve.ui.MWMediaDialog.prototype.getSetupProcess = function ( data ) {
	return ve.ui.MWMediaDialog.super.prototype.getSetupProcess.call( this, data )
		.next( function () {
			var pageTitle = mw.config.get( 'wgTitle' ),
				namespace = mw.config.get( 'wgNamespaceNumber' ),
				namespacesWithSubpages = mw.config.get( 'wgVisualEditor' ).namespacesWithSubpages;

			// Read the page title
			if ( namespacesWithSubpages[ namespace ] ) {
				// If we are in a namespace that allows for subpages, strip the entire
				// title except for the part after the last /
				pageTitle = pageTitle.substr( pageTitle.lastIndexOf( '/' ) + 1 );
			}
			this.pageTitle = pageTitle;

			if ( this.selectedNode ) {
				this.setImageModel( this.selectedNode.getAttributes() );
			}

			this.resetCaption();

			this.switchPanels( this.selectedNode ? 'edit' : 'search' );

			this.actions.setAbilities( { 'insert': false, 'apply': false } );

			// Initialization
			this.captionFieldset.$element.append( this.captionSurface.$element );
			this.captionSurface.initialize();

		}, this );
};

/**
 * Switch between the edit and insert/search panels
 * @param {string} panel Panel name
 */
ve.ui.MWMediaDialog.prototype.switchPanels = function ( panel ) {
	switch ( panel ) {
		case 'edit':
			// Set the edit panel
			this.panels.setItem( this.bookletLayout );
			// Focus the general settings page
			this.bookletLayout.setPage( 'general' );
			// Hide/show buttons
			this.actions.setMode( this.selectedNode ? 'edit' : 'insert' );
			// HACK: OO.ui.Dialog needs an API for this
			this.frame.$content.removeClass( 'oo-ui-dialog-content-footless' );
			// Focus the caption surface
			this.captionSurface.focus();
			// Hide/show the panels
			this.bookletLayout.$element.show();
			this.mediaSearchPanel.$element.hide();
			break;
		default:
		case 'search':
			// Show a spinner while we check for file repos.
			// this will only be done once per session.
			// The filerepo promise will be sent to the API
			// only once per session so this will be resolved
			// every time the search panel reloads
			this.$spinner.show();
			this.search.$element.hide();

			// Get the repos from the API first
			// The ajax request will only be done once per session
			this.getFileRepos().done( function ( repos ) {
				this.search.setSources( repos );
				// Done, hide the spinner
				this.$spinner.hide();
				// Show the search and query the media sources
				this.search.$element.show();
				this.search.query.setValue( this.pageTitle );
				this.search.queryMediaSources();
				// Initialization
				// This must be done only after there are proper
				// sources defined
				this.search.getQuery().focus().select();
				this.search.getResults().selectItem();
				this.search.getResults().highlightItem();
			}.bind( this ) );

			// Set the edit panel
			this.panels.setItem( this.mediaSearchPanel );
			this.actions.setMode( this.imageModel ? 'change' : 'select' );

			// HACK: OO.ui.Dialog needs an API for this
			this.frame.$content.toggleClass( 'oo-ui-dialog-content-footless', !this.imageModel );

			// Hide/show the panels
			this.bookletLayout.$element.hide();
			this.mediaSearchPanel.$element.show();
			break;
	}
};

/**
 * Set the image model
 * @param {ve.dm.MWImageNode} node Image node, if it doesn't come from the selected node
 */
ve.ui.MWMediaDialog.prototype.setImageModel = function ( attrs ) {
	var dir;

	if ( this.imageModel ) {
		this.imageModel.disconnect( this );
		this.sizeWidget.disconnect( this );
	}

	if ( this.selectedNode ) {
		dir = this.selectedNode.getDocument() ?
			this.selectedNode.getDocument().getDir() :
			this.getFragment().getSurface().getDocument().getDir();
		attrs = attrs || this.selectedNode.getAttributes();
	}

	this.imageModel = ve.dm.MWImageModel.static.newFromImageAttributes( attrs, dir );

	this.actions.setAbilities( { 'insert': true, 'apply': true } );

	// Events
	this.imageModel.connect( this, {
		'alignmentChange': 'onImageModelAlignmentChange',
		'typeChange': 'onImageModelTypeChange',
		'sizeDefaultChange': 'setChanged'
	} );

	// Set up

	// Size widget
	this.sizeErrorLabel.$element.hide();
	this.sizeWidget.setScalable( this.imageModel.getScalable() );
	this.sizeWidget.connect( this, { 'changeSizeType': 'setChanged' } );
	this.sizeWidget.connect( this, { 'change': 'setChanged' } );

	// Initialize size
	this.sizeWidget.setSizeType(
		this.imageModel.isDefaultSize() ?
		'default' :
		'custom'
	);
	this.sizeWidget.setDisabled( this.imageModel.getType() === 'frame' );

	// Set initial alt text
	this.altTextInput.setValue(
		this.imageModel.getAltText()
	);

	// Set initial alignment
	this.positionInput.setDisabled(
		!this.imageModel.isAligned()
	);
	this.positionInput.selectItem(
		this.imageModel.isAligned() ?
		this.positionInput.getItemFromData(
			this.imageModel.getAlignment()
		) :
		null
	);
	this.positionCheckbox.setValue(
		this.imageModel.isAligned()
	);

	// Border flag
	this.borderCheckbox.setDisabled(
		!this.imageModel.isBorderable()
	);
	this.borderCheckbox.setValue(
		this.imageModel.isBorderable() && this.imageModel.hasBorder()
	);

	// Type select
	this.typeInput.selectItem(
		this.typeInput.getItemFromData(
			this.imageModel.getType() || 'none'
		)
	);
};

/**
 * Reset the caption surface
 */
ve.ui.MWMediaDialog.prototype.resetCaption = function () {
	var captionDocument,
		doc = this.getFragment().getSurface().getDocument();

	if ( this.captionSurface ) {
		// Reset the caption surface if it already exists
		this.captionSurface.destroy();
		this.captionSurface = null;
		this.captionNode = null;
	}
	// Get existing caption. We only do this in setup, because the caption
	// should not reset to original if the image is replaced or edited.

	// If the selected node is a block image and the caption already exists,
	// store the initial caption and set it as the caption document
	if (
		this.imageModel &&
		this.selectedNode &&
		this.selectedNode.getDocument() &&
		this.selectedNode instanceof ve.dm.MWBlockImageNode
	) {
		this.captionNode = this.selectedNode.getCaptionNode();
		if ( this.captionNode && this.captionNode.getLength() > 0 ) {
			this.imageModel.setCaptionDocument(
				this.selectedNode.getDocument().cloneFromRange( this.captionNode.getRange() )
			);
		}
	}

	if ( this.imageModel ) {
		captionDocument = this.imageModel.getCaptionDocument();
	} else {
		captionDocument = new ve.dm.Document( [
			{ 'type': 'paragraph', 'internal': { 'generated': 'wrapper' } },
			{ 'type': '/paragraph' },
			{ 'type': 'internalList' },
			{ 'type': '/internalList' }
		] );
	}

	this.store = doc.getStore();

	// Set up the caption surface
	this.captionSurface = new ve.ui.SurfaceWidget(
		captionDocument,
		{
			'$': this.$,
			'tools': this.constructor.static.toolbarGroups,
			'commands': this.constructor.static.surfaceCommands,
			'pasteRules': this.constructor.static.getPasteRules()
		}
	);

	// Events
	this.captionSurface.getSurface().getModel().connect( this, {
		'documentUpdate': function () {
			this.wikitextWarning = ve.init.mw.ViewPageTarget.static.checkForWikitextWarning(
				this.captionSurface.getSurface(),
				this.wikitextWarning
			);
			this.setChanged();
		}
	} );
};

/**
 * @inheritdoc
 */
ve.ui.MWMediaDialog.prototype.getReadyProcess = function ( data ) {
	return ve.ui.MWMediaDialog.super.prototype.getReadyProcess.call( this, data )
		.next( function () {
			// Focus the caption surface
			this.captionSurface.focus();
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWMediaDialog.prototype.getTeardownProcess = function ( data ) {
	return ve.ui.MWMediaDialog.super.prototype.getTeardownProcess.call( this, data )
		.first( function () {
			// Cleanup
			this.search.getQuery().setValue( '' );
			if ( this.imageModel ) {
				this.imageModel.disconnect( this );
				this.sizeWidget.disconnect( this );
			}
			if ( this.wikitextWarning ) {
				this.wikitextWarning.close();
			}
			this.captionSurface.destroy();
			this.captionSurface = null;
			this.captionNode = null;
			this.imageModel = null;
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWMediaDialog.prototype.getActionProcess = function ( action ) {
	if ( action === 'change' ) {
		return new OO.ui.Process( function () {
			this.switchPanels( 'search' );
		}, this );
	}
	if ( action === 'back' ) {
		return new OO.ui.Process( function () {
			this.switchPanels( 'edit' );
		}, this );
	}
	if ( action === 'apply' || action === 'insert' ) {
		return new OO.ui.Process( function () {
			var surfaceModel = this.getFragment().getSurface();

			// Update from the form
			this.imageModel.setAltText( this.altTextInput.getValue() );
			this.imageModel.setCaptionDocument(
				this.captionSurface.getSurface().getModel().getDocument()
			);

			// TODO: Simplify this condition
			if ( this.imageModel ) {
				if (
					// There was an initial node
					this.selectedNode &&
					// And we didn't change the image type block/inline or vise versa
					this.selectedNode.type === this.imageModel.getImageNodeType() &&
					// And we didn't change the image itself
					this.selectedNode.getAttribute( 'src' ) ===
						this.imageModel.getImageSource()
				) {
					// We only need to update the attributes of the current node
					this.imageModel.updateImageNode( this.selectedNode, surfaceModel );
				} else {
					// Replacing an image or inserting a brand new one

					// If there was a previous node, remove it first
					if ( this.selectedNode ) {
						// Remove the old image
						this.fragment = this.getFragment().clone(
							this.selectedNode.getOuterRange()
						);
						this.fragment.removeContent();
					}
					// Insert the new image
					this.fragment = this.imageModel.insertImageNode( this.getFragment() );
				}
			}

			this.close( { 'action': action } );
		}, this );
	}
	return ve.ui.MWMediaDialog.super.prototype.getActionProcess.call( this, action );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWMediaDialog );
