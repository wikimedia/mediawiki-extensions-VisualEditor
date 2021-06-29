/*!
 * VisualEditor DataModel MWTemplateSpecModel class.
 *
 * @copyright 2011-2020 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Holds a mixture of:
 * - A copy of a template's specification as it is documented via TemplateData.
 * - Undocumented parameters that appear in a template invocation, {@see fillFromTemplate}.
 * - Documented aliases are also considered valid, known parameter names. Use
 *   {@see isParameterAlias} to differentiate between the two.
 * Therefore this is not the original specification but an accessor to the documentation for an
 * individual template invocation. It's possible different for every invocation.
 *
 * Meant to be in a 1:1 relationship to {@see ve.dm.MWTemplateModel}.
 *
 * The actual, unmodified specification can be found in {@see specCache} in
 * {@see ve.dm.MWTransclusionModel}.
 *
 * See https://github.com/wikimedia/mediawiki-extensions-TemplateData/blob/master/Specification.md
 * for the latest version of the TemplateData specification.
 *
 * @class
 *
 * @constructor
 * @param {ve.dm.MWTemplateModel} template
 */
ve.dm.MWTemplateSpecModel = function VeDmMWTemplateSpecModel( template ) {
	// Properties
	this.template = template;
	this.params = {};
	this.aliases = {};
	this.canonicalOrder = [];

	// Initialization
	this.fillFromTemplate();
};

OO.initClass( ve.dm.MWTemplateSpecModel );

/* Static methods */

/**
 * @private
 * @param {string|Object.<string,string>} stringOrObject
 * @param {string} [lang]
 * @return {string|undefined}
 */
ve.dm.MWTemplateSpecModel.static.getLocalValue = function ( stringOrObject, lang ) {
	return stringOrObject && typeof stringOrObject === 'object' ?
		OO.ui.getLocalValue( stringOrObject, lang ) :
		stringOrObject;
};

/* Methods */

/**
 * Extend with template spec data.
 *
 * Template spec data is available from the TemplateData extension's API. Extension is passive so
 * any filled in values are not overwritten unless new values are available. This prevents changes
 * in the API or fill methods from causing issues.
 *
 * @param {Object} data Template spec data
 * @param {string} [data.description] Template description
 * @param {string[]} [data.paramOrder] Canonically ordered parameter names
 * @param {Object} [data.params] Template param specs keyed by param name
 * @param {Array} [data.sets] Lists of param sets
 */
ve.dm.MWTemplateSpecModel.prototype.extend = function ( data ) {
	if ( data.description !== null ) {
		this.description = data.description;
	}
	if ( data.params ) {
		this.canonicalOrder = Array.isArray( data.paramOrder ) ?
			data.paramOrder :
			Object.keys( data.params );

		for ( var key in data.params ) {
			if ( !this.params[ key ] ) {
				this.params[ key ] = {};
			}
			var param = this.params[ key ];
			// Extend existing spec
			ve.extendObject( true, this.params[ key ], data.params[ key ] );
			// Add aliased references
			if ( param.aliases ) {
				for ( var i = 0; i < param.aliases.length; i++ ) {
					var alias = param.aliases[ i ];
					this.aliases[ alias ] = key;
					// Remove duplicate specification when it turns out the template used an alias
					delete this.params[ alias ];
				}
			}
		}
	}
	this.sets = data.sets;
	if ( data.maps ) {
		this.maps = data.maps;
	}
};

/**
 * Fill from template.
 *
 * Filling is passive, so existing information is never overwritten. The spec should be re-filled
 * after a parameter is added to ensure it's still complete, and this is safe because existing data
 * is never overwritten.
 */
ve.dm.MWTemplateSpecModel.prototype.fillFromTemplate = function () {
	for ( var key in this.template.getParameters() ) {
		// Ignore placeholder parameters with no name
		if ( key && !this.params[ key ] ) {
			// There is no information other than the names of the parameters, that they exist, and
			// in which order
			this.params[ key ] = {};
		}
	}
};

/**
 * Get template label.
 *
 * @return {string} Template label
 */
ve.dm.MWTemplateSpecModel.prototype.getLabel = function () {
	var title = this.template.getTitle(),
		target = this.template.getTarget();

	if ( title ) {
		try {
			// Normalize and remove namespace prefix if in the Template: namespace
			title = new mw.Title( title )
				.getRelativeText( mw.config.get( 'wgNamespaceIds' ).template );
		} catch ( e ) { }
	}

	return title || target.wt;
};

/**
 * Get template description.
 *
 * @param {string} [lang] Language to get description in
 * @return {string|null} Template description or null if not available
 */
ve.dm.MWTemplateSpecModel.prototype.getDescription = function ( lang ) {
	return this.constructor.static.getLocalValue( this.description || null, lang );
};

/**
 * Get parameter order.
 *
 * @return {string[]} Canonically ordered parameter names: the explicit
 *   `paramOrder` if given, otherwise the order of parameters as they appear in
 *   TemplateData.
 */
ve.dm.MWTemplateSpecModel.prototype.getCanonicalParameterOrder = function () {
	return this.canonicalOrder.slice();
};

/**
 * @param {string} name Parameter name or alias
 * @return {boolean}
 */
ve.dm.MWTemplateSpecModel.prototype.isKnownParameterOrAlias = function ( name ) {
	return name in this.params || name in this.aliases;
};

/**
 * Check if a parameter name is an alias.
 *
 * @param {string} name Parameter name or alias
 * @return {boolean} Parameter name is an alias
 */
ve.dm.MWTemplateSpecModel.prototype.isParameterAlias = function ( name ) {
	return name in this.aliases;
};

/**
 * Get a parameter label.
 *
 * @param {string} name Parameter name or alias
 * @param {string} [lang] Language to get label in
 * @return {string} Parameter label
 */
