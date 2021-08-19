/*!
 * VisualEditor user interface MWTemplateOutlineParameterCheckboxLayout class.
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
ve.ui.MWTemplateOutlineParameterCheckboxLayout = function VeUiMWTemplateOutlineParameterCheckboxLayout( config ) {
	this.checkbox = new OO.ui.CheckboxInputWidget( {
		title: config.required ? ve.msg( 'visualeditor-dialog-transclusion-required-parameter' ) : null,
		disabled: config.required,
		selected: config.selected || config.required
	} )
	// FIXME: pass-through binding like [ 'emit', 'toggle' ]?
		.connect( this, { change: 'onCheckboxChange' } );
	this.checkbox.$input.on( 'keydown', this.onKeyDown.bind( this ) );

	// Parent constructor
	ve.ui.MWTemplateOutlineParameterCheckboxLayout.super.call( this, ve.extendObject( config, {
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

OO.inheritClass( ve.ui.MWTemplateOutlineParameterCheckboxLayout, OO.ui.OptionWidget );
OO.mixinClass( ve.ui.MWTemplateOutlineParameterCheckboxLayout, OO.ui.mixin.TabIndexedElement );

/* Events */

/**
 * @event change
 * @param {string} paramName
 * @param {boolean} checked New checkbox state
 */

/**
 * @event select
 * @param {string} paramName
 */

/* Methods */

/**
 * @private
 * @fires select
 */
ve.ui.MWTemplateOutlineParameterCheckboxLayout.prototype.onClick = function () {
	this.selectCheckbox( true );
};

/**
 * @private
 * @fires select
 */
ve.ui.MWTemplateOutlineParameterCheckboxLayout.prototype.onKeyDown = function ( e ) {
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
 * @fires change
 */
ve.ui.MWTemplateOutlineParameterCheckboxLayout.prototype.onCheckboxChange = function ( value ) {
	this.emit( 'change', this.getData(), value );
};

/**
 * @private
 * @param {boolean} state Selected state
 * @fires select
 */
ve.ui.MWTemplateOutlineParameterCheckboxLayout.prototype.selectCheckbox = function ( state ) {
	if ( !this.checkbox.isDisabled() ) {
		this.checkbox.setSelected( state );
	}
	// Note: Must be fired even if the checkbox was selected before, for proper focus behavior
	this.emit( 'select', this.getData() );
};
