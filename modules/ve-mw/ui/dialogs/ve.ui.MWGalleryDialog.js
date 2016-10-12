/*!
 * VisualEditor user interface MWGalleryDialog class.
 *
 * @copyright 2016 VisualEditor Team and others; see AUTHORS.txt
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
	var imagesCard, optionsCard, menuLayout, menuPanel,
		modeField, captionField, widthsField, heightsField,
		perrowField, showFilenameField, classesField, stylesField;

	// Parent method
	ve.ui.MWGalleryDialog.super.prototype.initialize.call( this );

	// States
	this.highlightedItem = null;
	this.searchPanelVisible = false;

	// Default settings
	this.defaults = mw.config.get( 'wgVisualEditorConfig' ).galleryOptions;

	// Images and options cards
	this.indexLayout = new OO.ui.IndexLayout( {
		scrollable: false,
		expanded: true
	} );
	imagesCard = new OO.ui.CardLayout( 'images', {
		label: ve.msg( 'visualeditor-mwgallerydialog-card-images' ),
		expandable: false,
		scrollable: false,
		padded: true
	} );
	optionsCard = new OO.ui.CardLayout( 'options', {
		label: ve.msg( 'visualeditor-mwgallerydialog-card-options' ),
		expandable: false,
		scrollable: false,
		padded: true
	} );

	// Images card

	// General layout
	menuLayout = new OO.ui.MenuLayout();
	menuPanel = new OO.ui.PanelLayout( {
		padded: true,
		expanded: true,
		scrollable: true
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
	this.$highlightedImage = $( '<div>' )
		.addClass( 've-ui-mwGalleryDialog-highlighted-image' );
	// TODO: make into a ve.ui.MWTargetWidget once Parsoid handles galleries
	this.highlightedCaptionInput = new OO.ui.TextInputWidget( {
		placeholder: 'Image caption',
		multiline: true,
		autosize: true
	} );
	this.removeButton = new OO.ui.ButtonWidget( {
		label: ve.msg( 'visualeditor-mwgallerydialog-remove-button-label' ),
		flags: [ 'destructive' ],
		classes: [ 've-ui-mwGalleryDialog-remove-button' ]
	} );

	// Search panel
	this.searchWidget = new ve.ui.MWMediaSearchWidget();

	// Options card

	// Input widgets
	this.modeDropdown = new OO.ui.DropdownWidget( {
		menu: {
			items: [
				new OO.ui.OptionWidget( {
					data: 'traditional',
					label: ve.msg( 'visualeditor-mwgallerydialog-mode-dropdown-label-traditional' )
				} ),
				new OO.ui.OptionWidget( {
					data: 'nolines',
					label: ve.msg( 'visualeditor-mwgallerydialog-mode-dropdown-label-nolines' )
				} ),
				new OO.ui.OptionWidget( {
					data: 'packed',
					label: ve.msg( 'visualeditor-mwgallerydialog-mode-dropdown-label-packed' )
				} ),
				new OO.ui.OptionWidget( {
					data: 'packed-overlay',
					label: ve.msg( 'visualeditor-mwgallerydialog-mode-dropdown-label-packed-overlay' )
				} ),
				new OO.ui.OptionWidget( {
					data: 'packed-hover',
					label: ve.msg( 'visualeditor-mwgallerydialog-mode-dropdown-label-packed-hover' )
				} ),
				new OO.ui.OptionWidget( {
					data: 'slideshow',
					label: ve.msg( 'visualeditor-mwgallerydialog-mode-dropdown-label-slideshow' )
				} )
			]
		}
	} );
	this.captionInput = new OO.ui.TextInputWidget( {
		placeholder: ve.msg( 'visualeditor-mwgallerydialog-caption-input-placeholder' )
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
	menuLayout.$menu.append(
		menuPanel.$element.append(
			this.$emptyGalleryMessage,
			this.galleryGroup.$element,
			this.showSearchPanelButton.$element
		)
	);
	menuLayout.$content.append(
		this.editPanel.$element.append(
			this.$highlightedImage,
			this.highlightedCaptionInput.$element,
			this.removeButton.$element
		),
		this.searchPanel.$element.append(
			this.searchWidget.$element
		)
	);
	imagesCard.$element.append(
		menuLayout.$element
	);
	optionsCard.$element.append(
		modeField.$element,
		captionField.$element,
		widthsField.$element,
		heightsField.$element,
		perrowField.$element,
		showFilenameField.$element,
		classesField.$element,
		stylesField.$element
	);
	this.indexLayout.addCards( [
		imagesCard,
		optionsCard
	] );
	this.$body.append( this.indexLayout.$element );
};

/**
 * @inheritdoc
 */
