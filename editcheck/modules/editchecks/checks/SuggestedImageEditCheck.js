/*
 * SuggestedImageEditCheck
 *
 * Offers to add images suggested by the suggested image service.
 *
 * @class
 * @extends mw.editcheck.LinkEditCheck
 *
 * @constructor
 * @param {mw.editcheck.Controller} controller
 * @param {Object} [config]
 * @param {boolean} [includeSuggestions=false]
 */
mw.editcheck.SuggestedImageEditCheck = function () {
	mw.editcheck.SuggestedImageEditCheck.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( mw.editcheck.SuggestedImageEditCheck, mw.editcheck.BaseEditCheck );

/* Static properties */

mw.editcheck.SuggestedImageEditCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.BaseEditCheck.static.defaultConfig, {
	showAsCheck: false, // This would never make sense to enable
	showAsSuggestion: false
} );

mw.editcheck.SuggestedImageEditCheck.static.name = 'suggestedImage';
mw.editcheck.SuggestedImageEditCheck.static.title = 'Add an image';
mw.editcheck.SuggestedImageEditCheck.static.description = 'Do you want to add this image?';

mw.editcheck.SuggestedImageEditCheck.static.choices = [
	{
		action: 'accept',
		label: 'Add image'
	},
	{
		action: 'dismiss',
		label: OO.ui.deferMsg( 'ooui-dialog-process-dismiss' )
	}
];

mw.editcheck.SuggestedImageEditCheck.static.cachedPromises = new Map();

/* Static methods */

mw.editcheck.SuggestedImageEditCheck.static.fetchSuggestions = function ( surfaceModel ) {
	if ( !this.cachedPromises.has( surfaceModel ) ) {
		this.cachedPromises.set( surfaceModel, new mw.Api().get( {
			action: 'query',
			format: 'json',
			prop: 'growthimagesuggestiondata',
			gisdtasktype: 'section-image-recommendation',
			titles: mw.config.get( 'wgRelevantPageName' ),
			formatversion: '2'
		} )
			.then( ( response ) => ve.getProp( response, 'query', 'pages', 0, 'growthimagesuggestiondata', 0, 'images' ) )
			.then( ( suggestions ) => {
				// See: AddSectionImageArticleTarget.prototype.getInsertRange in GrowthExperiments
				const documentModel = surfaceModel.getDocument();
				const headings = documentModel.getNodesByType( 'mwHeading', true )
					.filter( ( heading ) => heading.getAttribute( 'level' ) === 2 );
				for ( const imageData of suggestions ) {
					const heading = headings[ imageData.sectionNumber - 1 ];
					if ( !heading ) {
						continue;
					}
					const expectedTitleText = imageData.sectionTitle.replace( /_/g, ' ' );
					const range = heading.getRange();
					if ( documentModel.data.getText( false, range ) === expectedTitleText ) {
						imageData.fragment = surfaceModel.getLinearFragment( range );
						const nextHeading = headings[ imageData.sectionNumber ];
						imageData.sectionFragment = surfaceModel.getLinearFragment(
							new ve.Range( heading.getOuterRange().end, nextHeading ? nextHeading.getOffset() : documentModel.getDocumentRange().end )
						);
					}
				}
				return suggestions;
			} )
		);
	}
	return this.cachedPromises.get( surfaceModel );
};

/* Methods */

mw.editcheck.SuggestedImageEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	return this.constructor.static.fetchSuggestions( surfaceModel ).then( ( suggestions ) => {
		if ( !suggestions ) {
			return null;
		}
		const documentModel = surfaceModel.getDocument();
		const modified = this.getModifiedRanges( documentModel );
		const existingImages = [
			...documentModel.getNodesByType( 'mwBlockImage' ),
			...documentModel.getNodesByType( 'mwInlineImage' )
		].sort( ( a, b ) => a.getOffset() - b.getOffset() );
		return suggestions.map( ( imageData ) => {
			if ( !imageData.fragment ) {
				return null;
			}
			const range = imageData.fragment.getSelection().getRange();
			const sectionRange = imageData.sectionFragment.getSelection().getRange();
			if (
				!this.isDismissedRange( range ) &&
				modified.some( ( modifiedRange ) => modifiedRange.touchesRange( range ) ) &&
				// Has an image already been added to this section?
				!existingImages.some( ( imageNode ) => sectionRange.containsOffset( imageNode.getOffset() ) )
				// TODO: does existingImages contain this recommended image already in another section?
			) {
				return new mw.editcheck.SuggestedImageEditCheckAction( {
					imageData,
					message: imageData.metadata.reason,
					fragments: [ imageData.fragment ],
					check: this
				} );
			}
			return null;
		} );
	} );
};

