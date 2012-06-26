/**
 * The module binds all the required VE module in a single object.
 * This will be used in ServerModel to synthesize VE's data model and
 * use the transaction processor.
 * Exports global `ve` object.
**/

ve = function () {

	//import files here
	jQuery = $ = require('jquery');
	jsdom = require('jsdom');
	window = {};
	document = jsdom.jsdom();
	ve = {};
	ve.dm = {};
	// ve
	require('../../jquery/jquery.json.js');
	require('../../ve/ve.js');
	require('../../ve/ve.EventEmitter.js');
	require('../../ve/ve.Factory.js');
	require('../../ve/ve.Position.js');
	require('../../ve/ve.Range.js');
	require('../../ve/ve.Node.js');
	require('../../ve/ve.BranchNode.js');
	require('../../ve/ve.LeafNode.js');
	require('../../ve/ve.Surface.js');
	require('../../ve/ve.Document.js');
	Node = {
	  ELEMENT_NODE: 1,
		ATTRIBUTE_NODE: 2,
		TEXT_NODE: 3,
		CDATA_SECTION_NODE: 4,
		ENTITY_REFERENCE_NODE: 5,
		ENTITY_NODE: 6,
		PROCESSING_INSTRUCTION_NODE: 7,
		COMMENT_NODE: 8,
		DOCUMENT_NODE: 9,
		DOCUMENT_TYPE_NODE: 10,
		DOCUMENT_FRAGMENT_NODE: 11,
		NOTATION_NODE: 12
	};


	// dm
	require('../../ve/dm/ve.dm.js');
	require('../../ve/dm/ve.dm.NodeFactory.js');
	require('../../ve/dm/ve.dm.Node.js');
	require('../../ve/dm/ve.dm.AnnotationFactory.js');
	require('../../ve/dm/ve.dm.Annotation.js');
	require('../../ve/dm/ve.dm.BranchNode.js');
	require('../../ve/dm/ve.dm.LeafNode.js');
	require('../../ve/dm/ve.dm.TransactionProcessor.js');
	require('../../ve/dm/ve.dm.Transaction.js');
	require('../../ve/dm/ve.dm.Surface.js');
	require('../../ve/dm/ve.dm.Document.js');
	require('../../ve/dm/ve.dm.DocumentSynchronizer.js');
	require('../../ve/dm/ve.dm.Converter.js');

	require('../../ve/dm/nodes/ve.dm.AlienInlineNode.js');
	require('../../ve/dm/nodes/ve.dm.AlienBlockNode.js');
	require('../../ve/dm/nodes/ve.dm.DefinitionListItemNode.js');
	require('../../ve/dm/nodes/ve.dm.DefinitionListNode.js');
	require('../../ve/dm/nodes/ve.dm.DocumentNode.js');
	require('../../ve/dm/nodes/ve.dm.HeadingNode.js');
	require('../../ve/dm/nodes/ve.dm.ImageNode.js');
	require('../../ve/dm/nodes/ve.dm.ListItemNode.js');
	require('../../ve/dm/nodes/ve.dm.ListNode.js');
	require('../../ve/dm/nodes/ve.dm.ParagraphNode.js');
	require('../../ve/dm/nodes/ve.dm.PreformattedNode.js');
	require('../../ve/dm/nodes/ve.dm.TableCellNode.js');
	require('../../ve/dm/nodes/ve.dm.TableNode.js');
	require('../../ve/dm/nodes/ve.dm.TableRowNode.js');
	require('../../ve/dm/nodes/ve.dm.TextNode.js');

	return ve;
};

if ( typeof module == 'object' ) {
	module.exports.ve = ve();
}
