/*!
 * VisualEditor UserInterface MWTagCompletionAction class.
 *
 * @copyright See AUTHORS.txt
 */

/**
 * Autocompletion of HTML, parser and extension tags in wikitext source mode,
 * triggered by typing "<". The chosen tag is inserted as a matching pair (or self-closing,
 * for void tags like <br />) with the caret placed ready for typing: between the
 * tags (e.g. <code>|</code>) or inside an empty attribute value
 * (e.g. <syntaxhighlight lang="|">).
 *
 * @class
 * @extends ve.ui.CompletionAction
 *
 * @constructor
 * @param {ve.ui.Surface} surface Surface to act on
 * @param {string} [source]
 */
ve.ui.MWTagCompletionAction = function VeUiMWTagCompletionAction() {
	// Parent constructor
	ve.ui.MWTagCompletionAction.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTagCompletionAction, ve.ui.CompletionAction );

/* Static Properties */

ve.ui.MWTagCompletionAction.static.name = 'mwTagCompletion';

// Only known tags are offered, so don't suggest whatever the user typed.
ve.ui.MWTagCompletionAction.static.alwaysIncludeInput = false;

/**
 * Plain HTML tags to offer: the set of HTML tags permitted by the MediaWiki
 * parser.
 *
 * @property {string[]}
 * @static
 * @inheritable
 */
ve.ui.MWTagCompletionAction.static.htmlTags = [
	'b', 'bdi', 'bdo', 'del', 'i', 'ins', 'u', 'font', 'big', 'small',
	'sub', 'sup', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'cite', 'code',
	'em', 's', 'strike', 'strong', 'tt', 'var', 'div', 'center', 'blockquote',
	'q', 'ol', 'ul', 'dl', 'table', 'caption', 'ruby', 'rb', 'rp', 'rt', 'rtc',
	'p', 'span', 'abbr', 'dfn', 'kbd', 'samp', 'data', 'time', 'mark', 'br',
	'wbr', 'hr', 'li', 'dt', 'dd', 'td', 'th', 'tr'
];

/**
 * The subset of #static-htmlTags that are void, inserted self-closing rather
 * than as a pair.
 *
 * @property {string[]}
 * @static
 * @inheritable
 */
ve.ui.MWTagCompletionAction.static.voidHtmlTags = [ 'br', 'hr', 'wbr' ];

/**
 * Parser tags built in to MediaWiki: always available, and always a matching
 * pair.
 *
 * @property {string[]}
 * @static
 * @inheritable
 */
ve.ui.MWTagCompletionAction.static.parserTags = [
	'nowiki',
	'pre',
	'noinclude',
	'includeonly',
	'onlyinclude',
	'indicator',
	'langconvert'
];

/**
 * Tags provided by extensions, offered ahead of the plain HTML tags. Each entry
 * is an object with:
 *  - `name`: the tag name, matched against the user's input
 *  - `node`: optional name of a `ve.dm` node class that must be registered for
 *    the tag to be offered
 *  - `module`: optional name of a ResourceLoader module that must be registered
 *    for the tag to be offered
 *  - `attributes`: optional attributes for the opening tag. If any value is
 *    empty the caret is placed inside it, otherwise between the opening and
 *    closing tags.
 *  - `selfClosing`: set for void tags (e.g. <templatestyles src="" />), which
 *    are inserted without a closing tag.
 *
 * @property {Object[]}
 * @static
 * @inheritable
 */
ve.ui.MWTagCompletionAction.static.extensionTags = [
	{ name: 'syntaxhighlight', node: 'MWSyntaxHighlightNode' },
	{ name: 'syntaxhighlight', node: 'MWSyntaxHighlightNode', attributes: { lang: '' } },
	{ name: 'source', node: 'MWSyntaxHighlightNode' },
	{ name: 'ref', node: 'MWReferenceNode' },
	{ name: 'references', node: 'MWReferencesListNode', selfClosing: true },
	{ name: 'references', node: 'MWReferencesListNode' },
	{ name: 'math', node: 'MWMathNode' },
	{ name: 'ce', node: 'MWChemNode' },
	{ name: 'chem', node: 'MWChemNode' },
	{ name: 'gallery', node: 'MWGalleryNode' },
	{ name: 'score', node: 'MWScoreNode' },
	{ name: 'hiero', node: 'MWHieroNode' },
	{ name: 'maplink', node: 'MWInlineMapsNode' },
	{ name: 'mapframe', node: 'MWMapsNode' },
	{ name: 'templatedata', module: 'ext.templateData.templateDiscovery' },
	{ name: 'timeline', module: 'ext.timeline.styles' },
	{ name: 'phonos', module: 'ext.phonos.init' },
	{ name: 'charinsert', module: 'ext.charinsert' },
	{ name: 'categorytree', module: 'ext.categoryTree' },
	{ name: 'inputbox', module: 'ext.inputBox' },
	{ name: 'imagemap', module: 'ext.imagemap' },
	// Poem and TemplateStyles have no dedicated ve.dm node or client-side module
	// to guard on (VisualEditor treats them as generic alien extensions), so
	// unlike the tags above they can't be availability-gated and are offered
	// unconditionally.
	{ name: 'poem' },
	{ name: 'templatestyles', selfClosing: true },
	{ name: 'templatestyles', selfClosing: true, attributes: { src: '' } }
];

