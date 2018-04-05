/*!
 * VisualEditor DataModel MWGalleryImageNode class.
 *
 * @copyright 2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * DataModel MediaWiki gallery image node.
 *
 * @class
 * @extends ve.dm.BranchNode
 *
 * @constructor
 * @param {Object} [element] Reference to element in linear model
 * @param {ve.dm.Node[]} [children]
 */
ve.dm.MWGalleryImageNode = function VeDmMWGalleryImageNode() {
	// Parent constructor
	ve.dm.MWGalleryImageNode.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.dm.MWGalleryImageNode, ve.dm.BranchNode );

/* Static members */

ve.dm.MWGalleryImageNode.static.name = 'mwGalleryImage';

ve.dm.MWGalleryImageNode.static.matchTagNames = [ 'li' ];

ve.dm.MWGalleryImageNode.static.childNodeTypes = [ 'mwGalleryImageCaption' ];

ve.dm.MWGalleryImageNode.static.matchFunction = function ( element ) {
	var parentTypeof = ( element.parentNode && element.parentNode.getAttribute( 'typeof' ) ) || '';
	return element.getAttribute( 'class' ) === 'gallerybox' &&
		parentTypeof.split( ' ' ).indexOf( 'mw:Extension/gallery' ) !== -1;
};

ve.dm.MWGalleryImageNode.static.parentNodeTypes = [ 'mwGallery' ];

ve.dm.MWGalleryImageNode.static.toDataElement = function ( domElements, converter ) {
	var li, img, captionDiv, caption, filename, dataElement;

	// TODO: Improve handling of missing files. See 'isError' in MWBlockImageNode#toDataElement
	li = domElements[ 0 ];
	img = li.querySelector( 'img,audio,video' );

	// Get caption (may be missing for mode="packed-hover" galleries)
	captionDiv = li.querySelector( '.gallerytext' );
	if ( captionDiv ) {
		captionDiv = captionDiv.cloneNode( true );
		// If showFilename is 'yes', the filename is also inside the caption, so throw this out
		filename = captionDiv.querySelector( '.galleryfilename' );
		if ( filename ) {
			filename.remove();
		}
	}

	// If the caption is empty, treat it like no caption at all. The two cases for gallery image
	// captions are equivalent, but it is convenient for us to have an actual empty node here
	// (rather than a node containing <paragraph></paragraph>), same as for MWBlockImageNode.
	if ( captionDiv && captionDiv.childNodes.length ) {
		caption = converter.getDataFromDomClean( captionDiv, { type: 'mwGalleryImageCaption' } );
	} else {
		caption = [ { type: 'mwGalleryImageCaption' }, { type: '/mwGalleryImageCaption' } ];
	}

	dataElement = {
		type: this.name,
		attributes: {
			resource: ve.normalizeParsoidResourceName( img.getAttribute( 'resource' ) ),
			altText: img.getAttribute( 'alt' ),
			// 'src' for images, 'poster' for video/audio
			src: img.getAttribute( 'src' ) || img.getAttribute( 'poster' ),
			height: img.getAttribute( 'height' ),
			width: img.getAttribute( 'width' )
		}
	};

	return [ dataElement ]
		.concat( caption )
		.concat( { type: '/' + this.name } );
};

ve.dm.MWGalleryImageNode.static.toDomElements = function ( data, doc ) {
	// ImageNode:
	// <li> li (gallerybox)
	// 	<div> outerDiv
	// 		<div> thumbDiv
	// 			<div> innerDiv
	// 				<a> a
	// 					<img> img
	var model = data,
		li = doc.createElement( 'li' ),
		outerDiv = doc.createElement( 'div' ),
		thumbDiv = doc.createElement( 'div' ),
		innerDiv = doc.createElement( 'div' ),
		a = doc.createElement( 'a' ),
		img = doc.createElement( 'img' ),
		alt = model.attributes.altText;

	li.classList.add( 'gallerybox' );
	thumbDiv.classList.add( 'thumb' );

	// TODO: Support editing the link
	// a.setAttribute( 'href', model.attributes.src );

	img.setAttribute( 'resource', model.attributes.resource );
	img.setAttribute( 'src', model.attributes.src );
	if ( alt ) {
		img.setAttribute( 'alt', alt );
	}

	a.appendChild( img );
	innerDiv.appendChild( a );
	thumbDiv.appendChild( innerDiv );
	outerDiv.appendChild( thumbDiv );
	li.appendChild( outerDiv );

	return [ li ];
};

ve.dm.MWGalleryImageNode.static.describeChange = function ( key ) {
	// These attributes are computed
	if ( key === 'src' || key === 'width' || key === 'height' ) {
		return null;
	}
	// Parent method
	return ve.dm.MWGalleryImageNode.super.static.describeChange.apply( this, arguments );
};

/* Methods */

/**
 * Get the image's caption node.
 *
 * @method
 * @return {ve.dm.MWImageCaptionNode|null} Caption node, if present
 */
ve.dm.MWGalleryImageNode.prototype.getCaptionNode = function () {
	return this.children.length > 0 ? this.children[ 0 ] : null;
};

/* Registration */

ve.dm.modelRegistry.register( ve.dm.MWGalleryImageNode );
