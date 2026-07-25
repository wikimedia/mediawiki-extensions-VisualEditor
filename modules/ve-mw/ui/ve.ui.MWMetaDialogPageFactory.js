/*!
 * VisualEditor MediaWiki MWMetaDialogPageFactory class.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Factory for the pages of {@link ve.ui.MWMetaDialog}, including its built-in ones.
 *
 * Registered classes extend OO.ui.PageLayout and are constructed with ( name, config ). Pages
 * appear in the dialog in registration order, so the built-in ones are ordered by where their
 * files sit in the module's script list.
 *
 * A page may declare:
 *
 * - `static.modes`: the surface modes it applies to, e.g. `[ 'source' ]`. Unset means all modes.
 *
 * and may implement:
 *
 * - `setup( fragment, config )`: prepare the page, optionally returning a promise.
 * - `teardown( { action } )`: apply or discard changes, per the action that closed the dialog.
 * - `getFieldsets()`: the fieldsets whose widgets the dialog watches for changes.
 * - `isValid()`: whether the page's settings are valid, as a boolean or a promise for one.
 *
 * The built-in pages edit the document and are staged with it; a contributed page applies its own
 * changes on 'done' instead, and discards them otherwise.
 *
 * @class
 * @extends OO.Factory
 * @constructor
 */
ve.ui.mwMetaDialogPageFactory = new OO.Factory();
