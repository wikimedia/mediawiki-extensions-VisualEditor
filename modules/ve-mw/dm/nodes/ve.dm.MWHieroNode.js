/*!
 * VisualEditor DataModel MWHieroNode class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * DataModel MediaWiki hieroglyphics node.
 *
 * @class
 * @extends ve.dm.MWExtensionNode
 *
 * @constructor
 * @param {Object} [element] Reference to element in linear model
 */
ve.dm.MWHieroNode = function VeDmMWHieroNode() {
	// Parent constructor
	ve.dm.MWExtensionNode.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.dm.MWHieroNode, ve.dm.MWExtensionNode );

/* Static members */

ve.dm.MWHieroNode.static.name = 'mwHiero';

ve.dm.MWHieroNode.static.tagName = 'table';

ve.dm.MWHieroNode.static.extensionName = 'hiero';

/* Registration */

ve.dm.modelRegistry.register( ve.dm.MWHieroNode );
