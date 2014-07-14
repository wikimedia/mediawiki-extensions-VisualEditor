/*!
 * VisualEditor user interface MWMetaDialog class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for editing MediaWiki page information.
 *
 * @class
 * @extends OO.ui.ProcessDialog
 *
 * @constructor
 * @param {OO.ui.WindowManager} manager Manager of window
 * @param {Object} [config] Configuration options
 */
ve.ui.MWMetaDialog = function VeUiMWMetaDialog( manager, config ) {
	// Parent constructor
	ve.ui.MWMetaDialog.super.call( this, manager, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWMetaDialog, ve.ui.FragmentDialog );

/* Static Properties */

ve.ui.MWMetaDialog.static.name = 'meta';

ve.ui.MWMetaDialog.static.title =
	OO.ui.deferMsg( 'visualeditor-dialog-meta-title' );

ve.ui.MWMetaDialog.static.icon = 'window';

ve.ui.MWMetaDialog.static.size = 'large';

ve.ui.MWMetaDialog.static.actions = [
	{
		'action': 'apply',
		'label': OO.ui.deferMsg( 'visualeditor-dialog-action-apply' ),
		'flags': 'primary'
	},
	{
		'label': OO.ui.deferMsg( 'visualeditor-dialog-action-cancel' ),
		'flags': 'safe'
	}
];

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWMetaDialog.prototype.getBodyHeight = function () {
	return 400;
};

/**
 * @inheritdoc
 */
ve.ui.MWMetaDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.MWMetaDialog.super.prototype.initialize.call( this );

	// Properties
	this.panels = new OO.ui.StackLayout( { '$': this.$ } );
	this.bookletLayout = new OO.ui.BookletLayout( { '$': this.$, 'outlined': true } );
	this.settingsPage = new ve.ui.MWSettingsPage(
		'settings',
		{ '$': this.$ }
	);
	this.advancedSettingsPage = new ve.ui.MWAdvancedSettingsPage(
		'advancedSettings',
		{ '$': this.$ }
	);
	this.categoriesPage = new ve.ui.MWCategoriesPage(
		'categories',
		{
			'$': this.$,
			'$overlay': this.$overlay
		}
	);
	this.languagesPage = new ve.ui.MWLanguagesPage(
		'languages',
		{ '$': this.$ }
	);

	// Initialization
	this.$body.append( this.panels.$element );
	this.panels.addItems( [ this.bookletLayout ] );
	this.bookletLayout.addPages( [
		this.settingsPage,
		this.advancedSettingsPage,
		this.categoriesPage,
		this.languagesPage
	] );
};

/**
 * @inheritdoc
 */
ve.ui.MWMetaDialog.prototype.getActionProcess = function ( action ) {
	var surfaceModel = this.getFragment().getSurface();

	if ( action === 'apply' ) {
		return new OO.ui.Process( function () {
			// Let each page tear itself down ('languages' page doesn't need this yet)
			this.settingsPage.teardown( { 'action': action } );
			this.advancedSettingsPage.teardown( { 'action': action } );
			this.categoriesPage.teardown( { 'action': action } );

			// ALWAYS return to normal tracking behavior
			surfaceModel.startHistoryTracking();

			this.close( { 'action': action } );
		}, this );
	}

	return ve.ui.MWMetaDialog.super.prototype.getActionProcess.call( this, action )
		.next( function () {
			// Place transactions made while dialog was open in a common history state
			if ( surfaceModel.breakpoint() ) {
				// Undo everything done in the dialog and prevent redoing those changes
				surfaceModel.undo();
				surfaceModel.truncateUndoStack();

				// ALWAYS return to normal tracking behavior
				surfaceModel.startHistoryTracking();
			}
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWMetaDialog.prototype.getSetupProcess = function ( data ) {
	return ve.ui.MWMetaDialog.super.prototype.getSetupProcess.call( this, data )
		.next( function () {
			// Data initialization
			data = data || {};

			var surfaceModel = this.getFragment().getSurface();

			if ( data.page && this.bookletLayout.getPage( data.page ) ) {
				this.bookletLayout.setPage( data.page );
			}

			// Force all previous transactions to be separate from this history state
			surfaceModel.breakpoint();
			surfaceModel.stopHistoryTracking();

			// Let each page set itself up ('languages' page doesn't need this yet)
			this.settingsPage.setup( surfaceModel.metaList, data );
			this.advancedSettingsPage.setup( surfaceModel.metaList, data );
			this.categoriesPage.setup( surfaceModel.metaList, data );
		}, this );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWMetaDialog );
