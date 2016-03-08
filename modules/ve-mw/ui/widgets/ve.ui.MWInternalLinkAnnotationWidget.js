/*!
 * VisualEditor UserInterface MWInternalLinkAnnotationWidget class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
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
	var title = mw.Title.newFromText( value.trim() );

	if ( !title ) {
		return null;
	}
	return ve.dm.MWInternalLinkAnnotation.static.newFromTitle( title );
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
	var input = new mw.widgets.TitleSearchWidget( ve.extendObject( {
		icon: 'search',
		showRedlink: true,
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
