/*!
 * VisualEditor UserInterface MWInternalLinkAnnotationWidget class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Creates an ve.ui.MWInternalLinkAnnotationWidget object.
 *
 * @class
 * @extends ve.ui.LinkAnnotationWidget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWInternalLinkAnnotationWidget = function VeUiMWInternalLinkAnnotationWidget() {
	// Parent constructor
	ve.ui.MWInternalLinkAnnotationWidget.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWInternalLinkAnnotationWidget, ve.ui.LinkAnnotationWidget );

/* Static Methods */

/**
 * @inheritdoc
 */
ve.ui.MWInternalLinkAnnotationWidget.static.getAnnotationFromText = function ( value ) {
	var title,
		target = value.trim();

	// Keep annotation in sync with value
	if ( target === '' ) {
		return null;
	} else {
		title = mw.Title.newFromText( target );

		if (
			title &&
			( title.getNamespaceId() === 6 || title.getNamespaceId() === 14 ) &&
			target[0] !== ':'
		) {
			// Prepend links to File and Category namespace with a colon
			target = ':' + target;
		}

		return new ve.dm.MWInternalLinkAnnotation( {
			type: 'link/mwInternal',
			attributes: {
				title: target,
				// bug 62816: we really need a builder for this stuff
				normalizedTitle: ve.dm.MWInternalLinkAnnotation.static.normalizeTitle( target ),
				lookupTitle: ve.dm.MWInternalLinkAnnotation.static.getLookupTitle( target )
			}
		} );
	}
};

/**
 * @inheritdoc
 */
ve.ui.MWInternalLinkAnnotationWidget.static.getTextFromAnnotation = function ( annotation ) {
	return annotation ? annotation.getAttribute( 'title' ) : '';
};

/* Methods */

/**
 * Create a text input widget to be used by the annotation widget
 *
 * @param {Object} [config] Configuration options
 * @return {OO.ui.TextInputWidget} Text input widget
 */
ve.ui.MWInternalLinkAnnotationWidget.prototype.createInputWidget = function ( config ) {
	return new ve.ui.MWLinkTargetInputWidget( {
		icon: 'search',
		$overlay: config.$overlay
	} );
};

/**
 * @inheritdoc
 */
ve.ui.MWInternalLinkAnnotationWidget.prototype.getHref = function () {
	var title = ve.ui.MWInternalLinkAnnotationWidget.super.prototype.getHref.call( this );
	return mw.util.getUrl( title );
};
