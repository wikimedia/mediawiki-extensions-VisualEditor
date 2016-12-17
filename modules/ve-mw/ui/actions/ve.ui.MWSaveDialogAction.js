/*!
 * VisualEditor UserInterface MWSaveDialogAction class.
 *
 * @copyright 2011-2017 VisualEditor Team and others; see http://ve.mit-license.org
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
ve.ui.MWSaveDialogAction.static.methods = [ 'save', 'review', 'preview' ];

/* Methods */

/**
 * Open the save dialog
 *
 * @method
 * @param {string} checkbox Checkbox to toggle after opening
 * @return {boolean} Action was executed
 */
ve.ui.MWSaveDialogAction.prototype.save = function ( checkbox ) {
	ve.init.target.showSaveDialog( null, checkbox );
	return true;
};

/**
 * Open the save dialog, and set it to the review panel
 *
 * @method
 * @return {boolean} Action was executed
 */
ve.ui.MWSaveDialogAction.prototype.review = function () {
	ve.init.target.showSaveDialog( 'review' );
	return true;
};

/**
 * Open the save dialog, and set it to the preview panel
 *
 * @method
 * @return {boolean} Action was executed
 */
ve.ui.MWSaveDialogAction.prototype.preview = function () {
	ve.init.target.showSaveDialog( 'preview' );
	return true;
};

/* Registration */

ve.ui.actionFactory.register( ve.ui.MWSaveDialogAction );

ve.ui.commandRegistry.register(
	new ve.ui.Command(
		'showSave', 'mwSaveDialog', 'save',
		{ supportedSelections: [ 'linear', 'table' ] }
	)
);
ve.ui.commandRegistry.register(
	new ve.ui.Command(
		'showChanges', 'mwSaveDialog', 'review',
		{ supportedSelections: [ 'linear', 'table' ] }
	)
);
if ( mw.libs.ve.isWikitextAvailable ) {
	// wikitextCommandRegistry has been requested already, but hasn't
	// loaded yet.
	mw.loader.using( 'ext.visualEditor.mwwikitext' ).then( function () {
		ve.ui.wikitextCommandRegistry.register(
			new ve.ui.Command(
				'showPreview', 'mwSaveDialog', 'preview',
				{ supportedSelections: [ 'linear', 'table' ] }
			)
		);
	} );
}
ve.ui.commandRegistry.register(
	new ve.ui.Command(
		'saveMinoredit', 'mwSaveDialog', 'save',
		{ args: [ 'wpMinoredit' ], supportedSelections: [ 'linear', 'table' ] }
	)
);
ve.ui.commandRegistry.register(
	new ve.ui.Command(
		'saveWatchthis', 'mwSaveDialog', 'save',
		{ args: [ 'wpWatchthis' ], supportedSelections: [ 'linear', 'table' ] }
	)
);

( function () {
	var accessKeyPrefix = $.fn.updateTooltipAccessKeys.getAccessKeyPrefix().replace( /-/g, '+' ),
		shortcuts = [
			{
				command: 'showSave',
				accessKey: 'accesskey-save',
				label: function () { return ve.init.target.getSaveButtonLabel(); }
			},
			{
				command: 'showChanges',
				accessKey: 'accesskey-diff',
				label: OO.ui.deferMsg( 'visualeditor-savedialog-label-review' )
			},
			{
				command: 'showPreview',
				accessKey: 'accesskey-preview',
				label: OO.ui.deferMsg( 'showpreview' )
			},
			{
				command: 'saveMinoredit',
				accessKey: 'accesskey-minoredit',
				label: OO.ui.deferMsg( 'tooltip-minoredit' )
			},
			{
				command: 'saveWatchthis',
				accessKey: 'accesskey-watch',
				label: OO.ui.deferMsg( 'tooltip-watch' )
			}
		];

	shortcuts.forEach( function ( shortcut ) {
		var accessKey = ve.msg( shortcut.accessKey );
		if ( accessKey !== '-' && accessKey !== '' ) {
			try {
				ve.ui.triggerRegistry.register(
					shortcut.command, new ve.ui.Trigger( accessKeyPrefix + accessKey )
				);
			} catch ( e ) {
				mw.log.warn( 'Invalid accesskey data? Failed to register ' + accessKeyPrefix + accessKey );
				return;
			}
			ve.ui.commandHelpRegistry.register( 'other', shortcut.command, {
				trigger: shortcut.command,
				label: shortcut.label
			} );
			ve.ui.MWCommandHelpDialog.static.commandGroups.other.demote.push( shortcut.command );
		}
	} );
}() );
