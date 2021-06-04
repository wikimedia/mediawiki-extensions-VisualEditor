/*!
 * VisualEditor DataModel MWTransclusionContentModel class.
 *
 * @copyright 2011-2020 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki transclusion content model.
 *
 * @class
 * @extends ve.dm.MWTransclusionPartModel
 *
 * @constructor
 * @param {ve.dm.MWTransclusionModel} transclusion
 * @param {string} [wikitext='']
 */
ve.dm.MWTransclusionContentModel = function VeDmMWTransclusionContentModel( transclusion, wikitext ) {
	// Parent constructor
	ve.dm.MWTransclusionContentModel.super.call( this, transclusion );

	// Properties
	this.wikitext = wikitext || '';
};

/* Inheritance */

OO.inheritClass( ve.dm.MWTransclusionContentModel, ve.dm.MWTransclusionPartModel );

/* Events */

/**
 * @event change
 */

/* Methods */

/**
 * @param {string} wikitext
 */
ve.dm.MWTransclusionContentModel.prototype.setWikitext = function ( wikitext ) {
	this.wikitext = wikitext;
	this.emit( 'change' );
};

/**
 * @inheritdoc
 */
ve.dm.MWTransclusionContentModel.prototype.serialize = function () {
	return this.wikitext;
};

/**
 * @inheritdoc
 */
ve.dm.MWTransclusionContentModel.prototype.getWikitext = function () {
	return this.wikitext;
};

/**
 * @inheritDoc
 */
ve.dm.MWTransclusionContentModel.prototype.isEmpty = function () {
	return this.wikitext === '';
};
