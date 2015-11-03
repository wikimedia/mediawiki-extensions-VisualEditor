/*
 * VisualEditor user interface MWVESwitchConfirmDialog class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
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
ve.ui.MWVESwitchConfirmDialog = function VeUiMWVESwitchConfirmDialog( config ) {
	// Parent constructor
	ve.ui.MWVESwitchConfirmDialog.super.call( this, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWVESwitchConfirmDialog, OO.ui.MessageDialog );

/* Static Properties */

ve.ui.MWVESwitchConfirmDialog.static.name = 'veswitchconfirm';

ve.ui.MWVESwitchConfirmDialog.static.verbose = true;

ve.ui.MWVESwitchConfirmDialog.static.size = 'small';

ve.ui.MWVESwitchConfirmDialog.static.icon = 'help';

ve.ui.MWVESwitchConfirmDialog.static.title =
	mw.msg( 'visualeditor-mweditmodeve-title' );

ve.ui.MWVESwitchConfirmDialog.static.message =
	mw.msg( 'visualeditor-mweditmodeve-warning' );

ve.ui.MWVESwitchConfirmDialog.static.actions = [
	{
		action: 'cancel',
		label: mw.msg( 'visualeditor-mweditmodesource-warning-cancel' ),
		flags: [ 'safe', 'back' ],
		modes: [ 'restbase', 'simple' ]
	},
	{
		action: 'discard',
		label: mw.msg( 'visualeditor-mweditmodesource-warning-switch-discard' ),
		flags: 'destructive',
		modes: [ 'restbase', 'simple' ]
	},
	{
		action: 'keep',
		label: mw.msg( 'visualeditor-mweditmodesource-warning-switch' ),
		flags: [ 'progressive', 'primary' ],
		modes: [ 'restbase' ]
	}
];

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWVESwitchConfirmDialog.prototype.getSetupProcess = function () {
	return ve.ui.MWVESwitchConfirmDialog.super.prototype.getSetupProcess.apply( this, arguments )
		.next( function () {
			this.actions.setMode( mw.config.get( 'wgVisualEditorConfig' ).fullRestbaseUrl ? 'restbase' : 'simple' );
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWVESwitchConfirmDialog.prototype.getActionProcess = function ( action ) {
	if ( action === 'keep' ) {
		return new OO.ui.Process( function () {
			this.getActions().setAbilities( { cancel: false, discard: false } );
			this.getActions().get()[ 1 ].pushPending();
			this.close( { action: 'keep' } );
		}, this );
	} else if ( action === 'discard' ) {
		return new OO.ui.Process( function () {
			this.getActions().setAbilities( { cancel: false, keep: false } );
			this.getActions().get()[ 2 ].pushPending();
			this.close( { action: 'discard' } );
		}, this );
	} else if ( action === 'cancel' ) {
		return new OO.ui.Process( function () {
			this.close( { action: 'cancel' } );
		}, this );
	}

	// Parent method
	return ve.ui.MWVESwitchConfirmDialog.super.prototype.getActionProcess.call( this, action );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWVESwitchConfirmDialog );
