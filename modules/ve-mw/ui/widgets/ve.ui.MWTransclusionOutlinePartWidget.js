/**
 * Common base class for top-level items (a.k.a. "parts") in the template editor sidebar. Subclasses
 * should exist for all subclasses of {@see ve.dm.MWTransclusionPartModel}:
 * - {@see ve.dm.MWTemplateModel}
 * - {@see ve.dm.MWTemplatePlaceholderModel}
 * - {@see ve.dm.MWTransclusionContentModel}
 *
 * This is inspired by and meant to replace {@see OO.ui.DecoratedOptionWidget} in the context of the
 * template dialog. Also see {@see OO.ui.ButtonWidget} for inspiration.
 *
 * @abstract
 * @class
 * @extends OO.ui.Widget
 *
 * @constructor
 * @param {ve.dm.MWTransclusionPartModel} part
 * @param {Object} config
 * @cfg {string} [icon='']
 * @cfg {string} label
 */
ve.ui.MWTransclusionOutlinePartWidget = function VeUiMWTransclusionOutlinePartWidget( part, config ) {
	// Parent constructor
	ve.ui.MWTransclusionOutlinePartWidget.super.call( this, ve.extendObject( config, {
		data: part.getId()
	} ) );

	var header = new ve.ui.MWTransclusionOutlineButtonWidget( config )
		.connect( this, { click: [ 'emit', 'focusPart', part.getId() ] } );

	this.$element
		.addClass( 've-ui-mwTransclusionOutlinePartWidget' )
		.append( header.$element );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlinePartWidget, OO.ui.Widget );

/* Events */

/**
 * @event focusPart
 * @param {string} partId Unique id of the part, e.g. something "part_1" or "part_1/param1".
 */
