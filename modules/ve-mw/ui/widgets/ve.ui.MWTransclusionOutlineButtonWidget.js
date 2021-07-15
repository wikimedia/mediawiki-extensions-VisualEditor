/**
 * Generic button-like widget for items in the template dialog sidebar. See {OO.ui.ButtonWidget} for
 * inspiration.
 *
 * @class
 * @extends OO.ui.Widget
 *
 * @constructor
 * @param {Object} config
 * @cfg {string} [icon='']
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
	OO.ui.mixin.LabelElement.call( this, config );

	this.$element
		.addClass( 've-ui-mwTransclusionOutlineButtonWidget' )
		.append( this.$button.append( this.$icon, this.$label ) );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlineButtonWidget, OO.ui.Widget );
OO.mixinClass( ve.ui.MWTransclusionOutlineButtonWidget, OO.ui.mixin.ButtonElement );
OO.mixinClass( ve.ui.MWTransclusionOutlineButtonWidget, OO.ui.mixin.IconElement );
OO.mixinClass( ve.ui.MWTransclusionOutlineButtonWidget, OO.ui.mixin.LabelElement );
// TODO: Add OO.ui.mixin.TitledElement?
// TODO: Add OO.ui.mixin.TabIndexedElement?
// TODO: Add OO.ui.mixin.AccessKeyedElement?
