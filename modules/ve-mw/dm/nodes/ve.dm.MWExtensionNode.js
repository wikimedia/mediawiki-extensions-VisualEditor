/*!
 * VisualEditor DataModel MWExtensionNode class.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * DataModel MediaWiki extension node.
 *
 * @class
 * @abstract
 * @extends ve.dm.LeafNode
 * @mixes ve.dm.FocusableNode
 * @mixes ve.dm.GeneratedContentNode
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
 *
 * @static
 * @property {string}
 * @inheritable
 */
ve.dm.MWExtensionNode.static.tagName = null;

/**
 * Name of the MediaWiki parser extension tag. (Not related to the name of the MediaWiki extension.)
 *
 * @static
 * @property {string}
 * @inheritable
 */
ve.dm.MWExtensionNode.static.extensionName = null;

ve.dm.MWExtensionNode.static.getMatchRdfaTypes = function () {
	return [ 'mw:Extension/' + this.extensionName ];
};

/**
 * @inheritdoc
 * @param {Node[]} domElements
 * @param {ve.dm.ModelFromDomConverter} converter
 * @param {string} [type] Type to give dataElement, defaults to static.name
 */
ve.dm.MWExtensionNode.static.toDataElement = function ( domElements, converter, type ) {
	const mwDataJSON = domElements[ 0 ].getAttribute( 'data-mw' ),
		mwData = mwDataJSON ? JSON.parse( mwDataJSON ) : {};

	const dataElement = {
		type: type || this.name,
		attributes: {
			mw: mwData,
			originalMw: mwDataJSON
		}
	};

	this.storeGeneratedContents( dataElement, domElements, converter.getStore() );
	// Sub-classes should not modify dataElement beyond this point as it will invalidate the cache

	return dataElement;
};

/**
 * @inheritdoc ve.dm.Node
 */
ve.dm.MWExtensionNode.static.cloneElement = function () {
	// Parent method
	const clone = ve.dm.MWExtensionNode.super.static.cloneElement.apply( this, arguments );
	delete clone.attributes.originalMw;
	return clone;
};

ve.dm.MWExtensionNode.static.toDomElements = function ( dataElement, doc, converter ) {
	const originalMw = dataElement.attributes.originalMw;

	let els;
	// If the transclusion is unchanged just send back the
	// original DOM elements so selser can skip over it
	if (
		dataElement.originalDomElementsHash &&
		originalMw && ve.compare( dataElement.attributes.mw, JSON.parse( originalMw ) )
	) {
		// originalDomElements is also used for CE rendering so return a copy
		els = ve.copyDomElements( converter.getStore().value( dataElement.originalDomElementsHash ), doc );
	} else {
		const store = converter.getStore();
		let value;
		if (
			converter.doesModeNeedRendering() &&
			// Use getHashObjectForRendering to get the rendering from the store
			( value = store.value( store.hashOfValue( null, OO.getHash( [ this.getHashObjectForRendering( dataElement ), undefined ] ) ) ) )
		) {
			// For the clipboard use the current DOM contents so the user has something
			// meaningful to paste into external applications
			els = ve.copyDomElements( value, doc );
		} else {
			const el = doc.createElement( this.tagName );
			el.setAttribute( 'typeof', 'mw:Extension/' + this.getExtensionName( dataElement ) );
			el.setAttribute( 'data-mw', JSON.stringify( dataElement.attributes.mw ) );
			els = [ el ];
		}
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
 * Get name of the MediaWiki parser extension tag.
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

ve.dm.MWExtensionNode.static.describeChanges = function ( attributeChanges, attributes, element ) {
	const descriptions = [],
		fromBody = attributeChanges.mw.from.body,
		toBody = attributeChanges.mw.to.body;

	if ( attributeChanges.mw ) {
		// HACK: Try to generate an '<Extension> has changed' message using the associated tool's title
		const tools = ve.ui.toolFactory.getRelatedItems( [ ve.dm.nodeFactory.createFromElement( element ) ] );
		if ( tools.length ) {
			descriptions.push( ve.msg( 'visualeditor-changedesc-unknown',
				OO.ui.resolveMsg( ve.ui.toolFactory.lookup( tools[ 0 ].name ).static.title )
			) );
		}
		// Compare body - default behaviour in #describeChange does nothing
		if ( !ve.compare( fromBody, toBody ) ) {
			const change = this.describeChange( 'body', {
				from: fromBody && fromBody.extsrc,
				to: toBody && toBody.extsrc
			} );
			if ( change ) {
				descriptions.push( change );
			}
		}
		// Append attribute changes
		// Parent method
		descriptions.push( ...ve.dm.MWExtensionNode.super.static.describeChanges.call(
			this,
			ve.ui.DiffElement.static.compareAttributes( attributeChanges.mw.from.attrs || {}, attributeChanges.mw.to.attrs || {} ),
			attributes
		) );
		return descriptions;
	}
	// 'mw' should be the only attribute that changes...
	return [];
};

ve.dm.MWExtensionNode.static.describeChange = function ( key, change ) {
	if ( key === 'body' ) {
		if ( change.from && change.to ) {
			const store = new ve.dm.HashValueStore();
			const linearDiffer = new ve.DiffMatchPatch( store, store );
			const trimNewlines = /^\n+|\n+$/g;
			const linearDiff = linearDiffer.getCleanDiff(
				change.from.replace( trimNewlines, '' ).split( '' ),
				change.to.replace( trimNewlines, '' ).split( '' ),
				{ keepOldText: false }
			);
			const div = document.createElement( 'div' );
			linearDiff.forEach( ( diffSection, i ) => {
				const [ type, data ] = diffSection;
				const text = data.join( '' );
				let el, nodeText;
				switch ( type ) {
					case ve.DiffMatchPatch.static.DIFF_DELETE:
						el = document.createElement( 'del' );
						nodeText = text;
						break;
					case ve.DiffMatchPatch.static.DIFF_INSERT:
						el = document.createElement( 'ins' );
						nodeText = text;
						break;
					case ve.DiffMatchPatch.static.DIFF_EQUAL: {
						el = document.createElement( 'span' );
						const lines = text.split( '\n' );
						const filteredLines = [];
						if ( lines.length === 1 ) {
							nodeText = text;
						} else {
							if ( i !== 0 ) {
								filteredLines.push( lines[ 0 ] );
							}
							if ( lines.length > 2 ) {
								filteredLines.push( '…' );
							}
							if ( i !== linearDiff.length - 1 ) {
								filteredLines.push( lines[ lines.length - 1 ] );
							}
							nodeText = filteredLines.join( '\n' );
						}
						break;
					}
				}
				el.appendChild( document.createTextNode( nodeText ) );
				div.appendChild( el );
			} );
			return [ div ];
		}
		return null;
	}
	// Parent method
	return ve.dm.MWExtensionNode.super.static.describeChange.apply( this, arguments );
};

/* Methods */

/**
 * Get name of the MediaWiki parser extension tag.
 *
 * @return {string} Extension name
 */
ve.dm.MWExtensionNode.prototype.getExtensionName = function () {
	return this.constructor.static.getExtensionName( this.element );
};
