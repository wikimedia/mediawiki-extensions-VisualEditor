/*!
 * VisualEditor DataModel MWTemplateModel class.
 *
 * @copyright 2011-2020 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Represents a template invocation that's part of a (possibly unbalanced) sequence of template
 * invocations and raw wikitext snippets. Meant to be an item in a {@see ve.dm.MWTransclusionModel}.
 * Holds a back-reference to its parent.
 *
 * Holds a reference to the specification of the template, i.e. how the template is documented via
 * TemplateData. The actual invocation might be entirely different, missing parameters as well as
 * containing undocumented ones.
 *
 * @class
 * @extends ve.dm.MWTransclusionPartModel
 *
 * @constructor
 * @param {ve.dm.MWTransclusionModel} transclusion
 * @param {Object} target Template target
 * @param {string} target.wt Original wikitext of target
 * @param {string} [target.href] Hypertext reference to target
 */
ve.dm.MWTemplateModel = function VeDmMWTemplateModel( transclusion, target ) {
	// Parent constructor
	ve.dm.MWTemplateModel.super.call( this, transclusion );

	// Properties
	this.target = target;

	// TODO: Either here or in uses of this constructor we need to validate the title
	this.title = target.href ? mw.libs.ve.normalizeParsoidResourceName( target.href ) : null;
	this.orderedParameterNames = null;
	this.params = {};
	this.spec = new ve.dm.MWTemplateSpecModel( this );
	this.originalData = null;
};

/* Inheritance */

OO.inheritClass( ve.dm.MWTemplateModel, ve.dm.MWTransclusionPartModel );

/* Events */

/**
 * @event add
 * @param {ve.dm.MWParameterModel} param Added param
 */

/**
 * @event remove
 * @param {ve.dm.MWParameterModel} param Removed param
 */

/* Static Methods */

/**
 * Create from data.
 *
 * Data is in the format provided by Parsoid.
 *
 * @param {ve.dm.MWTransclusionModel} transclusion Transclusion template is in
 * @param {Object} data Template data
 * @return {ve.dm.MWTemplateModel} New template model
 */
ve.dm.MWTemplateModel.newFromData = function ( transclusion, data ) {
	var key,
		template = new ve.dm.MWTemplateModel( transclusion, data.target );

	for ( key in data.params ) {
		template.addParameter(
			new ve.dm.MWParameterModel( template, key, data.params[ key ].wt )
		);
	}

	template.setOriginalData( data );

	return template;
};

/**
 * Create from name.
 *
 * Name is equivalent to what would be entered between double brackets, defaulting to the Template
 * namespace, using a leading colon to access other namespaces.
 *
 * @param {ve.dm.MWTransclusionModel} transclusion Transclusion template is in
 * @param {string|mw.Title} name Template name
 * @return {ve.dm.MWTemplateModel|null} New template model
 */
ve.dm.MWTemplateModel.newFromName = function ( transclusion, name ) {
	var href, title,
		templateNs = mw.config.get( 'wgNamespaceIds' ).template;
	if ( name instanceof mw.Title ) {
		title = name;
		name = title.getRelativeText( templateNs );
	} else {
		title = mw.Title.newFromText( name, templateNs );
	}
	if ( title !== null ) {
		href = title.getPrefixedText();
		return new ve.dm.MWTemplateModel( transclusion, { href: href, wt: name } );
	}

	return null;
};

/* Methods */

/**
 * Get template target.
 *
 * @return {Object} Template target
 */
ve.dm.MWTemplateModel.prototype.getTarget = function () {
	return this.target;
};

/**
 * Get template title.
 *
 * @return {string|null} Template title, if available
 */
ve.dm.MWTemplateModel.prototype.getTitle = function () {
	return this.title;
};

/**
 * Get template specification.
 *
 * @return {ve.dm.MWTemplateSpecModel} Template specification
 */
ve.dm.MWTemplateModel.prototype.getSpec = function () {
	return this.spec;
};

