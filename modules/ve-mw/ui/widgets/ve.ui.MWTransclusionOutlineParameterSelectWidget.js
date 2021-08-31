/**
 * This is modelled after {@see OO.ui.OutlineSelectWidget}.
 *
 * @class
 * @extends OO.ui.SelectWidget
 *
 * @constructor
 * @param {Object} [config]
 */
ve.ui.MWTransclusionOutlineParameterSelectWidget = function VeUiMWTransclusionOutlineParameterSelectWidget( config ) {
	// Parent constructor
	ve.ui.MWTransclusionOutlineParameterSelectWidget.super.call( this, ve.extendObject( config, {
		multiselect: true
	} ) );

	// Mixin constructors
	OO.ui.mixin.TabIndexedElement.call( this, config );

	// Events
	this.$element.on( {
		focus: this.bindDocumentKeyDownListener.bind( this ),
		blur: this.unbindDocumentKeyDownListener.bind( this )
	} );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlineParameterSelectWidget, OO.ui.SelectWidget );
OO.mixinClass( ve.ui.MWTransclusionOutlineParameterSelectWidget, OO.ui.mixin.TabIndexedElement );

/* Events */

/**
 * @event parameterFocused
 * @param {string} paramName
 */

/* Static Methods */

/**
 * @param {Object} config
 * @param {string} config.data Parameter name
 * @param {string} config.label
 * @param {boolean} [config.required] Required parameters can't be unchecked
 * @param {boolean} [config.selected] If the parameter is currently used (checked)
 * @return {ve.ui.MWTransclusionOutlineParameterWidget}
 */
ve.ui.MWTransclusionOutlineParameterSelectWidget.static.createItem = function ( config ) {
	return new ve.ui.MWTransclusionOutlineParameterWidget( config );
};

/* Methods */

/**
 * @inheritDoc OO.ui.mixin.GroupElement
 * @param {ve.ui.MWTransclusionOutlineParameterWidget[]} items
 * @param {number} [index]
 * @return {ve.ui.MWTransclusionOutlineParameterSelectWidget}
 */
ve.ui.MWTransclusionOutlineParameterSelectWidget.prototype.addItems = function ( items, index ) {
	var self = this;
	items.forEach( function ( item ) {
		item.connect( self, {
			change: [ 'onCheckboxChange', item ]
		} );
	} );

	return ve.ui.MWTransclusionOutlineParameterSelectWidget.super.prototype.addItems.call( this, items, index );
};

/**
 * @param {string} paramName
 */
ve.ui.MWTransclusionOutlineParameterSelectWidget.prototype.markParameterAsUnused = function ( paramName ) {
	// There is no OO.ui.SelectWidget.unselectItemByData(), we need to do this manually
	var item = this.findItemFromData( paramName );
	if ( item ) {
		item.setSelected( false );
	}
};

/**
 * @private
 * @param {ve.ui.MWTransclusionOutlineParameterWidget} item
 * @param {boolean} value
 */
ve.ui.MWTransclusionOutlineParameterSelectWidget.prototype.onCheckboxChange = function ( item, value ) {
	// This extra check shouldn't be necessary, but better be safe than sorry
	if ( item.isSelected() !== value ) {
		// Note: This should have been named `toggle…` as it toggles the item's selection
		this.chooseItem( item );
	}
};

/**
 * @inheritDoc OO.ui.SelectWidget
 * @param {jQuery.Event} e
 * @fires parameterFocused
 */
ve.ui.MWTransclusionOutlineParameterSelectWidget.prototype.onMouseDown = function ( e ) {
	if ( e.which === OO.ui.MouseButtons.LEFT ) {
		var item = this.findTargetItem( e );
		if ( item && item.isSelected() ) {
			this.emit( 'parameterFocused', item.getData() );

			// Don't call the parent, i.e. can't click to unselect the item
			return false;
		}
	}

	ve.ui.MWTransclusionOutlineParameterSelectWidget.super.prototype.onMouseDown.call( this, e );
};

/**
 * @inheritDoc OO.ui.SelectWidget
 * @param {KeyboardEvent} e
 * @fires choose
 * @fires parameterFocused
 */
ve.ui.MWTransclusionOutlineParameterSelectWidget.prototype.onDocumentKeyDown = function ( e ) {
	var item;

	switch ( e.keyCode ) {
		case OO.ui.Keys.HOME:
			item = this.items[ 0 ];
			if ( item ) {
				this.highlightItem( item );
			}
			break;
		case OO.ui.Keys.END:
			item = this.items[ this.items.length - 1 ];
			if ( item ) {
				this.highlightItem( item );
			}
			break;
		case OO.ui.Keys.SPACE:
			item = this.findHighlightedItem();
			if ( item ) {
				// Note: This should have been named `toggle…` as it toggles the item's selection
				this.chooseItem( item );
			}
			e.preventDefault();
			break;
		case OO.ui.Keys.ENTER:
			item = this.findHighlightedItem();
			if ( item && item.isSelected() ) {
				this.emit( 'parameterFocused', item.getData() );
				e.preventDefault();

				// Don't call the parent, i.e. can't use enter to unselect the item
				return false;
			}
			break;
	}

	ve.ui.MWTransclusionOutlineParameterSelectWidget.super.prototype.onDocumentKeyDown.call( this, e );
};