ve.ui.MWGalleryDialog.prototype.getSetupProcess = function ( data ) {
	return ve.ui.MWGalleryDialog.super.prototype.getSetupProcess.call( this, data )
		.next( function () {
			var titlesString, title, titleText, imageTitles, mode,
				caption, widths, heights, perrow,
				showFilename, classes, styles,
				pageTitle, namespace, namespacesWithSubpages,
				dialog = this,
				attributes = this.selectedNode && this.selectedNode.getAttribute( 'mw' ).attrs;

			// Images card

			// First set the search widget input value to the page title
			pageTitle = mw.config.get( 'wgTitle' );
			namespace = mw.config.get( 'wgNamespaceNumber' );
			namespacesWithSubpages = mw.config.get( 'wgVisualEditorConfig' ).namespacesWithSubpages;

			if ( namespacesWithSubpages[ namespace ] ) {
				pageTitle = pageTitle.slice( pageTitle.lastIndexOf( '/' ) + 1 );
			}

			this.searchWidget.getQuery().setValue( pageTitle );

			// If editing an existing gallery, populate with the images...
			if ( this.selectedNode ) {
				imageTitles = [];
				this.imageData = [];

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
							title = mw.Title.newFromText( matches[ 1 ] );
							// Ignore any invalid titles
							// (which will result in title being null)
							if ( title ) {
								titleText = title.getPrefixedText();
								imageTitles.push( titleText );
								dialog.imageData.push( {
									title: titleText,
									caption: matches[ 3 ]
								} );
							}
						}
					}
				);

				// Populate menu and edit panels
				titlesString = imageTitles.join( '|' );
				this.imagesPromise = this.requestImages( {
					titlesString: titlesString
				} ).done( function () {
					dialog.onHighlightItem();
				} );

			// ...Otherwise show the search panel
			} else {
				this.toggleEmptyGalleryMessage( true );
				this.showSearchPanelButton.toggle( false );
				this.toggleSearchPanel( true );
				this.updateActions();
			}

			// Options card

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

			// Add event handlers
			this.indexLayout.connect( this, { set: 'updateDialogSize' } );
			this.searchWidget.getResults().connect( this, { choose: 'onSearchResultsChoose' } );
			this.showSearchPanelButton.connect( this, { click: 'onShowSearchPanelButtonClick' } );
			this.galleryGroup.connect( this, { editItem: 'onHighlightItem' } );
			this.removeButton.connect( this, { click: 'onRemoveItem' } );
			this.modeDropdown.getMenu().connect( this, { choose: 'onModeDropdownChange' } );

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
			this.galleryGroup.clearItems();
			this.highlightedItem = null;
			this.searchWidget.getQuery().setValue( '' );
			this.searchWidget.teardown();
			this.searchPanelVisible = false;

			// Disconnect events
			this.indexLayout.disconnect( this );
			this.searchWidget.getResults().disconnect( this );
			this.showSearchPanelButton.disconnect( this );
			this.galleryGroup.disconnect( this );
			this.removeButton.disconnect( this );
			this.modeDropdown.disconnect( this );
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWGalleryDialog.prototype.getBodyHeight = function () {
	return 600;
};

/**
 * Request the images for the images card menu
 *
 * @param {Object} options Options for the request
 */
ve.ui.MWGalleryDialog.prototype.requestImages = function ( options ) {
	return new mw.Api().get( {
		action: 'query',
		prop: 'imageinfo',
		iiprop: 'url',
		iiurlwidth: options.width || 200,
		// Matches height of this.$highlightedImage
		iiurlheight: options.height || 200,
		titles: options.titlesString
	} ).done( this.onRequestImagesSuccess.bind( this ) );
};

