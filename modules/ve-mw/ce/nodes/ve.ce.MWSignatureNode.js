/*!
 * VisualEditor ContentEditable MWSignatureNode class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

// Update the timestamp on inserted signatures every minute.
var liveSignatures = [];
setInterval( function () {
	var updatedSignatures, i, sig;
	updatedSignatures = [];
	for ( i = 0; i < liveSignatures.length; i++ ) {
		sig = liveSignatures[ i ];
		try {
			sig.forceUpdate();
			updatedSignatures.push( sig );
		} catch ( er ) {
			// Do nothing
		}
	}
	liveSignatures = updatedSignatures;
}, 60 * 1000 );

/**
 * ContentEditable MediaWiki signature node. This defines the behavior of the signature node
 * inserted into the ContentEditable document.
 *
 * @class
 * @extends ve.ce.MWTransclusionInlineNode
 *
 * @constructor
 * @param {ve.dm.MWSignatureNode} model Model to observe
 * @param {Object} [config] Configuration options
 */
ve.ce.MWSignatureNode = function VeCeMWSignatureNode( model ) {
	// Parent constructor
	ve.ce.MWTransclusionInlineNode.call( this, model );

	// DOM changes
	this.$element.addClass( 've-ce-mwSignatureNode' );

	if ( this.isGenerating() ) {
		// Use an initial rendering of '~~~~' as a placeholder to avoid
		// the width changing when using the Sequence.
		this.$element.text( '~~~~' );
	}

	// Keep track for magical text updating
	liveSignatures.push( this );
};

/* Inheritance */

OO.inheritClass( ve.ce.MWSignatureNode, ve.ce.MWTransclusionInlineNode );

/* Static Properties */

ve.ce.MWSignatureNode.static.name = 'mwSignature';

ve.ce.MWSignatureNode.static.tagName = 'span';

ve.ce.MWSignatureNode.static.primaryCommandName = 'mwSignature';

/* Methods */

/**
 * @inheritdoc
 */
ve.ce.MWSignatureNode.prototype.generateContents = function () {
	var wikitext, signatureNode, api, deferred, xhr;
	// Parsoid doesn't support pre-save transforms. PHP parser doesn't support Parsoid's
	// meta attributes (that may or may not be required).

	// We could try hacking up one (or even both) of these, but just calling the two parsers
	// in order seems slightly saner.

	// We must have only one top-level node, this is the easiest way.
	wikitext = '<span>~~~~</span>';
	signatureNode = this;

	api = new mw.Api();
	deferred = $.Deferred();
	xhr = api.post( {
		action: 'parse',
		text: wikitext,
		contentmodel: 'wikitext',
		prop: 'text',
		onlypst: true
	} )
		.done( function ( resp ) {
			var wikitext = ve.getProp( resp, 'parse', 'text', '*' );
			if ( wikitext ) {
				// Call parent method with the wikitext with PST applied.
				ve.ce.MWSignatureNode.parent.prototype.generateContents.call(
					signatureNode,
					{ wikitext: wikitext }
				).done( function ( nodes ) {
					deferred.resolve( nodes );
				} );
			} else {
				signatureNode.onParseError( deferred );
			}
		} )
		.fail( this.onParseError.bind( this, deferred ) );

	return deferred.promise( { abort: xhr.abort } );
};

/* Registration */

ve.ce.nodeFactory.register( ve.ce.MWSignatureNode );
