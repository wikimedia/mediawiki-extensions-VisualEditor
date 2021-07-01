/*!
 * VisualEditor DataModel MWTransclusionPartModel class.
 *
 * @copyright 2011-2020 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Abstract base class for items in a {@see ve.dm.MWTransclusionModel}. Holds a back-reference to
 * it's parent. Currently used for:
 * - {@see ve.dm.MWTemplateModel} for a single template invocation.
 * - {@see ve.dm.MWTemplatePlaceholderModel} while searching for a template name to be added.
 * - {@see ve.dm.MWTransclusionContentModel} for a raw wikitext snippet.
 *
 * @class
 * @mixins OO.EventEmitter
 *
 * @constructor
 * @param {ve.dm.MWTransclusionModel} transclusion
 */
ve.dm.MWTransclusionPartModel = function VeDmMWTransclusionPartModel( transclusion ) {
	// Mixin constructors
	OO.EventEmitter.call( this );

	// Properties
	this.transclusion = transclusion;
	this.id = 'part_' + this.transclusion.getUniquePartId();
};

/* Inheritance */

OO.mixinClass( ve.dm.MWTransclusionPartModel, OO.EventEmitter );

/* Events */

/**
 * @event change
 */

/* Methods */

/**
 * Get transclusion part is in.
 *
 * @return {ve.dm.MWTransclusionModel} Transclusion
 */
ve.dm.MWTransclusionPartModel.prototype.getTransclusion = function () {
	return this.transclusion;
};

/**
 * Get a unique part ID within the transclusion.
 *
 * @return {string} Unique ID
 */
ve.dm.MWTransclusionPartModel.prototype.getId = function () {
	return this.id;
};

/**
 * Remove part from transclusion.
 */
ve.dm.MWTransclusionPartModel.prototype.remove = function () {
	this.transclusion.removePart( this );
};

/**
 * Create a serialized representation of this part. Contains all information needed to recreate the
 * original wikitext, including extra whitespace. Used in
 * {@see ve.dm.MWTransclusionModel.getPlainObject}. The corresponding deserializer is in
 * {@see ve.dm.MWTransclusionNode.static.getWikitext}.
 *
 * @return {Object|string|undefined} Serialized representation, raw wikitext, or undefined if empty
 */
ve.dm.MWTransclusionPartModel.prototype.serialize = function () {
	return undefined;
};

/**
 * Get a minimal wikitext representation for this part, e.g. a compiled template invocation like
 * `{{foo|1=bar|baz=quux}}`. Don't store this. This neither respects TemplateData format strings nor
 * how an edited template was formatted before.
 *
 * @return {string} Wikitext
 */
ve.dm.MWTransclusionPartModel.prototype.getWikitext = function () {
	return '';
};

/**
 * Add all non-existing required and suggested parameters, if any.
 *
 * @return {number} Number of parameters added
 */
ve.dm.MWTransclusionPartModel.prototype.addPromptedParameters = function () {
	return 0;
};

/**
 * @return {boolean} True if there is no user input
 */
ve.dm.MWTransclusionPartModel.prototype.isEmpty = function () {
	return true;
};
