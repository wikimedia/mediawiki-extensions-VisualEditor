/*!
 * VisualEditor UserInterface MWLanguageSearchDialog class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki Language search dialog
 *
 * @class
 * @extends ve.ui.LanguageSearchDialog
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWLanguageSearchDialog = function VeUiMWLanguageSearchDialog( config ) {
	// Parent constructor
	ve.ui.LanguageSearchDialog.call( this, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWLanguageSearchDialog, ve.ui.LanguageSearchDialog );

/* Static Properties */

ve.ui.MWLanguageSearchDialog.static.languageSearchWidget = ve.ui.MWLanguageSearchWidget;

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWLanguageSearchDialog );
