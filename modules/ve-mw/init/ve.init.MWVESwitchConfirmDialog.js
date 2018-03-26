/*
 * VisualEditor user interface MWVESwitchConfirmDialog class.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

mw.libs.ve = mw.libs.ve || {};
/**
 * Dialog for letting the user choose how to switch to wikitext mode.
 *
 * @class
 * @extends OO.ui.MessageDialog
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
mw.libs.ve.SwitchConfirmDialog = function MWLibsVESwitchConfirmDialog( config ) {
	// Parent constructor
	mw.libs.ve.SwitchConfirmDialog.super.call( this, config );
};

/* Inheritance */

OO.inheritClass( mw.libs.ve.SwitchConfirmDialog, OO.ui.MessageDialog );

/* Static Properties */

mw.libs.ve.SwitchConfirmDialog.static.name = 'veswitchconfirm';

mw.libs.ve.SwitchConfirmDialog.static.title =
	mw.msg( 'visualeditor-mweditmodeve-title' );

mw.libs.ve.SwitchConfirmDialog.static.message =
	mw.msg( 'visualeditor-mweditmodeve-warning' );

mw.libs.ve.SwitchConfirmDialog.static.actions = [
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
		modes: [ 'simple' ]
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
mw.libs.ve.SwitchConfirmDialog.prototype.getSetupProcess = function ( data ) {
	return mw.libs.ve.SwitchConfirmDialog.super.prototype.getSetupProcess.apply( this, arguments )
		.next( function () {
			if ( data && data.mode ) {
				this.actions.setMode( data.mode );
			} else if (
				mw.config.get( 'wgVisualEditorConfig' ).fullRestbaseUrl &&
				!$( 'input[name=wpSection]' ).val()
			) {
				this.actions.setMode( 'restbase' );
			} else {
				this.actions.setMode( 'simple' );
			}
		}, this );
};

/**
 * @inheritdoc
 */
mw.libs.ve.SwitchConfirmDialog.prototype.getActionProcess = function ( action ) {
	if ( action === 'keep' ) {
		return new OO.ui.Process( function () {
			this.getActions()
				.setAbilities( { cancel: false, discard: false } )
				.get( { actions: 'keep' } )[ 0 ].pushPending();
			this.close( { action: 'keep' } );
		}, this );
	} else if ( action === 'discard' ) {
		return new OO.ui.Process( function () {
			this.getActions()
				.setAbilities( { cancel: false, keep: false } )
				.get( { actions: 'discard' } )[ 0 ].pushPending();
			this.close( { action: 'discard' } );
		}, this );
	} else if ( action === 'cancel' ) {
		return new OO.ui.Process( function () {
			this.close( { action: 'cancel' } );
		}, this );
	}

	// Parent method
	return mw.libs.ve.SwitchConfirmDialog.super.prototype.getActionProcess.call( this, action );
};
