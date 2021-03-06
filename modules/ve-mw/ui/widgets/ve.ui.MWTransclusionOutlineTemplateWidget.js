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
			return paramName;
		} )
		.map( function ( paramName ) {
			return widget.createCheckbox( paramName );
		} );

	this.searchWidget = new OO.ui.SearchInputWidget( {
		placeholder: ve.msg( 'visualeditor-dialog-transclusion-filter-placeholder' ),
		classes: [ 've-ui-mwTransclusionOutlineTemplateWidget-searchWidget' ]
	} ).connect( this, {
		change: 'onFilterChange'
	} ).toggle( false );
	this.infoWidget = new OO.ui.LabelWidget( {
		label: new OO.ui.HtmlSnippet( ve.msg( 'visualeditor-dialog-transclusion-filter-no-match' ) ),
		classes: [ 've-ui-mwTransclusionOutlineTemplateWidget-no-match' ]
	} ).toggle( false );

	var addParameterButton = new ve.ui.MWTransclusionOutlineButtonWidget( {
		icon: 'parameter',
		label: ve.msg( 'visualeditor-dialog-transclusion-add-param' )
	} ).connect( this, { click: 'onAddParameterButtonClick' } );

	this.parameters = new OO.ui.FieldsetLayout()
		.connect( this, { change: 'onCheckboxListChange' } );
	this.parameters.addItems( checkboxes );

	this.$element.append(
		this.searchWidget.$element,
		this.infoWidget.$element,
		this.parameters.$element,
		addParameterButton.$element
	);
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlineTemplateWidget, ve.ui.MWTransclusionOutlinePartWidget );

/**
 * @param {string} paramName
 * @return {ve.ui.MWTemplateOutlineParameterCheckboxLayout}
 */
ve.ui.MWTransclusionOutlineTemplateWidget.prototype.createCheckbox = function ( paramName ) {
	var spec = this.templateModel.getSpec();

	return new ve.ui.MWTemplateOutlineParameterCheckboxLayout( {
		required: spec.isParameterRequired( paramName ),
		label: spec.getParameterLabel( paramName ),
		data: paramName,
		selected: this.templateModel.hasParameter( paramName )
	} ).connect( this, {
		change: 'onCheckboxChange',
		select: 'onCheckboxSelect'
	} );
};

/**
 * Handles a template model add event {@see ve.dm.MWTemplateModel}.
 * Triggered when a parameter is added to the template model.
 *
 * @param {ve.dm.MWParameterModel} param
 */
ve.ui.MWTransclusionOutlineTemplateWidget.prototype.onAddParameter = function ( param ) {
	var paramName = param.getName(),
		checkbox = this.parameters.findItemFromData( paramName );

	// All parameters known via the spec already have a checkbox
	if ( checkbox ) {
		checkbox.setSelected( true, true );
	} else if ( paramName ) {
		this.searchWidget.setValue( '' );
		this.parameters.addItems(
			[ this.createCheckbox( paramName ) ],
			this.templateModel.getAllParametersOrdered().indexOf( paramName )
		);
	}
};

/**
 * Handles a template model remove event {@see ve.dm.MWTemplateModel}.
 * Triggered when a parameter is removed from the template model.
 *
 * @param {ve.dm.MWParameterModel} param
 */
ve.ui.MWTransclusionOutlineTemplateWidget.prototype.onRemoveParameter = function ( param ) {
	var checkbox = this.parameters.findItemFromData( param.getName() );
	if ( checkbox ) {
		checkbox.setSelected( false, true );
	}
};

/**
 * Handles a parameter checkbox change event {@see ve.ui.MWTemplateOutlineParameterCheckboxLayout}
 *
 * @param {string} paramName
 * @param {boolean} checked New checkbox state
 */
ve.ui.MWTransclusionOutlineTemplateWidget.prototype.onCheckboxChange = function ( paramName, checked ) {
	var param = this.templateModel.getParameter( paramName );
	if ( !checked ) {
		this.templateModel.removeParameter( param );
	} else if ( !param ) {
		this.templateModel.addParameter( new ve.dm.MWParameterModel( this.templateModel, paramName ) );
	}
};

/**
 * @param {string} paramName
 */
ve.ui.MWTransclusionOutlineTemplateWidget.prototype.onCheckboxSelect = function ( paramName ) {
	var param = this.templateModel.getParameter( paramName );
	if ( param ) {
		// FIXME: This triggers a chain of events that (re)does way to much. Replace!
		this.templateModel.addParameter( param );
	}
};

ve.ui.MWTransclusionOutlineTemplateWidget.prototype.onAddParameterButtonClick = function () {
	// FIXME: This triggers a chain of events that (re)does way to much. Replace!
	this.templateModel.addParameter( new ve.dm.MWParameterModel( this.templateModel ) );
};

/**
 * @param {OO.ui.Element[]} items
 */
ve.ui.MWTransclusionOutlineTemplateWidget.prototype.onCheckboxListChange = function ( items ) {
	this.searchWidget.toggle( items.length >= 1 );
};

/**
 * Narrows the list of checkboxes down to parameters that match the user's input. The search
 * algorithm is modelled after {@see ve.ui.MWParameterSearchWidget.buildIndex}. We search the
 * parameter's primary name, aliases, label, and description. But not e.g. the example value.
 *
 * @param {string} query user input
 */
ve.ui.MWTransclusionOutlineTemplateWidget.prototype.onFilterChange = function ( query ) {
	var spec = this.templateModel.getSpec(),
		checkboxes = this.parameters,
		nothingFound = true;

	query = query.trim().toLowerCase();

	// Note: We can't really cache this because the list of know parameters can change any time
	this.templateModel.getAllParametersOrdered().forEach( function ( paramName ) {
		var checkbox = checkboxes.findItemFromData( paramName );
		if ( !checkbox ) {
			return;
		}

		var placesToSearch = [
			spec.getPrimaryParameterName( paramName ),
			spec.getParameterLabel( paramName ),
			spec.getParameterDescription( paramName )
		].concat( spec.getParameterAliases( paramName ) );

		var foundSomeMatch = placesToSearch.some( function ( term ) {
			return term && term.toLowerCase().indexOf( query ) !== -1;
		} );

		checkbox.toggle( foundSomeMatch );
		nothingFound = nothingFound && !foundSomeMatch;
	} );

	this.infoWidget.toggle( nothingFound );
};