/**
 * Get all params.
 *
 * @return {Object.<string,ve.dm.MWParameterModel>} Parameters keyed by name
 */
ve.dm.MWTemplateModel.prototype.getParameters = function () {
	return this.params;
};

/**
 * @param {string} name Parameter name
 * @return {ve.dm.MWParameterModel|undefined}
 */
ve.dm.MWTemplateModel.prototype.getParameter = function ( name ) {
	return this.params[ name ];
};

/**
 * Check if a parameter exists.
 *
 * @param {string} name Parameter name
 * @return {boolean} Parameter exists
 */
ve.dm.MWTemplateModel.prototype.hasParameter = function ( name ) {
	var primaryName,
		params = this.params;

	// Check if name (which may be an alias) is present in the template
	if ( name in params ) {
		return true;
	}

	// Check if the name is known at all
	if ( !this.spec.isParameterKnown( name ) ) {
		return false;
	}

	primaryName = this.spec.getParameterName( name );
	// Check for primary name (may be the same as name)
	if ( primaryName in params ) {
		return true;
	}
	// Check for other aliases (may include name)
	return this.spec.getParameterAliases( primaryName ).some( function ( alias ) {
		return alias in params;
	} );
};

/**
 * Get all potential parameters, known and unknown.
 *
 * All parameters reported by TemplateData, plus any unknown parameters present
 * in the template invocation.  Known parameters are ordered according to
 * `paramOrder`, or when absent to the order of parameters as they appear in
 * TemplateData.
 *
 * Known parameters are in TemplateData order, and unknown parameters are sorted
 * with numeric names first, followed by alphabetically sorted names.
 *
 * @return {string[]}
 */
ve.dm.MWTemplateModel.prototype.getAllParametersOrdered = function () {
	var knownParams = this.spec.getParameterOrder();
	var paramNames = Object.keys( this.params );
	var unknownParams = paramNames.filter( function ( name ) {
		return knownParams.indexOf( name ) === -1;
	} );
	// TODO: verify in a test that aliases are handled correctly.
	// Unknown parameters in alpha-numeric order second, empty string at the very end
	unknownParams.sort( function ( a, b ) {
		var aIsNaN = isNaN( a ),
			bIsNaN = isNaN( b );

		if ( a === '' ) {
			return 1;
		}
		if ( b === '' ) {
			return -1;
		}
		if ( aIsNaN && bIsNaN ) {
			// Two strings
			return a < b ? -1 : a === b ? 0 : 1;
		}
		if ( aIsNaN ) {
			// A is a string
			return 1;
		}
		if ( bIsNaN ) {
			// B is a string
			return -1;
		}
		// Two numbers
		return a - b;
	} );
	// TODO: cache results
	return knownParams.concat( unknownParams );
};

/**
 * Get ordered list of parameter names present in this template invocation.
 *
 * @return {string[]} List of parameter names
 */
ve.dm.MWTemplateModel.prototype.getOrderedParameterNames = function () {
	if ( !this.orderedParameterNames ) {
		var paramNames = Object.keys( this.params );
		this.orderedParameterNames = this.getAllParametersOrdered().filter( function ( name ) {
			return paramNames.indexOf( name ) !== -1;
		} );
	}
	return this.orderedParameterNames;
};

/**
 * Get parameter from its ID.
 *
 * @param {string} id Parameter ID
 * @return {ve.dm.MWParameterModel|null} Parameter with matching ID, null if no parameters match
 */
ve.dm.MWTemplateModel.prototype.getParameterFromId = function ( id ) {
	var name;

	for ( name in this.params ) {
		if ( this.params[ name ].getId() === id ) {
			return this.params[ name ];
		}
	}

	return null;
};

/**
 * Add a parameter to template.
 *
 * @param {ve.dm.MWParameterModel} param Parameter to add
 * @fires add
 */
