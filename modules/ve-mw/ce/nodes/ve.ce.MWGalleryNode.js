/*!
 * VisualEditor ContentEditable MWGalleryNode class.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * ContentEditable MediaWiki gallery node.
 *
 * @class
 * @extends ve.ce.BranchNode
 * @mixins ve.ce.FocusableNode
 *
 * @constructor
 * @param {ve.dm.MWGalleryNode} model Model to observe
 * @param {Object} [config] Configuration options
 */
ve.ce.MWGalleryNode = function VeCeMWGalleryNode() {
	// Parent constructor
	ve.ce.MWGalleryNode.super.apply( this, arguments );

	// DOM hierarchy for MWGalleryNode:
	//   <ul> this.$element (gallery mw-gallery-{mode})
	//     <li> ve.ce.MWGalleryCaptionNode (gallerycaption)
	//     <li> ve.ce.MWGalleryImageNode (gallerybox)
	//     <li> ve.ce.MWGalleryImageNode (gallerybox)
	//     ⋮

	// Mixin constructors
	ve.ce.FocusableNode.call( this, this.$element );

	// Events
	this.model.connect( this, { update: 'updateInvisibleIcon' } );
	this.model.connect( this, { update: 'onUpdate' } );

	// Initialization
	this.onUpdate();
};

/* Inheritance */

OO.inheritClass( ve.ce.MWGalleryNode, ve.ce.BranchNode );

OO.mixinClass( ve.ce.MWGalleryNode, ve.ce.FocusableNode );

/* Static Properties */

ve.ce.MWGalleryNode.static.name = 'mwGallery';

ve.ce.MWGalleryNode.static.tagName = 'ul';

ve.ce.MWGalleryNode.static.iconWhenInvisible = 'imageGallery';

ve.ce.MWGalleryNode.static.primaryCommandName = 'gallery';

/* Methods */

/**
 * Handle model update events.
 *
 * @method
 */
ve.ce.MWGalleryNode.prototype.onUpdate = function () {
	var mwAttrs, defaults, mode, imageWidth, imagePadding;

	mwAttrs = this.model.getAttribute( 'mw' ).attrs;
	defaults = mw.config.get( 'wgVisualEditorConfig' ).galleryOptions;
	mode = mwAttrs.mode || defaults.mode;

	this.$element
		.attr( 'class', mwAttrs.class )
		.attr( 'style', mwAttrs.style )
		.addClass( 'gallery mw-gallery-' + mode );

	if ( mwAttrs.perrow && ( mode === 'traditional' || mode === 'nolines' ) ) {
		// Magic 30 and 8 matches the code in ve.ce.MWGalleryImageNode
		imageWidth = parseInt( mwAttrs.widths || defaults.imageWidth );
		imagePadding = ( mode === 'traditional' ? 30 : 0 );
		this.$element.css( 'max-width', mwAttrs.perrow * ( imageWidth + imagePadding + 8 ) );
	}
};

/* Registration */

ve.ce.nodeFactory.register( ve.ce.MWGalleryNode );