mw.editcheck.SuggestedImageEditCheck.prototype.act = function ( choice, action, surface ) {
	if ( choice === 'accept' ) {
		return new mw.Api().get( {
			action: 'query',
			format: 'json',
			prop: 'imageinfo',
			titles: mw.Title.newFromText( action.imageData.image, mw.config.get( 'wgNamespaceIds' ).file ).getPrefixedDb(),
			iiprop: 'dimensions|url|mediatype|canonicaltitle',
			iiurlwidth: mw.config.get( 'wgVisualEditorConfig' ).thumbLimits[ mw.user.options.get( 'thumbsize' ) ] || 250,
			formatversion: '2'
		} ).then( ( response ) => {
			const imageinfo = ve.getProp( response, 'query', 'pages', 0, 'imageinfo', 0 );
			if ( !imageinfo ) {
				return;
			}
			// This covers the full mwHeading; we want to insert the image after it.
			const fragment = action.fragments[ 0 ];
			// TODO: this should be smarter; it'd ideally want to find the
			// first paragraph following the heading and insert before it, to
			// avoid things like "main article" templates.
			const documentModel = surface.getModel().getDocument();
			const nextOffset = documentModel.getNearestCursorOffset( fragment.selection.getCoveringRange().end, 1 );
			const insertionFragment = surface.getModel().getLinearFragment( new ve.Range( nextOffset ) );

			const imageModel = ve.dm.MWImageModel.static.newFromImageInfo( imageinfo, documentModel );
			insertionFragment.insertContent( imageModel.getData() );
			const leafNodes = insertionFragment.getLeafNodes();
			action.focusFragment = insertionFragment;
			if ( leafNodes.length > 0 ) {
				const leaf = leafNodes[ 0 ];
				if ( leaf.node.findParent( ve.dm.MWImageCaptionNode ) ) {
					// We've definitely inserted an image with a caption, and
					// the leaf we have selected is the paragraph node inside the caption.
					const captionFragment = surface.getModel().getLinearFragment( leaf.nodeRange );
					if ( action.imageData.metadata.caption ) {
						captionFragment.insertContent( action.imageData.metadata.caption );
						action.focusFragment = captionFragment;
					} else {
						captionFragment.insertContent( [ { type: 'paragraph' }, { type: '/paragraph' } ] );
						action.focusFragment = captionFragment.adjustLinearSelection( 1, -1 );
					}
				}
			}
			action.select( surface, true );
		} );
	}
	// Parent method
	return mw.editcheck.SuggestedImageEditCheck.super.prototype.act.apply( this, arguments );
};

/* Registration */

mw.editcheck.editCheckFactory.register( mw.editcheck.SuggestedImageEditCheck );

mw.editcheck.SuggestedImageEditCheckAction = function ( config ) {
	mw.editcheck.SuggestedImageEditCheckAction.super.call( this, config );

	this.imageData = config.imageData;
};

OO.inheritClass( mw.editcheck.SuggestedImageEditCheckAction, mw.editcheck.EditCheckAction );

/**
 * @inheritdoc
 */
mw.editcheck.SuggestedImageEditCheckAction.prototype.render = function () {
	const widget = mw.editcheck.SuggestedImageEditCheckAction.super.prototype.render.apply( this, arguments );

	const imageMetadata = ve.getProp( this, 'image', 'metadata' );
	if ( imageMetadata ) {
		const $link = $( '<a>' ).append(
			$( '<img>' )
				.attr( 'src', imageMetadata.thumbUrl )
				.attr( 'title', imageMetadata.description )
				.css( 'margin-top', '8px' )
		);
		ve.setAttributeSafe( $link[ 0 ], 'href', imageMetadata.descriptionUrl );
		ve.targetLinksToNewWindow( $link[ 0 ] );
		widget.message.$element.after( $link );
	}
	return widget;
};
