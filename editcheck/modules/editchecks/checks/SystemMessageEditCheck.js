/**
 * Utility edit check to show a follow-up action card
 * at the location of an edit check action that has just been resolved
 *
 * Doesn't scan the document for new issues like other checks, and has no listener.
 * Instead, mw.editcheck.Controller#registerSystemMessage makes an action with this check
 * and adds it to the controller's action list.
 *
 * A registered message is tied to a fragment of the document and disappears
 * once that fragment's text no longer matches what it was when the message
 * was registered (in particular, if the user undoes the edit that resolved
 * the original check), or on a timeout
 *
 * @class
 * @extends mw.editcheck.BaseEditCheck
 *
 * @constructor
 * @param {mw.editcheck.Controller} controller
 * @param {Object} [config]
 * @param {boolean} [includeSuggestions=false]
 */
mw.editcheck.SystemMessageEditCheck = function MWSystemMessageEditCheck() {
	// Parent constructor
	mw.editcheck.SystemMessageEditCheck.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( mw.editcheck.SystemMessageEditCheck, mw.editcheck.BaseEditCheck );

/* Static properties */

mw.editcheck.SystemMessageEditCheck.static.name = 'systemMessage';

// Always keep the configured messageType's type (e.g. 'success'), regardless
// of whether the check/suggestion it followed up on was a suggestion.
mw.editcheck.SystemMessageEditCheck.static.fixedType = true;

// Mark this check as a system check because it only follows up on other
// checks' completions and doesn't actually scan the doc for its own issues,
// so it should be excluded from most bookkeeping logic
mw.editcheck.SystemMessageEditCheck.static.isSystemCheck = true;

mw.editcheck.SystemMessageEditCheck.static.takesFocus = true;

/**
 * Message types: default 'success' card, and 'publishPath', shown instead
 * of 'success' on the user's first successfully completed edit
 *
 * @type {Object.<string,Object>}
 */
mw.editcheck.SystemMessageEditCheck.static.messageTypes = {
	success: {
		type: 'success',
		collapsible: false,
		choices: [],
		autoDismiss: 2000
	},
	publishPath: {
		type: 'success',
		collapsible: true,
		message: OO.ui.deferMsg( 'editcheck-dialog-publish-path-message' ),
		choices: [
			{
				action: 'viewMoreSuggestions',
				label: OO.ui.deferMsg( 'editcheck-dialog-action-view-more-suggestions' )
			},
			{
				action: 'publish',
				label: OO.ui.deferMsg( 'editcheck-dialog-action-publish' ),
				flags: [ 'progressive' ]
			}
		]
		// No autoDismiss because it should exist until the user acts or moves on to another action
	}
};

/* Methods */

/**
 * @inheritdoc
 */
mw.editcheck.SystemMessageEditCheck.prototype.act = function ( choice, action ) {
	const controller = this.controller;
	if ( choice === 'publish' ) {
		controller.target.showSaveDialog( null );
		controller.removeSystemMessage( action );
		return;
	}
	if ( choice === 'viewMoreSuggestions' ) {
		controller.removeSystemMessage( action );
		// Tell #onAct not to close the dialog if we've actually navigated it to
		// another action above, rather than resolving/dismissing this one
		return ve.createDeferred().resolve( { navigated: controller.scrollToNearestAction( 'below' ) } ).promise();
	}
};

/* Registration */

mw.editcheck.editCheckFactory.register( mw.editcheck.SystemMessageEditCheck );