/* Methods */

/**
 * Get the tag descriptors available in the current context: the parser and
 * extension tags followed by the plain HTML tags, dropping any that are
 * unavailable (see #static-extensionTags).
 *
 * @return {Object[]} Available tag descriptors, in preference order
 */
ve.ui.MWTagCompletionAction.prototype.getTags = function () {
	const voidTags = this.constructor.static.voidHtmlTags;
	const htmlTags = this.constructor.static.htmlTags.map(
		( name ) => ( { name, selfClosing: voidTags.includes( name ) } )
	);
	return this.constructor.static.parserTags
		.concat( this.constructor.static.extensionTags )
		.map( ( tag ) => ( typeof tag === 'string' ? { name: tag } : tag ) )
		.concat( htmlTags )
		.filter( ( tag ) => (
			( !tag.node || !!ve.dm[ tag.node ] ) &&
			( !tag.module || !!mw.loader.getState( tag.module ) )
		) );
};

/**
 * @inheritdoc
 */
ve.ui.MWTagCompletionAction.prototype.getSuggestions = function ( input ) {
	return ve.createDeferred().resolve(
		this.filterSuggestionsForInput( this.getTags(), input )
	).promise();
};

/**
 * @inheritdoc
 */
ve.ui.MWTagCompletionAction.prototype.compareSuggestionToInput = function ( suggestion, normalizedInput ) {
	const name = suggestion.name.toLowerCase();
	return {
		isMatch: name.startsWith( normalizedInput ),
		isExact: name === normalizedInput
	};
};

/**
 * Build the opening tag for a suggestion, including any attributes.
 *
 * @param {Object} suggestion Tag descriptor
 * @return {string} e.g. '<syntaxhighlight lang="">'
 */
ve.ui.MWTagCompletionAction.prototype.getOpenTag = function ( suggestion ) {
	let attributes = '';
	for ( const key in suggestion.attributes ) {
		attributes += ' ' + key + '="' + suggestion.attributes[ key ] + '"';
	}
	return '<' + suggestion.name + attributes + ( suggestion.selfClosing ? ' />' : '>' );
};

/**
 * @inheritdoc
 */
ve.ui.MWTagCompletionAction.prototype.getMenuItemForSuggestion = function ( suggestion ) {
	// Show the opening tag as it will be inserted; the descriptor is the data.
	return new OO.ui.MenuOptionWidget( { data: suggestion, label: this.getOpenTag( suggestion ) } );
};

/**
 * @inheritdoc
 */
ve.ui.MWTagCompletionAction.prototype.insertCompletion = function ( data, range ) {
	const open = this.getOpenTag( data );
	const markup = data.selfClosing ? open : open + '</' + data.name + '>';
	ve.ui.MWTagCompletionAction.super.prototype.insertCompletion.call( this, markup, range );
	// Content is inserted at range.start. Place the caret inside the first empty
	// attribute value if there is one (e.g. lang=""), otherwise between the tags.
	// chooseItem() collapses and selects this range.
	let offset = open.length;
	for ( const key in data.attributes ) {
		if ( data.attributes[ key ] === '' ) {
			offset = open.indexOf( key + '="' ) + key.length + 2;
			break;
		}
	}
	return this.surface.getModel().getLinearFragment( new ve.Range( range.start + offset ) );
};

/* Registration */

ve.ui.actionFactory.register( ve.ui.MWTagCompletionAction );

const tagCommand = new ve.ui.Command(
	'openMWTagCompletions', ve.ui.MWTagCompletionAction.static.name, 'open',
	{ supportedSelections: [ 'linear' ] }
);
ve.ui.wikitextCommandRegistry.register( tagCommand );
ve.ui.wikitextSequenceRegistry.register(
	new ve.ui.Sequence( 'autocompleteMWTags', 'openMWTagCompletions', '<', 0 )
);
