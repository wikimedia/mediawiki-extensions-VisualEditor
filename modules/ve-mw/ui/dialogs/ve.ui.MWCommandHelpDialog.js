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
 * @param {OO.ui.WindowManager} manager Manager of window
 * @param {Object} [config] Configuration options
 */
ve.ui.MWCommandHelpDialog = function VeUiMWCommandHelpDialog( manager, config ) {
	// Parent constructor
	ve.ui.MWCommandHelpDialog.super.call( this, manager, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWCommandHelpDialog, ve.ui.CommandHelpDialog );

/* Static methods */

/**
 * @inheritdoc
 */
ve.ui.MWCommandHelpDialog.static.getCommandGroups = function () {
	var commandGroups = ve.ui.MWCommandHelpDialog.super.static.getCommandGroups.call( this ),
		accessKeyPrefix = mw.util.tooltipAccessKeyPrefix.toUpperCase().replace( /-/g, ' + ' ),
		save = ve.msg( 'accesskey-save' );

	if ( save !== '-' && save !== '' ) {
		commandGroups.other.commands.push(
			{
				'shortcuts': [ accessKeyPrefix + save.toUpperCase() ],
				'msg': 'visualeditor-savedialog-label-save'
			}
		);
	}

	return commandGroups;
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWCommandHelpDialog );
