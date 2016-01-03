/*!
 * VisualEditor UserInterface MWPreviewElement class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Creates an ve.ui.MWPreviewElement object.
 *
 * @class
 * @extends ve.ui.PreviewElement
 *
 * @constructor
 * @param {ve.dm.Node} [model]
 * @param {Object} [config]
 */
ve.ui.MWPreviewElement = function VeUiMwPreviewElement() {
	// Parent constructor
	ve.ui.MWPreviewElement.super.apply( this, arguments );

	// Initialize
	this.$element.addClass( 've-ui-mwPreviewElement mw-body-content' );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWPreviewElement, ve.ui.PreviewElement );
