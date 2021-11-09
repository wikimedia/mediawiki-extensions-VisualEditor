/*!
 * VisualEditor user interface MWFloatingHelpDialog class.
 *
 * @copyright 2011-2021 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for the floating help element.
 *
 * @class
 * @extends OO.ui.ProcessDialog
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @cfg {string} label
 * @cfg {jQuery} $message
 */
ve.ui.MWFloatingHelpDialog = function VeUiMWFloatingHelpDialog( config ) {
	// Parent constructor
	ve.ui.MWFloatingHelpDialog.super.call( this, config );

	this.label = config.label;
	this.$message = config.$message;
};

/* Inheritance */

OO.inheritClass( ve.ui.MWFloatingHelpDialog, OO.ui.ProcessDialog );

/* Static properties */

ve.ui.MWFloatingHelpDialog.static.name = 'floatingHelp';

ve.ui.MWFloatingHelpDialog.static.actions = [
	{
		label: OO.ui.deferMsg( 'visualeditor-dialog-action-cancel' ),
		flags: [ 'safe', 'close' ]
	}
];

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWFloatingHelpDialog.prototype.initialize = function () {
	ve.ui.MWFloatingHelpDialog.super.prototype.initialize.call( this );
	var content = new OO.ui.PanelLayout( { padded: true, expanded: false } );
	content.$element.append( this.$message );
	this.$body.append( content.$element );
};

/**
 * @inheritdoc
 */
ve.ui.MWFloatingHelpDialog.prototype.getSetupProcess = function ( data ) {
	return ve.ui.MWFloatingHelpDialog.super.prototype.getSetupProcess.call( this, data ).next( function () {
		this.title.setLabel( this.label );
	}, this );
};

ve.ui.MWFloatingHelpDialog.prototype.getSizeProperties = function () {
	var sizeProps = ve.ui.MWFloatingHelpDialog.super.prototype.getSizeProperties.call( this );
	return ve.extendObject( {}, sizeProps, { width: '350px' } );
};