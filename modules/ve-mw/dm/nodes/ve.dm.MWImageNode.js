/*!
 * VisualEditor DataModel MWImageNode class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * DataModel generated content node.
 *
 * @class
 * @abstract
 * @extends ve.dm.GeneratedContentNode
 * @mixins ve.dm.ResizableNode
 *
 * @constructor
 */
ve.dm.MWImageNode = function VeDmMWImageNode() {
	// Parent constructor
	ve.dm.GeneratedContentNode.call( this );
	// Mixin constructor
	ve.dm.ResizableNode.call( this );

	this.scalablePromise = null;

	// Use 'bitmap' as default media type until we can
	// fetch the actual media type from the API
	this.mediaType = 'BITMAP';
	// Get wiki defaults
	this.svgMaxSize = mw.config.get( 'wgVisualEditor' ).svgMaxSize;

	// Initialize
	this.constructor.static.syncScalableToType(
		this.getAttribute( 'type' ),
		this.mediaType,
		this.getScalable()
	);

	// Events
	this.connect( this, { 'attributeChange': 'onAttributeChange' } );
};

/* Inheritance */

OO.inheritClass( ve.dm.MWImageNode, ve.dm.GeneratedContentNode );

OO.mixinClass( ve.dm.MWImageNode, ve.dm.ResizableNode );

/* Methods */

/**
 * Update image scalable properties according to the image type.
 *
 * @param {string} type The new image type
 * @param {string} mediaType Image media type 'DRAWING' or 'BITMAP'
 * @param {ve.dm.Scalable} scalable The scalable object to update
 */
ve.dm.MWImageNode.static.syncScalableToType = function ( type, mediaType, scalable ) {
	var originalDimensions, dimensions,
		width = scalable.getCurrentDimensions().width,
		defaultThumbSize = mw.config.get( 'wgVisualEditorConfig' ).defaultUserOptions.defaultthumbsize;

	originalDimensions = scalable.getOriginalDimensions();

	// Deal with the different default sizes
	if ( type === 'thumb' || type === 'frameless' ) {
		// Set the default size to that in the wiki configuration if
		// 1. The image width is not smaller than the default
		// 2. If the image is an SVG drawing
		if ( width >= defaultThumbSize || mediaType === 'DRAWING' ) {
			dimensions = ve.dm.Scalable.static.getDimensionsFromValue( {
				'width': defaultThumbSize
			}, scalable.getRatio() );
		} else {
			dimensions = ve.dm.Scalable.static.getDimensionsFromValue(
				scalable.getCurrentDimensions(),
				scalable.getRatio()
			);
		}
		scalable.setDefaultDimensions( dimensions );
	} else {
		if ( originalDimensions ) {
			scalable.setDefaultDimensions( originalDimensions );
		}
	}

	// Deal with maximum dimensions for images and drawings
	if ( mediaType !== 'DRAWING' ) {
		if ( originalDimensions ) {
			scalable.setMaxDimensions( originalDimensions );
			scalable.setEnforcedMax( true );
		} else {
			scalable.setEnforcedMax( false );
		}
	}
	// TODO: Some day, when svgMaxSize works properly in MediaWiki
	// we can add it back as max dimension consideration.
};

/**
 * Get the scalable promise which fetches original dimensions from the API
 * @param {string} filename The image filename whose details the scalable will represent
 * @returns {jQuery.Promise} Promise which resolves after the image size details are fetched from the API
 */
ve.dm.MWImageNode.static.getScalablePromise = function ( filename ) {
	var scalablePromise = $.Deferred();
	// On the first call set off an async call to update the scalable's
	// original dimensions from the API.
	if ( ve.init.target ) {
		ve.init.target.constructor.static.apiRequest(
			{
				'action': 'query',
				'prop': 'imageinfo',
				'indexpageids': '1',
				'iiprop': 'size|mediatype',
				'titles': filename
			},
			{ 'type': 'POST' }
		)
		.done( function ( response ) {
			var page = response.query && response.query.pages[response.query.pageids[0]],
				info = page && page.imageinfo && page.imageinfo[0];
			if ( info ) {
				scalablePromise.resolve( info );
			} else {
				scalablePromise.reject();
			}
		} )
		.fail( function () {
			scalablePromise.reject();
		} );
	} else {
		scalablePromise.reject();
	}
	return scalablePromise;
};

/**
 * Respond to attribute change.
 * Update the rendering of the 'align', src', 'width' and 'height' attributes
 * when they change in the model.
 *
 * @method
 * @param {string} key Attribute key
 * @param {string} from Old value
 * @param {string} to New value
 */
ve.dm.MWImageNode.prototype.onAttributeChange = function ( key, from, to ) {
	if ( key === 'type' ) {
		this.constructor.static.syncScalableToType( to, this.mediaType, this.getScalable() );
	}
};

/**
 * Get the normalised filename of the image
 *
 * @returns {string} Filename
 */
ve.dm.MWImageNode.prototype.getFilename = function () {
	// Strip ./ stuff and decode URI encoding
	var resource = this.getAttribute( 'resource' ),
		filename = resource.replace( /^(.+\/)*/, '' );

	// Protect against decodeURIComponent() throwing exceptions
	try {
		filename = decodeURIComponent( filename );
	} catch ( e ) {
		ve.log( 'URI decoding exception', e );
	}
	return filename;
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

/**
 * @inheritdoc
 */
ve.dm.MWImageNode.prototype.getScalable = function () {
	if ( !this.scalablePromise ) {
		this.scalablePromise = ve.dm.MWImageNode.static.getScalablePromise( this.getFilename() )
			.done( ve.bind( function ( info ) {
				if ( info ) {
					this.getScalable().setOriginalDimensions( {
						'width': info.width,
						'height': info.height
					} );
					// Update media type
					this.mediaType = info.mediatype;
					// Update according to type
					this.constructor.static.syncScalableToType(
						this.getAttribute( 'type' ),
						this.mediaType,
						this.getScalable()
					);
				}
			}, this ) );
	}
	// Parent method
	return ve.dm.ResizableNode.prototype.getScalable.call( this );
};

/**
 * @inheritdoc
 */
ve.dm.MWImageNode.prototype.createScalable = function () {
	return new ve.dm.Scalable( {
		'currentDimensions': {
			'width': this.getAttribute( 'width' ),
			'height': this.getAttribute( 'height' )
		},
		'minDimensions': {
			'width': 1,
			'height': 1
		}
	} );
};

/**
 * Get symbolic name of media type.
 *
 * Example values: "BITMAP" for JPEG or PNG images; "DRAWING" for SVG graphics
 *
 * @return {string|undefined} Symbolic media type name, or undefined if empty
 */
ve.dm.MWImageNode.prototype.getMediaType = function () {
	return this.mediaType;
};
