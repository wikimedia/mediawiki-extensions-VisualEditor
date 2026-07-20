/**
 * FixedEditCheckDialog constructor.
 *
 * This dialog displays edit checks in a fixed-position panel
 * (side panel on desktop or at the bottom on mobile)
 *
 * @class
 * @extends ve.ui.ToolbarDialog
 * @mixes ve.ui.EditCheckDialog
 * @param {Object} config
 */
ve.ui.FixedEditCheckDialog = function VeUiFixedEditCheckDialog( config ) {
	// Parent constructor
	ve.ui.FixedEditCheckDialog.super.call( this, config );

	// Mixin constructor
	ve.ui.EditCheckDialog.call( this, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.FixedEditCheckDialog, ve.ui.ToolbarDialog );

OO.mixinClass( ve.ui.FixedEditCheckDialog, ve.ui.EditCheckDialog );

/* Static properties */

ve.ui.FixedEditCheckDialog.static.name = 'fixedEditCheckDialog';

ve.ui.FixedEditCheckDialog.static.position = OO.ui.isMobile() ? 'below' : 'side';

ve.ui.FixedEditCheckDialog.static.size = OO.ui.isMobile() ? 'full' : 'medium';

ve.ui.FixedEditCheckDialog.static.alwaysFocusAction = true;

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.FixedEditCheckDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.FixedEditCheckDialog.super.prototype.initialize.call( this );
	// Mixin method
	return ve.ui.EditCheckDialog.prototype.initialize.call( this );
};

/**
 * @inheritdoc
 */
ve.ui.FixedEditCheckDialog.prototype.getSetupProcess = function ( data ) {
	// Parent method
	const process = ve.ui.FixedEditCheckDialog.super.prototype.getSetupProcess.call( this, data );
	// Mixin method
	return ve.ui.EditCheckDialog.prototype.getSetupProcess.call( this, data, process );
};

/**
 * @inheritdoc
 */
ve.ui.FixedEditCheckDialog.prototype.getTeardownProcess = function ( data ) {
	// Parent method
	const process = ve.ui.FixedEditCheckDialog.super.prototype.getTeardownProcess.call( this, data );
	// Mixin method
	return ve.ui.EditCheckDialog.prototype.getTeardownProcess.call( this, data, process );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.FixedEditCheckDialog );
