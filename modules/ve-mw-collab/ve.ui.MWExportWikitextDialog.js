/*!
 * VisualEditor UserInterface MWExportWikitextDialog class.
 *
 * @copyright 2011-2017 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for exportWikitexting CollabTarget pages
 *
 * @class
 * @extends OO.ui.ProcessDialog
 *
 * @constructor
 * @param {Object} [config] Config options
 */
ve.ui.MWExportWikitextDialog = function VeUiMwExportWikitextDialog( config ) {
	// Parent constructor
	ve.ui.MWExportWikitextDialog.super.call( this, config );

	// Initialization
	this.$element.addClass( 've-ui-mwExportWikitextDialog' );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWExportWikitextDialog, OO.ui.ProcessDialog );

/* Static Properties */

ve.ui.MWExportWikitextDialog.static.name = 'mwExportWikitext';

ve.ui.MWExportWikitextDialog.static.title = ve.msg( 'visualeditor-savedialog-review-wikitext' );

ve.ui.MWExportWikitextDialog.static.actions = [
	{
		label: OO.ui.deferMsg( 'visualeditor-dialog-action-done' ),
		flags: 'safe'
	}
];

ve.ui.MWExportWikitextDialog.static.size = 'larger';

/**
 * @inheritdoc
 */
ve.ui.MWExportWikitextDialog.prototype.initialize = function () {
	var panel;
	// Parent method
	ve.ui.MWExportWikitextDialog.super.prototype.initialize.call( this );

	this.wikitext = new OO.ui.MultilineTextInputWidget( {
		classes: [ 'mw-editfont-' + mw.user.options.get( 'editfont' ) ],
		autosize: true,
		readOnly: true,
		rows: 20
	} );
	this.wikitext.$element.css( 'max-width', 'none' ); // Move to CSS
	panel = new OO.ui.PanelLayout( {
		padded: true,
		expanded: false,
		$content: this.wikitext.$element
	} );
	this.$body.append( panel.$element );
};

/**
 * @inheritdoc
 */
ve.ui.MWExportWikitextDialog.prototype.getSetupProcess = function ( data ) {
	return ve.ui.MWExportWikitextDialog.super.prototype.getSetupProcess.call( this, data )
		.next( function () {
			var dialog = this;
			this.wikitext.pushPending();
			ve.init.target.getWikitextFragment( data.surface.getModel().getDocument() ).then( function ( wikitext ) {
				dialog.wikitext.setValue( wikitext.trim() ).select();
				dialog.wikitext.$input.scrollTop( 0 );
				dialog.wikitext.popPending();
				dialog.updateSize();
			}, function () {
				// TODO: Display API errors
				dialog.wikitext.popPending();
			} );
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWExportWikitextDialog.prototype.getTeardownProcess = function ( data ) {
	return ve.ui.MWExportWikitextDialog.super.prototype.getTeardownProcess.call( this, data )
		.next( function () {
			this.wikitext.setValue( '' );
		}, this );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWExportWikitextDialog );
