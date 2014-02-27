/*
 * VisualEditor user interface MWTemplateDialog class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for editing MediaWiki templates.
 *
 * @class
 * @extends ve.ui.MWTransclusionDialog
 *
 * @constructor
 * @param {ve.ui.WindowSet} windowSet Window set this dialog is part of
 * @param {Object} [config] Configuration options
 */
ve.ui.MWTemplateDialog = function VeUiMWTemplateDialog( windowSet, config ) {
	// Parent constructor
	ve.ui.MWTransclusionDialog.call( this, windowSet, config );

	// Properties
	this.node = null;
	this.transclusion = null;
	this.loaded = false;
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTemplateDialog, ve.ui.MWTransclusionDialog );

/* Static Properties */

ve.ui.MWTemplateDialog.static.name = 'transclusion';

ve.ui.MWTemplateDialog.static.title =
	OO.ui.deferMsg( 'visualeditor-dialog-transclusion-title' );

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWTemplateDialog.prototype.onReplacePart = function ( removed, added  ) {
	// Parent method
	ve.ui.MWTransclusionDialog.prototype.onReplacePart.call( this, removed, added );

	// Initialization
	if ( added instanceof ve.dm.MWTemplateModel ) {
		this.setTitle( added.getSpec().getLabel() );
	}
};

/**
 * @inheritdoc
 */
ve.ui.MWTemplateDialog.prototype.getBookletLayout = function () {
	return new OO.ui.BookletLayout( {
		'$': this.$,
		'continuous': true,
		'autoFocus': true,
		'outlined': false
	} );
};

/**
 * @inheritdoc
 */
ve.ui.MWTemplateDialog.prototype.setup = function ( data ) {
	// Parent method
	ve.ui.MWTransclusionDialog.prototype.setup.call( this, data );

	// Initialization
	this.setTitle( ve.msg( 'visualeditor-dialog-template-title' ) );
};

/* Registration */

ve.ui.dialogFactory.register( ve.ui.MWTemplateDialog );
