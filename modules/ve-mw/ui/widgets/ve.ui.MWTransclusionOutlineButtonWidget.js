/**
 * Generic button-like widget for top-level parts in the template dialog
 * sidebar. See {@see OO.ui.ButtonWidget} for inspiration.
 *
 * @class
 * @extends OO.ui.OptionWidget
 * @mixes OO.ui.mixin.ButtonElement
 * @mixes OO.ui.mixin.IconElement
 * @mixes OO.ui.mixin.TabIndexedElement
 * @mixes ve.ui.MWAriaDescribe
 *
 * @constructor
 * @param {Object} config
 * @param {string} [config.icon=''] Symbolic name of an icon, e.g. "puzzle" or "wikiText"
 * @param {string} config.label
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
	ve.ui.MWAriaDescribe.call( this, {
		ariaLabel: config.label,
		$describedElement: this.$button
	} );

	// FIXME hack for screen readers to understand the selection state
	this.$button.attr( {
		role: 'gridcell',
		'aria-selected': 'false'
	} );

	this.$element
		.append( this.$button.append( this.$icon, this.$label ) );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlineButtonWidget, OO.ui.OptionWidget );
OO.mixinClass( ve.ui.MWTransclusionOutlineButtonWidget, OO.ui.mixin.ButtonElement );
OO.mixinClass( ve.ui.MWTransclusionOutlineButtonWidget, OO.ui.mixin.IconElement );
OO.mixinClass( ve.ui.MWTransclusionOutlineButtonWidget, OO.ui.mixin.TabIndexedElement );
OO.mixinClass( ve.ui.MWTransclusionOutlineButtonWidget, ve.ui.MWAriaDescribe );

ve.ui.MWTransclusionOutlineButtonWidget.static.highlightable = false;
ve.ui.MWTransclusionOutlineButtonWidget.static.pressable = false;

/* Events */

/**
 * @event ve.ui.MWTransclusionOutlineButtonWidget#keyPressed
 * @param {number} key Typically one of the {@see OO.ui.Keys} constants
 */

/**
 * @inheritDoc OO.ui.mixin.ButtonElement
 * @param {jQuery.Event} e
 * @fires ve.ui.MWTransclusionOutlineButtonWidget#keyPressed
 */
ve.ui.MWTransclusionOutlineButtonWidget.prototype.onKeyDown = function ( e ) {
	const isMac = ve.getSystemPlatform() === 'mac';
	const withMetaKey = isMac ? e.metaKey : e.ctrlKey;

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
	}

	return OO.ui.mixin.ButtonElement.prototype.onKeyDown.call( this, e );
};

/**
 * @inheritDoc
 */
ve.ui.MWTransclusionOutlineButtonWidget.prototype.setSelected = function ( state ) {
	if ( this.$button ) {
		this.$button.attr( 'aria-selected', state.toString() );
	}
	return ve.ui.MWTransclusionOutlineButtonWidget.super.prototype.setSelected.call( this, state );
};
