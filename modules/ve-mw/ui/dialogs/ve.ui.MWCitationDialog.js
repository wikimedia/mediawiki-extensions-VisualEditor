/*
 * VisualEditor user interface MWCitationDialog class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for inserting and editing MediaWiki transclusions.
 *
 * @class
 * @extends ve.ui.MWTransclusionDialog
 *
 * @constructor
 * @param {ve.ui.Surface} surface Surface dialog is for
 * @param {Object} [config] Configuration options
 */
ve.ui.MWCitationDialog = function VeUiMWCitationDialog( surface, config ) {
	// Parent constructor
	ve.ui.MWTransclusionDialog.call( this, surface, config );

	// Properties
	this.ref = null;
};

/* Inheritance */

OO.inheritClass( ve.ui.MWCitationDialog, ve.ui.MWTransclusionDialog );

/* Static Properties */

ve.ui.MWCitationDialog.static.name = 'citation';

ve.ui.MWCitationDialog.static.icon = 'reference';

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWCitationDialog.prototype.getApplyButtonLabel = function () {
	return ve.msg(
		this.inserting ?
			'visualeditor-dialog-citation-insert-citation' :
			'visualeditor-dialog-action-apply'
	);
};

/**
 * @inheritdoc
 */
ve.ui.MWCitationDialog.prototype.getNode = function ( data ) {
	var node, branches, leaves, transclusion;

	node = ve.ui.MWTransclusionDialog.prototype.getNode.call( this, data );
	if ( node ) {
		branches = node.getInternalItem().getChildren();
		leaves = branches &&
			branches.length === 1 &&
			branches[0].canContainContent() &&
			branches[0].getChildren();
		transclusion = leaves &&
			leaves.length === 1 &&
			leaves[0] instanceof ve.dm.MWTransclusionNode &&
			leaves[0];
	}

	return transclusion || null;
};

/**
 * @inheritdoc
 */
ve.ui.MWCitationDialog.prototype.saveChanges = function () {
	var item,
		surfaceModel = this.surface.getModel(),
		doc = surfaceModel.getDocument(),
		internalList = doc.getInternalList(),
		obj = this.transclusion.getPlainObject();

	if ( !this.ref ) {
		this.ref = new ve.dm.MWReferenceModel();
		this.ref.insertInternalItem( surfaceModel );
		this.ref.insertReferenceNode( surfaceModel );
	}

	item = this.ref.findInternalItem( surfaceModel );
	if ( item ) {
		if ( this.node instanceof ve.dm.MWTransclusionNode ) {
			this.transclusion.updateTransclusionNode( surfaceModel, this.node );
		} else if ( obj !== null ) {
			this.transclusion.insertTransclusionNode( surfaceModel, item.getRange() );
		}
	}

	// HACK: Scorch the earth - this is only needed because without it, the reference list won't
	// re-render properly, and can be removed once someone fixes that
	this.ref.setDocument(
		doc.cloneFromRange( internalList.getItemNode( this.ref.getListIndex() ).getRange() )
	);
	this.ref.updateInternalItem( surfaceModel );
};

/**
 * @inheritdoc
 */
ve.ui.MWCitationDialog.prototype.setup = function ( data ) {
	var focusedNode;

	// Parent method
	ve.ui.MWTransclusionDialog.prototype.setup.call( this, data );

	// Initialization
	focusedNode = this.surface.getView().getFocusedNode();
	this.ref = focusedNode && focusedNode.getModel() instanceof ve.dm.MWReferenceNode ?
		ve.dm.MWReferenceModel.static.newFromReferenceNode( focusedNode.getModel() ) : null;
};

/**
 * @inheritdoc
 */
ve.ui.MWCitationDialog.prototype.teardown = function ( data ) {
	// Parent method
	ve.ui.MWTransclusionDialog.prototype.teardown.call( this, data );

	// Cleanup
	this.ref = null;
};
