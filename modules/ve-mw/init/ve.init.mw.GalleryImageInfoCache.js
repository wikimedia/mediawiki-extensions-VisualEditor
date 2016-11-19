/*!
 * VisualEditor MediaWiki Initialization GalleryImageInfoCache class.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Get thumbnail URL information about gallery images.
 *
 * @class
 * @extends ve.init.mw.ImageInfoCache
 * @constructor
 */
ve.init.mw.GalleryImageInfoCache = function VeInitMwGalleryImageInfoCache() {
	ve.init.mw.GalleryImageInfoCache.super.call( this );
};

/* Inheritance */

OO.inheritClass( ve.init.mw.GalleryImageInfoCache, ve.init.mw.ImageInfoCache );

/* Methods */

/**
 * @inheritdoc
 */
ve.init.mw.GalleryImageInfoCache.prototype.getRequestPromise = function ( subqueue ) {
	return new mw.Api().get(
		{
			action: 'query',
			prop: 'imageinfo',
			iiprop: 'url|size',
			titles: subqueue,
			iiurlwidth: 200,
			iiurlheight: 200
		},
		{ type: 'POST' }
	);
};
