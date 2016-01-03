/*!
 * VisualEditor UserInterface MWExtensionPreviewDialog class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for editing generic MediaWiki extensions with a preview.
 *
 * @class
 * @abstract
 * @extends ve.ui.MWExtensionDialog
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWExtensionPreviewDialog = function VeUiMWExtensionPreviewDialog() {
	// Parent constructor
	ve.ui.MWExtensionPreviewDialog.super.apply( this, arguments );

	// Late bind onChangeHandler to a debounced updatePreview
	this.onChangeHandler = ve.debounce( this.updatePreview.bind( this ), 250 );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWExtensionPreviewDialog, ve.ui.MWExtensionDialog );

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWExtensionPreviewDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.MWExtensionPreviewDialog.super.prototype.initialize.call( this );

	// Properties
	this.previewNode = null;
	this.previewElement = new ve.ui.MWPreviewElement();

	// Initialization
	this.$element.addClass( 've-ui-mwExtensionPreviewDialog' );
};

/**
 * @inheritdoc
 */
ve.ui.MWExtensionPreviewDialog.prototype.getSetupProcess = function ( data ) {
	return ve.ui.MWExtensionPreviewDialog.super.prototype.getSetupProcess.call( this, data )
		.next( function () {
			var doc, element;
			if ( this.selectedNode ) {
				doc = this.selectedNode.getDocument().cloneFromRange( this.selectedNode.getOuterRange() );
			} else {
				element = this.getNewElement();
				doc = new ve.dm.Document( [
					element,
					{ type: '/' + element.type },
					{ type: 'internalList' },
					{ type: '/internalList' }
				] );
			}
			this.previewNode = doc.getDocumentNode().children[ 0 ];
			this.previewElement.setModel( this.previewNode );
		}, this );
};

/**
 * Update the node rendering to reflect the current content in the dialog.
 */
ve.ui.MWExtensionPreviewDialog.prototype.updatePreview = function () {
	var mwData = ve.copy( this.previewNode.getAttribute( 'mw' ) ),
		doc = this.previewNode.getDocument();

	this.updateMwData( mwData );

	doc.commit(
		ve.dm.Transaction.newFromAttributeChanges(
			doc, this.previewNode.getOuterRange().start, { mw: mwData }
		)
	);
	this.previewElement.updatePreview();
};
