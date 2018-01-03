/*!
 * VisualEditor UserInterface MWInternalLinkAnnotationWidget class.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
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
	var trimmed = value.trim(),
		title = mw.Title.newFromText( trimmed );

	if ( !title ) {
		return null;
	}
	return ve.dm.MWInternalLinkAnnotation.static.newFromTitle( title, trimmed );
};

/**
 * @inheritdoc
 */
ve.ui.MWInternalLinkAnnotationWidget.static.getTextFromAnnotation = function ( annotation ) {
	return annotation ? annotation.getAttribute( 'origTitle' ) || annotation.getAttribute( 'normalizedTitle' ) : '';
};

/* Methods */

/**
 * Create a text input widget to be used by the annotation widget
 *
 * @param {Object} [config] Configuration options
 * @return {OO.ui.TextInputWidget} Text input widget
 */
ve.ui.MWInternalLinkAnnotationWidget.prototype.createInputWidget = function ( config ) {
	var input = new mw.widgets.TitleSearchWidget( ve.extendObject( {
		icon: 'search',
		showRedlink: true,
		excludeCurrentPage: true,
		showImages: mw.config.get( 'wgVisualEditor' ).usePageImages,
		showDescriptions: mw.config.get( 'wgVisualEditor' ).usePageDescriptions,
		cache: ve.init.platform.linkCache
	}, config ) );

	// Put query first in DOM
	// TODO: Consider upstreaming this to SearchWidget
	input.$element.prepend( input.$query );

	return input;
};

/**
 * @inheritdoc
 */
ve.ui.MWInternalLinkAnnotationWidget.prototype.getTextInputWidget = function () {
	return this.input.query;
};

/**
 * @inheritdoc
 */
ve.ui.MWInternalLinkAnnotationWidget.prototype.getHref = function () {
	var title = ve.ui.MWInternalLinkAnnotationWidget.super.prototype.getHref.call( this );
	return mw.util.getUrl( title );
};

/**
 * @inheritdoc
 */
ve.ui.MWInternalLinkAnnotationWidget.prototype.onTextChange = function ( value ) {
	var targetData,
		htmlDoc = this.getElementDocument();
	// Specific thing we want to check: has a valid URL for an internal page
	// been pasted into here, in which case we want to convert it to just the
	// page title. This has to happen /here/ because a URL can reference a
	// valid page while not being a valid Title (e.g. if it contains a "%").
	if ( ve.init.platform.getExternalLinkUrlProtocolsRegExp().test( value ) ) {
		targetData = ve.dm.MWInternalLinkAnnotation.static.getTargetDataFromHref(
			value,
			htmlDoc
		);
		if ( targetData.isInternal ) {
			value = targetData.title;
			this.input.query.setValue( targetData.title );
		}
	}
	return ve.ui.MWInternalLinkAnnotationWidget.super.prototype.onTextChange.call( this, value );
};
