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

	var checkbox = new OO.ui.CheckboxInputWidget( {
		title: config.required ? ve.msg( 'visualeditor-dialog-transclusion-required-parameter' ) : null,
		disabled: config.required,
		selected: config.selected || config.required
	} )
	// FIXME: pass-through binding like [ 'emit', 'toggle' ]?
		.connect( this, {
			change: 'onEdit'
		} );

	// Parent constructor
	ve.ui.MWTemplateOutlineParameterCheckboxLayout.super.call( this, checkbox, config );

	// Initialization
	this.$element.addClass( 've-ui-templateOutlineItem' );

	// Override base behaviors
	// Unwire native label->input linkage, and replace with our custom click handler.
	this.$label
		.attr( 'for', null );
	this.$header
		.on( 'click', this.onLabelClick.bind( this ) );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTemplateOutlineParameterCheckboxLayout, OO.ui.FieldLayout );

/* Methods */
ve.ui.MWTemplateOutlineParameterCheckboxLayout.prototype.onEdit = function ( value ) {
	this.emit( 'change', value );
};

ve.ui.MWTemplateOutlineParameterCheckboxLayout.prototype.onLabelClick = function () {
	if ( !this.fieldWidget.isSelected() ) {
		this.fieldWidget.setSelected( true );
	}
	this.emit( 'select' );
};
