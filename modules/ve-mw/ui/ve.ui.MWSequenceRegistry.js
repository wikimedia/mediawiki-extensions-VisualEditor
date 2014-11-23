/*!
 * VisualEditor MediaWiki SequenceRegistry registrations.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

ve.ui.sequenceRegistry.register(
	new ve.ui.Sequence( 'wikitextLink', 'mwWikitextWarning', '[[' )
);
ve.ui.sequenceRegistry.register(
	new ve.ui.Sequence( 'wikitextTemplate', 'mwWikitextWarning', '{{' )
);
ve.ui.sequenceRegistry.register(
	new ve.ui.Sequence( 'wikitextItalic', 'mwWikitextWarning', '\'\'' )
);
ve.ui.sequenceRegistry.register(
	new ve.ui.Sequence( 'wikitextNowiki', 'mwWikitextWarning', '<nowiki' )
);
ve.ui.sequenceRegistry.register(
	new ve.ui.Sequence( 'wikitextRef', 'mwWikitextWarning', '<ref' )
);
ve.ui.sequenceRegistry.register(
	new ve.ui.Sequence( 'wikitextSig', 'mwWikitextWarning', '~~~' )
);
ve.ui.sequenceRegistry.register(
	new ve.ui.Sequence( 'wikitextHeading', 'mwWikitextWarning', [ { type: 'paragraph' }, '=', '=' ] )
);
ve.ui.sequenceRegistry.register(
	new ve.ui.Sequence( 'wikitextNumbered', 'mwWikitextWarning', [ { type: 'paragraph' }, '#' ] )
);
