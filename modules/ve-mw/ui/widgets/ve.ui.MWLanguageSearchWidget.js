/*!
 * VisualEditor UserInterface MWLanguageSearchWidget class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/*global mw */

/**
 * Creates an ve.ui.MWLanguageSearchWidget object.
 *
 * @class
 * @extends ve.ui.LanguageSearchWidget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWLanguageSearchWidget = function VeUiMWLanguageSearchWidget( config ) {
	// Parent constructor
	ve.ui.LanguageSearchWidget.call( this, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWLanguageSearchWidget, ve.ui.LanguageSearchWidget );

/* Methods */

/**
 * @inheritDoc
 */
ve.ui.MWLanguageSearchWidget.prototype.getLanguages = function () {
	return mw.language.getData( mw.config.get( 'wgUserLanguage' ), 'languageNames' ) ||
		$.uls.data.getAutonyms();
};
