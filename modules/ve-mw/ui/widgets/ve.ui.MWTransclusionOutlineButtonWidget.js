/**
 * Generic button-like widget for items in the template dialog sidebar. See
 * {@see OO.ui.ButtonWidget} for inspiration.
 *
 * @class
 * @extends OO.ui.OptionWidget
 *
 * @constructor
 * @param {Object} config
 * @cfg {string} [icon=''] Symbolic name of an icon, e.g. "puzzle" or "wikiText"
 * @cfg {string} label
 */
ve.ui.MWTransclusionOutlineButtonWidget = function VeUiMWTransclusionOutlineButtonWidget( config ) {
	// Parent constructor
	ve.ui.MWTransclusionOutlineButtonWidget.super.call( this, config );

	// Mixin constructors
	OO.ui.mixin.ButtonElement.call( this, {
		framed: false
	} );
	OO.ui.mixin.IconElement.call( this, config );
	OO.ui.mixin.TabIndexedElement.call( this, ve.extendObject( {
		$tabIndexed: this.$button
	}, config ) );

	this.$element
		.addClass( 've-ui-mwTransclusionOutlineButtonWidget' )
		.append( this.$button.append( this.$icon, this.$label ) );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlineButtonWidget, OO.ui.OptionWidget );
OO.mixinClass( ve.ui.MWTransclusionOutlineButtonWidget, OO.ui.mixin.ButtonElement );
OO.mixinClass( ve.ui.MWTransclusionOutlineButtonWidget, OO.ui.mixin.IconElement );
OO.mixinClass( ve.ui.MWTransclusionOutlineButtonWidget, OO.ui.mixin.TabIndexedElement );

ve.ui.MWTransclusionOutlineButtonWidget.static.highlightable = false;
ve.ui.MWTransclusionOutlineButtonWidget.static.pressable = false;
