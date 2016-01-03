/*!
 * VisualEditor DataModel MWSignatureNode class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * DataModel MediaWiki signature node. This defines the behavior of the data model for the
 * signature, especially the fact that it needs to be converted into a wikitext signature on
 * save.
 *
 * @class
 * @extends ve.dm.MWTransclusionInlineNode
 *
 * @constructor
 * @param {Object} [element] Reference to element in linear model
 */
ve.dm.MWSignatureNode = function VeDmMWSignatureNode( element ) {
	// Parent constructor
	ve.dm.MWTransclusionInlineNode.call( this, element );
};

/* Inheritance */

OO.inheritClass( ve.dm.MWSignatureNode, ve.dm.MWTransclusionInlineNode );

/* Static members */

ve.dm.MWSignatureNode.static.name = 'mwSignature';

ve.dm.MWSignatureNode.static.matchTagNames = null;

ve.dm.MWSignatureNode.static.matchRdfaTypes = [];

ve.dm.MWSignatureNode.static.matchFunction = function () {
	return false;
};

ve.dm.MWSignatureNode.static.getHashObject = function ( dataElement ) {
	return {
		type: dataElement.type
	};
};

ve.dm.MWSignatureNode.static.toDomElements = function ( dataElement, doc, converter ) {
	dataElement = ve.dm.MWSignatureNode.static.toDataElement();
	return ve.dm.MWSignatureNode.parent.static.toDomElements( dataElement, doc, converter );
};

ve.dm.MWSignatureNode.static.toDataElement = function () {
	return {
		type: 'mwTransclusionInline',
		attributes: {
			mw: {
				parts: [ '~~~~' ]
			}
		}
	};
};

/* Methods */

ve.dm.MWSignatureNode.prototype.getPartsList = function () {
	return [ { content: '~~~~' } ];
};

/* Registration */

ve.dm.modelRegistry.register( ve.dm.MWSignatureNode );
