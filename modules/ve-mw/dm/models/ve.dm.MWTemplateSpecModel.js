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
 * @property {Object.<string,boolean>} seenParameterNames Keeps track of any parameter from any
 *  source and in which order they have been seen first. Includes parameters that have been removed
 *  during the lifetime of this object, i.e. {@see fillFromTemplate} doesn't remove parameters that
 *  have been seen before. The order is typically but not necessarily the original order in which
 *  the parameters appear in the template. Aliases are resolved and don't appear on their original
 *  position any more.
 */
ve.dm.MWTemplateSpecModel = function VeDmMWTemplateSpecModel( template ) {
	// Properties
	this.template = template;
	this.seenParameterNames = {};
	this.templateData = { params: {} };
	this.aliases = {};

	// Initialization
	this.fillFromTemplate();
};

OO.initClass( ve.dm.MWTemplateSpecModel );

/* Static methods */

/**
 * @private
 * @param {string|Object.<string,string>} stringOrObject
 * @param {string} [languageCode]
 * @return {string|undefined}
 */
ve.dm.MWTemplateSpecModel.static.getLocalValue = function ( stringOrObject, languageCode ) {
	return stringOrObject && typeof stringOrObject === 'object' ?
		OO.ui.getLocalValue( stringOrObject, languageCode ) :
		stringOrObject;
};

/* Methods */

/**
 * Template spec data is available from the TemplateData extension's API.
 *
 * @param {Object} data Template spec data
 * @param {string} [data.description] Template description
 * @param {string[]} [data.paramOrder] Preferred parameter order as documented via TemplateData. If
 *  given, the TemplateData API makes sure this contains the same parameters as `params`.
 * @param {Object} [data.params] Template param specs keyed by param name
 * @param {Array} [data.sets] Lists of param sets
 */
ve.dm.MWTemplateSpecModel.prototype.setTemplateData = function ( data ) {
	this.templateData = data || {};
	// Better be safe even if the `params` element isn't optional in the TemplateData API
	if ( !this.templateData.params ) {
		this.templateData.params = {};
	}

	var resolveAliases = false;

	for ( var primaryName in this.templateData.params ) {
		this.seenParameterNames[ primaryName ] = true;

		var aliases = this.getParameterAliases( primaryName );
		for ( var i = 0; i < aliases.length; i++ ) {
			var alias = aliases[ i ];
			this.aliases[ alias ] = primaryName;
			if ( alias in this.seenParameterNames ) {
				resolveAliases = true;
			}
		}
	}

	if ( resolveAliases ) {
		var primaryNames = {};
		for ( var name in this.seenParameterNames ) {
			primaryNames[ this.getPrimaryParameterName( name ) ] = true;
		}
		this.seenParameterNames = primaryNames;
	}
};

/**
 * Filling is passive, so existing information is never overwritten. The spec should be re-filled
 * after a parameter is added to ensure it's still complete, and this is safe because existing data
 * is never overwritten.
 */
ve.dm.MWTemplateSpecModel.prototype.fillFromTemplate = function () {
	for ( var key in this.template.getParameters() ) {
		// Ignore placeholder parameters with no name
		if ( key && !this.isKnownParameterOrAlias( key ) ) {
			// There is no information other than the names of the parameters, that they exist, and
			// in which order
			this.seenParameterNames[ key ] = true;
		}
	}
};

/**
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
 * @param {string} [languageCode]
 * @return {string|null} Template description or null if not available
 */
ve.dm.MWTemplateSpecModel.prototype.getDescription = function ( languageCode ) {
	return this.constructor.static.getLocalValue( this.templateData.description || null, languageCode );
};

/**
 * Empty if the template is not documented. Otherwise the explicit `paramOrder` if given, or the
 * order of parameters as they appear in TemplateData. Returns a copy, i.e. it's safe to manipulate
 * the array.
 *
 * @return {string[]} Preferred order of parameters via TemplateData, if given
 */
ve.dm.MWTemplateSpecModel.prototype.getDocumentedParameterOrder = function () {
	return Array.isArray( this.templateData.paramOrder ) ?
		this.templateData.paramOrder.slice() :
		Object.keys( this.templateData.params );
};

/**
 * Check if a parameter name or alias was seen before. This includes parameters and aliases
 * documented via TemplateData as well as undocumented parameters, e.g. from the original template
 * invocation. When undocumented parameters are removed from the linked {@see ve.dm.MWTemplateModel}
 * they are still known and will still be offered via {@see getKnownParameterNames} for the lifetime
 * of this object.
 *
 * @param {string} name Parameter name or alias
 * @return {boolean}
 */
ve.dm.MWTemplateSpecModel.prototype.isKnownParameterOrAlias = function ( name ) {
	return name in this.seenParameterNames || name in this.aliases;
};

/**
 * Check if a parameter name is an alias.
 *
 * @param {string} name Parameter name or alias
 * @return {boolean}
 */
ve.dm.MWTemplateSpecModel.prototype.isParameterAlias = function ( name ) {
	return name in this.aliases;
};

