/**
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
	OO.ui.mixin.IconElement.call( this, config );
	OO.ui.mixin.LabelElement.call( this, config );

	this.$element
		.addClass( 've-ui-mwTransclusionOutlineButtonWidget' )
		.prepend( this.$icon, this.$label );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlineButtonWidget, OO.ui.Widget );
OO.mixinClass( ve.ui.MWTransclusionOutlineButtonWidget, OO.ui.mixin.IconElement );
OO.mixinClass( ve.ui.MWTransclusionOutlineButtonWidget, OO.ui.mixin.LabelElement );
// TODO: Add OO.ui.mixin.AccessKeyedElement?
// TODO: Add OO.ui.mixin.TitledElement?
