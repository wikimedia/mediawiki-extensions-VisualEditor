/*!
 * VisualEditor UserInterface MWMobileSaveDialog class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for saving MediaWiki pages in mobile.
 *
 * Note that most methods are not safe to call before the dialog has initialized, except where
 * noted otherwise.
 *
 * @class
 * @extends ve.ui.MWSaveDialog
 *
 * @constructor
 * @param {Object} [config] Config options
 */
ve.ui.MWMobileSaveDialog = function VeUiMwMobileSaveDialog( config ) {
	// Parent constructor
	ve.ui.MWMobileSaveDialog.super.call( this, config );

	// Initialization
	this.$element.addClass( 've-ui-mwMobileSaveDialog' );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWMobileSaveDialog, ve.ui.MWSaveDialog );

/* Static Properties */

ve.ui.MWMobileSaveDialog.static.actions = ve.ui.MWMobileSaveDialog.static.actions.slice( 0, 2 );

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWMobileSaveDialog );
