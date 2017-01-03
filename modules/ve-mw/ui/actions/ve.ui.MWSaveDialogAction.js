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
( function () {
	var accessKeyPrefix = $.fn.updateTooltipAccessKeys.getAccessKeyPrefix().replace( /-/g, '+' ),
		saveShortcut = ve.msg( 'accesskey-save' ),
		changesShortcut = ve.msg( 'accesskey-diff' ),
		previewShortcut = ve.msg( 'accesskey-preview' );

	if ( saveShortcut !== '-' && saveShortcut !== '' ) {
		ve.ui.triggerRegistry.register(
			'showSave', new ve.ui.Trigger( accessKeyPrefix + saveShortcut )
		);
		ve.ui.commandHelpRegistry.register( 'other', 'showSave', {
			trigger: 'showSave',
			label: function () { return ve.init.target.getSaveButtonLabel(); }
		} );
		ve.ui.MWCommandHelpDialog.static.commandGroups.other.demote.push( 'showSave' );
	}

	if ( changesShortcut !== '-' && changesShortcut !== '' ) {
		ve.ui.triggerRegistry.register(
			'showChanges', new ve.ui.Trigger( accessKeyPrefix + changesShortcut )
		);
		ve.ui.commandHelpRegistry.register( 'other', 'showChanges', {
			trigger: 'showChanges',
			label: OO.ui.deferMsg( 'visualeditor-savedialog-label-review' )
		} );
		ve.ui.MWCommandHelpDialog.static.commandGroups.other.demote.push( 'showChanges' );
	}

	if ( previewShortcut !== '-' && previewShortcut !== '' ) {
		ve.ui.triggerRegistry.register(
			'showPreview', new ve.ui.Trigger( accessKeyPrefix + previewShortcut )
		);
		ve.ui.commandHelpRegistry.register( 'other', 'showPreview', {
			trigger: 'showPreview',
			label: OO.ui.deferMsg( 'showpreview' )
		} );
		ve.ui.MWCommandHelpDialog.static.commandGroups.other.demote.push( 'showPreview' );
	}
}() );
