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
 * @param {OO.ui.BookletLayout} bookletLayout
 * @property {Object.<string,ve.ui.MWTransclusionOutlinePartWidget>} partWidgets Map of top-level
 *  items currently visible in this container, indexed by part id
 */
ve.ui.MWTransclusionOutlineContainerWidget = function VeUiMWTransclusionOutlineContainerWidget( bookletLayout ) {
	// Parent constructor
	ve.ui.MWTransclusionOutlineContainerWidget.super.call( this );

	// Initialization
	this.bookletLayout = bookletLayout;
	this.partWidgets = {};

	this.$element.addClass( 've-ui-mwTransclusionOutlineContainerWidget' );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlineContainerWidget, OO.ui.Widget );

/* Events */

/**
 * @event filterParameters
 * @param {Object.<string,boolean>} visibility Keyed by unique id of the parameter, e.g. something
 *  like "part_1/param1". Note this lists only parameters that are currently in use.
 */

/**
 * @param {ve.dm.MWTransclusionPartModel|null} removed Removed part
 * @param {ve.dm.MWTransclusionPartModel|null} added Added part
 * @param {number} [newPosition]
 */
ve.ui.MWTransclusionOutlineContainerWidget.prototype.onReplacePart = function ( removed, added, newPosition ) {
	if ( removed ) {
		this.removePartWidget( removed );
	}
	// TODO: reselect if active part was in a removed template

	if ( added ) {
		this.addPartWidget( added, newPosition );
	}
};

/**
 * @param {ve.dm.MWTransclusionModel} transclusionModel
 */
ve.ui.MWTransclusionOutlineContainerWidget.prototype.onTransclusionModelChange = function ( transclusionModel ) {
	var newOrder = transclusionModel.getParts();

	for ( var i = 0; i < newOrder.length; i++ ) {
		var expectedWidget = this.partWidgets[ newOrder[ i ].getId() ],
			$expectedElement = expectedWidget && expectedWidget.$element,
			$currentElement = this.$element.children().eq( i );

		if ( !$currentElement.is( $expectedElement ) ) {
			// Move each widget to the correct position if it wasn't there before
			$currentElement.before( $expectedElement );
		}
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
 * @param {number} [newPosition]
 */
ve.ui.MWTransclusionOutlineContainerWidget.prototype.addPartWidget = function ( part, newPosition ) {
	var widget;

	if ( part instanceof ve.dm.MWTemplateModel ) {
		widget = new ve.ui.MWTransclusionOutlineTemplateWidget( part );
		// This forwards events from the nested ve.ui.MWTransclusionOutlineTemplateWidget upwards.
		// The array syntax is a way to call `this.emit( 'filterParameters' )`.
		widget.connect( this, {
			selectParameter: 'focusPart',
			filterParameters: [ 'emit', 'filterParameters' ]
		} );
	} else if ( part instanceof ve.dm.MWTemplatePlaceholderModel ) {
		widget = new ve.ui.MWTransclusionOutlinePlaceholderWidget( part );
	} else if ( part instanceof ve.dm.MWTransclusionContentModel ) {
		widget = new ve.ui.MWTransclusionOutlineWikitextWidget( part );
	}

	widget.connect( this, { partHeaderClick: 'focusPart' } );

	this.partWidgets[ part.getId() ] = widget;
	if ( typeof newPosition === 'number' && newPosition < this.$element.children().length ) {
		this.$element.children().eq( newPosition ).before( widget.$element );
	} else {
		this.$element.append( widget.$element );
	}
};

/**
 * @private
 * @param {string} partId
 */
ve.ui.MWTransclusionOutlineContainerWidget.prototype.focusPart = function ( partId ) {
	this.bookletLayout.focus();
	this.bookletLayout.setPage( partId );
};

/**
 * Removes all {@see ve.ui.MWTransclusionOutlinePartWidget}, i.e. empties the list.
 */
ve.ui.MWTransclusionOutlineContainerWidget.prototype.clear = function () {
	for ( var partId in this.partWidgets ) {
		var widget = this.partWidgets[ partId ];
		widget.disconnect( this );
		widget.$element.remove();
	}
	this.partWidgets = {};
};
