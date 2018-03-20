/*!
 * VisualEditor ContentEditable MWAlienExtensionNode class.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * ContentEditable MediaWiki alien extension node.
 *
 * @class
 * @abstract
 *
 * @constructor
 */
ve.ce.MWAlienExtensionNode = function VeCeMWAlienExtensionNode() {
};

/* Inheritance */

OO.initClass( ve.ce.MWAlienExtensionNode );

/* Static members */

ve.ce.MWAlienExtensionNode.static.primaryCommandName = 'alienExtension';

ve.ce.MWAlienExtensionNode.static.iconWhenInvisible = 'markup';

ve.ce.MWAlienExtensionNode.static.rendersEmpty = true;

/* Methods */

/* Static methods */

/**
 * @inheritdoc ve.ce.MWExtensionNode
 */
ve.ce.MWAlienExtensionNode.static.getDescription = function ( model ) {
	return model.getExtensionName();
};

/**
 * ContentEditable MediaWiki alien inline extension node.
 *
 * @class
 * @abstract
 * @extends ve.ce.MWInlineExtensionNode
 * @mixins ve.ce.MWAlienExtensionNode
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ce.MWAlienInlineExtensionNode = function VeCeMWAlienInlineExtensionNode( config ) {
	// Parent constructor
	ve.ce.MWAlienInlineExtensionNode.super.apply( this, arguments );

	// Mixin constructors
	ve.ce.MWAlienExtensionNode.call( this, config );
};

/* Inheritance */

OO.inheritClass( ve.ce.MWAlienInlineExtensionNode, ve.ce.MWInlineExtensionNode );

OO.mixinClass( ve.ce.MWAlienInlineExtensionNode, ve.ce.MWAlienExtensionNode );

/* Static members */

ve.ce.MWAlienInlineExtensionNode.static.name = 'mwAlienInlineExtension';

/**
 * ContentEditable MediaWiki alien block extension node.
 *
 * @class
 * @abstract
 * @extends ve.ce.MWBlockExtensionNode
 * @mixins ve.ce.MWAlienExtensionNode
 *
 * @constructor
 * @param {ve.dm.MWAlienBlockExtensionNode} model Model to observe
 * @param {Object} [config] Configuration options
 */
ve.ce.MWAlienBlockExtensionNode = function VeCeMWAlienBlockExtensionNode() {
	// Parent constructor
	ve.ce.MWAlienBlockExtensionNode.super.apply( this, arguments );

	// Mixin constructors
	ve.ce.MWAlienExtensionNode.call( this );
};

/* Inheritance */

OO.inheritClass( ve.ce.MWAlienBlockExtensionNode, ve.ce.MWBlockExtensionNode );

OO.mixinClass( ve.ce.MWAlienBlockExtensionNode, ve.ce.MWAlienExtensionNode );

/* Static members */

ve.ce.MWAlienBlockExtensionNode.static.name = 'mwAlienBlockExtension';

/* Registration */

ve.ce.nodeFactory.register( ve.ce.MWAlienInlineExtensionNode );
ve.ce.nodeFactory.register( ve.ce.MWAlienBlockExtensionNode );
