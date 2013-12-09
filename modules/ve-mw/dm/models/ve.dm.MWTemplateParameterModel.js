/*!
 * VisualEditor DataModel MWTemplateParameterModel class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki template parameter.
 *
 * @class
 * @mixins OO.EventEmitter
 *
 * @constructor
 * @param {ve.dm.MWTemplateModel} template Template
 * @param {string} name Parameter name
 * @param {string} value Parameter value
 */
ve.dm.MWTemplateParameterModel = function VeDmMWTemplateParameterModel( template, name, value ) {
	// Mixin constructors
	OO.EventEmitter.call( this );

	// Properties
	this.template = template;
	this.originalName = name;
	this.name = name.trim();
	this.value = value || '';
	this.id = this.template.getId() + '/' + name;
};

/* Inheritance */

OO.mixinClass( ve.dm.MWTemplateParameterModel, OO.EventEmitter );

/* Events */

/**
 * @event change
 */

/* Methods */

/**
 * Check if parameter is required.
 *
 * @method
 * @param {string} name Parameter name
 * @returns {boolean} Parameter is required
 */
ve.dm.MWTemplateParameterModel.prototype.isRequired = function () {
	return this.template.getSpec().isParameterRequired( this.name );
};

/**
 * Get template parameter is part of.
 *
 * @returns {ve.dm.MWTemplateModel} Template
 */
ve.dm.MWTemplateParameterModel.prototype.getTemplate = function () {
	return this.template;
};

/**
 * Get unique parameter ID within the transclusion.
 *
 * @returns {string} Unique ID
 */
ve.dm.MWTemplateParameterModel.prototype.getId = function () {
	return this.id;
};

/**
 * Get parameter name.
 *
 * @returns {string} Parameter name
 */
ve.dm.MWTemplateParameterModel.prototype.getName = function () {
	return this.name;
};

/**
 * Get parameter name.
 *
 * @returns {string} Parameter name
 */
ve.dm.MWTemplateParameterModel.prototype.getOriginalName = function () {
	return this.originalName;
};

/**
 * Get parameter value.
 *
 * @returns {string} Parameter value
 */
ve.dm.MWTemplateParameterModel.prototype.getValue = function () {
	return this.value;
};

/**
 * Set parameter value.
 *
 * @param {string} value Parameter value
 */
ve.dm.MWTemplateParameterModel.prototype.setValue = function ( value ) {
	this.value = value;
	this.emit( 'change' );
};

/**
 * Remove parameter from template.
 */
ve.dm.MWTemplateParameterModel.prototype.remove = function () {
	this.template.removeParameter( this );
};
