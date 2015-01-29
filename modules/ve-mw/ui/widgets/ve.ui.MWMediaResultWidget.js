/*!
 * VisualEditor UserInterface MWMediaResultWidget class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Creates an ve.ui.MWMediaResultWidget object.
 *
 * @class
 * @extends OO.ui.OptionWidget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @cfg {number} [size] Media thumbnail size
 */
ve.ui.MWMediaResultWidget = function VeUiMWMediaResultWidget( config ) {
	// Configuration initialization
	config = config || {};

	// Parent constructor
	OO.ui.OptionWidget.call( this, config );

	// Properties
	this.initialSize = config.size || 150;
	this.maxSize = config.maxSize || this.initialSize * 2;
	this.expanded = false;
	this.dimensions = {};
	this.$thumb = this.buildThumbnail();
	this.$overlay = this.$( '<div>' );
	this.row = null;
	// Store the thumbnail url
	this.thumbUrl = ve.getProp( this.data.imageinfo, 0, 'thumburl' );

	// Get wiki default thumbnail size
	this.defaultThumbSize = mw.config.get( 'wgVisualEditorConfig' )
		.defaultUserOptions.defaultthumbsize;

	// Initialization
	this.setLabel( new mw.Title( this.data.title ).getNameText() );
	this.$label.addClass( 've-ui-mwMediaResultWidget-nameLabel' );
	this.$overlay.addClass( 've-ui-mwMediaResultWidget-overlay' );

	this.$element
		.addClass( 've-ui-mwMediaResultWidget ve-ui-texture-pending' )
		.prepend( this.$thumb, this.$overlay );

	// Adjust wrapper padding
	this.$element.css( $.extend( this.dimensions, this.calculateWrapperPadding( this.dimensions, this.initialSize ) ) );

	// Select button
	this.selectButton = new OO.ui.ButtonWidget( {
		$: this.$,
		label: ve.msg( 'visualeditor-dialog-media-searchselect' ),
		icon: 'check'
	} );
	this.selectButton.toggle( false );
	this.$element.prepend( this.selectButton.$element );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWMediaResultWidget, OO.ui.OptionWidget );

/* Methods */
/** */
ve.ui.MWMediaResultWidget.prototype.onThumbnailLoad = function () {
	this.$thumb.first().addClass( 've-ui-texture-transparency' );
	this.$element
		.addClass( 've-ui-mwMediaResultWidget-done' )
		.removeClass( 've-ui-texture-pending' );
};

/** */
ve.ui.MWMediaResultWidget.prototype.onThumbnailError = function () {
	this.$thumb.last()
		.css( 'background-image', '' )
		.addClass( 've-ui-texture-alert' );
	this.$element
		.addClass( 've-ui-mwMediaResultWidget-error' )
		.removeClass( 've-ui-texture-pending' );
};

/**
 * Build a thumbnail.
 *
 * @method
 * @returns {jQuery} Thumbnail element
 */
ve.ui.MWMediaResultWidget.prototype.buildThumbnail = function () {
	var imageDimensions,
		info = this.data.imageinfo[0],
		$thumb = this.$( '<img>' );

	// Preload image
	$thumb
		.addClass( 've-ui-mwMediaResultWidget-thumbnail' )
		.on( {
			load: this.onThumbnailLoad.bind( this ),
			error: this.onThumbnailError.bind( this )
		} );

	if ( info.mediatype === 'AUDIO' ) {
		// HACK: We are getting the wrong information from the
		// API about audio files. Set their thumbnail to square
		imageDimensions = {
			width: this.initialSize,
			height: this.initialSize
		};
	} else {
		if ( info.height < this.initialSize && info.width < this.maxSize ) {
			// Define dimensions with original size
			imageDimensions = {
				width: info.width,
				height: info.height
			};
		} else {
			// Resize dimensions to be a fixed height
			imageDimensions = ve.dm.Scalable.static.getDimensionsFromValue(
				{ height: this.initialSize },
				info.thumbwidth / info.thumbheight
			);
		}
	}
	// Resize the wrapper
	this.dimensions = this.calculateThumbDimensions( imageDimensions );

	// Resize the image
	$thumb.css( this.dimensions );

	return $thumb;
};

/**
 * Replace the empty .src attribute of the image with the
 * actual src.
 */
