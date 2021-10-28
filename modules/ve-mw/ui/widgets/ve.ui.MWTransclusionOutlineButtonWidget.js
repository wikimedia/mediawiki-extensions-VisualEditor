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
	ve.ui.MWTransclusionOutlineButtonWidget.super.call( this, ve.extendObject( config, {
		classes: [ 've-ui-mwTransclusionOutlineButtonWidget' ]
	} ) );

	// Mixin constructors
	OO.ui.mixin.ButtonElement.call( this, {
		// FIXME semantically this could be a <legend> and the surrounding OutlinePartWidget a <fieldset>
		$button: $( '<span>' ),
		framed: false
	} );
	OO.ui.mixin.IconElement.call( this, config );
	OO.ui.mixin.TabIndexedElement.call( this, ve.extendObject( {
		$tabIndexed: this.$button
	}, config ) );

	this.$element
		.append( this.$button.append( this.$icon, this.$label ) );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlineButtonWidget, OO.ui.OptionWidget );
OO.mixinClass( ve.ui.MWTransclusionOutlineButtonWidget, OO.ui.mixin.ButtonElement );
OO.mixinClass( ve.ui.MWTransclusionOutlineButtonWidget, OO.ui.mixin.IconElement );
OO.mixinClass( ve.ui.MWTransclusionOutlineButtonWidget, OO.ui.mixin.TabIndexedElement );

ve.ui.MWTransclusionOutlineButtonWidget.static.highlightable = false;
ve.ui.MWTransclusionOutlineButtonWidget.static.pressable = false;

/* Events */

/**
 * @event keyPressed
 * @param {number} key Typically one of the {@see OO.ui.Keys} constants
 */

/**
 * @inheritDoc OO.ui.mixin.ButtonElement
 * @param {jQuery.Event} e
 * @fires keyPressed
 */
ve.ui.MWTransclusionOutlineButtonWidget.prototype.onKeyDown = function ( e ) {
	var isMac = ve.getSystemPlatform() === 'mac';
	var withMetaKey = isMac ? e.metaKey : e.ctrlKey;

	if ( e.which === OO.ui.Keys.SPACE &&
		!withMetaKey && !e.shiftKey && !e.altKey
	) {
		// We know we can only select another part, so don't even try to unselect this one
		if ( !this.isSelected() ) {
			this.emit( 'keyPressed', e.which );
		}
		// The default behavior of pressing space is to scroll down
		e.preventDefault();
		return;
	} else if ( ( e.which === OO.ui.Keys.UP || e.which === OO.ui.Keys.DOWN ) &&
		withMetaKey && e.shiftKey &&
		!e.altKey
	) {
		this.emit( 'keyPressed', e.which );
		// TODO: Do we need e.preventDefault() and/or e.stopPropagation() here?
		return;
	} else if ( e.which === OO.ui.Keys.DELETE &&
		withMetaKey &&
		!e.shiftKey && !e.altKey
	) {
		this.emit( 'keyPressed', e.which );
		// To not trigger the "clear cache" feature in Chrome we must do both
		e.preventDefault();
		e.stopPropagation();
		return;
	}

	return OO.ui.mixin.ButtonElement.prototype.onKeyDown.call( this, e );
};
