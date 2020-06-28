'use strict';

const createScreenshotEnvironment = require( './screenshots.js' ).createScreenshotEnvironment,
	test = require( 'selenium-webdriver/testing' ),
	userGuide = require( './screenshots-client/userGuide.js' ),
	runScreenshotTest = createScreenshotEnvironment( test );

function runTests( lang ) {

	const runLang = runScreenshotTest.bind( this, lang );

	test.describe( 'Screenshots: ' + lang, function () {
		this.lang = lang;
		test.it( 'Toolbar & action tools', function () {
			runLang( 'VisualEditor_toolbar', userGuide.toolbar, 0 );
			runLang( 'VisualEditor_toolbar_actions', userGuide.toolbarActions, 0 );
		} );
		test.it( 'Citoid inspector', function () {
			runLang( 'VisualEditor_Citoid_Inspector', userGuide.citoidInspector );
			runLang( 'VisualEditor_Citoid_Inspector_Manual', userGuide.citoidInspectorManual );
			runLang( 'VisualEditor_Citoid_Inspector_Reuse', userGuide.citoidInspectorReuse );
		} );
		test.it( 'Tool groups (headings/text style/indentation/insert/page settings)', function () {
			runLang( 'VisualEditor_Toolbar_Headings', userGuide.toolbarHeadings );
			runLang( 'VisualEditor_Toolbar_Formatting', userGuide.toolbarFormatting );
			runLang( 'VisualEditor_Toolbar_Lists_and_indentation', userGuide.toolbarLists );
			runLang( 'VisualEditor_Insert_Menu', userGuide.toolbarInsert );
			runLang( 'VisualEditor_Media_Insert_Menu', userGuide.toolbarMedia );
			runLang( 'VisualEditor_Template_Insert_Menu', userGuide.toolbarTemplate );
			runLang( 'VisualEditor_insert_table', userGuide.toolbarTable );
			runLang( 'VisualEditor_Formula_Insert_Menu', userGuide.toolbarFormula );
			runLang( 'VisualEditor_References_List_Insert_Menu', userGuide.toolbarReferences );
			runLang( 'VisualEditor_More_Settings', userGuide.toolbarSettings );
			runLang( 'VisualEditor_page_settings_item', userGuide.toolbarPageSettings );
			runLang( 'VisualEditor_category_item', userGuide.toolbarCategory );
		} );
		test.it( 'Save dialog', function () {
			runLang( 'VisualEditor_save_dialog', userGuide.save );
		} );
		test.it( 'Special character inserter', function () {
			runLang( 'VisualEditor_Toolbar_SpecialCharacters', userGuide.specialCharacters );
		} );
		test.it( 'Math dialog', function () {
			runLang( 'VisualEditor_formula', userGuide.formula );
		} );
		test.it( 'Reference list dialog', function () {
			runLang( 'VisualEditor_references_list', userGuide.referenceList );
		} );
		test.it( 'Cite button', function () {
			runLang( 'VisualEditor_citoid_Cite_button', userGuide.toolbarCite, 0 );
		} );
		test.it( 'Link inspector', function () {
			runLang( 'VisualEditor-link_tool-search_results', userGuide.linkSearchResults );
		} );
	} );
}

langs.forEach( function ( lang ) {
	runTests( lang );
} );
