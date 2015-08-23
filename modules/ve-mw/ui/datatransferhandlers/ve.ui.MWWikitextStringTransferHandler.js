/*!
 * VisualEditor UserInterface MWWikitextStringTransferHandler class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * Detect an attempt to paste wikitext, and convert it to proper
 * HTML.
 *
 * @class
 * @extends ve.ui.PlainTextStringTransferHandler
 *
 * @constructor
 * @param {ve.ui.Surface} surface
 * @param {ve.ui.DataTransferItem} item
 */
ve.ui.MWWikitextStringTransferHandler = function VeUiMWWikitextStringTransferHandler() {
	// Parent constructor
	ve.ui.MWWikitextStringTransferHandler.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWWikitextStringTransferHandler, ve.ui.PlainTextStringTransferHandler );

/* Static properties */

ve.ui.MWWikitextStringTransferHandler.static.name = 'wikitextString';

ve.ui.MWWikitextStringTransferHandler.static.types =
	ve.ui.MWWikitextStringTransferHandler.super.static.types.concat(
		[ 'text/x-wiki' ]
	);

ve.ui.MWWikitextStringTransferHandler.static.handlesPaste = true;

/**
 * Heuristic pattern which attempts to discover wikitext, without
 * incurring too many false positives.
 *
 * Currently the pattern looks for ==...==, [[...]], or {{...}}
 * which occur on a single line of max 80 characters.
 */
ve.ui.MWWikitextStringTransferHandler.static.matchRegExp =
	/(^\s*(={2,6})[^=\r\n]{1,80}\2\s*$)|\[\[.{1,80}\]\]|\{\{.{1,80}\}\}/m;

ve.ui.MWWikitextStringTransferHandler.static.matchFunction = function ( item ) {
	var text = item.getAsString();

	// If the mime type is explicitly wikitext (ie, not plain text),
	// always accept.
	if ( item.type === 'text/x-wiki' ) {
		return true;
	}

	// Detect autolink opportunities for magic words.
	// (The link should be the only contents of paste to match this heuristic)
	if ( /^\s*(RFC|ISBN|PMID)[-\s0-9]+[Xx]?\s*$/.test( text ) ) {
		return true;
	}

	// Use a heuristic regexp to find text likely to be wikitext.
	// This test could be made more sophisticated in the future.
	if ( this.matchRegExp.test( text ) ) {
		return true;
	}
	return false;
};

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWWikitextStringTransferHandler.prototype.process = function () {
	var xhr,
		handler = this,
		wikitext = this.item.getAsString();

	function failure() {
		// There's no DTH fallback handling for failures, so just paste
		// the raw wikitext if things go wrong.
		handler.resolve( wikitext );
	}

	// Convert wikitext to html using Parsoid.
	xhr = new mw.Api().post( {
		action: 'visualeditor',
		paction: 'parsefragment',
		page: mw.config.get( 'wgRelevantPageName' ),
		wikitext: wikitext
	} ).then( function ( response ) {
		var doc, surface;
		if ( ve.getProp( response, 'visualeditor', 'result' ) !== 'success' ) {
			return failure();
		}

		doc = handler.surface.getModel().getDocument().newFromHtml(
			response.visualeditor.content,
			null // No sanitization, since HTML is from Parsoid
		);

		// Attempt to undo outermost p-wrapping if possible
		surface = new ve.dm.Surface( doc );
		try {
			surface.change(
				ve.dm.Transaction.newFromWrap( doc, new ve.Range( 0, doc.data.countNonInternalElements() ), [], [], [ { type: 'paragraph' } ], [] )
			);
		} catch ( e ) {
			// Sometimes there is no p-wrapping, for example: "* foo"
			// Sometimes there are multiple <p> tags in the output.
			// That's okay: ignore the error and paste what we've got.
		}

		handler.resolve( doc );
	}, failure );
};

/* Registration */

ve.ui.dataTransferHandlerFactory.register( ve.ui.MWWikitextStringTransferHandler );
