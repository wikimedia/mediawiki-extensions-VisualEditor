/*!
 * VisualEditor user interface MWTemplateOutlineParameterCheckboxWidget class.
 *
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Container for checkbox and label
 *
 * @class
 * @extends OO.ui.Widget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWTemplateOutlineParameterCheckboxWidget = function VeUiMWTemplateOutlineParameterCheckboxWidget( config ) {
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
	ve.ui.MWTemplateOutlineParameterCheckboxWidget.super.call( this, checkbox, config );

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

OO.inheritClass( ve.ui.MWTemplateOutlineParameterCheckboxWidget, OO.ui.FieldLayout );

/* Methods */
ve.ui.MWTemplateOutlineParameterCheckboxWidget.prototype.onEdit = function ( value ) {
	this.emit( 'change', value );
};

ve.ui.MWTemplateOutlineParameterCheckboxWidget.prototype.onLabelClick = function () {
	if ( !this.fieldWidget.isSelected() ) {
		this.fieldWidget.setSelected( true );
	}
	this.emit( 'select' );
};