/**
 * @param {string} name Parameter name or alias
 * @param {string} [languageCode]
 * @return {string}
 */
ve.dm.MWTemplateSpecModel.prototype.getParameterLabel = function ( name, languageCode ) {
	var param = this.templateData.params[ this.getPrimaryParameterName( name ) ];
	return this.constructor.static.getLocalValue( param && param.label || name, languageCode );
};

/**
 * @param {string} name Parameter name or alias
 * @param {string} [languageCode]
 * @return {string|null}
 */
ve.dm.MWTemplateSpecModel.prototype.getParameterDescription = function ( name, languageCode ) {
	var param = this.templateData.params[ this.getPrimaryParameterName( name ) ];
	return this.constructor.static.getLocalValue( param && param.description || null, languageCode );
};

/**
 * @param {string} name Parameter name or alias
 * @return {string[]}
 */
ve.dm.MWTemplateSpecModel.prototype.getParameterSuggestedValues = function ( name ) {
	var param = this.templateData.params[ this.getPrimaryParameterName( name ) ];
	return param && param.suggestedvalues || [];
};

/**
 * @param {string} name Parameter name or alias
 * @return {string}
 */
ve.dm.MWTemplateSpecModel.prototype.getParameterDefaultValue = function ( name ) {
	var param = this.templateData.params[ this.getPrimaryParameterName( name ) ];
	return param && param.default || '';
};

/**
 * @param {string} name Parameter name or alias
 * @param {string} [languageCode]
 * @return {string|null}
 */
ve.dm.MWTemplateSpecModel.prototype.getParameterExampleValue = function ( name, languageCode ) {
	var param = this.templateData.params[ this.getPrimaryParameterName( name ) ];
	return this.constructor.static.getLocalValue( param && param.example || null, languageCode );
};

/**
 * @param {string} name Parameter name or alias
 * @return {string}
 */
ve.dm.MWTemplateSpecModel.prototype.getParameterAutoValue = function ( name ) {
	var param = this.templateData.params[ this.getPrimaryParameterName( name ) ];
	return param && param.autovalue || '';
};

/**
 * @param {string} name Parameter name or alias
 * @return {string} e.g. "string"
 */
ve.dm.MWTemplateSpecModel.prototype.getParameterType = function ( name ) {
	var param = this.templateData.params[ this.getPrimaryParameterName( name ) ];
	return param && param.type || 'string';
};

/**
 * @param {string} name Parameter name or alias
 * @return {string[]} Alternate parameter names
 */
ve.dm.MWTemplateSpecModel.prototype.getParameterAliases = function ( name ) {
	var param = this.templateData.params[ this.getPrimaryParameterName( name ) ];
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
 * @param {string} name Parameter name or alias
 * @return {boolean}
 */
ve.dm.MWTemplateSpecModel.prototype.isParameterRequired = function ( name ) {
	var param = this.templateData.params[ this.getPrimaryParameterName( name ) ];
	return !!( param && param.required );
};

/**
 * @param {string} name Parameter name or alias
 * @return {boolean}
 */
ve.dm.MWTemplateSpecModel.prototype.isParameterSuggested = function ( name ) {
	var param = this.templateData.params[ this.getPrimaryParameterName( name ) ];
	return !!( param && param.suggested );
};

/**
 * @param {string} name Parameter name or alias
 * @return {boolean}
 */
ve.dm.MWTemplateSpecModel.prototype.isParameterDeprecated = function ( name ) {
	var param = this.templateData.params[ this.getPrimaryParameterName( name ) ];
	return !!( param && ( param.deprecated || typeof param.deprecated === 'string' ) );
};

/**
 * @param {string} name Parameter name or alias
 * @return {string} Explaining of why parameter is deprecated, empty if parameter is either not
 *   deprecated or no description has been specified
 */
ve.dm.MWTemplateSpecModel.prototype.getParameterDeprecationDescription = function ( name ) {
	var param = this.templateData.params[ this.getPrimaryParameterName( name ) ];
	return param && typeof param.deprecated === 'string' ? param.deprecated : '';
};

/**
 * Get all known primary parameter names, without aliases, in their original order as they became
 * known (usually but not necessarily the order in which they appear in the template). This still
 * includes undocumented parameters that have been part of the template at some point during the
 * lifetime of this object, but have been removed from the linked {@see ve.dm.MWTemplateModel} in
 * the meantime.
 *
 * @return {string[]} Primary parameter names
 */
ve.dm.MWTemplateSpecModel.prototype.getKnownParameterNames = function () {
	return Object.keys( this.seenParameterNames );
};

/**
 * @return {Object[]} Lists of parameter set descriptors
 */
ve.dm.MWTemplateSpecModel.prototype.getParameterSets = function () {
	return this.templateData.sets || [];
};

/**
 * Get map describing relationship between another content type and the parameters.
 *
 * @return {Object} Object with application property maps to parameters keyed to application name.
 */
ve.dm.MWTemplateSpecModel.prototype.getMaps = function () {
	return this.templateData.maps || {};
};