ve.dm.MWTemplateSpecModel.prototype.getParameterLabel = function ( name, lang ) {
	var param = this.params[ this.getPrimaryParameterName( name ) ];
	return this.constructor.static.getLocalValue( param && param.label || name, lang );
};

/**
 * Get a parameter description.
 *
 * @param {string} name Parameter name or alias
 * @param {string} [lang] Language to get description
 * @return {string|null} Parameter description
 */
ve.dm.MWTemplateSpecModel.prototype.getParameterDescription = function ( name, lang ) {
	var param = this.params[ this.getPrimaryParameterName( name ) ];
	return this.constructor.static.getLocalValue( param && param.description || null, lang );
};

/**
 * Get a parameter suggested values.
 *
 * @param {string} name Parameter name or alias
 * @return {string[]} Parameter suggested values
 */
ve.dm.MWTemplateSpecModel.prototype.getParameterSuggestedValues = function ( name ) {
	var param = this.params[ this.getPrimaryParameterName( name ) ];
	return param && param.suggestedvalues || [];
};

/**
 * Get a parameter value.
 *
 * @param {string} name Parameter name or alias
 * @return {string} Default parameter value
 */
ve.dm.MWTemplateSpecModel.prototype.getParameterDefaultValue = function ( name ) {
	var param = this.params[ this.getPrimaryParameterName( name ) ];
	return param && param.default || '';
};

/**
 * Get a parameter example value.
 *
 * @param {string} name Parameter name or alias
 * @param {string} [lang] Language to get description
 * @return {string|null}
 */
ve.dm.MWTemplateSpecModel.prototype.getParameterExampleValue = function ( name, lang ) {
	var param = this.params[ this.getPrimaryParameterName( name ) ];
	return this.constructor.static.getLocalValue( param && param.example || null, lang );
};

/**
 * Get a parameter auto value.
 *
 * @param {string} name Parameter name or alias
 * @return {string} Auto-value for the parameter
 */
ve.dm.MWTemplateSpecModel.prototype.getParameterAutoValue = function ( name ) {
	var param = this.params[ this.getPrimaryParameterName( name ) ];
	return param && param.autovalue || '';
};

/**
 * Get a parameter type.
 *
 * @param {string} name Parameter name or alias
 * @return {string} Parameter type
 */
ve.dm.MWTemplateSpecModel.prototype.getParameterType = function ( name ) {
	var param = this.params[ this.getPrimaryParameterName( name ) ];
	return param && param.type || 'string';
};

/**
 * Get parameter aliases.
 *
 * @param {string} name Parameter name or alias
 * @return {string[]} Alternate parameter names
 */
ve.dm.MWTemplateSpecModel.prototype.getParameterAliases = function ( name ) {
	var param = this.params[ this.getPrimaryParameterName( name ) ];
	return param && param.aliases || [];
};

/**
 * Get the parameter name, resolving an alias.
 *
 * If a parameter is not an alias of another, the output will be the same as the input.
 *
 * @param {string} name Parameter name or alias
 * @return {string}
 */
ve.dm.MWTemplateSpecModel.prototype.getPrimaryParameterName = function ( name ) {
	return this.aliases[ name ] || name;
};

/**
 * Check if parameter is required.
 *
 * @param {string} name Parameter name or alias
 * @return {boolean} Parameter is required
 */
ve.dm.MWTemplateSpecModel.prototype.isParameterRequired = function ( name ) {
	var param = this.params[ this.getPrimaryParameterName( name ) ];
	return !!( param && param.required );
};

/**
 * Check if parameter is suggested.
 *
 * @param {string} name Parameter name or alias
 * @return {boolean} Parameter is suggested
 */
ve.dm.MWTemplateSpecModel.prototype.isParameterSuggested = function ( name ) {
	var param = this.params[ this.getPrimaryParameterName( name ) ];
	return !!( param && param.suggested );
};

/**
 * Check if parameter is deprecated.
 *
 * @param {string} name Parameter name or alias
 * @return {boolean} Parameter is deprecated
 */
ve.dm.MWTemplateSpecModel.prototype.isParameterDeprecated = function ( name ) {
	var param = this.params[ this.getPrimaryParameterName( name ) ];
	return !!( param && ( param.deprecated || typeof param.deprecated === 'string' ) );
};

/**
 * Get parameter deprecation description.
 *
 * @param {string} name Parameter name or alias
 * @return {string} Explaining of why parameter is deprecated, empty if parameter is either not
 *   deprecated or no description has been specified
 */
ve.dm.MWTemplateSpecModel.prototype.getParameterDeprecationDescription = function ( name ) {
	var param = this.params[ this.getPrimaryParameterName( name ) ];
	return param && typeof param.deprecated === 'string' ? param.deprecated : '';
};

/**
 * Get all primary parameter names, without aliases. Warning:
 * - This is not necessarily in the original order as the parameters appeared in the template.
 * - When a parameter is known to be an alias, the alias is resolved.
 * - This includes parameters that appear in the template but aren't documented via TemplateData.
 *
 * @return {string[]}
 */
ve.dm.MWTemplateSpecModel.prototype.getParameterNames = function () {
	return Object.keys( this.params );
};

/**
 * Get parameter sets.
 *
 * @return {Object[]} Lists of parameter set descriptors
 */
ve.dm.MWTemplateSpecModel.prototype.getParameterSets = function () {
	return this.sets || [];
};

/**
 * Get map describing relationship between another content type and the parameters.
 *
 * @return {Object} Object with application property maps to parameters keyed to application name.
 */
ve.dm.MWTemplateSpecModel.prototype.getMaps = function () {
	return this.maps || {};
};
