/**
 * Dialog for showing a confirmation/warning message.
 *
 * @class
 * @extends ve.ui.Dialog
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWWikitextSwitchConfirmDialog = function VeUiMWWikitextSwitchConfirmDialog( config ) {
	// Configuration initialization
	config = $.extend( { 'size': 'small' }, config );

	// Parent constructor
	ve.ui.MWWikitextSwitchConfirmDialog.super.call( this, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWWikitextSwitchConfirmDialog, OO.ui.Dialog );

/* Static Properties */

ve.ui.MWWikitextSwitchConfirmDialog.static.name = 'wikitextswitchconfirm';

ve.ui.MWWikitextSwitchConfirmDialog.static.icon = 'help';

ve.ui.MWWikitextSwitchConfirmDialog.static.title = OO.ui.deferMsg( 'ooui-dialog-confirm-title' );

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWWikitextSwitchConfirmDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.MWWikitextSwitchConfirmDialog.super.prototype.initialize.call( this );

	// Set up the layout
	var contentLayout = new OO.ui.PanelLayout( {
		'$': this.$,
		'padded': true
	} );

	this.$promptContainer = this.$( '<div>' )
		.addClass( 'oo-ui-dialog-confirm-promptContainer' )
		.text( ve.msg( 'visualeditor-mweditmodesource-warning' ) );

	this.cancelButton = new OO.ui.ButtonWidget( {
		'label': ve.msg( 'visualeditor-mweditmodesource-warning-cancel' )
	} );
	this.cancelButton.connect( this, { 'click': [ 'close', { 'action': 'cancel' } ] } );

	this.keepChangesButton = new OO.ui.ButtonWidget( {
		'flags': 'primary',
		'label': ve.msg( 'visualeditor-mweditmodesource-warning-switch' )
	} );
	this.keepChangesButton.connect( this, { 'click': [ 'close', { 'action': 'switch' } ] } );

	this.forgetChangesButton = new OO.ui.ButtonWidget( {
		'flags': 'destructive',
		'label': ve.msg( 'visualeditor-mweditmodesource-warning-switch-discard' )
	} );
	this.forgetChangesButton.connect( this, { 'click': [ 'close', { 'action': 'discard' } ] } );

	// Make the buttons
	contentLayout.$element.append( this.$promptContainer );
	this.$body.append( contentLayout.$element );

	this.$foot.append(
		this.keepChangesButton.$element,
		this.forgetChangesButton.$element,
		this.cancelButton.$element
	);
};

/**
 * @inheritdoc
 */
ve.ui.MWWikitextSwitchConfirmDialog.prototype.getTeardownProcess = function ( data ) {
	// Parent method
	return ve.ui.MWWikitextSwitchConfirmDialog.super.prototype.getTeardownProcess.call( this, data )
		.first( function () {
			if ( data.action === 'switch' || data.action === 'discard' ) {
				this.opened.resolve( data );
			} else {
				this.opened.reject();
			}
		}, this );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWWikitextSwitchConfirmDialog );
