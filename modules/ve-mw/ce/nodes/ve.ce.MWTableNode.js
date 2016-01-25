/*!
 * VisualEditor ContentEditable MWTableNode class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * ContentEditable MW table node.
 *
 * @class
 * @extends ve.ce.TableNode
 * @mixins ve.ce.ClassAttributeNode
 *
 * @constructor
 * @param {ve.dm.MWTableNode} model Model to observe
 * @param {Object} [config] Configuration options
 */
ve.ce.MWTableNode = function VeCeMWTableNode() {
	// Parent constructor
	ve.ce.MWTableNode.super.apply( this, arguments );

	// Mixin constructors
	ve.ce.ClassAttributeNode.call( this );
};

/* Inheritance */

OO.inheritClass( ve.ce.MWTableNode, ve.ce.TableNode );

OO.mixinClass( ve.ce.MWTableNode, ve.ce.ClassAttributeNode );

/* Static Properties */

ve.ce.MWTableNode.static.name = 'mwTable';

/* Registration */

ve.ce.nodeFactory.register( ve.ce.MWTableNode );
