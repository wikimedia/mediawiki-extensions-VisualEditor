/*!
 * VisualEditor user interface MWMetaDialog class.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for editing MediaWiki page information.
 *
 * @class
 * @extends ve.ui.FragmentDialog
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWMetaDialog = function VeUiMWMetaDialog( config ) {
	// Parent constructor
	ve.ui.MWMetaDialog.super.call( this, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWMetaDialog, ve.ui.FragmentDialog );

/* Static Properties */

ve.ui.MWMetaDialog.static.name = 'meta';

ve.ui.MWMetaDialog.static.title =
	OO.ui.deferMsg( 'visualeditor-dialog-meta-title' );

ve.ui.MWMetaDialog.static.size = 'large';

ve.ui.MWMetaDialog.static.actions = [
	{
		action: 'apply',
		label: OO.ui.deferMsg( 'visualeditor-dialog-action-apply' ),
		flags: [ 'progressive', 'primary' ]
	},
	{
		label: OO.ui.deferMsg( 'visualeditor-dialog-action-cancel' ),
		flags: [ 'safe', 'back' ]
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
	this.panels = new OO.ui.StackLayout();
	this.bookletLayout = new OO.ui.BookletLayout( { outlined: true } );
	this.categoriesPage = new ve.ui.MWCategoriesPage( 'categories', { $overlay: this.$overlay } );
	this.settingsPage = new ve.ui.MWSettingsPage( 'settings', { $overlay: this.$overlay } );
	this.advancedSettingsPage = new ve.ui.MWAdvancedSettingsPage( 'advancedSettings', { $overlay: this.$overlay } );
	this.languagesPage = new ve.ui.MWLanguagesPage( 'languages', { $overlay: this.$overlay } );
	this.templatesUsedPage = new ve.ui.MWTemplatesUsedPage( 'templatesUsed', { $overlay: this.$overlay } );

	// Initialization
	this.$body.append( this.panels.$element );
	this.panels.addItems( [ this.bookletLayout ] );
	this.bookletLayout.addPages( [
		this.categoriesPage,
		this.settingsPage,
		this.advancedSettingsPage,
		this.languagesPage,
		this.templatesUsedPage
	] );
};

/**
 * @inheritdoc
 */
ve.ui.MWMetaDialog.prototype.getActionProcess = function ( action ) {
	var surfaceModel = this.getFragment().getSurface();

	if ( action === 'apply' ) {
		return new OO.ui.Process( function () {
			surfaceModel.applyStaging();
			this.close( { action: action } );
		}, this );
	}

	return ve.ui.MWMetaDialog.super.prototype.getActionProcess.call( this, action )
		.next( function () {
			surfaceModel.popStaging();
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWMetaDialog.prototype.getSetupProcess = function ( data ) {
	data = data || {};
	return ve.ui.MWMetaDialog.super.prototype.getSetupProcess.call( this, data )
		.next( function () {
			var surfaceModel = this.getFragment().getSurface(),
				selectWidget = this.bookletLayout.outlineSelectWidget,
				visualOnlyPages = [ 'categories', 'settings', 'advancedSettings', 'languages' ],
				isSource = ve.init.target.getSurface().getMode() === 'source';

			visualOnlyPages.forEach( function ( page ) {
				selectWidget.findItemFromData( page ).setDisabled( isSource );
			} );

			if ( isSource && visualOnlyPages.indexOf( data.page || 'categories' ) !== -1 ) {
				data.page = 'templatesUsed';
			}

			// Force all previous transactions to be separate from this history state
			surfaceModel.pushStaging();
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWMetaDialog.prototype.getReadyProcess = function ( data ) {
	data = data || {};
	return ve.ui.MWMetaDialog.super.prototype.getReadyProcess.call( this, data )
		.next( function () {
			var surfaceModel = this.getFragment().getSurface();

			// Call setPage in ready as setPage triggers PageLayout#focus
			if ( data.page && this.bookletLayout.getPage( data.page ) ) {
				this.bookletLayout.setPage( data.page );
				this.bookletLayout.getPage( data.page ).focus();
			}

			// Let each page set itself up ('languages' page doesn't need this yet)
			this.categoriesPage.setup( surfaceModel.metaList, data );
			this.settingsPage.setup( surfaceModel.metaList, data );
			this.advancedSettingsPage.setup( surfaceModel.metaList, data );
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWMetaDialog.prototype.getTeardownProcess = function ( data ) {
	data = data || {};
	return ve.ui.MWMetaDialog.super.prototype.getTeardownProcess.call( this, data )
		.first( function () {
			// Let each page tear itself down ('languages' page doesn't need this yet)
			this.categoriesPage.teardown( { action: data.action } );
			this.settingsPage.teardown( { action: data.action } );
			this.advancedSettingsPage.teardown( { action: data.action } );
		}, this );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWMetaDialog );
