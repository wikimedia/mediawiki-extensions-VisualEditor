/**
 * The module binds all the required VE module in a single object.
 * This will be used in ServerModel to synthesize VE's data model and
 * use the transaction processor.
 * Exports global `ve` object.
**/

ve = function () {

	//import files here
	jQuery = $ = require('jquery');
	window = {};
	ve = {};
	ve.dm = {};
	// ve
	require('../jquery/jquery.json.js');
	require('../ve2/ve.js');
	require('../ve2/ve.NodeFactory.js');
	require('../ve2/ve.Position.js');
	require('../ve2/ve.Range.js');
	require('../ve2/ve.EventEmitter.js');
	require('../ve2/ve.Node.js');
	require('../ve2/ve.BranchNode.js');
	require('../ve2/ve.LeafNode.js');
	require('../ve2/ve.Surface.js');
	require('../ve2/ve.Document.js');

	// dm
	require('../ve2/dm/ve.dm.js');
	require('../ve2/dm/ve.dm.NodeFactory.js');
	require('../ve2/dm/ve.dm.Node.js');
	require('../ve2/dm/ve.dm.BranchNode.js');
	require('../ve2/dm/ve.dm.LeafNode.js');
	require('../ve2/dm/ve.dm.TransactionProcessor.js');
	require('../ve2/dm/ve.dm.Transaction.js');
	require('../ve2/dm/ve.dm.Surface.js');
	require('../ve2/dm/ve.dm.Document.js');
	require('../ve2/dm/ve.dm.HTMLConverter.js');

	require('../ve2/dm/nodes/ve.dm.AlienInlineNode.js');
	require('../ve2/dm/nodes/ve.dm.AlienBlockNode.js');
	require('../ve2/dm/nodes/ve.dm.DefinitionListItemNode.js');
	require('../ve2/dm/nodes/ve.dm.DefinitionListNode.js');
	require('../ve2/dm/nodes/ve.dm.DocumentNode.js');
	require('../ve2/dm/nodes/ve.dm.HeadingNode.js');
	require('../ve2/dm/nodes/ve.dm.ImageNode.js');
	require('../ve2/dm/nodes/ve.dm.ListItemNode.js');
	require('../ve2/dm/nodes/ve.dm.ListNode.js');
	require('../ve2/dm/nodes/ve.dm.ParagraphNode.js');
	require('../ve2/dm/nodes/ve.dm.PreformattedNode.js');
	require('../ve2/dm/nodes/ve.dm.TableCellNode.js');
	require('../ve2/dm/nodes/ve.dm.TableNode.js');
	require('../ve2/dm/nodes/ve.dm.TableRowNode.js');
	require('../ve2/dm/nodes/ve.dm.TextNode.js');

	require('../ve/dm/serializers/ve.dm.AnnotationSerializer.js');
	require('../ve/dm/serializers/ve.dm.HtmlSerializer.js');
	require('../ve/dm/serializers/ve.dm.JsonSerializer.js');
	require('../ve/dm/serializers/ve.dm.WikitextSerializer.js');
	return ve;
};

if ( typeof module == 'object' ) {
	module.exports.ve = ve();
}
