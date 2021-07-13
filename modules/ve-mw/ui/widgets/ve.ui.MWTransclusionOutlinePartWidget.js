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
	ve.ui.MWTransclusionOutlinePartWidget.super.call( this, config );

	// FIXME: Use config.data and OO.ui.Element.getData() instead?
	// Warning, there is already config.id and this.elementId!
	this.partId = part.getId();

	this.header = new ve.ui.MWTransclusionOutlineButtonWidget( config )
		.connect( this, { click: 'onHeaderClick' } );

	this.$element
		.addClass( 've-ui-mwTransclusionOutlinePartWidget' )
		// Note: There is no code that uses this. It just helps when manually inspecting the HTML.
		.attr( 'data-transclusion-part-id', part.getId() )
		.append( this.header.$element );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlinePartWidget, OO.ui.Widget );

/* Events */

/**
 * @event partHeaderClick
 * @param {string} partId
 */

/**
 * @return {string} Identifier of the {@see ve.dm.MWTransclusionPartModel} this widget represents
 */
ve.ui.MWTransclusionOutlinePartWidget.prototype.getPartId = function () {
	return this.partId;
};

/**
 * @fires partHeaderClick
 */
ve.ui.MWTransclusionOutlinePartWidget.prototype.onHeaderClick = function () {
	this.emit( 'partHeaderClick', this.partId );
};