ve.ui.MWMediaResultWidget.prototype.lazyLoad = function () {
	this.$thumb.attr( 'src', this.thumbUrl );
};

/**
 * Retrieve the store dimensions object
 * @return {Object} Thumb dimensions
 */
ve.ui.MWMediaResultWidget.prototype.getDimensions = function () {
	return this.dimensions;
};

/**
 * Resize thumbnail and element according to the resize factor
 * @param {number} resizeFactor New resizing factor, multiplying the
 *  current dimensions of the thumbnail
 */
ve.ui.MWMediaResultWidget.prototype.resizeThumb = function ( resizeFactor ) {
	var wrapperCss, imageDimensions,
		currWidth = this.$thumb.width(),
		currHeight = this.$thumb.height();

	imageDimensions = {
		width: currWidth * resizeFactor,
		height: currHeight * resizeFactor
	};
	// Resize thumb wrapper
	this.$thumb.css( imageDimensions );
	// Adjust wrapper padding - this is done so the image is placed in the center
	wrapperCss = $.extend( imageDimensions, this.calculateWrapperPadding( imageDimensions, imageDimensions.height ) );
	this.$element.css( wrapperCss );
};

/**
 * Calculate thumbnail dimensions
 * @param {Object} imageDimensions Image dimensions
 * @return {Object} Thumbnail dimensions
 */
ve.ui.MWMediaResultWidget.prototype.calculateThumbDimensions = function ( imageDimensions ) {
	var dimensions,
		maxWidth = this.maxSize,
		ratio = imageDimensions.width / imageDimensions.height;
	// Rules of resizing:
	// (1) Images must have height = this.initialSize
	// (2) If after resize image width is larger than maxWidth
	//   the image is scaled down to width = 3*this.width
	// (3) Smaller images do not scale up
	//     * If image height < this.initialSize, add padding and center
	//       the image vertically
	//     * If image width < this.initialSize, add a fixed padding to both
	//       sides.
	//     This is done in 'calculateWrapperPadding'
	// First scale all images based on height = this.initialSize
	dimensions = ve.dm.MWImageNode.static.resizeToBoundingBox(
		// Image thumb size
		imageDimensions,
		// Bounding box
		{
			width: maxWidth,
			height: this.initialSize
		}
	);

	// Check if image width is larger than maxWidth
	if ( dimensions.width > maxWidth ) {
		// Resize again to fit maxWidth
		dimensions = ve.dm.Scalable.static.getDimensionsFromValue( { width: maxWidth }, ratio );
	}

	return dimensions;
};

/**
 * Adjust the wrapper padding for small images
 * @param {Object} thumbDimensions Thumbnail dimensions
 * @return {Object} Left and right padding
 */
ve.ui.MWMediaResultWidget.prototype.calculateWrapperPadding = function ( thumbDimensions, rowHeight ) {
	var padding,
		minWidthRatioForPadding = 2 / 3 * rowHeight,
		paddingWidth = {},
		paddingHeight = {},
		minWidth = 0.5 * rowHeight;

	// Check if the image fits the row height
	if ( thumbDimensions.height < rowHeight ) {
		// Set up top/bottom padding
		paddingHeight = {
			'padding-top': ( rowHeight - thumbDimensions.height ) / 2,
			'padding-bottom': ( rowHeight - thumbDimensions.height ) / 2
		};
	}

	// Check if the image is too thin so we can make a bit of space around it
	if ( thumbDimensions.width < minWidth ) {
		// Make the padding so that the total width is a 1/3 of the line height
		padding = rowHeight - minWidthRatioForPadding - thumbDimensions.width;
		paddingWidth = {
			'padding-left': padding / 2,
			'padding-right': padding / 2
		};
	}

	return $.extend( {}, paddingWidth, paddingHeight );
};

/**
 * Set the row this result is in.
 * @param {number} row Row number
 */
ve.ui.MWMediaResultWidget.prototype.setRow = function ( row ) {
	this.row = row;
};

/**
 * Get the row this result is in.
 * @return {number} row Row number
 */
ve.ui.MWMediaResultWidget.prototype.getRow = function () {
	return this.row;
};

/**
 * Check if the image has a src attribute already
 * @returns {boolean} Thumbnail has its source attribute set
 */
ve.ui.MWMediaResultWidget.prototype.hasSrc = function () {
	return !!this.$thumb.attr( 'src' );
};
