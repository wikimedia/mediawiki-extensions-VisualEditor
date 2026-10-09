/**
 * MobileEditCheckDialog constructor.
 *
 * This dialog displays single edit checks at the bottom of the display while on mobile.
 *
 * @class
 * @extends ve.ui.FixedEditCheckDialog
 * @param {Object} config
 */
ve.ui.MobileEditCheckDialog = function VeUiMobileEditCheckDialog( config ) {
	// Parent constructor
	ve.ui.MobileEditCheckDialog.super.call( this, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MobileEditCheckDialog, ve.ui.FixedEditCheckDialog );

/* Static properties */

ve.ui.MobileEditCheckDialog.static.name = 'mobileEditCheckDialog';

ve.ui.MobileEditCheckDialog.static.position = 'below';

ve.ui.MobileEditCheckDialog.static.size = 'full';

ve.ui.MobileEditCheckDialog.static.alwaysFocusAction = false;

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MobileEditCheckDialog.prototype.getSetupProcess = function ( data ) {
	// Parent method
	return ve.ui.MobileEditCheckDialog.super.prototype.getSetupProcess.call( this, data ).first( () => {
		this.sectionActions = data.sectionActions;
	}, this );
};

/**
 * @inheritdoc ve.ui.EditCheckDialog
 */
ve.ui.MobileEditCheckDialog.prototype.onAct = function ( action, widget, promise ) {
	if ( this.inBeforeSave ) {
		return ve.ui.EditCheckDialog.prototype.onAct.call( this, action, widget, promise );
	}
	this.acting = true;
	this.updateNavigationState();
	this.updateSize();
	promise.then( ( data ) => {
		if ( data && data.navigated ) {
			// The check already navigated this dialog to another action,
			// so don't close it out from under that.
			return;
		}
		if ( this.currentAction && this.currentAction.check.isSystemCheck() ) {
			// A check that completes synchronously can register a publish card
			// that gets shown in this same dialog before this promise settles.
			// In that case, we'll leave the dialog open to show it.
			this.controller.refresh();
			return;
		}
		// On mobile, the dialog should close after a check is acted on
		this.close( { action: 'complete' } ).closed.then( () => {
			// Don't refresh until dialog is finished tearing down,
			// so that it's not affected by any events that refresh() will trigger
			this.controller.refresh();
		} );
	} ).always( () => {
		this.acting = false;
		this.updateNavigationState();
	} );
};

/**
 * Check if an action exists in the current section's actions.
 *
 * @param {Object} action Action
 * @return {boolean}
 */
ve.ui.MobileEditCheckDialog.prototype.hasActionInSection = function ( action ) {
	return this.sectionActions.some( ( a ) => action.equals( a ) );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MobileEditCheckDialog );
