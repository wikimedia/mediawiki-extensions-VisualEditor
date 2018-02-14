/*!
 * VisualEditor MediaWiki temporary wikitext editor widget
 *
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

mw.libs.ve = mw.libs.ve || {};

/**
 * MediaWiki temporary wikitext editor widget
 *
 * This widget can be used to show the user a basic editing interface
 * while VE libraries are still loading.
 *
 * It has a similar API to OO.ui.TextInputWidget, but is designed to
 * be loaded before any core VE code or dependencies, e.g. OOUI.
 *
 * @class
 * @constructor
 */
mw.libs.ve.MWTempWikitextEditorWidget = function VeUiMwTempWikitextEditorWidget( config ) {
	var conf = mw.config.get( 'wgVisualEditor' ),
		dir = conf.pageLanguageDir,
		lang = conf.pageLanguageCode;

	this.$element = $( '<textarea>' )
		.addClass( 've-init-mw-tempWikitextEditorWidget ' )
		.addClass( 'mw-editfont-' + mw.user.options.get( 'editfont' ) )
		.addClass( 'mw-content-' + dir )
		.attr( {
			lang: lang,
			dir: dir
		} )
		.val( config.value );
};

/**
 * Focus the input and move the cursor to the start.
 *
 * @chainable
 */
mw.libs.ve.MWTempWikitextEditorWidget.prototype.moveCursorToStart = function () {
	// Move cursor to start
	this.$element[ 0 ].setSelectionRange( 0, 0 );
	this.focus();
	return this;
};

/**
 * Expand the height of the text to fit the contents
 *
 * @chainable
 */
mw.libs.ve.MWTempWikitextEditorWidget.prototype.adjustSize = function () {
	// Don't bother with reducing height for simplicity
	this.$element.height( this.$element[ 0 ].scrollHeight );
	return this;
};

/**
 * Focus the input
 *
 * @chainable
 */
mw.libs.ve.MWTempWikitextEditorWidget.prototype.focus = function () {
	this.$element[ 0 ].focus();
	return this;
};

/**
 * Get the input value
 *
 * @return {string} Value
 */
mw.libs.ve.MWTempWikitextEditorWidget.prototype.getValue = function () {
	return this.$element.val();
};

/**
 * Get the selection range
 *
 * @return {Object} Object containing numbers 'from' and 'to'
 */
mw.libs.ve.MWTempWikitextEditorWidget.prototype.getRange = function () {
	var input = this.$element[ 0 ],
		start = input.selectionStart,
		end = input.selectionEnd,
		isBackwards = input.selectionDirection === 'backward';

	return {
		from: isBackwards ? end : start,
		to: isBackwards ? start : end
	};
};
