/*!
 * VisualEditor user interface MWTemplateOutlineTemplateWidget class.
 *
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Container for template, as rendered in the template dialog sidebar.
 *
 * @class
 * @extends OO.ui.Widget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWTemplateOutlineTemplateWidget = function VeUiMWTemplateOutlineTemplateWidget( config ) {
	// Parent constructor
	ve.ui.MWTemplateOutlineTemplateWidget.super.call( this, config );

	// Initialization
	this.templateModel = config.templateModel.connect( this, {
		add: 'onAddParameter'
		// remove: 'onRemoveParameter'
	} );

	var widget = this;
	var checkboxes = this.templateModel.getAllParametersOrdered().filter( function ( parameter ) {
		return parameter !== '';
	} ).map( function ( parameter ) {
		return widget.createCheckbox( parameter );
	} );

	var addParameterButton = new OO.ui.ButtonWidget( {
		framed: false,
		icon: 'parameter',
		label: ve.msg( 'visualeditor-dialog-transclusion-add-param' ),
		classes: [ 've-ui-templateOutlineItem' ]
	} );

	this.parameters = new OO.ui.FieldsetLayout( {
		items: checkboxes
	} );
	var layout = new OO.ui.Layout( {
		// TODO: template title and icon
		items: [ this.parameters ]
	} );
	layout.$element
		.append( this.parameters.$element, addParameterButton.$element );

	this.$element
		.append( layout.$element )
		.addClass( 've-ui-mwTemplateDialogOutlineTemplate' );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTemplateOutlineTemplateWidget, OO.ui.Widget );

ve.ui.MWTemplateOutlineTemplateWidget.prototype.createCheckbox = function ( name ) {
	var parameterModel = this.templateModel.getParameter( name );
	var isPresent = !!parameterModel;
	if ( !parameterModel ) {
		// TODO: Streamline, don't create a temporary parameter model?
		parameterModel = new ve.dm.MWParameterModel( this.templateModel, name );
	}
	return new ve.ui.MWTemplateOutlineParameterCheckboxLayout( {
		required: parameterModel.isRequired(),
		label: parameterModel.getName(),
		selected: isPresent
	} );
};

ve.ui.MWTemplateOutlineTemplateWidget.prototype.onAddParameter = function ( /* parameter */ ) {
	// Note: this is not called when initially populating the template, we attach to its events too late.
};
