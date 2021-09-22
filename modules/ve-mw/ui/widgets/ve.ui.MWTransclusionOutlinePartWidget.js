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
 * @cfg {string} [icon=''] Symbolic name of an icon, e.g. "puzzle" or "wikiText"
 * @cfg {string} label
 */
ve.ui.MWTransclusionOutlinePartWidget = function VeUiMWTransclusionOutlinePartWidget( part, config ) {
	this.part = part;

	// Parent constructor
	ve.ui.MWTransclusionOutlinePartWidget.super.call( this, ve.extendObject( config, {
		classes: [ 've-ui-mwTransclusionOutlinePartWidget' ],
		data: part.getId()
	} ) );

	this.header = new ve.ui.MWTransclusionOutlineButtonWidget( config )
		.connect( this, {
			keyPressed: 'onHeaderKeyPressed',
			click: 'onHeaderClick'
		} );

	this.$element
		.append( this.header.$element );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlinePartWidget, OO.ui.Widget );

/* Events */

/**
 * "Soft" selection with space.
 *
 * @event transclusionPartSoftSelected
 * @param {string} partId Unique id of the {@see ve.dm.MWTransclusionPartModel}, e.g. something like
 *  "part_1".
 */

/**
 * "Hard" selection with enter or mouse click.
 *
 * @event transclusionPartSelected
 * @param {string} pageName Unique id of the {@see OO.ui.BookletLayout} page, e.g. something like
 *  "part_1" or "part_1/param1".
 */

/* Methods */

/**
 * @private
 * @param {number} key Note that some keys only make it here when Ctrl or Ctrl+Shift is pressed
 * @fires transclusionPartSoftSelected
 */
ve.ui.MWTransclusionOutlinePartWidget.prototype.onHeaderKeyPressed = function ( key ) {
	switch ( key ) {
		case OO.ui.Keys.SPACE:
			this.emit( 'transclusionPartSoftSelected', this.getData() );
			break;
		case OO.ui.Keys.UP:
		case OO.ui.Keys.DOWN:
			// Modelled after {@see ve.ui.MWTransclusionDialog.onOutlineControlsMove}
			var transclusion = this.part.getTransclusion(),
				parts = transclusion.getParts(),
				offset = key === OO.ui.Keys.UP ? -1 : 1,
				newIndex = parts.indexOf( this.part ) + offset;
			if ( newIndex >= 0 && newIndex < parts.length ) {
				transclusion.addPart( this.part, newIndex );
			}
			break;
		case OO.ui.Keys.DELETE:
			this.part.remove();
			break;
	}
};

/**
 * @protected
 * @fires transclusionPartSelected
 */
ve.ui.MWTransclusionOutlinePartWidget.prototype.onHeaderClick = function () {
	this.emit( 'transclusionPartSelected', this.getData() );
};

/**
 * Convenience method, modelled after {@see OO.ui.OptionWidget}, but this isn't one.
 *
 * @return {boolean}
 */
ve.ui.MWTransclusionOutlinePartWidget.prototype.isSelected = function () {
	return this.header.isSelected();
};

/**
 * Convenience method, modelled after {@see OO.ui.OptionWidget}, but this isn't one.
 *
 * @param {boolean} state
 */
ve.ui.MWTransclusionOutlinePartWidget.prototype.setSelected = function ( state ) {
	this.header
		.setSelected( state )
		.setFlags( { progressive: state } );
};
