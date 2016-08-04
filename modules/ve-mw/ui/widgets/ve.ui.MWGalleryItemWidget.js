/*!
 * VisualEditor user interface MWGalleryItemWidget class.
 *
 * @copyright 2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Draggable item widget for the MWGalleryGroupWidget
 *
 * @class
 * @extends OO.ui.Widget
 * @mixins OO.ui.mixin.DraggableElement
 *
 * @constructor
 * @param {Object} imageInfo Image information object
 * @param {Object} [config] Configuration options
 */
ve.ui.MWGalleryItemWidget = function VeUiMWGalleryItemWidget( imageInfo, config ) {
	this.imageTitle = imageInfo.title;
	this.thumbUrl = imageInfo.thumbUrl;
	this.caption = imageInfo.caption;
	this.highlighted = false;

	// Configuration initialization
	config = config || {};

	// Parent constructor
	ve.ui.MWGalleryItemWidget.super.call( this, config );

	this.$element
		.addClass( 've-ui-mwGalleryDialog-image-container' ) // TODO: put in new CSS file?
		.css( 'background-image', 'url(' + this.thumbUrl + ')' );

	// Mixin constructors
	OO.ui.mixin.DraggableElement.call( this, ve.extendObject( { $handle: this.$element }, this.config ) );
	OO.ui.mixin.TabIndexedElement.call( this, config );

	this.$element.on( {
		click: this.onItemClick.bind( this ),
		keypress: this.onItemKeyPress.bind( this )
	} );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWGalleryItemWidget, OO.ui.Widget );

OO.mixinClass( ve.ui.MWGalleryItemWidget, OO.ui.mixin.DraggableElement );
OO.mixinClass( ve.ui.MWGalleryItemWidget, OO.ui.mixin.TabIndexedElement );

/* Events */

/**
 * @event edit
 */

/* Methods */

/**
 * Handle clicking on an item
 */
ve.ui.MWGalleryItemWidget.prototype.onItemClick = function () {
	this.emit( 'edit', this );
};

/**
 * Handle key press events
 *
 * @param {jQuery.Event} e Key press event
 */
ve.ui.MWGalleryItemWidget.prototype.onItemKeyPress = function ( e ) {
	if ( e.which === OO.ui.Keys.ENTER ) {
		this.emit( 'edit', this );
		return false;
	}
};

/**
 * Set the caption property
 *
 * @param {string} caption The caption
 */
ve.ui.MWGalleryItemWidget.prototype.setCaption = function ( caption ) {
	this.caption = caption;
};

/**
 * Toggle highlighted class
 *
 * @param {boolean} highlighted The item is highlighted
 */
ve.ui.MWGalleryItemWidget.prototype.toggleHighlighted = function ( highlighted ) {
	highlighted = highlighted !== undefined ? highlighted : !this.highlighted;
	this.$element.toggleClass( 've-ui-mwGalleryDialog-image-container-highlighted', !!highlighted );
};
