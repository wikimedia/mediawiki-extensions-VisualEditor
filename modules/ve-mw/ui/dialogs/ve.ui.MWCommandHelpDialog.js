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

/* Static properties */

ve.ui.MWCommandHelpDialog.static.commandGroups = ve.extendObject( ve.ui.CommandHelpDialog.static.commandGroups, {
	insert: {
		title: 'visualeditor-shortcuts-insert',
		promote: [],
		demote: []
	}
} );

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWCommandHelpDialog );

( function () {
	var accessKeyPrefix = $.fn.updateTooltipAccessKeys.getAccessKeyPrefix().toUpperCase().replace( /-/g, ' + ' ),
		save = ve.msg( 'accesskey-save' );

	ve.ui.commandHelpRegistry.register( 'textStyle', 'link', { sequence: [ 'wikitextLink' ] } );
	ve.ui.commandHelpRegistry.register( 'formatting', 'blockquote', { sequence: [ 'wikitextDescription' ] } );
	ve.ui.commandHelpRegistry.register( 'formatting', 'listNumber', { sequence: [ 'numberHash' ] } );
	ve.ui.commandHelpRegistry.register( 'formatting', 'heading2', {
		sequence: [ 'wikitextHeading' ],
		msg: 'visualeditor-formatdropdown-format-heading2'
	} );
	ve.ui.commandHelpRegistry.register( 'insert', 'template', {
		sequence: [ 'wikitextTemplate' ],
		msg: 'visualeditor-dialog-template-title'
	} );
	ve.ui.commandHelpRegistry.register( 'insert', 'ref', {
		sequence: [ 'wikitextRef' ],
		msg: 'visualeditor-dialog-reference-title'
	} );
	ve.ui.commandHelpRegistry.register( 'insert', 'table', {
		sequence: [ 'wikitextTable' ],
		msg: 'visualeditor-table-insert-table'
	} );
	ve.ui.commandHelpRegistry.register( 'insert', 'comment', {
		sequence: [ 'wikitextComment' ],
		msg: 'visualeditor-commentinspector-title'
	} );

	if ( save !== '-' && save !== '' ) {
		ve.ui.commandHelpRegistry.register( 'other', 'save', {
			shortcuts: [ accessKeyPrefix + save.toUpperCase() ],
			msg: 'visualeditor-savedialog-label-save',
			demote: true
		} );
	}
} )();
