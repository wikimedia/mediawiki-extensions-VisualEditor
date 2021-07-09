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
 * @property {Object.<string,ve.ui.MWTransclusionOutlinePartWidget>} partWidgets Map of top-level
 *  items currently visible in this container, indexed by part id
 */
ve.ui.MWTransclusionOutlineContainerWidget = function VeUiMWTransclusionOutlineContainerWidget( config ) {
	// Parent constructor
	ve.ui.MWTransclusionOutlineContainerWidget.super.call( this, config );

	// Initialization
	this.transclusionModel = config.transclusionModel;
	this.partWidgets = {};

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
	if ( removed ) {
		this.removePartWidget( removed );
	}
	// TODO: reselect if active part was in a removed template

	if ( added ) {
		this.addPartWidget( added );
	}
};

/* Methods */

/**
 * @private
 * @param {ve.dm.MWTransclusionPartModel} part
 */
ve.ui.MWTransclusionOutlineContainerWidget.prototype.removePartWidget = function ( part ) {
	var partId = part.getId(),
		widget = this.partWidgets[ partId ];

	if ( widget ) {
		widget.$element.remove();
		delete this.partWidgets[ partId ];
	}
};

/**
 * @private
 * @param {ve.dm.MWTransclusionPartModel} part
 */
ve.ui.MWTransclusionOutlineContainerWidget.prototype.addPartWidget = function ( part ) {
	var widget;

	if ( part instanceof ve.dm.MWTemplateModel ) {
		widget = new ve.ui.MWTransclusionOutlineTemplateWidget( part );
	} else if ( part instanceof ve.dm.MWTemplatePlaceholderModel ) {
		widget = new ve.ui.MWTransclusionOutlinePlaceholderWidget( part );
	} else if ( part instanceof ve.dm.MWTransclusionContentModel ) {
		widget = new ve.ui.MWTransclusionOutlineWikitextWidget( part );
	}

	this.partWidgets[ part.getId() ] = widget;
	// FIXME: Respect order
	this.$element.append( widget.$element );
};