/**
 * Create items for the returned images and add them to the gallery group
 *
 * @param {Object} deferred jQuery deferred object
 * @param {Object} response jQuery response object
 */
ve.ui.MWGalleryDialog.prototype.onRequestImagesSuccess = function ( deferred, response ) {
	var index,
		thumbUrls = {},
		items = [],
		pages = response.responseJSON.query.pages;

	// Store object of titles to thumbUrls
	for ( index in pages ) {
		if ( pages[ index ].imageinfo ) {
			thumbUrls[ pages[ index ].title ] = pages[ index ].imageinfo[ 0 ].thumburl;
		}
	}

	// Make items for every image in imageData
	this.imageData.forEach( function ( image ) {
		image.thumbUrl = thumbUrls[ image.title ];
		items.push( new ve.ui.MWGalleryItemWidget( image ) );
	} );
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

	// Reset this.imageData, for onRequestImagesSuccess
	this.imageData = [ {
		title: title,
		caption: ''
	} ];

	// Request image
	this.requestImages( {
		titlesString: title
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
 * @param {ve.ui.MWMediaResultWidget} item Chosen item
 */
ve.ui.MWGalleryDialog.prototype.onSearchResultsChoose = function ( item ) {
	this.addNewImage( item.getData().title );
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
	// Unhighlight previous item
	if ( this.highlightedItem ) {
		this.highlightedItem.toggleHighlighted( false );
	}

	// Show edit panel
	this.toggleSearchPanel( false );

	// Highlight new item
	item = item ? item : this.galleryGroup.items[ 0 ];
	item.toggleHighlighted( true );
	this.highlightedItem = item;

	// Populate edit panel
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
		this.searchWidget.getQuery().focus().select();
	}
	this.updateDialogSize();
};

/**
 * Resize the dialog according to which panel is focused
 */
ve.ui.MWGalleryDialog.prototype.updateDialogSize = function () {
	if ( this.searchPanelVisible && this.indexLayout.currentCardName === 'images' ) {
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
	this.actions.setAbilities( { done: this.galleryGroup.items.length > 0 } );
};

/**
 * @inheritdoc
 */
ve.ui.MWGalleryDialog.prototype.updateMwData = function ( mwData ) {
	var i, ilen, mode, caption, widths, heights, perrow,
		showFilename, classes, styles,
		extsrc = '',
		items = this.galleryGroup.items;

	// Parent method
	ve.ui.MWGalleryDialog.super.prototype.updateMwData.call( this, mwData );

	// Get titles and captions from gallery group
	this.highlightedItem.setCaption( this.highlightedCaptionInput.getValue() );
	for ( i = 0, ilen = items.length; i < ilen; i++ ) {
		extsrc += '\n' + items[ i ].imageTitle + '|' + items[ i ].caption;
	}

	// Get data from options card
	mode = this.modeDropdown.getMenu().getSelectedItem().getData();
	caption = this.captionInput.getValue();
	widths = this.widthsInput.getValue();
	heights = this.heightsInput.getValue();
	perrow = this.perrowInput.getValue();
	showFilename = this.showFilenameCheckbox.isSelected();
	classes = this.classesInput.getValue();
	styles = this.stylesInput.getValue();

	// Update extsrc and attributes
	mwData.body.extsrc = extsrc + '\n';
	mwData.attrs.mode = mode || undefined;
	mwData.attrs.caption = caption || undefined;
	mwData.attrs.widths = widths || undefined;
	mwData.attrs.heights = heights || undefined;
	mwData.attrs.perrow = perrow || undefined;
	mwData.attrs.showfilename = showFilename ? 'yes' : undefined;
	mwData.attrs.classes = classes || undefined;
	mwData.attrs.styles = styles || undefined;

	// Unset mode attribute if it is the same as the default
	mwData.attrs.mode = mode === this.defaults.mode ? undefined : mode;
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWGalleryDialog );
