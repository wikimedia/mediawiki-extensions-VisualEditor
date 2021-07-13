/*!
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Container for template, as rendered in the template dialog sidebar.
 *
 * @class
 * @extends ve.ui.MWTransclusionOutlinePartWidget
 *
 * @constructor
 * @param {ve.dm.MWTemplateModel} template
 */
ve.ui.MWTransclusionOutlineTemplateWidget = function VeUiMWTransclusionOutlineTemplateWidget( template ) {
	// Parent constructor
	ve.ui.MWTransclusionOutlineTemplateWidget.super.call( this, template, {
		icon: 'puzzle',
		label: template.getSpec().getLabel()
	} );

	// Initialization
	this.templateModel = template.connect( this, {
		add: 'onAddParameter',
		remove: 'onRemoveParameter'
	} );

	var widget = this;
	var checkboxes = this.templateModel
		.getAllParametersOrdered()
		.filter( function ( paramName ) {
			// Don't create a checkbox for ve.ui.MWParameterPlaceholderPage
			return paramName !== '';
		} )
		.map( function ( paramName ) {
			return widget.createCheckbox( paramName );
		} );

	var addParameterButton = new ve.ui.MWTransclusionOutlineButtonWidget( {
		icon: 'parameter',
		label: ve.msg( 'visualeditor-dialog-transclusion-add-param' )
	} );

	this.parameters = new OO.ui.FieldsetLayout( {
		items: checkboxes
	} );
	this.$element
		.append( this.parameters.$element, addParameterButton.$element );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlineTemplateWidget, ve.ui.MWTransclusionOutlinePartWidget );

/**
 * @param {string|ve.dm.MWParameterModel} parameter
 * @return {ve.ui.MWTemplateOutlineParameterCheckboxLayout}
 */
ve.ui.MWTransclusionOutlineTemplateWidget.prototype.createCheckbox = function ( parameter ) {
	var templateSpec = this.templateModel.getSpec(),
		parameterModel = ( parameter instanceof ve.dm.MWParameterModel ) ?
			parameter : this.templateModel.getParameter( parameter ),
		isPresent = !!parameterModel;

	if ( !parameterModel ) {
		// TODO: Streamline, don't create a temporary parameter model?
		parameterModel = new ve.dm.MWParameterModel( this.templateModel, parameter );
	}
	return new ve.ui.MWTemplateOutlineParameterCheckboxLayout( {
		required: parameterModel.isRequired(),
		label: templateSpec.getParameterLabel( parameterModel.getName() ),
		data: parameterModel.getName(),
		selected: isPresent
	} ).connect( this, {
		change: 'onCheckboxChange'
	} );
};

/**
 * Handles a template model add event {@see ve.dm.MWTemplateModel}.
 * Triggered when a parameter is added to the template model.
 *
 * @param {ve.dm.MWParameterModel} parameter
 */
ve.ui.MWTransclusionOutlineTemplateWidget.prototype.onAddParameter = function ( parameter ) {
	var paramName = parameter.getName(),
		paramCheckbox = this.parameters.findItemFromData( paramName );

	if ( paramName === '' ) {
		// Don't create a checkbox for ve.ui.MWParameterPlaceholderPage
		return;
	}

	if ( !paramCheckbox ) {
		this.parameters.addItems(
			this.createCheckbox( parameter ),
			this.templateModel.getAllParametersOrdered().indexOf( paramName )
		);
	} else {
		paramCheckbox.setSelected( true, true );
	}
};

/**
 * Handles a template model remove event {@see ve.dm.MWTemplateModel}.
 * Triggered when a parameter is removed from the template model.
 *
 * @param {ve.dm.MWParameterModel} parameter
 */
ve.ui.MWTransclusionOutlineTemplateWidget.prototype.onRemoveParameter = function ( parameter ) {
	var paramCheckbox = this.parameters.findItemFromData( parameter.getName() );
	if ( paramCheckbox ) {
		paramCheckbox.setSelected( false, true );
	}
};

/**
 * Handles a parameter checkbox change event {@see ve.ui.MWTemplateOutlineParameterCheckboxLayout}
 *
 * @param {string} data Parameter name
 * @param {boolean} checked New checkbox state
 */
ve.ui.MWTransclusionOutlineTemplateWidget.prototype.onCheckboxChange = function ( data, checked ) {
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
