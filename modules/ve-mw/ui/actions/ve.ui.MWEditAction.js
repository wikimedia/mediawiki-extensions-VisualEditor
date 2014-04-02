/*!
 * VisualEditor MediaWiki UserInterface EditAction class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MWEdit action.
 *
 * @class
 * @extends ve.ui.Action
 * @constructor
 * @param {ve.ui.Surface} surface Surface to act on
 */
ve.ui.MWEditAction = function VeUiMWEditAction( surface ) {
	// Parent constructor
	ve.ui.Action.call( this, surface );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWEditAction, ve.ui.Action );

/* Static Properties */

ve.ui.MWEditAction.static.name = 'edit';

/**
 * List of allowed methods for the action.
 *
 * @static
 * @property
 */
ve.ui.MWEditAction.static.methods = [ 'source' ];

/* Methods */

/**
 * Switch to source editing.
 *
 * @method
 */
ve.ui.MWEditAction.prototype.source = function () {
	this.surface.getTarget().editSource();
};

/* Registration */

ve.ui.actionFactory.register( ve.ui.MWEditAction );
