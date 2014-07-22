/*!
 * VisualEditor user interface MWReferenceListDialog class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for inserting and editing MediaWiki reference lists.
 *
 * @class
 * @extends ve.ui.NodeDialog
 *
 * @constructor
 * @param {OO.ui.WindowManager} manager Manager of window
 * @param {Object} [config] Configuration options
 */
ve.ui.MWReferenceListDialog = function VeUiMWReferenceListDialog( manager, config ) {
	// Parent constructor
	ve.ui.MWReferenceListDialog.super.call( this, manager, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWReferenceListDialog, ve.ui.NodeDialog );

/* Static Properties */

ve.ui.MWReferenceListDialog.static.name = 'referenceList';

ve.ui.MWReferenceListDialog.static.title =
	OO.ui.deferMsg( 'visualeditor-dialog-referencelist-title' );

ve.ui.MWReferenceListDialog.static.icon = 'references';

ve.ui.MWReferenceListDialog.static.modelClasses = [ ve.dm.MWReferenceListNode ];

ve.ui.MWReferenceListDialog.static.size = 'medium';

ve.ui.MWReferenceListDialog.static.actions = [
	{
		'action': 'apply',
		'label': OO.ui.deferMsg( 'visualeditor-dialog-action-apply' ),
		'flags': 'primary',
		'modes': 'edit'
	},
	{
		'action': 'insert',
		'label': OO.ui.deferMsg( 'visualeditor-dialog-referencelist-insert-button' ),
		'flags': [ 'primary', 'constructive' ],
		'modes': 'insert'
	},
	{
		'label': OO.ui.deferMsg( 'visualeditor-dialog-action-cancel' ),
		'flags': 'safe',
		'modes': [ 'insert', 'edit' ]
	}
];

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWReferenceListDialog.prototype.getBodyHeight = function () {
	return Math.ceil( this.editPanel.$element[0].scrollHeight );
};

/**
 * @inheritdoc
 */
ve.ui.MWReferenceListDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.MWReferenceListDialog.super.prototype.initialize.call( this );

	// Properties
	this.panels = new OO.ui.StackLayout( { '$': this.$ } );
	this.editPanel = new OO.ui.PanelLayout( {
		'$': this.$, 'scrollable': true, 'padded': true
	} );
	this.optionsFieldset = new OO.ui.FieldsetLayout( {
		'$': this.$
	} );

	this.groupInput = new OO.ui.TextInputWidget( {
		'$': this.$,
		'placeholder': ve.msg( 'visualeditor-dialog-reference-options-group-placeholder' )
	} );
	this.groupField = new OO.ui.FieldLayout( this.groupInput, {
		'$': this.$,
		'align': 'top',
		'label': ve.msg( 'visualeditor-dialog-reference-options-group-label' )
	} );

	// Initialization
	this.optionsFieldset.addItems( [ this.groupField ] );
	this.editPanel.$element.append( this.optionsFieldset.$element );
	this.panels.addItems( [ this.editPanel ] );
	this.$body.append( this.panels.$element );
};

/**
 * @inheritdoc
 */
ve.ui.MWReferenceListDialog.prototype.getActionProcess = function ( action ) {
	if ( action === 'apply' || action === 'insert' ) {
		return new OO.ui.Process( function () {
			var refGroup, listGroup, oldListGroup, attrChanges, doc,
				surfaceModel = this.getFragment().getSurface();

			// Save changes
			refGroup = this.groupInput.getValue();
			listGroup = 'mwReference/' + refGroup;

			if ( this.selectedNode ) {
				// Edit existing model
				doc = surfaceModel.getDocument();
				oldListGroup = this.selectedNode.getAttribute( 'listGroup' );

				if ( listGroup !== oldListGroup ) {
					attrChanges = {
						listGroup: listGroup,
						refGroup: refGroup
					};
					surfaceModel.change(
						ve.dm.Transaction.newFromAttributeChanges(
							doc, this.selectedNode.getOuterRange().start, attrChanges
						)
					);
				}
			} else {
				// Collapse returns a new fragment, so update this.fragment
				this.fragment = this.getFragment().collapseRangeToEnd().insertContent( [
					{
						'type': 'mwReferenceList',
						'attributes': {
							'listGroup': listGroup,
							'refGroup': refGroup
						}
					},
					{ 'type': '/mwReferenceList' }
				] );
			}

			this.close( { 'action': action } );
		}, this );
	}
	// Parent method
	return ve.ui.MWReferenceListDialog.super.prototype.getActionProcess.call( this, action );
};

/**
 * @inheritdoc
 */
ve.ui.MWReferenceListDialog.prototype.getSetupProcess = function ( data ) {
	return ve.ui.MWReferenceListDialog.super.prototype.getSetupProcess.call( this, data )
		.next( function () {
			var node, refGroup;

			// Prepopulate from existing node if we're editing a node
			// instead of inserting a new one
			node = this.getFragment().getSelectedNode();
			if ( this.selectedNode instanceof ve.dm.MWReferenceListNode ) {
				refGroup = node.getAttribute( 'refGroup' );
				this.actions.setMode( 'edit' );
			} else {
				refGroup = '';
				this.actions.setMode( 'insert' );
			}

			this.groupInput.setValue( refGroup );
		}, this );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWReferenceListDialog );
