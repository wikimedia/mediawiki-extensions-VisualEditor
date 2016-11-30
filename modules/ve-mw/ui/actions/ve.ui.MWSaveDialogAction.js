/*!
 * VisualEditor UserInterface MWSaveDialogAction class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see http://ve.mit-license.org
 */

// TODO: Can perhaps extract a lot of the dialog lifecycle management code
// from ArticleTarget and put it here.

/**
 * Save action.
 *
 * @class
 * @extends ve.ui.Action
 *
 * @constructor
 * @param {ve.ui.Surface} surface Surface to act on
 */
ve.ui.MWSaveDialogAction = function VeUiMWSaveDialogAction() {
	// Parent constructor
	ve.ui.MWSaveDialogAction.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWSaveDialogAction, ve.ui.Action );

/* Static Properties */

ve.ui.MWSaveDialogAction.static.name = 'mwSaveDialog';

/**
 * List of allowed methods for the action.
 *
 * @static
 * @property
 */
ve.ui.MWSaveDialogAction.static.methods = [ 'save', 'review' ];

/* Methods */

/**
 * Open the save dialog
 *
 * @method
 * @return {boolean} Action was executed
 */
ve.ui.MWSaveDialogAction.prototype.save = function () {
	ve.init.target.showSaveDialog();
	return true;
};

/**
 * Open the save dialog, and set it to the review panel
 *
 * @method
 * @return {boolean} Action was executed
 */
ve.ui.MWSaveDialogAction.prototype.review = function () {
	ve.init.target.showSaveDialog( 'review', 'review' );
	return true;
};

/* Registration */

ve.ui.actionFactory.register( ve.ui.MWSaveDialogAction );

ve.ui.commandRegistry.register(
	new ve.ui.Command(
		'showChanges', 'mwSaveDialog', 'review',
		{ supportedSelections: [ 'linear', 'table' ] }
	)
);
ve.ui.triggerRegistry.register(
	'showChanges', new ve.ui.Trigger( 'alt+shift+v' )
);
ve.ui.commandHelpRegistry.register( 'other', 'showChanges', {
	trigger: 'showChanges',
	label: OO.ui.deferMsg( 'visualeditor-savedialog-label-review' )
} );
ve.ui.MWCommandHelpDialog.static.commandGroups.other.demote.push( 'showChanges' );

ve.ui.commandRegistry.register(
	new ve.ui.Command(
		'showSave', 'mwSaveDialog', 'save',
		{ supportedSelections: [ 'linear', 'table' ] }
	)
);
( function () {
	var accessKeyPrefix = $.fn.updateTooltipAccessKeys.getAccessKeyPrefix().toUpperCase().replace( /-/g, ' + ' ),
		saveShortcut = ve.msg( 'accesskey-save' );

	if ( saveShortcut !== '-' && saveShortcut !== '' ) {
		ve.ui.triggerRegistry.register(
			'showSave', new ve.ui.Trigger( accessKeyPrefix + saveShortcut )
		);
		ve.ui.commandHelpRegistry.register( 'other', 'save', {
			trigger: 'showSave',
			label: function () { return ve.init.target.getSaveButtonLabel(); }
		} );
		ve.ui.MWCommandHelpDialog.static.commandGroups.other.demote.push( 'save' );
	}
}() );
