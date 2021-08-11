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
	var spec = template.getSpec();

	// Parent constructor
	ve.ui.MWTransclusionOutlineTemplateWidget.super.call( this, template, {
		icon: 'puzzle',
		label: spec.getLabel()
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
			if ( spec.isParameterDeprecated( paramName ) && !template.hasParameter( paramName ) ) {
				return false;
			}
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
		change: 'filterParameters'
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

/* Events */

/**
 * Triggered when the user uses the search widget at the top to filter the list of parameters.
 *
 * @event filterParameters
 * @param {Object.<string,boolean>} visibility Keyed by unique id of the parameter, e.g. something
 *  like "part_1/param1". Note this lists only parameters that are currently in use.
 */

/* Methods */

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
 * @param {ve.ui.MWTemplateOutlineParameterCheckboxLayout} checkbox
 */
ve.ui.MWTransclusionOutlineTemplateWidget.prototype.insertCheckboxAtCanonicalPosition = function ( checkbox ) {
	var paramName = checkbox.getData(),
		insertAt = 0,
		// Note this might include parameters that don't have a checkbox, e.g. deprecated
		allParamNames = this.templateModel.getAllParametersOrdered();
	for ( var i = 0; i < allParamNames.length; i++ ) {
		if ( allParamNames[ i ] === paramName || !this.parameters.items[ insertAt ] ) {
			break;
		} else if ( this.parameters.items[ insertAt ].getData() === allParamNames[ i ] ) {
			insertAt++;
		}
	}
	this.parameters.addItems( [ checkbox ], insertAt );
};

/**
 * Handles a template model add event {@see ve.dm.MWTemplateModel}.
 * Triggered when a parameter is added to the template model.
 *
 * @param {ve.dm.MWParameterModel} param
 */
ve.ui.MWTransclusionOutlineTemplateWidget.prototype.onAddParameter = function ( param ) {
	var paramName = param.getName();
	// The placeholder (currently) doesn't get a corresponding item in the sidebar
	if ( !paramName ) {
		return;
	}

	// All parameters known via the spec already have a checkbox
	var checkbox = this.parameters.findItemFromData( paramName );
	if ( !checkbox ) {
		checkbox = this.createCheckbox( paramName );
		this.insertCheckboxAtCanonicalPosition( checkbox );
		// Make sure an active filter is applied to the new checkbox as well
		var filter = this.searchWidget.getValue();
		if ( filter ) {
			this.filterParameters( filter );
		}
	}

	checkbox.setSelected( true, true );

	// Reset filter, but only if it hides the relevant checkbox
	if ( !checkbox.isVisible() ) {
		this.searchWidget.setValue( '' );
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
 * @fires filterParameters
 */
ve.ui.MWTransclusionOutlineTemplateWidget.prototype.filterParameters = function ( query ) {
	var self = this,
		template = this.templateModel,
		spec = this.templateModel.getSpec(),
		visibility = {},
		nothingFound = true;

	query = query.trim().toLowerCase();

	// Note: We can't really cache this because the list of know parameters can change any time
	this.parameters.items.forEach( function ( checkbox ) {
		var paramName = checkbox.getData(),
			placesToSearch = [
				spec.getPrimaryParameterName( paramName ),
				spec.getParameterLabel( paramName ),
				spec.getParameterDescription( paramName )
			].concat( spec.getParameterAliases( paramName ) );

		var foundSomeMatch = placesToSearch.some( function ( term ) {
			return term && term.toLowerCase().indexOf( query ) !== -1;
		} );

		checkbox.toggle( foundSomeMatch );

		nothingFound = nothingFound && !foundSomeMatch;

		var param = template.getParameter( paramName );
		if ( param ) {
			visibility[ param.getId() ] = foundSomeMatch;
		}
	} );

	this.infoWidget.toggle( nothingFound );
	self.emit( 'filterParameters', visibility );
};
