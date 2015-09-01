/*!
 * VisualEditor UserInterface MWLinkAction class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * Link action.
 *
 * Opens either MWLinkAnnotationInspector or MWLinkNodeInspector depending on what is selected.
 *
 * @class
 * @extends ve.ui.LinkAction
 * @constructor
 * @param {ve.ui.Surface} surface Surface to act on
 */
ve.ui.MWLinkAction = function VeUiMWLinkAction( surface ) {
	// Parent constructor
	ve.ui.MWLinkAction.super.call( this, surface );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWLinkAction, ve.ui.LinkAction );

/* Static Properties */

/**
 * List of allowed methods for the action.
 *
 * @static
 * @property
 */
ve.ui.MWLinkAction.static.methods = ve.ui.MWLinkAction.super.static.methods.concat( [ 'open', 'autolinkMagicLink' ] );

/* Methods */

/**
 * Match the trailing punctuation set used for autolinks in wikitext.
 * Closing parens are only stripped if open parens are missing from the
 * candidate text, so that URLs with embedded matched parentheses (like
 * wiki articles with disambiguation text) autolink nicely.
 *
 * @method
 * @inheritdoc
 */
ve.ui.MWLinkAction.prototype.getTrailingPunctuation = function ( candidate ) {
	// This is:
	// * the "trailing punctuation" character set from
	//   Parse.php::makeFreeExternalLink(): [,;.:!?] and sometimes [)]
	// * extended with characters banned by EXT_LINK_URL_CLASS: []<>"
	// * further extended with international close quotes: "'”’›»“‘‹«」』
	//   https://en.wikipedia.org/wiki/Quotation_mark
	return /\(/.test( candidate ) ?
		/[,;.:!?\[\]<>\"\'”’›»“‘‹«」』]+$/ :
		/[,;.:!?\[\]<>\"\'”’›»“‘‹«」』)]+$/;
};

/**
 * @method
 * @inheritdoc
 * @return {ve.dm.MWExternalLinkAnnotation} The annotation to use.
 */
ve.ui.MWLinkAction.prototype.getLinkAnnotation = function ( linktext ) {
	var title, targetData, m,
		href = linktext;
	// The link has been validated in #autolinkMagicLink and/or
	// #autolinkUrl, so we can use a quick and dirty regexp here to pull
	// apart the magic link.
	m = /^(RFC|PMID|ISBN)\s+(\S.*)$/.exec( linktext );
	if ( m && m[ 1 ] === 'RFC' ) {
		href = '//tools.ietf.org/html/rfc' + m[ 2 ];
	} else if ( m && m[ 1 ] === 'PMID' ) {
		href = '//www.ncbi.nlm.nih.gov/pubmed/' + m[ 2 ] + '?dopt=Abstract';
	} else if ( m && m[ 1 ] === 'ISBN' ) {
		title = mw.Title.newFromText( 'Special:BookSources/' + m[ 2 ].replace( /[^0-9Xx]/g, '' ) );
	} else {
		targetData = ve.dm.MWInternalLinkAnnotation.static.getTargetDataFromHref(
			href,
			this.surface.getModel().getDocument().getHtmlDocument()
		);
		if ( targetData.isInternal ) {
			title = mw.Title.newFromText( targetData.title );
		}
	}
	return title ?
		ve.dm.MWInternalLinkAnnotation.static.newFromTitle( title ) :
		new ve.dm.MWExternalLinkAnnotation( {
			type: 'link/mwExternal',
			attributes: { href: href }
		} );
};

/**
 * Autolink the selected RFC/PMID/ISBN, which may have trailing punctuation
 * followed by whitespace.
 *
 * @see ve.ui.LinkAction#autolinkUrl
 * @method
 * @return {boolean}
 *   True if the selection is a valid RFC/PMID/ISBN and the autolink action
 *   was executed; otherwise false.
 */
ve.ui.MWLinkAction.prototype.autolinkMagicLink = function () {
	return this.autolink( function ( linktext ) {
		if ( /^(RFC|PMID) [0-9]+$/.test( linktext ) ) {
			return true; // Valid RFC/PMID
		}
		if ( /^ISBN (97[89][- ]?)?([0-9][- ]?){9}[0-9Xx]$/.test( linktext ) ) {
			return true; // Valid ISBN
		}
		return false;
	} );
};

/**
 * Open either the 'link' or 'linkNode' window, depending on what is selected.
 *
 * @method
 * @return {boolean} Action was executed
 */
ve.ui.MWLinkAction.prototype.open = function () {
	var fragment = this.surface.getModel().getFragment(),
		windowName = 'link';

	if ( fragment.getSelectedNode() instanceof ve.dm.MWNumberedExternalLinkNode ) {
		windowName = 'linkNode';
	}
	this.surface.execute( 'window', 'open', windowName );
	return true;
};

/* Registration */

ve.ui.actionFactory.register( ve.ui.MWLinkAction );

ve.ui.commandRegistry.register(
	new ve.ui.Command(
		'autolinkMagicLink', ve.ui.MWLinkAction.static.name, 'autolinkMagicLink',
		{ supportedSelections: [ 'linear' ] }
	)
);

ve.ui.sequenceRegistry.register(
	// This regexp doesn't have to be precise; we'll validate the magic
	// link in #autolinkMagicLink above.
	// The trailing \S* covers any trailing punctuation, which will be
	// stripped before validating the link.
	new ve.ui.Sequence( 'autolinkMagicLink', 'autolinkMagicLink', /\b(RFC|PMID|ISBN)\s+[0-9]([- 0-9]*[0-9Xx])?\S*(\s|\n\n)$/, 0, true )
);
