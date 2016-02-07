/*!
 * VisualEditor DataModel MWExtensionNode class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * DataModel MediaWiki extension node.
 *
 * @class
 * @abstract
 * @extends ve.dm.LeafNode
 * @mixins ve.dm.FocusableNode
 * @mixins ve.dm.GeneratedContentNode
 *
 * @constructor
 */
ve.dm.MWExtensionNode = function VeDmMWExtensionNode() {
	// Parent constructor
	ve.dm.MWExtensionNode.super.apply( this, arguments );

	// Mixin constructors
	ve.dm.GeneratedContentNode.call( this );
	ve.dm.FocusableNode.call( this );
};

/* Inheritance */

OO.inheritClass( ve.dm.MWExtensionNode, ve.dm.LeafNode );
OO.mixinClass( ve.dm.MWExtensionNode, ve.dm.FocusableNode );
OO.mixinClass( ve.dm.MWExtensionNode, ve.dm.GeneratedContentNode );

/* Static members */

ve.dm.MWExtensionNode.static.enableAboutGrouping = true;

ve.dm.MWExtensionNode.static.matchTagNames = null;

ve.dm.MWExtensionNode.static.childNodeTypes = [];

/**
 * HTML tag name.
 * @static
 * @property {string}
 * @inheritable
 */
ve.dm.MWExtensionNode.static.tagName = null;

/**
 * Name of the extension and the parser tag name.
 * @static
 * @property {string}
 * @inheritable
 */
ve.dm.MWExtensionNode.static.extensionName = null;

ve.dm.MWExtensionNode.static.getMatchRdfaTypes = function () {
	return [ 'mw:Extension/' + this.extensionName ];
};

ve.dm.MWExtensionNode.static.toDataElement = function ( domElements, converter ) {
	var dataElement,
		mwDataJSON = domElements[ 0 ].getAttribute( 'data-mw' ),
		mwData = mwDataJSON ? JSON.parse( mwDataJSON ) : {};

	dataElement = {
		type: this.name,
		attributes: {
			mw: mwData,
			originalMw: mwDataJSON
		}
	};

	this.storeGeneratedContents( dataElement, domElements, converter.getStore() );

	return dataElement;
};

/** */
ve.dm.MWExtensionNode.static.cloneElement = function () {
	// TODO: This is the same as ve.dm.MWTransclusionnode.static.cloneElement, find a way
	// to de-duplicate this method.
	var i, len,
		// Parent method
		clone = ve.dm.MWExtensionNode.super.static.cloneElement.apply( this, arguments );

	delete clone.attributes.originalMw;
	// Remove about attribute to prevent about grouping of duplicated transclusions
	if ( clone.originalDomElements ) {
		for ( i = 0, len = clone.originalDomElements.length; i < len; i++ ) {
			clone.originalDomElements[ i ].removeAttribute( 'about' );
		}
	}
	return clone;
};

ve.dm.MWExtensionNode.static.toDomElements = function ( dataElement, doc, converter ) {
	var el, els, index,
		store = converter.getStore(),
		originalMw = dataElement.attributes.originalMw;

	// If the transclusion is unchanged just send back the
	// original DOM elements so selser can skip over it
	if (
		( originalMw && ve.compare( dataElement.attributes.mw, JSON.parse( originalMw ) ) )
	) {
		// originalDomElements is also used for CE rendering so return a copy
		els = ve.copyDomElements( dataElement.originalDomElements, doc );
	} else {
		if (
			converter.isForClipboard() &&
			// Use getHashObjectForRendering to get the rendering from the store
			( index = store.indexOfHash( OO.getHash( [ this.getHashObjectForRendering( dataElement ), undefined ] ) ) ) !== null
		) {
			// For the clipboard use the current DOM contents so the user has something
			// meaningful to paste into external applications
			els = ve.copyDomElements( store.value( index ), doc );
		} else {
			el = doc.createElement( this.tagName );
			el.setAttribute( 'typeof', 'mw:Extension/' + this.getExtensionName( dataElement ) );
			el.setAttribute( 'data-mw', JSON.stringify( dataElement.attributes.mw ) );
			els = [ el ];
		}
	}
	if ( converter.isForClipboard() ) {
		// Resolve attributes
		ve.resolveAttributes( $( els ), doc, ve.dm.Converter.static.computedAttributes );
	}
	return els;
};

ve.dm.MWExtensionNode.static.getHashObject = function ( dataElement ) {
	return {
		type: dataElement.type,
		mw: ve.copy( dataElement.attributes.mw )
	};
};

/**
 * Get the extension's name
 *
 * Static version for toDomElements
 *
 * @static
 * @param {Object} dataElement Data element
 * @return {string} Extension name
 */
ve.dm.MWExtensionNode.static.getExtensionName = function () {
	return this.extensionName;
};

/* Methods */

/**
 * Get the extension's name
 *
 * @method
 * @return {string} Extension name
 */
ve.dm.MWExtensionNode.prototype.getExtensionName = function () {
	return this.constructor.static.getExtensionName( this.element );
};

/**
 * DataModel MediaWiki inline extension node.
 *
 * @class
 * @abstract
 * @extends ve.dm.MWExtensionNode
 *
 * @constructor
 * @param {Object} [element] Reference to element in linear model
 */
ve.dm.MWInlineExtensionNode = function VeDmMWInlineExtensionNode() {
	// Parent constructor
	ve.dm.MWInlineExtensionNode.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.dm.MWInlineExtensionNode, ve.dm.MWExtensionNode );

/* Static members */

ve.dm.MWInlineExtensionNode.static.isContent = true;

/**
 * DataModel MediaWiki block extension node.
 *
 * @class
 * @abstract
 * @extends ve.dm.MWExtensionNode
 *
 * @constructor
 * @param {Object} [element] Reference to element in linear model
 * @param {ve.dm.Node[]} [children]
 */
ve.dm.MWBlockExtensionNode = function VeDmMWBlockExtensionNode() {
	// Parent constructor
	ve.dm.MWBlockExtensionNode.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.dm.MWBlockExtensionNode, ve.dm.MWExtensionNode );
