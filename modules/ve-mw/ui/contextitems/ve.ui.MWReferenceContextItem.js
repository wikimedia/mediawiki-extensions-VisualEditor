/*!
 * VisualEditor MWReferenceContextItem class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * Context item for a MWReference.
 *
 * @class
 * @extends ve.ui.ContextItem
 *
 * @constructor
 * @param {ve.ui.Context} context Context item is in
 * @param {ve.dm.Model} model Model item is related to
 * @param {Object} config Configuration options
 */
ve.ui.MWReferenceContextItem = function VeMWReferenceContextItem() {
	// Parent constructor
	ve.ui.MWReferenceContextItem.super.apply( this, arguments );

	// Initialization
	this.$element.addClass( 've-ui-mwReferenceContextItem' );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWReferenceContextItem, ve.ui.ContextItem );

/* Static Properties */

ve.ui.MWReferenceContextItem.static.name = 'reference';

ve.ui.MWReferenceContextItem.static.icon = 'reference';

ve.ui.MWReferenceContextItem.static.label = OO.ui.deferMsg( 'visualeditor-dialogbutton-reference-tooltip' );

ve.ui.MWReferenceContextItem.static.modelClasses = [ ve.dm.MWReferenceNode ];

ve.ui.MWReferenceContextItem.static.commandName = 'reference';

/* Methods */

/**
 * Get a DOM rendering of the reference.
 *
 * @private
 * @return {jQuery} DOM rendering of reference
 */
ve.ui.MWReferenceContextItem.prototype.getRendering = function () {
	var ref = ve.dm.MWReferenceModel.static.newFromReferenceNode( this.model ),
		view = new ve.ce.InternalItemNode(
			this.model.getDocument().getInternalList().getItemNode( ref.getListIndex() )
		);

	// HACK: PHP parser doesn't wrap single lines in a paragraph
	if ( view.$element.children().length === 1 && view.$element.children( 'p' ).length === 1 ) {
		// unwrap inner
		view.$element.children().replaceWith( view.$element.children().contents() );
	}

	// Cleanup
	view.destroy();

	// Make all links open in a new window (sync rendering)
	view.$element.find( 'a' ).attr( 'target', '_blank' );

	// Make all links open in a new window (async rendering)
	ve.BranchNode.static.traverse( view, function ( node ) {
		// Duck type ve.ce.GeneratedContentNode
		if ( typeof node.generateContents === 'function' ) {
			node.once( 'rerender', function () {
				node.$element.find( 'a' ).attr( 'target', '_blank' );
			} );
		}
	} );

	// WARNING: The $element property may be rendered into asynchronously
	return view.$element;
};

/**
 * @inheritdoc
 */
ve.ui.MWReferenceContextItem.prototype.getDescription = function () {
	return this.getRendering().text();
};

/**
 * @inheritdoc
 */
ve.ui.MWReferenceContextItem.prototype.renderBody = function () {
	this.$body.empty().append( this.getRendering() );
};

/* Registration */

ve.ui.contextItemFactory.register( ve.ui.MWReferenceContextItem );
