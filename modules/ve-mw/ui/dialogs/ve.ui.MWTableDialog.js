/*!
 * VisualEditor UserInterface MWTableDialog class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * Dialog for table properties.
 *
 * @class
 * @extends ve.ui.TableDialog
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWTableDialog = function VeUiMWTableDialog( config ) {
	// Parent constructor
	ve.ui.MWTableDialog.super.call( this, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTableDialog, ve.ui.TableDialog );

/* Static Properties */

ve.ui.MWTableDialog.static.actions = [
	{
		action: 'done',
		label: OO.ui.deferMsg( 'visualeditor-dialog-action-done' ),
		flags: [ 'primary', 'progressive' ]
	}
];

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWTableDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.MWTableDialog.super.prototype.initialize.call( this );

	this.wikitableToggle = new OO.ui.ToggleSwitchWidget();
	this.wikitableField = new OO.ui.FieldLayout( this.wikitableToggle, {
		align: 'left',
		label: ve.msg( 'visualeditor-dialog-table-wikitable' )
	} );

	this.sortableToggle = new OO.ui.ToggleSwitchWidget();
	this.sortableField = new OO.ui.FieldLayout( this.sortableToggle, {
		align: 'left',
		label: ve.msg( 'visualeditor-dialog-table-sortable' )
	} );

	this.panel.$element.prepend( this.wikitableField.$element, this.sortableField.$element );
};

/**
 * @inheritdoc
 */
ve.ui.MWTableDialog.prototype.getSetupProcess = function ( data ) {
	return ve.ui.MWTableDialog.super.prototype.getSetupProcess.call( this, data )
		.next( function () {
			var tableNode = this.getFragment().getSelection().getTableNode();

			this.wikitableToggle.setValue( !!tableNode.getAttribute( 'wikitable' ) );
			this.sortableToggle.setValue( !!tableNode.getAttribute( 'sortable' ) );
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWTableDialog.prototype.getActionProcess = function ( action ) {
	return ve.ui.MWTableDialog.super.prototype.getActionProcess.call( this, action )
		.next( function () {
			var surfaceModel, fragment;
			if ( action === 'done' ) {
				surfaceModel = this.getFragment().getSurface();
				fragment = surfaceModel.getLinearFragment( this.getFragment().getSelection().tableRange, true );
				fragment.changeAttributes( {
					wikitable: this.wikitableToggle.getValue(),
					sortable: this.sortableToggle.getValue()
				} );
			}
		}, this );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWTableDialog );
