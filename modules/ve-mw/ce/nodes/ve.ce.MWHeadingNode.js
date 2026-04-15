/*!
 * VisualEditor ContentEditable MWHeadingNode class.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * ContentEditable MW heading node.
 *
 * @class
 * @extends ve.ce.HeadingNode
 * @constructor
 * @param {ve.dm.MWHeadingNode} model Model to observe
 * @param {Object} [config] Configuration options
 */
ve.ce.MWHeadingNode = function VeCeMWHeadingNode() {
	// Parent constructor
	ve.ce.MWHeadingNode.super.apply( this, arguments );

	this.updateClasses();
};

/* Inheritance */

OO.inheritClass( ve.ce.MWHeadingNode, ve.ce.HeadingNode );

/* Static Properties */

ve.ce.MWHeadingNode.static.name = 'mwHeading';

/* Methods */

ve.ce.MWHeadingNode.prototype.onUpdate = function () {
	// Parent method
	ve.ce.MWHeadingNode.super.prototype.onUpdate.call( this );

	this.updateClasses();
};

/**
 * Update CSS classes form model state
 */
ve.ce.MWHeadingNode.prototype.updateClasses = function () {
	// Add the section wrapper class to the heading itself
	// so that the correct padding is applied.
	// This currently only affects Minerva
	// eslint-disable-next-line mediawiki/class-doc
	this.$element
		.removeClass( [
			'mw-heading1',
			'mw-heading2',
			'mw-heading3',
			'mw-heading4',
			'mw-heading5',
			'mw-heading6'
		] )
		.addClass( 'mw-heading mw-heading' + this.model.getAttribute( 'level' ) );
};

/* Registration */

ve.ce.nodeFactory.register( ve.ce.MWHeadingNode );
