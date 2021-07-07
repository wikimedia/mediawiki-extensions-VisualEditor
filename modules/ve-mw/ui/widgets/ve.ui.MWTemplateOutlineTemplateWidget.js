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
 * @param {Object} config
 * @param {ve.dm.MWTemplateModel} config.templateModel
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
	var checkboxes = this.templateModel
		.getAllParametersOrdered()
		.filter( function ( paramName ) {
			// Don't create a checkbox for ve.ui.MWParameterPlaceholderPage
			return paramName !== '';
		} )
		.map( function ( paramName ) {
			return widget.createCheckbox( paramName );
		} );

	var addParameterButton = new OO.ui.ButtonWidget( {
		framed: false,
		icon: 'parameter',
		label: ve.msg( 'visualeditor-dialog-transclusion-add-param' ),
		classes: [ 've-ui-templateOutlineItem' ]
	} );

	// FIXME: This is an abstract base class, it should not be instantiated directly
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
	// FIXME: This is an abstract base class, it should not be instantiated directly
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

/**
 * @param {string|ve.dm.MWParameterModel} parameter
 * @return {ve.ui.MWTemplateOutlineParameterCheckboxLayout}
 */
ve.ui.MWTemplateOutlineTemplateWidget.prototype.createCheckbox = function ( parameter ) {
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
ve.ui.MWTemplateOutlineTemplateWidget.prototype.onAddParameter = function ( parameter ) {
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
ve.ui.MWTemplateOutlineTemplateWidget.prototype.onRemoveParameter = function ( parameter ) {
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
