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
 * @param {Object} config
 * @cfg {string} data Parameter name
 * @cfg {string} label
 * @cfg {boolean} [required]
 * @cfg {boolean} [selected]
 */
ve.ui.MWTemplateOutlineParameterCheckboxLayout = function VeUiMWTemplateOutlineParameterCheckboxLayout( config ) {
	config = config || {};
	config = ve.extendObject( { align: 'inline' }, config );

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
 * @param {string} paramName
 * @param {boolean} checked New checkbox state
 */

/**
 * @event select
 * @param {string} paramName
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
	// FIXME: Move up into the if()?
	this.emit( 'select', this.getData() );
};

ve.ui.MWTemplateOutlineParameterCheckboxLayout.prototype.setSelected = function ( state, internal ) {
	this.checkbox.setSelected( state, internal );
};
