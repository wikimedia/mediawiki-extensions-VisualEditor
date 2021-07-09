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
 * @param {Object} config
 * @param {ve.dm.MWTransclusionModel} config.transclusionModel
 * // TODO: document `items`
 */
ve.ui.MWTransclusionOutlineContainerWidget = function VeUiMWTransclusionOutlineContainerWidget( config ) {
	// Parent constructor
	ve.ui.MWTransclusionOutlineContainerWidget.super.call( this, config );

	// Initialization
	this.transclusionModel = config.transclusionModel;

	// Events
	this.transclusionModel.connect( this, {
		replace: 'onReplacePart'
		// TODO
		// change: 'onTransclusionModelChange'
	} );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlineContainerWidget, OO.ui.Widget );

/* Events */

/**
 * @private
 * @param {ve.dm.MWTransclusionPartModel|null} removed Removed part
 * @param {ve.dm.MWTransclusionPartModel|null} added Added part
 */
ve.ui.MWTransclusionOutlineContainerWidget.prototype.onReplacePart = function ( removed, added ) {
	if ( removed instanceof ve.dm.MWTemplateModel ) {
		// TODO
		// this.removeTemplate( removed );
	}
	// TODO: and for wikitext snippets?
	// TODO: reselect if active part was in a removed template

	if ( added instanceof ve.dm.MWTemplateModel ) {
		this.addTemplate( added );
	}
	// TODO: and for wikitext snippets?
};

/* Methods */

/**
 * @private
 * @param {ve.dm.MWTemplateModel} template
 */
ve.ui.MWTransclusionOutlineContainerWidget.prototype.addTemplate = function ( template ) {
	// FIXME: Respect order
	var container = new ve.ui.MWTemplateOutlineTemplateWidget( {
		templateModel: template
	} );

	this.$element
		.append( container.$element );
};
