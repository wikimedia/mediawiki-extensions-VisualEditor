/*!
 * VisualEditor user interface MWTransclusionOutlineContainerWidget class.
 *
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Container for transclusion, may contain a single or multiple templates.
 *
 * @class
 * @extends OO.ui.Widget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * // TODO: document `items`
 */
ve.ui.MWTransclusionOutlineContainerWidget = function VeUiMWTransclusionOutlineContainerWidget( config ) {
	// Parent constructor
	ve.ui.MWTransclusionOutlineContainerWidget.super.call( this, config );

	config = config || {};

	// Initialization
	var layout = new OO.ui.Layout( {
		content: [ config.items ]
	} );
	this.$element.append( layout.$element );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlineContainerWidget, OO.ui.Widget );