ve.dm.MWTemplateModel.prototype.addParameter = function ( param ) {
	var name = param.getName();
	this.orderedParameterNames = null;
	this.params[ name ] = param;
	this.spec.fillFromTemplate();
	param.connect( this, { change: [ 'emit', 'change' ] } );
	this.emit( 'add', param );
	this.emit( 'change' );
};

/**
 * Remove a parameter from this MWTemplateModel, and emit events which result in removing the
 * parameter from the UI. Note this does *not* remove the parameter from the linked specification.
 *
 * @param {ve.dm.MWParameterModel} [param]
 * @fires remove
 * @fires change
 */
ve.dm.MWTemplateModel.prototype.removeParameter = function ( param ) {
	if ( param ) {
		this.orderedParameterNames = null;
		delete this.params[ param.getName() ];
		param.disconnect( this );
		this.emit( 'remove', param );
		this.emit( 'change' );
	}
};

/**
 * @inheritdoc
 */
ve.dm.MWTemplateModel.prototype.addPromptedParameters = function () {
	var i, len, name, foundAlias,
		addedCount = 0,
		params = this.params,
		spec = this.getSpec(),
		names = spec.getParameterNames();

	for ( i = 0, len = names.length; i < len; i++ ) {
		name = names[ i ];
		foundAlias = spec.getParameterAliases( name ).some( function ( alias ) {
			return alias in params;
		} );
		if (
			!foundAlias &&
			!params[ name ] &&
			(
				spec.isParameterRequired( name ) ||
				spec.isParameterSuggested( name )
			)
		) {
			this.addParameter( new ve.dm.MWParameterModel( this, names[ i ] ) );
			addedCount++;
		}
	}

	return addedCount;
};

/**
 * Set original data, to be used as a base for serialization.
 *
 * @param {Object} data Original data
 */
ve.dm.MWTemplateModel.prototype.setOriginalData = function ( data ) {
	this.originalData = data;
};

/**
 * @inheritdoc
 */
ve.dm.MWTemplateModel.prototype.serialize = function () {
	var name, origName,
		origData = this.originalData || {},
		origParams = origData.params || {},
		template = { target: this.getTarget(), params: {} },
		spec = this.getSpec(),
		params = this.getParameters();

	for ( name in params ) {
		if ( name === '' ) {
			continue;
		}

		if (
			// Don't add empty parameters (T101075)
			params[ name ].getValue() === '' &&
			// …unless they were present before the edit
			!Object.prototype.hasOwnProperty.call( origParams, name ) &&
			// …unless they are required (T276989)
			!( spec.isParameterKnown( name ) && spec.isParameterRequired( name ) )
		) {
			continue;
		}

		origName = params[ name ].getOriginalName();
		template.params[ origName ] = ve.extendObject(
			{},
			origParams[ origName ],
			{ wt: params[ name ].getValue() }
		);

	}

	// Performs a non-deep extend, so this won't reintroduce
	// deleted parameters (T75134)
	template = ve.extendObject( {}, origData, template );
	return { template: template };
};

/**
 * @inheritdoc
 */
ve.dm.MWTemplateModel.prototype.getWikitext = function () {
	var param,
		wikitext = this.getTarget().wt,
		params = this.getParameters();

	for ( param in params ) {
		if ( param === '' ) {
			continue;
		}
		wikitext += '|' + param + '=' +
			ve.dm.MWTransclusionNode.static.escapeParameter( params[ param ].getValue() );
	}

	return '{{' + wikitext + '}}';
};

/**
 * @inheritDoc
 */
ve.dm.MWTemplateModel.prototype.isEmpty = function () {
	var params = this.getParameters();

	return Object.keys( params ).every( function ( name ) {
		// There is always an unnamed placeholder at the start
		if ( !name ) {
			return true;
		}

		var param = params[ name ],
			value = param.getValue();
		// Check that the value has not been set, or is indistinguishable from
		// the automatically-set value.  See `MWParameterModel.getValue`
		return value === '' || value === param.getAutoValue();
	} );
};
