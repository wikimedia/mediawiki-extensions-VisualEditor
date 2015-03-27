/*!
 * VisualEditor MWAlienExtensionContextItem class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * Context item for a MWAlienExtension.
 *
 * @class
 * @extends ve.ui.ContextItem
 *
 * @constructor
 * @param {ve.ui.Context} context Context item is in
 * @param {ve.dm.Model} model Model item is related to
 * @param {Object} config Configuration options
 */
ve.ui.MWAlienExtensionContextItem = function VeMWAlienExtensionContextItem( context, model ) {
	// Parent constructor
	ve.ui.MWAlienExtensionContextItem.super.apply( this, arguments );

	// Initialization
	this.$element.addClass( 've-ui-mwAlienExtensionContextItem' );

	this.setLabel( model.getExtensionName() );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWAlienExtensionContextItem, ve.ui.ContextItem );

/* Static Properties */

ve.ui.MWAlienExtensionContextItem.static.name = 'alienExtension';

ve.ui.MWAlienExtensionContextItem.static.icon = 'alienextension';

ve.ui.MWAlienExtensionContextItem.static.modelClasses = [ ve.dm.MWAlienExtensionNode ];

ve.ui.MWAlienExtensionContextItem.static.commandName = 'alienExtension';

/* Methods */

/* Registration */

ve.ui.contextItemFactory.register( ve.ui.MWAlienExtensionContextItem );
