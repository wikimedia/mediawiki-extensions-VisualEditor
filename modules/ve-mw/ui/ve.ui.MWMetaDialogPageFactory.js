/*!
 * VisualEditor MediaWiki MWMetaDialogPageFactory class.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Factory for the pages of {@link ve.ui.MWMetaDialog}, including its built-in ones.
 *
 * Registered classes extend {@link ve.ui.MWMetaPage} and are constructed with ( name, config ).
 * Pages appear in the dialog in registration order, so the built-in ones are ordered by where
 * their files sit in the module's script list.
 *
 * @class
 * @extends OO.Factory
 * @constructor
 */
ve.ui.MWMetaDialogPageFactory = function VeUiMWMetaDialogPageFactory() {
	// Parent constructor
	ve.ui.MWMetaDialogPageFactory.super.call( this );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWMetaDialogPageFactory, OO.Factory );

/* Initialization */

ve.ui.mwMetaDialogPageFactory = new ve.ui.MWMetaDialogPageFactory();
