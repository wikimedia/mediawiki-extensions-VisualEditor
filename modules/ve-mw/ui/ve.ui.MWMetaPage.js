/*!
 * VisualEditor user interface MWMetaPage class.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Abstract base class for the pages of {@link ve.ui.MWMetaDialog}.
 *
 * Subclasses are registered with the {@link ve.ui.MWMetaDialogPageFactory}
 * ve.ui.mwMetaDialogPageFactory. Pages appear in the dialog in registration order.
 *
 * @class
 * @abstract
 * @extends OO.ui.PageLayout
 *
 * @constructor
 * @param {string} name Unique symbolic name of page
 * @param {Object} [config] Configuration options
 * @param {jQuery} [config.$overlay] Overlay to render dropdowns in
 */
ve.ui.MWMetaPage = function VeUiMWMetaPage() {
	// Parent constructor
	ve.ui.MWMetaPage.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWMetaPage, OO.ui.PageLayout );

/* Static Properties */

/**
 * Surface modes the page applies to, e.g. `[ 'visual', 'source' ]`. `null` means all modes.
 *
 * @static
 * @property {string[]|null}
 * @inheritable
 */
ve.ui.MWMetaPage.static.modes = [ 'visual' ];

/* Methods */

/**
 * Set up the page.
 *
 * @param {ve.dm.SurfaceFragment} fragment Surface fragment
 * @param {Object} config
 * @param {Object} [config.data] Dialog setup data
 * @param {boolean} [config.isReadOnly=false] Dialog is in read-only mode
 * @return {jQuery.Promise}
 */
ve.ui.MWMetaPage.prototype.setup = function () {
	return ve.createDeferred().resolve().promise();
};

/**
 * Tear down the page, applying or discarding changes per the action that closed the dialog.
 *
 * @param {Object} [data] Dialog tear down data
 * @param {string} [data.action] Action that closed the dialog
 */
ve.ui.MWMetaPage.prototype.teardown = function () {};

/**
 * Get the fieldsets whose widgets the dialog watches for changes.
 *
 * @return {OO.ui.FieldsetLayout[]} Fieldsets
 */
ve.ui.MWMetaPage.prototype.getFieldsets = function () {
	return [];
};

/**
 * Check whether the page's settings are valid.
 *
 * @return {boolean|jQuery.Promise} Whether the settings are valid, or a promise resolving to that
 */
ve.ui.MWMetaPage.prototype.isValid = function () {
	return true;
};
