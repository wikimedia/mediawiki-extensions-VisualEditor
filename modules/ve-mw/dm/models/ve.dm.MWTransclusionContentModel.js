/*!
 * VisualEditor DataModel MWTransclusionContentModel class.
 *
 * @copyright 2011-2020 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Represents a raw wikitext snippet that is part of an unbalanced sequence of template invocations.
 * Meant to be an item in a {@see ve.dm.MWTransclusionModel}. Holds a back-reference to it's parent.
 *
 * @class
 * @extends ve.dm.MWTransclusionPartModel
 *
 * @constructor
 * @param {ve.dm.MWTransclusionModel} transclusion Transclusion
 * @param {string} [value] Content value
 */
ve.dm.MWTransclusionContentModel = function VeDmMWTransclusionContentModel( transclusion, value ) {
	// Parent constructor
	ve.dm.MWTransclusionContentModel.super.call( this, transclusion );

	// Properties
	this.value = value || '';
};

/* Inheritance */

OO.inheritClass( ve.dm.MWTransclusionContentModel, ve.dm.MWTransclusionPartModel );

/* Events */

/**
 * @event change
 */

/* Methods */

/**
 * Get content value.
 *
 * @return {string} Content value
 */
ve.dm.MWTransclusionContentModel.prototype.getValue = function () {
	return this.value;
};

/**
 * Set content value.
 *
 * @param {string} value Content value
 */
ve.dm.MWTransclusionContentModel.prototype.setValue = function ( value ) {
	this.value = value;
	this.emit( 'change' );
};

/**
 * @inheritdoc
 */
ve.dm.MWTransclusionContentModel.prototype.serialize = function () {
	return this.value;
};

/**
 * @inheritdoc
 */
ve.dm.MWTransclusionContentModel.prototype.getWikitext = function () {
	return this.value;
};

/**
 * @inheritDoc
 */
ve.dm.MWTransclusionContentModel.prototype.isEmpty = function () {
	return this.value === '';
};
