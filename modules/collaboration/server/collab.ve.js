/**
 * The module binds all the required VE module in a single object.
 * This will be used to synthesize VE's data model on the server and 
 * use the transaction processor.
 * Exports global `ve` object.
**/

ve = function() {

	// Build a browser environment.
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
	window = {};
	jsdom = require('jsdom');
	navigator = require('navigator');
	window.navigator = navigator;
	document = jsdom.jsdom();
	window.document = document;

	jQuery = $ = require('jquery');
	
	// Some placeholders to prevent errors.
	ve = {};
	ve.dm = {};
	
	// Import files here.
	var mp = '../../';

	// ve
	require(mp + 've/ve.js');
	ve = window.ve;
	require(mp + 've/ve.EventEmitter.js');
	require(mp + 've/init/ve.init.js');
	require(mp + 've/init/ve.init.Platform.js');
	ve.init.platform = new ve.init.Platform();
	require(mp + 've/ve.Registry.js');
	require(mp + 've/ve.Factory.js');
	require(mp + 've/ve.Position.js');
	require(mp + 've/ve.Command.js');
	require(mp + 've/ve.CommandRegistry.js');
	require(mp + 've/ve.Range.js');
	require(mp + 've/ve.Node.js');
	require(mp + 've/ve.BranchNode.js');
	require(mp + 've/ve.LeafNode.js');
	require(mp + 've/ve.Surface.js');
	require(mp + 've/ve.Document.js');
	require(mp + 've/ve.OrderedHashSet.js');
	require(mp + 've/ve.AnnotationSet.js');
	require(mp + 've/ve.Action.js');
	require(mp + 've/ve.ActionFactory.js');

	// actions
	require(mp + 've/actions/ve.AnnotationAction.js');
	require(mp + 've/actions/ve.FormatAction.js');
	require(mp + 've/actions/ve.HistoryAction.js');
	require(mp + 've/actions/ve.IndentationAction.js');
	require(mp + 've/actions/ve.InspectorAction.js');
	require(mp + 've/actions/ve.ListAction.js');

	// dm
	require(mp + 've/dm/ve.dm.js');

	require(mp + 've/dm/ve.dm.NodeFactory.js');
	require(mp + 've/dm/ve.dm.AnnotationFactory.js');
	require(mp + 've/dm/ve.dm.Node.js');
	require(mp + 've/dm/ve.dm.BranchNode.js');
	require(mp + 've/dm/ve.dm.LeafNode.js');
	require(mp + 've/dm/ve.dm.Converter.js');


	require(mp + 've/dm/ve.dm.Annotation.js');
	require(mp + 've/dm/nodes/ve.dm.AlienInlineNode.js');
	require(mp + 've/dm/nodes/ve.dm.AlienBlockNode.js');
	require(mp + 've/dm/nodes/ve.dm.BreakNode.js');
	require(mp + 've/dm/nodes/ve.dm.CenterNode.js');
	require(mp + 've/dm/nodes/ve.dm.DefinitionListItemNode.js');
	require(mp + 've/dm/nodes/ve.dm.DefinitionListNode.js');
	require(mp + 've/dm/nodes/ve.dm.DocumentNode.js');
	require(mp + 've/dm/nodes/ve.dm.HeadingNode.js');
	require(mp + 've/dm/nodes/ve.dm.ImageNode.js');
	require(mp + 've/dm/nodes/ve.dm.ListItemNode.js');
	require(mp + 've/dm/nodes/ve.dm.ListNode.js');
	require(mp + 've/dm/nodes/ve.dm.MetaBlockNode.js');
	require(mp + 've/dm/nodes/ve.dm.MetaInlineNode.js');
	require(mp + 've/dm/nodes/ve.dm.ParagraphNode.js');
	require(mp + 've/dm/nodes/ve.dm.PreformattedNode.js');
	require(mp + 've/dm/nodes/ve.dm.TableCellNode.js');
	require(mp + 've/dm/nodes/ve.dm.TableNode.js');
	require(mp + 've/dm/nodes/ve.dm.TableRowNode.js');
	require(mp + 've/dm/nodes/ve.dm.TableSectionNode.js');
	require(mp + 've/dm/nodes/ve.dm.TextNode.js');

	require(mp + 've/dm/annotations/ve.dm.LinkAnnotation.js');
	require(mp + 've/dm/annotations/ve.dm.MWExternalLinkAnnotation.js');
	require(mp + 've/dm/annotations/ve.dm.MWInternalLinkAnnotation.js');
	require(mp + 've/dm/annotations/ve.dm.TextStyleAnnotation.js');

	require(mp + 've/dm/ve.dm.TransactionProcessor.js');
	require(mp + 've/dm/ve.dm.Transaction.js');
	require(mp + 've/dm/ve.dm.Surface.js');
	require(mp + 've/dm/ve.dm.SurfaceFragment.js');
	require(mp + 've/dm/ve.dm.Document.js');

	require(mp + 've/dm/ve.dm.DocumentSynchronizer.js');

	return ve;
};

if ( typeof module == 'object' ) {
	module.exports.ve = ve();
}
