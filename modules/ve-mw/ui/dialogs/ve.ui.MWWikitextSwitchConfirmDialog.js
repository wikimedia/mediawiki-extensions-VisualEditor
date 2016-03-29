/*
 * VisualEditor user interface MWWikitextSwitchConfirmDialog class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for letting the user choose how to switch to wikitext mode.
 *
 * @class
 * @extends OO.ui.MessageDialog
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWWikitextSwitchConfirmDialog = function VeUiMWWikitextSwitchConfirmDialog( config ) {
	// Parent constructor
	ve.ui.MWWikitextSwitchConfirmDialog.super.call( this, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWWikitextSwitchConfirmDialog, OO.ui.MessageDialog );

/* Static Properties */

ve.ui.MWWikitextSwitchConfirmDialog.static.name = 'wikitextswitchconfirm';

ve.ui.MWWikitextSwitchConfirmDialog.static.verbose = true;

ve.ui.MWWikitextSwitchConfirmDialog.static.size = 'small';

ve.ui.MWWikitextSwitchConfirmDialog.static.title =
	OO.ui.deferMsg( 'visualeditor-mweditmodesource-title' );

ve.ui.MWWikitextSwitchConfirmDialog.static.message =
	OO.ui.deferMsg( 'visualeditor-mweditmodesource-warning' );

ve.ui.MWWikitextSwitchConfirmDialog.static.actions = [
	{
		action: 'cancel',
		label: OO.ui.deferMsg( 'visualeditor-mweditmodesource-warning-cancel' ),
		flags: [ 'safe', 'back' ]
	},
	{
		action: 'switch',
		label: OO.ui.deferMsg( 'visualeditor-mweditmodesource-warning-switch' ),
		flags: [ 'progressive', 'primary' ]
	}
];

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWWikitextSwitchConfirmDialog.prototype.getActionProcess = function ( action ) {
	if ( action === 'switch' ) {
		return new OO.ui.Process( function () {
			this.getActions().setAbilities( { cancel: false } );
			this.getActions().get()[ 1 ].pushPending();
			this.target.switchToWikitextEditor( false, true );
		}, this );
	} else if ( action === 'cancel' ) {
		return new OO.ui.Process( function () {
			this.close( { action: action } );
			this.target.resetDocumentOpacity();
		}, this );
	}

	// Parent method
	return ve.ui.MWWikitextSwitchConfirmDialog.super.prototype.getActionProcess.call( this, action );
};

/**
 * @inheritdoc
 **/
ve.ui.MWWikitextSwitchConfirmDialog.prototype.setup = function ( data ) {
	this.target = data.target;

	// Parent method
	return ve.ui.MWWikitextSwitchConfirmDialog.super.prototype.setup.call( this, data );
};

/**
 * @inheritdoc
 */
ve.ui.MWWikitextSwitchConfirmDialog.prototype.getTeardownProcess = function ( data ) {
	data = data || {};
	return ve.ui.MWWikitextSwitchConfirmDialog.super.prototype.getTeardownProcess.call( this, data )
		.first( function () {
			// EVIL HACK - we shouldn't be reaching into the manager for these promises
			if ( data.action === 'switch' ) {
				this.manager.closing.resolve( data );
			} else {
				this.manager.closing.reject( data );
			}
		}, this );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWWikitextSwitchConfirmDialog );
