/*!
 * VisualEditor DataModel MWRedirectMetaItem class.
 *
 * @copyright 2011-2013 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * DataModel redirect meta item.
 *
 * @class
 * @extends ve.dm.MetaItem
 * @constructor
 * @param {Object} element Reference to element in meta-linmod
 */
ve.dm.MWRedirectMetaItem = function VeDmMWRedirectMetaItem( element ) {
	// Parent constructor
	ve.dm.MetaItem.call( this, element );
};

/* Inheritance */

OO.inheritClass( ve.dm.MWRedirectMetaItem, ve.dm.MetaItem );

/* Static Properties */

ve.dm.MWRedirectMetaItem.static.name = 'mwRedirect';

ve.dm.MWRedirectMetaItem.static.group = 'mwRedirect';

ve.dm.MWRedirectMetaItem.static.matchTagNames = [ 'link' ];

ve.dm.MWRedirectMetaItem.static.matchRdfaTypes = [ 'mw:PageProp/redirect' ];

ve.dm.MWRedirectMetaItem.static.toDataElement = function ( domElements ) {
	var href = domElements[0].getAttribute( 'href' );
	return {
		'type': this.name,
		'attributes': {
			'href': href
		}
	};
};

ve.dm.MWRedirectMetaItem.static.toDomElements = function ( dataElement, doc ) {
	var meta = doc.createElement( 'link' );
	meta.setAttribute( 'rel', 'mw:PageProp/redirect' );
	meta.setAttribute( 'href', dataElement.attributes.href );
	return [ meta ];
};

/* Registration */

ve.dm.modelRegistry.register( ve.dm.MWRedirectMetaItem );
