/*!
 * VisualEditor DataModel MWTransclusionInlineNode class.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * DataModel MediaWiki transclusion inline node.
 *
 * @class
 * @extends ve.dm.MWTransclusionNode
 *
 * @constructor
 * @param {Object} [element] Reference to element in linear model
 */
ve.dm.MWTransclusionInlineNode = function VeDmMWTransclusionInlineNode() {
	// Parent constructor
	ve.dm.MWTransclusionInlineNode.super.apply( this, arguments );
};

OO.inheritClass( ve.dm.MWTransclusionInlineNode, ve.dm.MWTransclusionNode );

ve.dm.MWTransclusionInlineNode.static.matchTagNames = [];

ve.dm.MWTransclusionInlineNode.static.name = 'mwTransclusionInline';

ve.dm.MWTransclusionInlineNode.static.isContent = true;

/* Registration */

ve.dm.modelRegistry.register( ve.dm.MWTransclusionInlineNode );
