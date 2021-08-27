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
		add: 'onParameterAddedToTemplateModel',
		remove: 'onParameterRemovedFromTemplateModel'
	} );

	var parameterNames = this.templateModel
		.getAllParametersOrdered()
		.filter( function ( paramName ) {
			if ( spec.isParameterDeprecated( paramName ) && !template.hasParameter( paramName ) ) {
				return false;
			}
			// Don't create a checkbox for ve.ui.MWParameterPlaceholderPage
			return paramName;
		} );

	this.searchWidget = new OO.ui.SearchInputWidget( {
		placeholder: ve.msg( 'visualeditor-dialog-transclusion-filter-placeholder' ),
		classes: [ 've-ui-mwTransclusionOutlineTemplateWidget-searchWidget' ]
	} ).connect( this, {
		change: 'filterParameters'
	} ).toggle( parameterNames.length );
	this.infoWidget = new OO.ui.LabelWidget( {
		label: new OO.ui.HtmlSnippet( ve.msg( 'visualeditor-dialog-transclusion-filter-no-match' ) ),
		classes: [ 've-ui-mwTransclusionOutlineTemplateWidget-no-match' ]
	} ).toggle( false );

	this.parameters = new ve.ui.MWTransclusionOutlineParameterSelectWidget( {
		items: parameterNames.map( this.createCheckbox.bind( this ) )
	} )
		.connect( this, {
			choose: 'onParameterChoose',
			parameterFocused: 'onParameterFocused',
			change: 'onParameterWidgetListChanged'
		} );

	this.$element.append(
		this.searchWidget.$element,
		this.infoWidget.$element,
		this.parameters.$element
	);
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlineTemplateWidget, ve.ui.MWTransclusionOutlinePartWidget );

/* Events */

/**
 * @event focusPart
 * @param {string} partId Unique id of the part, e.g. something "part_1" or "part_1/param1".
 */

/**
 * Triggered when the user uses the search widget at the top to filter the list of parameters.
 *
 * @event filterParameters
 * @param {Object.<string,boolean>} visibility Keyed by unique id of the parameter, e.g. something
 *  like "part_1/param1". Note this lists only parameters that are currently in use.
 */

/* Methods */

/**
 * @private
 * @param {string} paramName
 * @return {OO.ui.OptionWidget}
 */
ve.ui.MWTransclusionOutlineTemplateWidget.prototype.createCheckbox = function ( paramName ) {
	var spec = this.templateModel.getSpec();
	return ve.ui.MWTransclusionOutlineParameterSelectWidget.static.createItem( {
		required: spec.isParameterRequired( paramName ),
		label: spec.getParameterLabel( paramName ),
		data: paramName,
		selected: this.templateModel.hasParameter( paramName )
	} );
};

/**
 * @private
 * @param {string} paramName
 * @return {number}
 */
ve.ui.MWTransclusionOutlineTemplateWidget.prototype.findCanonicalPosition = function ( paramName ) {
	var insertAt = 0,
		// Note this might include parameters that don't have a checkbox, e.g. deprecated
		allParamNames = this.templateModel.getAllParametersOrdered();
	for ( var i = 0; i < allParamNames.length; i++ ) {
		if ( allParamNames[ i ] === paramName || !this.parameters.items[ insertAt ] ) {
			break;
		} else if ( this.parameters.items[ insertAt ].getData() === allParamNames[ i ] ) {
			insertAt++;
		}
	}
	return insertAt;
};

/**
 * @private
 * @param {ve.dm.MWParameterModel} param
 */
ve.ui.MWTransclusionOutlineTemplateWidget.prototype.onParameterAddedToTemplateModel = function ( param ) {
	var paramName = param.getName();
	// The placeholder (currently) doesn't get a corresponding item in the sidebar
	if ( !paramName ) {
		return;
	}

	// All parameters known via the spec already have a checkbox
	var item = this.parameters.findItemFromData( paramName );
	if ( !item ) {
		item = this.createCheckbox( paramName );
		this.parameters.addItems( [ item ], this.findCanonicalPosition( paramName ) );

		// Make sure an active filter is applied to the new checkbox as well
		var filter = this.searchWidget.getValue();
		if ( filter ) {
			this.filterParameters( filter );
		}
	}

	item.setSelected( true, true );

	// Reset filter, but only if it hides the relevant checkbox
	if ( !item.isVisible() ) {
		this.searchWidget.setValue( '' );
	}
};

/**
 * @private
 * @param {ve.dm.MWParameterModel} param
 */
ve.ui.MWTransclusionOutlineTemplateWidget.prototype.onParameterRemovedFromTemplateModel = function ( param ) {
	this.parameters.markParameterAsUnused( param.getName() );
};

/**
 * @private
 * @param {OO.ui.OptionWidget} item
 * @param {boolean} selected
 */
ve.ui.MWTransclusionOutlineTemplateWidget.prototype.onParameterChoose = function ( item, selected ) {
	var paramName = item.getData(),
		param = this.templateModel.getParameter( paramName );
	if ( !selected ) {
		this.templateModel.removeParameter( param );
	} else if ( !param ) {
		this.templateModel.addParameter( new ve.dm.MWParameterModel( this.templateModel, paramName ) );
	}
};

/**
 * @private
 * @param {string} paramName
 * @fires focusPart
 */
ve.ui.MWTransclusionOutlineTemplateWidget.prototype.onParameterFocused = function ( paramName ) {
	var param = this.templateModel.getParameter( paramName );
	if ( param ) {
		this.emit( 'focusPart', param.getId() );
	}
};

/**
 * @private
 * @param {OO.ui.Element[]} items
 */
ve.ui.MWTransclusionOutlineTemplateWidget.prototype.onParameterWidgetListChanged = function ( items ) {
	this.searchWidget.toggle( items.length >= 1 );
};

/**
 * Narrows the list of checkboxes down to parameters that match the user's input. The search
 * algorithm is modelled after {@see ve.ui.MWParameterSearchWidget.buildIndex}. We search the
 * parameter's primary name, aliases, label, and description. But not e.g. the example value.
 *
 * @private
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
	this.parameters.items.forEach( function ( item ) {
		var paramName = item.getData(),
			placesToSearch = [
				spec.getPrimaryParameterName( paramName ),
				spec.getParameterLabel( paramName ),
				spec.getParameterDescription( paramName )
			].concat( spec.getParameterAliases( paramName ) );

		var foundSomeMatch = placesToSearch.some( function ( term ) {
			return term && term.toLowerCase().indexOf( query ) !== -1;
		} );

		item.toggle( foundSomeMatch );

		nothingFound = nothingFound && !foundSomeMatch;

		var param = template.getParameter( paramName );
		if ( param ) {
			visibility[ param.getId() ] = foundSomeMatch;
		}
	} );

	this.infoWidget.toggle( nothingFound );
	self.emit( 'filterParameters', visibility );
};
