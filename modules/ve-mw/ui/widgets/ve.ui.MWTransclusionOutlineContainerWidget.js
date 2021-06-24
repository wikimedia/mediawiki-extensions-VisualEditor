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

	// Initialization
	this.transclusionModel = config.transclusionModel;

	this.containerLayout = new OO.ui.Layout();
	this.$element.append( this.containerLayout.$element );

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
 * Handle parts being replaced.
 *
 * @param {ve.dm.MWTransclusionPartModel} removed Removed part
 * @param {ve.dm.MWTransclusionPartModel} added Added part
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
 * Add a template container
 *
 * @private
 * @param {ve.dm.MWTemplateModel} template Added part
 */
ve.ui.MWTransclusionOutlineContainerWidget.prototype.addTemplate = function ( template ) {
	// FIXME: Respect order
	var container = new ve.ui.MWTemplateOutlineTemplateWidget( {
		templateModel: template
	} );

	this.containerLayout.$element
		.append( container.$element );
};
