/*!
 * VisualEditor Initialization save error handler class
 *
 * @copyright 2011-2018 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * Data transfer handler.
 *
 * @class
 * @abstract
 *
 * @constructor
 */
ve.init.mw.SaveErrorHandler = function () {};

/* Inheritance */

OO.initClass( ve.init.mw.SaveErrorHandler );

/* Static methods */

/**
 * Test if this handler should handle as specific API response
 *
 * @static
 * @inheritable
 * @method
 * @param {Object} editApi Edit API response
 * @return {boolean}
 */
ve.init.mw.SaveErrorHandler.static.matchFunction = null;

/**
 * Process the save error
 *
 * @static
 * @inheritable
 * @method
 * @param {Object} editApi Edit API response
 * @param {ve.init.mw.ArticleTarget} target Target
 */
ve.init.mw.SaveErrorHandler.static.process = null;

/* Save error registry */

/*
 * Extensions can add SaveErrorHandler sub-classes to this registry.
 */
ve.init.mw.saveErrorHandlerFactory = new OO.Factory();
