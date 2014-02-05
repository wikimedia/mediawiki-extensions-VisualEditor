/*!
 * VisualEditor DataModel MWImageNode class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/*global mw */

/**
 * DataModel generated content node.
 *
 * @class
 * @abstract
 * @extends ve.dm.GeneratedContentNode
 * @constructor
 * @param {number} [length] Length of content data in document; ignored and overridden to 0
 * @param {Object} [element] Reference to element in linear model
 */
ve.dm.MWImageNode = function VeDmMWImageNode() {
	// Parent constructor
	ve.dm.GeneratedContentNode.call( this );
};

/* Inheritance */

OO.inheritClass( ve.dm.MWImageNode, ve.dm.GeneratedContentNode );

/* Methods */

/**
 * Get the original size of the media object from the API, if it exists
 *
 * @returns {jQuery.Promise} Promise which resolves with a width, height and mediatype object
 */
ve.dm.MWImageNode.prototype.getImageInfo = function () {
	var node = this,
		store = this.getDocument().getStore(),
		index = store.indexOfHash( this.getSizeHash() ),
		deferred = $.Deferred();

	if ( index ) {
		// The dimensions already stored
		deferred.resolve( store.value( index ) );
	} else {
		// Look for the media size through the API
		$.ajax( {
			'url': mw.util.wikiScript( 'api' ),
			'data': {
				'action': 'query',
				'prop': 'imageinfo',
				'indexpageids': '1',
				'iiprop': 'size|mediatype',
				'format': 'json',
				'titles': this.getFilename()
			},
			'dataType': 'json',
			'type': 'POST',
			// Wait up to 100 seconds before giving up
			'timeout': 100000,
			'cache': false
		} )
		.done( function ( resp ) {
			var originalSize,
				page = resp.query && resp.query.pages[resp.query.pageids[0]],
				imageinfo = page && page.imageinfo && page.imageinfo[0];

			if ( imageinfo ) {
				originalSize = {
					'width': imageinfo.width,
					'height': imageinfo.height,
					'mediatype': imageinfo.mediatype
				};

				// Store result and resolve
				store.index( originalSize, node.getSizeHash() );
				deferred.resolve( originalSize );
			} else {
				deferred.reject();
			}
		} )
		.fail( function () {
			deferred.reject();
		} );
	}
	return deferred.promise();
};

/**
 * Get the normalised filename of the image
 *
 * @returns {string} Filename
 */
ve.dm.MWImageNode.prototype.getFilename = function () {
	// Strip the raw filename up to the 'File:' namespage
	var resource = this.getAttribute( 'resource' );
	return resource.substring( resource.indexOf( 'File:' ) );
};

/**
 * Get the store hash for the original dimensions of the image
 *
 * @returns {string} Store hash
 */
ve.dm.MWImageNode.prototype.getSizeHash = function () {
	return 'MWImageOriginalSize:' + this.getFilename();
};

/* Static methods */

ve.dm.MWImageNode.static.getHashObject = function ( dataElement ) {
	return {
		'type': dataElement.type,
		'resource': dataElement.attributes.resource,
		'width': dataElement.attributes.width,
		'height': dataElement.attributes.height
	};
};
