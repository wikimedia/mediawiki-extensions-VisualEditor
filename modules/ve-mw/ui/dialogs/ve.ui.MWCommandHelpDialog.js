/*!
 * VisualEditor UserInterface MWCommandHelpDialog class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/*global mw */

/**
 * Dialog listing all command keyboard shortcuts.
 *
 * @class
 * @extends ve.ui.CommandHelpDialog
 *
 * @constructor
 * @param {ve.ui.WindowSet} windowSet Window set this dialog is part of
 * @param {Object} [config] Configuration options
 */
ve.ui.MWCommandHelpDialog = function VeUiMWCommandHelpDialog( windowSet, config ) {
	// Parent constructor
	ve.ui.CommandHelpDialog.call( this, windowSet, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWCommandHelpDialog, ve.ui.CommandHelpDialog );

/* Static methods */

/** */
ve.ui.MWCommandHelpDialog.static.getCommandGroups = function () {
	var commandGroups = ve.ui.CommandHelpDialog.static.getCommandGroups.call( this ),
		accessKeyPrefix = mw.util.tooltipAccessKeyPrefix.toUpperCase().replace( /-/g, ' + ' ),
		save = ve.msg( 'accesskey-save' );

	if ( save !== '-' && save !== '' ) {
		commandGroups.other.commands.push(
			{
				'shortcut': accessKeyPrefix + save.toUpperCase(),
				'msg': 'visualeditor-savedialog-label-save'
			}
		);
	}

	return commandGroups;
};

/* Registration */

ve.ui.dialogFactory.register( ve.ui.MWCommandHelpDialog );
