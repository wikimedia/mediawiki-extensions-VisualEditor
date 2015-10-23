/*!
 * VisualEditor UserInterface MWCommandHelpDialog class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog listing all command keyboard shortcuts.
 *
 * @class
 * @extends ve.ui.CommandHelpDialog
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWCommandHelpDialog = function VeUiMWCommandHelpDialog( config ) {
	// Parent constructor
	ve.ui.MWCommandHelpDialog.super.call( this, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWCommandHelpDialog, ve.ui.CommandHelpDialog );

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWCommandHelpDialog );

( function () {
	var accessKeyPrefix = mw.util.tooltipAccessKeyPrefix.toUpperCase().replace( /-/g, ' + ' ),
		save = ve.msg( 'accesskey-save' );

	ve.ui.MWCommandHelpDialog.static.registerCommand( 'textStyle', 'link', { sequence: [ 'wikitextLink' ] } );
	ve.ui.MWCommandHelpDialog.static.registerCommand( 'formatting', 'blockquote', { sequence: [ 'wikitextDescription' ] } );
	ve.ui.MWCommandHelpDialog.static.registerCommand( 'formatting', 'listNumber', { sequence: [ 'numberHash' ] } );
	ve.ui.MWCommandHelpDialog.static.registerCommand( 'formatting', 'heading2', {
		sequence: [ 'wikitextHeading' ],
		msg: 'visualeditor-formatdropdown-format-heading2'
	} );
	ve.ui.MWCommandHelpDialog.static.registerCommand( 'other', 'template', {
		sequence: [ 'wikitextTemplate' ],
		msg: 'visualeditor-dialog-transclusion-add-template'
	} );
	ve.ui.MWCommandHelpDialog.static.registerCommand( 'other', 'ref', {
		sequence: [ 'wikitextRef' ],
		msg: 'visualeditor-dialog-reference-title'
	} );

	if ( save !== '-' && save !== '' ) {
		ve.ui.MWCommandHelpDialog.static.registerCommand( 'other', 'save', {
			shortcuts: [ accessKeyPrefix + save.toUpperCase() ],
			msg: 'visualeditor-savedialog-label-save',
			demote: true
		} );
	}
} )();
