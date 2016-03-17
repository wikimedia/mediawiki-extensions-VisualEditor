/*!
 * VisualEditor DataModel MWExternalLinkAnnotation class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * DataModel MediaWiki external link annotation.
 *
 * Example HTML sources:
 *
 *     <a rel="mw:ExtLink">
 *     <a rel="mw:ExtLink/Numbered">
 *
 * Each example is semantically slightly different, but they don't need special treatment (yet).
 *
 * @class
 * @extends ve.dm.LinkAnnotation
 * @constructor
 * @param {Object} element
 */
ve.dm.MWExternalLinkAnnotation = function VeDmMWExternalLinkAnnotation( element ) {
	// Parent constructor
	ve.dm.LinkAnnotation.call( this, element );
};

/* Inheritance */

OO.inheritClass( ve.dm.MWExternalLinkAnnotation, ve.dm.LinkAnnotation );

/* Static Properties */

ve.dm.MWExternalLinkAnnotation.static.name = 'link/mwExternal';

ve.dm.MWExternalLinkAnnotation.static.matchFunction = function ( domElement ) {
	var rel = domElement.getAttribute( 'rel' );
	// Match explicity mw:ExtLink, or plain RDFa-less links (e.g. from external paste)
	return !rel || rel === 'mw:ExtLink';
};

ve.dm.MWExternalLinkAnnotation.static.toDataElement = function ( domElements ) {
	// Parent method
	var dataElement = ve.dm.MWExternalLinkAnnotation.super.static.toDataElement.apply( this, arguments );

	dataElement.attributes.rel = domElements[ 0 ].getAttribute( 'rel' );
	return dataElement;
};

ve.dm.MWExternalLinkAnnotation.static.toDomElements = function ( dataElement ) {
	// Parent method
	var domElements = ve.dm.MWExternalLinkAnnotation.super.static.toDomElements.apply( this, arguments );

	domElements[ 0 ].setAttribute( 'rel', dataElement.attributes.rel || 'mw:ExtLink' );
	return domElements;
};

/* Methods */

/**
 * @return {Object}
 */
ve.dm.MWExternalLinkAnnotation.prototype.getComparableObject = function () {
	return {
		type: this.getType(),
		href: this.getAttribute( 'href' ),
		rel: this.getAttribute( 'rel' ) || 'mw:ExtLink'
	};
};

/**
 * @inheritdoc
 */
ve.dm.MWExternalLinkAnnotation.prototype.getComparableHtmlAttributes = function () {
	// Assume that wikitext never adds meaningful html attributes for comparison purposes,
	// although ideally this should be decided by Parsoid (Bug T95028).
	return {};
};

/* Registration */

ve.dm.modelRegistry.register( ve.dm.MWExternalLinkAnnotation );
