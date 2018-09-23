/*!
 * VisualEditor DataModel MWTransclusionBlockNode class.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * DataModel MediaWiki transclusion block node.
 *
 * @class
 * @extends ve.dm.MWTransclusionNode
 *
 * @constructor
 * @param {Object} [element] Reference to element in linear model
 */
ve.dm.MWTransclusionBlockNode = function VeDmMWTransclusionBlockNode() {
	// Parent constructor
	ve.dm.MWTransclusionBlockNode.super.apply( this, arguments );
};

OO.inheritClass( ve.dm.MWTransclusionBlockNode, ve.dm.MWTransclusionNode );

ve.dm.MWTransclusionBlockNode.static.matchTagNames = [];

ve.dm.MWTransclusionBlockNode.static.name = 'mwTransclusionBlock';

/* Registration */

ve.dm.modelRegistry.register( ve.dm.MWTransclusionBlockNode );
