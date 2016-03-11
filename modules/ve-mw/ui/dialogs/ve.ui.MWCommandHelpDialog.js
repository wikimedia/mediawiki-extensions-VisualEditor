/*!
 * VisualEditor UserInterface MWCommandHelpDialog class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
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

ve.ui.MWCommandHelpDialog.static.commandGroups = ve.extendObject( {}, ve.ui.MWCommandHelpDialog.static.commandGroups, {
	insert: {
		title: OO.ui.deferMsg( 'visualeditor-shortcuts-insert' ),
		promote: [],
		demote: []
	}
} );

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWCommandHelpDialog );

( function () {
	var accessKeyPrefix = $.fn.updateTooltipAccessKeys.getAccessKeyPrefix().toUpperCase().replace( /-/g, ' + ' ),
		save = ve.msg( 'accesskey-save' );

	if ( save !== '-' && save !== '' ) {
		ve.ui.commandHelpRegistry.register( 'other', 'save', {
			shortcuts: [ accessKeyPrefix + save.toUpperCase() ],
			label: OO.ui.deferMsg( 'visualeditor-savedialog-label-save' ),
			demote: true
		} );
	}
} )();
