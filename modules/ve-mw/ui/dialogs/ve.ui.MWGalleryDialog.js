/*!
 * VisualEditor user interface MWGalleryDialog class.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for editing MediaWiki galleries.
 *
 * @class
 * @extends ve.ui.MWExtensionDialog
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWGalleryDialog = function VeUiMWGalleryDialog() {
	// Parent constructor
	ve.ui.MWGalleryDialog.super.apply( this, arguments );

	this.$element.addClass( 've-ui-mwGalleryDialog' );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWGalleryDialog, ve.ui.MWExtensionDialog );

/* Static properties */

ve.ui.MWGalleryDialog.static.name = 'gallery';

ve.ui.MWGalleryDialog.static.size = 'large';

ve.ui.MWGalleryDialog.static.title =
	OO.ui.deferMsg( 'visualeditor-mwgallerydialog-title' );

ve.ui.MWGalleryDialog.static.modelClasses = [ ve.dm.MWGalleryNode ];

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWGalleryDialog.prototype.initialize = function () {
	var imagesTabPanel, optionsTabPanel, menuLayout,
		innerMenuLayout, innerMenuPanel, innerContentPanel,
		modeField, captionField, widthsField, heightsField,
		perrowField, showFilenameField, classesField, stylesField;

	// Parent method
	ve.ui.MWGalleryDialog.super.prototype.initialize.call( this );

	// States
	this.highlightedItem = null;
	this.searchPanelVisible = false;
	this.selectedFilenames = {};
	this.initialImageData = [];

	// Default settings
	this.defaults = mw.config.get( 'wgVisualEditorConfig' ).galleryOptions;

	// Images and options tab panels
	this.indexLayout = new OO.ui.IndexLayout( {
		scrollable: false,
		expanded: true
	} );
	imagesTabPanel = new OO.ui.TabPanelLayout( 'images', {
		label: ve.msg( 'visualeditor-mwgallerydialog-card-images' ),
		expandable: false,
		scrollable: false,
		padded: true
	} );
	optionsTabPanel = new OO.ui.TabPanelLayout( 'options', {
		label: ve.msg( 'visualeditor-mwgallerydialog-card-options' ),
		expandable: false,
		scrollable: false,
		padded: true
	} );

	// Images tab panel

	// General layout
	menuLayout = new OO.ui.MenuLayout( {
		classes: [ 've-ui-mwGalleryDialog-menuLayout' ]
	} );
	innerMenuLayout = new OO.ui.MenuLayout( {
		menuPosition: 'bottom',
		classes: [ 've-ui-mwGalleryDialog-innerMenuLayout' ]
	} );
	innerMenuPanel = new OO.ui.PanelLayout( {
		padded: true,
		expanded: true,
		scrollable: true
	} );
	innerContentPanel = new OO.ui.PanelLayout( {
		padded: true,
		expanded: true
	} );
	this.editPanel = new OO.ui.PanelLayout( {
		padded: true,
		expanded: true,
		scrollable: true
	} );
	this.searchPanel = new OO.ui.PanelLayout( {
		padded: true,
		expanded: true,
		scrollable: true
	} ).toggle( false );

	// Menu
	this.$emptyGalleryMessage = $( '<div>' )
		.addClass( 'oo-ui-element-hidden' )
		.text( ve.msg( 'visualeditor-mwgallerydialog-empty-gallery-message' ) );
	this.galleryGroup = new ve.ui.MWGalleryGroupWidget();
	this.showSearchPanelButton = new OO.ui.ButtonWidget( {
		label: ve.msg( 'visualeditor-mwgallerydialog-search-button-label' ),
		flags: [ 'progressive' ],
		classes: [ 've-ui-mwGalleryDialog-show-search-panel-button' ]
	} );

	// Edit panel
	this.filenameFieldset = new OO.ui.FieldsetLayout( {
		label: ve.msg( 'visualeditor-dialog-media-content-filename' ),
		icon: 'image'
	} );
	this.$highlightedImage = $( '<div>' )
		.addClass( 've-ui-mwGalleryDialog-highlighted-image' );
	this.filenameFieldset.$element.append( this.$highlightedImage );
	// TODO: make into a ve.ui.MWTargetWidget once Parsoid handles galleries
	this.highlightedCaptionInput = new OO.ui.MultilineTextInputWidget( {
		placeholder: ve.msg( 'visualeditor-mwgallerydialog-image-caption-placeholder' ),
		autosize: true,
		spellcheck: true
	} );
	this.highlightedCaptionFieldset = new OO.ui.FieldsetLayout( {
		label: ve.msg( 'visualeditor-dialog-media-content-section' ),
		icon: 'parameter'
	} );
	this.highlightedCaptionFieldset.$element.append( this.highlightedCaptionInput.$element );
	this.removeButton = new OO.ui.ButtonWidget( {
		label: ve.msg( 'visualeditor-mwgallerydialog-remove-button-label' ),
		flags: [ 'destructive' ],
		classes: [ 've-ui-mwGalleryDialog-remove-button' ]
	} );

	// Search panel
	this.searchWidget = new mw.widgets.MediaSearchWidget( {
		rowHeight: 150
	} );

	// Options tab panel

	// Input widgets
	this.modeDropdown = new OO.ui.DropdownWidget( {
		menu: {
			items: [
				new OO.ui.MenuOptionWidget( {
					data: 'traditional',
					label: ve.msg( 'visualeditor-mwgallerydialog-mode-dropdown-label-traditional' )
				} ),
				new OO.ui.MenuOptionWidget( {
					data: 'nolines',
					label: ve.msg( 'visualeditor-mwgallerydialog-mode-dropdown-label-nolines' )
				} ),
				new OO.ui.MenuOptionWidget( {
					data: 'packed',
					label: ve.msg( 'visualeditor-mwgallerydialog-mode-dropdown-label-packed' )
				} ),
				new OO.ui.MenuOptionWidget( {
					data: 'packed-overlay',
					label: ve.msg( 'visualeditor-mwgallerydialog-mode-dropdown-label-packed-overlay' )
				} ),
				new OO.ui.MenuOptionWidget( {
					data: 'packed-hover',
					label: ve.msg( 'visualeditor-mwgallerydialog-mode-dropdown-label-packed-hover' )
				} ),
				new OO.ui.MenuOptionWidget( {
					data: 'slideshow',
					label: ve.msg( 'visualeditor-mwgallerydialog-mode-dropdown-label-slideshow' )
				} )
			]
		}
	} );
	this.captionInput = new OO.ui.TextInputWidget( {
		placeholder: ve.msg( 'visualeditor-mwgallerydialog-caption-input-placeholder' ),
		spellcheck: true
	} );
	this.widthsInput = new OO.ui.NumberInputWidget( {
		min: 0,
		showButtons: false,
		input: {
			placeholder: ve.msg( 'visualeditor-mwgallerydialog-widths-input-placeholder', this.defaults.imageWidth )
		}
	} );
	this.heightsInput = new OO.ui.NumberInputWidget( {
		min: 0,
		showButtons: false,
		input: {
			placeholder: ve.msg( 'visualeditor-mwgallerydialog-heights-input-placeholder', this.defaults.imageHeight )
		}
	} );
	this.perrowInput = new OO.ui.NumberInputWidget( {
		min: 0,
		showButtons: false
	} );
	this.showFilenameCheckbox = new OO.ui.CheckboxInputWidget( {
		value: 'yes'
	} );
	this.classesInput = new OO.ui.TextInputWidget( {
		placeholder: ve.msg( 'visualeditor-mwgallerydialog-classes-input-placeholder' )
	} );
	this.stylesInput = new OO.ui.TextInputWidget( {
		placeholder: ve.msg( 'visualeditor-mwgallerydialog-styles-input-placeholder' )
	} );

	// Field layouts
	modeField = new OO.ui.FieldLayout( this.modeDropdown, {
		label: ve.msg( 'visualeditor-mwgallerydialog-mode-field-label' )
	} );
	captionField = new OO.ui.FieldLayout( this.captionInput, {
		label: ve.msg( 'visualeditor-mwgallerydialog-caption-field-label' )
	} );
	widthsField = new OO.ui.FieldLayout( this.widthsInput, {
		label: ve.msg( 'visualeditor-mwgallerydialog-widths-field-label' )
	} );
	heightsField = new OO.ui.FieldLayout( this.heightsInput, {
		label: ve.msg( 'visualeditor-mwgallerydialog-heights-field-label' )
	} );
	perrowField = new OO.ui.FieldLayout( this.perrowInput, {
		label: ve.msg( 'visualeditor-mwgallerydialog-perrow-field-label' )
	} );
	showFilenameField = new OO.ui.FieldLayout( this.showFilenameCheckbox, {
		label: ve.msg( 'visualeditor-mwgallerydialog-show-filename-field-label' )
	} );
	classesField = new OO.ui.FieldLayout( this.classesInput, {
		label: ve.msg( 'visualeditor-mwgallerydialog-classes-field-label' )
	} );
	stylesField = new OO.ui.FieldLayout( this.stylesInput, {
		label: ve.msg( 'visualeditor-mwgallerydialog-styles-field-label' )
	} );

	// Append everything
	innerMenuLayout.$menu.append(
		innerContentPanel.$element.append(
			this.showSearchPanelButton.$element
		)
	);
	innerMenuLayout.$content.append(
		innerMenuPanel.$element.append(
			this.$emptyGalleryMessage,
			this.galleryGroup.$element
		)
	);
	menuLayout.$menu.append(
		innerMenuLayout.$element
	);
	menuLayout.$content.append(
		this.editPanel.$element.append(
			this.filenameFieldset.$element,
			this.highlightedCaptionFieldset.$element,
			this.removeButton.$element
		),
		this.searchPanel.$element.append(
			this.searchWidget.$element
		)
	);
	imagesTabPanel.$element.append(
		menuLayout.$element
	);
	optionsTabPanel.$element.append(
		modeField.$element,
		captionField.$element,
		widthsField.$element,
		heightsField.$element,
		perrowField.$element,
		showFilenameField.$element,
		classesField.$element,
		stylesField.$element
	);
	this.indexLayout.addTabPanels( [
		imagesTabPanel,
		optionsTabPanel
	] );
	this.$body.append( this.indexLayout.$element );
};

/**
 * @inheritdoc
 */
ve.ui.MWGalleryDialog.prototype.getSetupProcess = function ( data ) {
	return ve.ui.MWGalleryDialog.super.prototype.getSetupProcess.call( this, data )
		.next( function () {
			var title, titleText, imageTitles, mode,
				caption, widths, heights, perrow,
				showFilename, classes, styles,
				namespaceIds = mw.config.get( 'wgNamespaceIds' ),
				dialog = this,
				attributes = this.selectedNode && this.selectedNode.getAttribute( 'mw' ).attrs;

			// Images tab panel
			// If editing an existing gallery, populate with the images...
			if ( this.selectedNode ) {
				imageTitles = [];
				// Get image and caption data
				// TODO: Can be multiple pipes. See parser.php -> renderImageGallery in MediaWiki
				$.trim( this.selectedNode.getAttribute( 'mw' ).body.extsrc )
					.split( '\n' ).forEach( function ( line ) {
						var matches;

						// Match lines like:
						// Image:someimage.jpg|This is some image
						matches = line.match( /^([^|]+)(\|(.*))?$/ );

						// Ignore any empty lines
						if ( matches ) {
							// The "File:" prefix is optional in wikitext galleries. This will add
							// the prefix if there is no prefix, but won't change an existing
							// prefix (e.g. "Category:")

							if ( matches[ 1 ].indexOf( '%' ) !== -1 ) {
								matches[ 1 ] = decodeURIComponent( matches[ 1 ] );
							}

							title = mw.Title.newFromText( matches[ 1 ], namespaceIds.file );
							// Ignore any invalid titles
							// (which will result in title being null)
							if ( title ) {
								titleText = title.getPrefixedText();
								imageTitles.push( titleText );
								dialog.initialImageData.push( {
									title: titleText,
									caption: matches[ 3 ] || ''
								} );
							}
						}
					} );

				// Populate menu and edit panels
				this.imagesPromise = this.requestImages( {
					titles: imageTitles
				} ).done( function () {
					dialog.onHighlightItem();
				} );

			// ...Otherwise show the search panel
			} else {
				this.toggleEmptyGalleryMessage( true );
				this.showSearchPanelButton.toggle( false );
				this.toggleSearchPanel( true );
			}

			// Options tab panel

			// Set options
			mode = attributes && attributes.mode || this.defaults.mode;
			caption = attributes && attributes.caption || '';
			widths = attributes && parseInt( attributes.widths ) || '';
			heights = attributes && parseInt( attributes.heights ) || '';
			perrow = attributes && attributes.perrow || '';
			showFilename = attributes && attributes.showfilename === 'yes';
			classes = attributes && attributes.class || '';
			styles = attributes && attributes.style || '';

			// Populate options panel
			this.modeDropdown.getMenu().selectItemByData( mode );
			this.captionInput.setValue( caption );
			this.widthsInput.setValue( widths );
			this.heightsInput.setValue( heights );
			this.perrowInput.setValue( perrow );
			this.showFilenameCheckbox.setSelected( showFilename );
			this.classesInput.setValue( classes );
			this.stylesInput.setValue( styles );

			// Disable fields depending on mode
			this.onModeDropdownChange();

			// Add event handlers
			this.indexLayout.connect( this, { set: 'updateDialogSize' } );
			this.highlightedCaptionInput.connect( this, { change: 'updateActions' } );
			this.searchWidget.getResults().connect( this, { choose: 'onSearchResultsChoose' } );
			this.showSearchPanelButton.connect( this, { click: 'onShowSearchPanelButtonClick' } );
			this.galleryGroup.connect( this, { editItem: 'onHighlightItem' } );
			this.galleryGroup.connect( this, { itemDragEnd: 'updateActions' } );
			this.removeButton.connect( this, { click: 'onRemoveItem' } );
			this.modeDropdown.getMenu().connect( this, { choose: 'onModeDropdownChange' } );
			this.captionInput.connect( this, { change: 'updateActions' } );
			this.widthsInput.connect( this, { change: 'updateActions' } );
			this.heightsInput.connect( this, { change: 'updateActions' } );
			this.perrowInput.connect( this, { change: 'updateActions' } );
			this.showFilenameCheckbox.connect( this, { change: 'updateActions' } );
			this.classesInput.connect( this, { change: 'updateActions' } );
			this.stylesInput.connect( this, { change: 'updateActions' } );

			// Hack: Give the input a value so that this.insertOrUpdateNode gets called
			this.input.setValue( 'gallery' );
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWGalleryDialog.prototype.getReadyProcess = function ( data ) {
	return ve.ui.MWGalleryDialog.super.prototype.getReadyProcess.call( this, data )
		.next( function () {
			this.searchWidget.getQuery().focus().select();
			return this.imagesPromise;
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWGalleryDialog.prototype.getTeardownProcess = function ( data ) {
	return ve.ui.MWGalleryDialog.super.prototype.getTeardownProcess.call( this, data )
		.first( function () {
			// Widgets
			this.galleryGroup.clearItems();
			this.searchWidget.getQuery().setValue( '' );
			this.searchWidget.teardown();

			// States
			this.highlightedItem = null;
			this.searchPanelVisible = false;
			this.selectedFilenames = {};
			this.initialImageData = [];

			// Disconnect events
			this.indexLayout.disconnect( this );
			this.highlightedCaptionInput.disconnect( this );
			this.searchWidget.getResults().disconnect( this );
			this.showSearchPanelButton.disconnect( this );
			this.galleryGroup.disconnect( this );
			this.removeButton.disconnect( this );
			this.modeDropdown.disconnect( this );
			this.captionInput.disconnect( this );
			this.widthsInput.disconnect( this );
			this.heightsInput.disconnect( this );
			this.perrowInput.disconnect( this );
			this.showFilenameCheckbox.disconnect( this );
			this.classesInput.disconnect( this );
			this.stylesInput.disconnect( this );
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWGalleryDialog.prototype.getBodyHeight = function () {
	return 600;
};

/**
 * Request the images for the images tab panel menu
 *
 * @param {Object} options Options for the request
 * @return {jQuery.Promise} Promise which resolves when image data has been fetched
 */
ve.ui.MWGalleryDialog.prototype.requestImages = function ( options ) {
	var i, len,
		dialog = this,
		promises = [];
	for ( i = 0, len = options.titles.length; i < len; i++ ) {
		promises.push( ve.init.platform.galleryImageInfoCache.get( options.titles[ i ] ) );
	}
	return $.when.apply( $, promises )
		.done( function () {
			var resp = {};
			for ( i = 0; i < len; i++ ) {
				resp[ options.titles[ i ] ] = arguments[ i ];
			}
			dialog.onRequestImagesSuccess( resp );
		} );
};

/**
 * Create items for the returned images and add them to the gallery group
 *
 * @param {Object} response jQuery response object
 */
ve.ui.MWGalleryDialog.prototype.onRequestImagesSuccess = function ( response ) {
	var title,
		thumbUrls = {},
		items = [];

	for ( title in response ) {
		thumbUrls[ title ] = response[ title ].thumburl;
	}

	if ( this.initialImageData.length > 0 ) {
		this.initialImageData.forEach( function ( image ) {
			image.thumbUrl = thumbUrls[ image.title ];
			items.push( new ve.ui.MWGalleryItemWidget( image ) );
		} );
		this.initialImageData = [];
	} else {
		for ( title in this.selectedFilenames ) {
			if ( Object.prototype.hasOwnProperty.call( thumbUrls, title ) ) {
				items.push( new ve.ui.MWGalleryItemWidget( {
					title: title,
					thumbUrl: thumbUrls[ title ]
				} ) );
				delete this.selectedFilenames[ title ];
			}
		}
	}
	this.galleryGroup.addItems( items );

	// Gallery is no longer empty
	this.updateActions();
	this.toggleEmptyGalleryMessage( false );
	this.showSearchPanelButton.toggle( true );
};

/**
 * Request a new image and highlight it
 *
 * @param {string} title File name for the new image
 */
ve.ui.MWGalleryDialog.prototype.addNewImage = function ( title ) {
	var dialog = this;

	// Make list of unique pending images, for onRequestImagesSuccess
	this.selectedFilenames[ title ] = true;

	// Request image
	this.requestImages( {
		titles: [ title ]
	} ).done( function () {

		// populate edit panel with the new image
		var items = dialog.galleryGroup.items;
		dialog.onHighlightItem( items[ items.length - 1 ] );
		dialog.highlightedCaptionInput.focus();
	} );
};

/**
 * Handle search results choose event.
 *
 * @param {mw.widgets.MediaResultWidget} item Chosen item
 */
ve.ui.MWGalleryDialog.prototype.onSearchResultsChoose = function ( item ) {
	var title = mw.Title.newFromText( item.getData().title ).getPrefixedText();

	if ( !Object.prototype.hasOwnProperty( this.selectedFilenames, title ) ) {
		this.addNewImage( title );
	}

	this.updateActions();
};

/**
 * Handle click event for the remove button
 */
ve.ui.MWGalleryDialog.prototype.onRemoveItem = function () {

	// Remove the highlighted item
	this.galleryGroup.removeItems( [ this.highlightedItem ] );

	// Show the search panel if the gallery is now empty...
	if ( this.galleryGroup.items.length === 0 ) {
		this.toggleEmptyGalleryMessage( true );
		this.showSearchPanelButton.toggle( false );
		this.toggleSearchPanel( true );

	// ...Otherwise highlight the first item in the gallery
	} else {
		this.onHighlightItem();
	}
	this.updateActions();
};

/**
 * Handle clicking on an image in the menu
 *
 * @param {ve.ui.MWGalleryItemWidget} item The item that was clicked on
 */
ve.ui.MWGalleryDialog.prototype.onHighlightItem = function ( item ) {
	var title;

	// Unhighlight previous item
	if ( this.highlightedItem ) {
		this.highlightedItem.toggleHighlighted( false );
	}

	// Show edit panel
	this.toggleSearchPanel( false );

	// Highlight new item
	item = item || this.galleryGroup.items[ 0 ];
	item.toggleHighlighted( true );
	this.highlightedItem = item;

	// Scroll item into view in menu
	OO.ui.Element.static.scrollIntoView( item.$element[ 0 ] );

	// Populate edit panel
	title = mw.Title.newFromText( item.imageTitle );
	this.filenameFieldset.setLabel(
		$( '<span>' ).append(
			document.createTextNode( title.getMainText() + ' ' ),
			$( '<a>' )
				.addClass( 'visualeditor-dialog-media-content-description-link' )
				.attr( 'href', title.getUrl() )
				.attr( 'target', '_blank' )
				.attr( 'rel', 'noopener' )
				.text( ve.msg( 'visualeditor-dialog-media-content-description-link' ) )
		)
	);
	this.$highlightedImage
		.css( 'background-image', 'url(' + item.thumbUrl + ')' );
	this.highlightedCaptionInput
		.setValue( item.caption );
};

/**
 * Handle change event for this.modeDropdown
 */
ve.ui.MWGalleryDialog.prototype.onModeDropdownChange = function () {
	var mode = this.modeDropdown.getMenu().getSelectedItem().getData(),
		disabled = (
			mode === 'packed' ||
			mode === 'packed-overlay' ||
			mode === 'packed-hover' ||
			mode === 'slideshow'
		);

	this.widthsInput.setDisabled( disabled );
	this.perrowInput.setDisabled( disabled );

	// heights is only ignored in slideshow mode
	this.heightsInput.setDisabled( mode === 'slideshow' );

	this.updateActions();
};

/**
 * Handle click event for showSearchPanelButton
 */
ve.ui.MWGalleryDialog.prototype.onShowSearchPanelButtonClick = function () {
	this.toggleSearchPanel( true );
};

/**
 * Toggle the search panel (and the edit panel, the opposite way)
 *
 * @param {boolean} visible The search panel is visible
 */
ve.ui.MWGalleryDialog.prototype.toggleSearchPanel = function ( visible ) {
	var pageTitle, namespace, namespacesWithSubpages;

	visible = visible !== undefined ? visible : !this.searchPanelVisible;

	// If currently visible panel is an edit panel, store the caption
	if ( !this.searchPanelVisible && this.highlightedItem ) {
		this.highlightedItem.setCaption(
			this.highlightedCaptionInput.getValue()
		);
	}

	// Record the state of the search panel
	this.searchPanelVisible = visible;

	// Toggle the search panel, and do the opposite for the edit panel
	this.searchPanel.toggle( visible );
	this.editPanel.toggle( !visible );

	// If the edit panel is visible, focus the caption input
	if ( !visible ) {
		this.highlightedCaptionInput.focus();
	} else {
		if ( !this.searchWidget.getQuery().getValue() ) {
			// Wait until the search panel is visible before setting a default query
			// as this triggers a request and render.
			pageTitle = mw.config.get( 'wgTitle' );
			namespace = mw.config.get( 'wgNamespaceNumber' );
			namespacesWithSubpages = mw.config.get( 'wgVisualEditorConfig' ).namespacesWithSubpages;

			if ( namespacesWithSubpages[ namespace ] ) {
				pageTitle = pageTitle.slice( pageTitle.lastIndexOf( '/' ) + 1 );
			}

			this.searchWidget.getQuery().setValue( pageTitle );
		}

		this.searchWidget.getQuery().focus().select();
	}
	this.updateDialogSize();
};

/**
 * Resize the dialog according to which panel is focused
 */
ve.ui.MWGalleryDialog.prototype.updateDialogSize = function () {
	if ( this.searchPanelVisible && this.indexLayout.currentTabPanelName === 'images' ) {
		this.setSize( 'larger' );
	} else {
		this.setSize( 'large' );
	}
};

/**
 * Toggle the empty gallery message
 *
 * @param {boolean} empty The gallery is empty
 */
ve.ui.MWGalleryDialog.prototype.toggleEmptyGalleryMessage = function ( empty ) {
	if ( empty ) {
		this.$emptyGalleryMessage.removeClass( 'oo-ui-element-hidden' );
	} else {
		this.$emptyGalleryMessage.addClass( 'oo-ui-element-hidden' );
	}
};

/**
 * Disable the "Done" button if the gallery is empty, otherwise enable it
 */
ve.ui.MWGalleryDialog.prototype.updateActions = function () {
	this.actions.setAbilities( { done: this.galleryGroup.items.length > 0 && this.isModified() } );
};

/**
 * Get the current images and options data
 *
 * @return {Object} Images and options data
 */
ve.ui.MWGalleryDialog.prototype.getCurrentData = function () {
	var i, ilen,
		data = {},
		items = this.galleryGroup.items;

	// Get data from options tab panel
	data.caption = this.captionInput.getValue() || undefined;
	data.widths = this.widthsInput.getValue() || undefined;
	data.heights = this.heightsInput.getValue() || undefined;
	data.perrow = this.perrowInput.getValue() || undefined;
	data.showFilename = this.showFilenameCheckbox.isSelected() ? 'yes' : undefined;
	data.classes = this.classesInput.getValue() || undefined;
	data.styles = this.stylesInput.getValue() || undefined;
	if ( this.modeDropdown.getMenu().getSelectedItem() ) {
		data.mode = this.modeDropdown.getMenu().getSelectedItem().getData();
	}

	// Unset mode attribute if it is the same as the default
	data.mode = data.mode === this.defaults.mode ? undefined : data.mode;

	// Get titles and captions from gallery group
	data.extsrc = '';
	if ( this.highlightedItem ) {
		this.highlightedItem.setCaption( this.highlightedCaptionInput.getValue() );
	}
	for ( i = 0, ilen = items.length; i < ilen; i++ ) {
		data.extsrc += '\n' + items[ i ].imageTitle + '|' + items[ i ].caption;
	}
	data.extsrc += '\n';

	return data;
};

/**
 * @inheritdoc
 */
ve.ui.MWGalleryDialog.prototype.updateMwData = function ( mwData ) {
	var data;

	// Parent method
	ve.ui.MWGalleryDialog.super.prototype.updateMwData.call( this, mwData );

	data = this.getCurrentData();

	mwData.body.extsrc = data.extsrc;
	mwData.attrs.mode = data.mode;
	mwData.attrs.caption = data.caption;
	mwData.attrs.widths = data.widths;
	mwData.attrs.heights = data.heights;
	mwData.attrs.perrow = data.perrow;
	mwData.attrs.showfilename = data.showFilename;
	mwData.attrs.class = data.classes;
	mwData.attrs.style = data.styles;
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWGalleryDialog );
