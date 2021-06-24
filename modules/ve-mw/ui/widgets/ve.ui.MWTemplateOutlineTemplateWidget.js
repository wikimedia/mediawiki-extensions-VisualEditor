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
		add: 'onAddParameter',
		remove: 'onRemoveParameter'
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

	var templateLabel = new OO.ui.Layout( {
		classes: [ 've-ui-templateOutlineTemplateLabel' ],
		content: [
			new OO.ui.IconWidget( {
				icon: 'puzzle'
			} ),
			new OO.ui.LabelWidget( {
				label: config.templateModel.getSpec().getLabel()
			} )
		]
	} );

	this.parameters = new OO.ui.FieldsetLayout( {
		items: checkboxes
	} );
	var layout = new OO.ui.Layout( {
		// TODO: template title and icon
		// items: [ this.parameters ]
	} );
	layout.$element
		.append( templateLabel.$element, this.parameters.$element, addParameterButton.$element );

	this.$element
		.append( layout.$element )
		.addClass( 've-ui-mwTemplateDialogOutlineTemplate' );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTemplateOutlineTemplateWidget, OO.ui.Widget );

ve.ui.MWTemplateOutlineTemplateWidget.prototype.createCheckbox = function ( parameter ) {
	var parameterModel = ( parameter instanceof ve.dm.MWParameterModel ) ?
			parameter : this.templateModel.getParameter( parameter ),
		isPresent = !!parameterModel;

	if ( !parameterModel ) {
		// TODO: Streamline, don't create a temporary parameter model?
		parameterModel = new ve.dm.MWParameterModel( this.templateModel, parameter );
	}
	return new ve.ui.MWTemplateOutlineParameterCheckboxLayout( {
		required: parameterModel.isRequired(),
		label: parameterModel.getName(),
		data: parameterModel.getName(),
		selected: isPresent
	} ).connect( this, {
		change: 'onCheckboxChange'
	} );
};

ve.ui.MWTemplateOutlineTemplateWidget.prototype.onAddParameter = function ( parameter ) {
	var paramCheckbox = this.parameters.findItemFromData( parameter.getName() );

	if ( !paramCheckbox ) {
		this.parameters.addItems(
			this.createCheckbox( parameter ),
			this.templateModel.getAllParametersOrdered().indexOf( parameter.getName() )
		);
	} else {
		paramCheckbox.setSelected( true, true );
	}
};

ve.ui.MWTemplateOutlineTemplateWidget.prototype.onRemoveParameter = function ( parameter ) {
	var paramCheckbox = this.parameters.findItemFromData( parameter.getName() );

	if ( paramCheckbox ) {
		if ( this.templateModel.isParameterUnknown( parameter ) ) {
			paramCheckbox.disconnect( this );
			this.parameters.removeItems( [ paramCheckbox ] );
		} else {
			paramCheckbox.setSelected( false, true );
		}
	}
};

ve.ui.MWTemplateOutlineTemplateWidget.prototype.onCheckboxChange = function ( data, checked ) {
	var parameter = this.templateModel.getParameter( data );

	if ( checked ) {
		parameter = parameter || new ve.dm.MWParameterModel( this.templateModel, data );
		this.templateModel.addParameter( parameter );
	} else {
		if ( parameter ) {
			this.templateModel.removeParameter( parameter );
		}
	}
};
