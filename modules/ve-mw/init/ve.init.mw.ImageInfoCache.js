/*!
 * VisualEditor MediaWiki Initialization ImageInfoCache class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */
( function () {
	/**
	 * Get information about images.
	 * @class
	 * @extends ve.init.mw.ApiResponseCache
	 * @constructor
	 */
	ve.init.mw.ImageInfoCache = function VeInitMwImageInfoCache() {
		ve.init.mw.ImageInfoCache.super.call( this );
	};

	OO.inheritClass( ve.init.mw.ImageInfoCache, ve.init.mw.ApiResponseCache );

	/**
	 * @inheritdoc
	 */
	ve.init.mw.ImageInfoCache.prototype.getRequestPromise = function ( subqueue ) {
		return new mw.Api().get(
			{
				action: 'query',
				prop: 'imageinfo',
				indexpageids: '1',
				iiprop: 'size|mediatype',
				titles: subqueue.join( '|' )
			},
			{ type: 'POST' }
		);
	};

	/**
	 * @inheritdoc
	 */
	ve.init.mw.ImageInfoCache.prototype.processPage = function ( page ) {
		if ( page.imageinfo ) {
			return page.imageinfo[0];
		}
	};
}() );
