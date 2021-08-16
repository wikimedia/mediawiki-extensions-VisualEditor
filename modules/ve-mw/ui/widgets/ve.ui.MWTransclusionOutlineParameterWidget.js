/*!
 * VisualEditor user interface MWTransclusionOutlineParameterWidget class.
 *
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Container for checkbox and label
 *
 * @class
 * @extends OO.ui.OptionWidget
 *
 * @constructor
 * @param {Object} config
 * @cfg {string} data Parameter name
 * @cfg {string} label
 * @cfg {boolean} [required]
 * @cfg {boolean} [selected]
 */
ve.ui.MWTransclusionOutlineParameterWidget = function VeUiMWTransclusionOutlineParameterWidget( config ) {
	this.checkbox = new OO.ui.CheckboxInputWidget( {
		title: config.required ? ve.msg( 'visualeditor-dialog-transclusion-required-parameter' ) : null,
		disabled: config.required,
		selected: config.selected || config.required
	} )
	// FIXME: pass-through binding like [ 'emit', 'toggle' ]?
		.connect( this, { change: 'onCheckboxChange' } );
	this.checkbox.$input.on( 'keydown', this.onKeyDown.bind( this ) );

	// Parent constructor
	ve.ui.MWTransclusionOutlineParameterWidget.super.call( this, ve.extendObject( config, {
		$label: $( '<label>' )
	} ) );

	// Mixin constructors
	OO.ui.mixin.TabIndexedElement.call( this, ve.extendObject( config, {
		tabIndex: this.checkbox.isDisabled() ? 0 : -1
	} ) );

	// Initialization
	this.$element
		.addClass( 've-ui-mwTransclusionOutlineItem' )
		.append( this.checkbox.$element, this.$label )
		.on( 'click', this.onClick.bind( this ) )
		.on( 'keydown', this.onKeyDown.bind( this ) );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlineParameterWidget, OO.ui.OptionWidget );
OO.mixinClass( ve.ui.MWTransclusionOutlineParameterWidget, OO.ui.mixin.TabIndexedElement );

/* Events */

/**
 * @event parameterSelectionChanged
 * @param {string} paramName
 * @param {boolean} selected
 */

/**
 * @event parameterFocused
 * @param {string} paramName
 */

/* Methods */

/**
 * @private
 * @fires parameterFocused
 */
ve.ui.MWTransclusionOutlineParameterWidget.prototype.onClick = function () {
	this.selectCheckbox( true );
};

/**
 * @private
 * @fires parameterFocused
 */
ve.ui.MWTransclusionOutlineParameterWidget.prototype.onKeyDown = function ( e ) {
	if ( e.keyCode === OO.ui.Keys.SPACE ) {
		// FIXME: Focus should stay in the sidebar
	} else if ( e.keyCode === OO.ui.Keys.ENTER ) {
		this.selectCheckbox( true );
		return false;
	}
};

/**
 * Handles a checkbox input widget change event {@see OO.ui.CheckboxInputWidget}.
 *
 * @private
 * @param {boolean} value
 * @fires parameterSelectionChanged
 */
ve.ui.MWTransclusionOutlineParameterWidget.prototype.onCheckboxChange = function ( value ) {
	this.emit( 'parameterSelectionChanged', this.getData(), value );
};

/**
 * @private
 * @param {boolean} state Selected state
 * @fires parameterFocused
 */
ve.ui.MWTransclusionOutlineParameterWidget.prototype.selectCheckbox = function ( state ) {
	if ( !this.checkbox.isDisabled() ) {
		this.checkbox.setSelected( state );
	}
	// Note: Must be fired even if the checkbox was selected before, for proper focus behavior
	this.emit( 'parameterFocused', this.getData() );
};
