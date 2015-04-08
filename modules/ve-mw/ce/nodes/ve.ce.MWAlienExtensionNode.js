/*!
 * VisualEditor ContentEditable MWAlienExtensionNode class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * ContentEditable MediaWiki alien extension node.
 *
 * @class
 * @extends ve.ce.MWBlockExtensionNode
 *
 * @constructor
 * @param {ve.dm.MWAlienExtensionNode} model Model to observe
 * @param {Object} [config] Configuration options
 */
ve.ce.MWAlienExtensionNode = function VeCeMWAlienExtensionNode( config ) {
	// Parent constructor
	ve.ce.MWAlienExtensionNode.super.apply( this, arguments );

	// Mixin constructors
	OO.ui.IconElement.call( this, config );
};

/* Inheritance */

OO.inheritClass( ve.ce.MWAlienExtensionNode, ve.ce.MWBlockExtensionNode );

OO.mixinClass( ve.ce.MWAlienExtensionNode, OO.ui.IconElement );

/* Static Properties */

ve.ce.MWAlienExtensionNode.static.name = 'mwAlienExtension';

ve.ce.MWAlienExtensionNode.static.primaryCommandName = 'alienExtension';

/* Static Methods */

/**
 * @inheritdoc
 */
ve.ce.MWAlienExtensionNode.static.getDescription = function ( model ) {
	return model.getExtensionName();
};

/* Methods */

/**
 * @inheritdoc
 */
ve.ce.MWAlienExtensionNode.prototype.onSetup = function () {
	ve.ce.MWAlienExtensionNode.super.prototype.onSetup.call( this );

	if ( !this.isVisible() ) {
		this.setIcon( 'alienextension' );
		this.$element.first().prepend( this.$icon );
	} else {
		this.setIcon( null );
	}
};

/**
 * @inheritdoc
 */
ve.ce.MWAlienExtensionNode.prototype.render = function ( generatedContents ) {
	// Since render is trigerred before onSetup, we need to make sure that the
	// icon is detached only when it is defined and is not null
	if ( this.$icon ) {
		this.$icon.detach();
	}
	// Call parent mixin
	ve.ce.GeneratedContentNode.prototype.render.call( this, generatedContents );

	// Since render replaces this.$element with a new node, we need to make sure
	// our iconElement is defined again to be this.$element
	this.$element.addClass( 've-ce-mwAlienExtensionNode' );
};

/* Registration */

ve.ce.nodeFactory.register( ve.ce.MWAlienExtensionNode );
