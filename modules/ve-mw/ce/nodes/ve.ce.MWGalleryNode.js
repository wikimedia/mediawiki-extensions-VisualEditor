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
 * @extends ve.ce.MWBlockExtensionNode
 *
 * @constructor
 * @param {ve.dm.MWGalleryNode} model Model to observe
 * @param {Object} [config] Configuration options
 */
ve.ce.MWGalleryNode = function VeCeMWGalleryNode() {
	// Parent constructor
	ve.ce.MWGalleryNode.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.ce.MWGalleryNode, ve.ce.MWBlockExtensionNode );

/* Static Properties */

ve.ce.MWGalleryNode.static.name = 'mwGallery';

ve.ce.MWGalleryNode.static.tagName = 'div';

ve.ce.MWGalleryNode.static.primaryCommandName = 'gallery';

/* Methods */

/**
 * @inheritdoc ve.ce.GeneratedContentNode
 */
ve.ce.MWGalleryNode.prototype.getFocusableElement = function () {
	var $gallery = this.$element.find( '.gallery' ).addBack( '.gallery' ).children();
	return $gallery.length ? $gallery : this.$element;
};

/**
 * @inheritdoc ve.ce.GeneratedContentNode
 * @method
 */
ve.ce.MWGalleryNode.prototype.getBoundingElement = ve.ce.MWGalleryNode.prototype.getFocusableElement;

/* Registration */

ve.ce.nodeFactory.register( ve.ce.MWGalleryNode );
