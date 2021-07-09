/*!
 * VisualEditor user interface MWTemplateOutlineParameterCheckboxLayout class.
 *
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Container for checkbox and label
 *
 * @class
 * @extends OO.ui.FieldLayout
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWTemplateOutlineParameterCheckboxLayout = function VeUiMWTemplateOutlineParameterCheckboxLayout( config ) {
	config = config || {};
	config = $.extend( { align: 'inline' }, config );

	this.checkbox = new OO.ui.CheckboxInputWidget( {
		title: config.required ? ve.msg( 'visualeditor-dialog-transclusion-required-parameter' ) : null,
		disabled: config.required,
		selected: config.selected || config.required
	} )
	// FIXME: pass-through binding like [ 'emit', 'toggle' ]?
		.connect( this, {
			change: 'onEdit'
		} );

	// Parent constructor
	ve.ui.MWTemplateOutlineParameterCheckboxLayout.super.call( this, this.checkbox, config );

	// Initialization
	this.$element.addClass( 've-ui-mwTransclusionOutlineItem' );

	// Override base behaviors
	// Unwire native label->input linkage, and replace with our custom click handler.
	this.$label
		.attr( 'for', null );
	this.$header
		.on( 'click', this.onLabelClick.bind( this ) );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTemplateOutlineParameterCheckboxLayout, OO.ui.FieldLayout );

/* Events */

/**
 * @event change
 * @param {string} name Parameter name
 * @param {boolean} checked New checkbox state
 */

/**
 * @event select
 * @param {string} name Parameter name
 */

/* Methods */

/**
 * Handles a checkbox input widget change event {@see OO.ui.CheckboxInputWidget}.
 *
 * @param {boolean} value
 * @fires change
 */
ve.ui.MWTemplateOutlineParameterCheckboxLayout.prototype.onEdit = function ( value ) {
	this.emit( 'change', this.getData(), value );
};

/**
 * @fires select
 */
ve.ui.MWTemplateOutlineParameterCheckboxLayout.prototype.onLabelClick = function () {
	if ( !this.fieldWidget.isSelected() ) {
		this.fieldWidget.setSelected( true );
	}
	this.emit( 'select', this.getData() );
};

ve.ui.MWTemplateOutlineParameterCheckboxLayout.prototype.setSelected = function ( state, internal ) {
	this.checkbox.setSelected( state, internal );
};
