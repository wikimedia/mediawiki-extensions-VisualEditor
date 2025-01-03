/*!
 * VisualEditor ContentEditable MWSignatureNode class.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * ContentEditable MediaWiki signature node. This defines the behavior of the signature node
 * inserted into the ContentEditable document.
 *
 * @class
 * @extends ve.ce.LeafNode
 *
 * @constructor
 * @param {ve.dm.MWSignatureNode} model Model to observe
 * @param {Object} [config] Configuration options
 */
ve.ce.MWSignatureNode = function VeCeMWSignatureNode() {
	// Parent constructor
	ve.ce.MWSignatureNode.super.apply( this, arguments );

	// Mixin constructors
	ve.ce.GeneratedContentNode.call( this );
	ve.ce.FocusableNode.call( this );

	// DOM changes
	this.$element.addClass( 've-ce-mwSignatureNode' );

	if ( this.isGenerating() ) {
		// Use an initial rendering of '~~~~' as a placeholder to avoid
		// the width changing when using the Sequence.
		this.$element.text( '~~~~' );
	}
};

/* Inheritance */

OO.inheritClass( ve.ce.MWSignatureNode, ve.ce.LeafNode );
OO.mixinClass( ve.ce.MWSignatureNode, ve.ce.GeneratedContentNode );
OO.mixinClass( ve.ce.MWSignatureNode, ve.ce.FocusableNode );

/* Static Properties */

ve.ce.MWSignatureNode.static.name = 'mwSignature';

ve.ce.MWSignatureNode.static.tagName = 'span';

ve.ce.MWSignatureNode.static.primaryCommandName = 'mwSignature';

ve.ce.MWSignatureNode.static.liveSignatures = [];

// Set a description for focusable node tooltip
ve.ce.MWSignatureNode.static.getDescription = function () {
	return ve.msg( 'visualeditor-mwsignature-tool' );
};

// Update the timestamp on inserted signatures every minute.
setInterval( () => {
	const liveSignatures = ve.ce.MWSignatureNode.static.liveSignatures;

	const updatedSignatures = [];
	for ( let i = 0; i < liveSignatures.length; i++ ) {
		const sig = liveSignatures[ i ];
		try {
			sig.forceUpdate();
			updatedSignatures.push( sig );
		} catch ( er ) {
			// Do nothing
		}
	}
	// Stop updating signatures that failed once
	ve.ce.MWSignatureNode.static.liveSignatures = updatedSignatures;
}, 60 * 1000 );

/* Methods */

/**
 * @inheritdoc
 */
ve.ce.MWSignatureNode.prototype.onSetup = function () {
	// Parent method
	ve.ce.MWSignatureNode.super.prototype.onSetup.call( this );

	// Keep track for regular updating of timestamp
	this.constructor.static.liveSignatures.push( this );
};

/**
 * @inheritdoc
 */
ve.ce.MWSignatureNode.prototype.onTeardown = function () {
	const liveSignatures = this.constructor.static.liveSignatures;

	// Parent method
	ve.ce.MWSignatureNode.super.prototype.onTeardown.call( this );

	// Stop tracking
	const index = liveSignatures.indexOf( this );
	if ( index !== -1 ) {
		liveSignatures.splice( index, 1 );
	}
};

/**
 * @inheritdoc ve.ce.GeneratedContentNode
 */
ve.ce.MWSignatureNode.prototype.generateContents = function () {
	const doc = this.getModel().getDocument();
	const api = ve.init.target.getContentApi( doc );
	const ajaxOptions = {};
	const abortable = api.makeAbortablePromise( ajaxOptions );

	// Acquire a temporary user username before previewing, so that signatures
	// display the temp user instead of IP user. (T331397)
	return mw.user.acquireTempUserName()
		.then( () => {
			// We must have only one top-level node, this is the easiest way.
			const wikitext = '<span>~~~~</span>';

			// Parsoid doesn't support pre-save transforms. PHP parser doesn't support Parsoid's
			// meta attributes (that may or may not be required).
			// We could try hacking up one (or even both) of these, but just calling the two parsers
			// in order seems slightly saner.
			return api.post( {
				action: 'parse',
				text: wikitext,
				contentmodel: 'wikitext',
				prop: 'text',
				onlypst: true
			}, ajaxOptions );
		} )
		.then( ( pstResponse ) => {
			const wikitext = ve.getProp( pstResponse, 'parse', 'text' );
			if ( !wikitext ) {
				return ve.createDeferred().reject();
			}
			return ve.init.target.parseWikitextFragment( wikitext, true, doc, ajaxOptions );
		} )
		.then( ( parseResponse ) => {
			if ( ve.getProp( parseResponse, 'visualeditor', 'result' ) !== 'success' ) {
				return ve.createDeferred().reject();
			}
			// Simplified case of template rendering, don't need to worry about filtering etc
			return $( parseResponse.visualeditor.content ).contents().toArray();
		} )
		.promise( abortable );
};

/* Registration */

ve.ce.nodeFactory.register( ve.ce.MWSignatureNode );
