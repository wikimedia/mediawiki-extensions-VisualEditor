/*!
 * VisualEditor DataModel MWFlaggedMetaItem class.
 *
 * @copyright 2011-2017 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * DataModel flagged meta item abstract (for pairs of meta items).
 *
 * @class
 * @abstract
 * @extends ve.dm.MetaItem
 * @constructor
 * @param {Object} [element] Reference to element in meta-linmod
 */
ve.dm.MWFlaggedMetaItem = function VeDmMWFlaggedMetaItem() {
	// Parent constructor
	ve.dm.MWFlaggedMetaItem.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.dm.MWFlaggedMetaItem, ve.dm.MetaItem );

/* Static Properties */

/* No name/group/matchRdfaTypes, as this is not a valid meta item, just an abstract class. */

ve.dm.MWFlaggedMetaItem.static.matchTagNames = [ 'meta' ];

ve.dm.MWFlaggedMetaItem.static.toDataElement = function ( domElements ) {
	var type = domElements[ 0 ].getAttribute( 'property' );

	if ( !type || this.matchRdfaTypes.indexOf( type ) === -1 ) {
		// Fallback to first match if somehow unset
		type = this.matchRdfaTypes[ 0 ];
	}

	return { type: this.name, attributes: { type: type } };
};

ve.dm.MWFlaggedMetaItem.static.toDomElements = function ( dataElement, doc ) {
	var meta = doc.createElement( 'meta' ),
		type = OO.getProp( dataElement, 'attributes', 'property' );

	if ( !type || this.matchRdfaTypes.indexOf( type ) === -1 ) {
		// Fallback to first item if somehow unset
		type = this.matchRdfaTypes[ 0 ];
	}

	meta.setAttribute( 'property', type );

	return [ meta ];
};

/* No registration, as this is not a valid meta item, just an abstract class. */
