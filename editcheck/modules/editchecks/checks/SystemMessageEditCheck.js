/**
 * Utility edit check to show a follow-up action card
 * at the location of an edit check action that has just been resolved
 *
 * Doesn't scan the document for new issues like other checks.
 * Instead, other checks register a message via mw.editcheck.Controller#registerSystemMessage,
 * which adds a record to controller.pendingSystemMessages. Then like any other check, it
 * derives its actions afresh from that state on every scan (see #getActions).
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

// Eligibility to see the originating check has already been decided by
// that check, so don't apply a second, possibly-stricter, gate here.
mw.editcheck.SystemMessageEditCheck.prototype.canBeShown = function () {
	return true;
};

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

/* Static methods */

/**
 * Build an EditCheckAction from a pending message record
 *
 * @param {mw.editcheck.Controller} controller
 * @param {Object} record A record from controller.pendingSystemMessages
 * @return {mw.editcheck.EditCheckAction}
 */
mw.editcheck.SystemMessageEditCheck.static.buildAction = function ( controller, record ) {
	const action = new mw.editcheck.EditCheckAction( ve.extendObject( {}, record.config, {
		check: mw.editcheck.editCheckFactory.create( this.name, controller ),
		fragments: [ record.fragment ]
	} ) );
	// Back-reference so #dismissRecord can remove the right record without having to re-derive it from the action
	action.systemMessageRecord = record;
	return action;
};

/**
 * Find whichever action currently represents a pending message record
 *
 * @param {mw.editcheck.Controller} controller
 * @param {Object} record
 * @return {mw.editcheck.EditCheckAction|undefined}
 */
mw.editcheck.SystemMessageEditCheck.static.findCurrentAction = function ( controller, record ) {
	return controller.getActions( 'onSystemMessage' ).find( ( action ) => action.systemMessageRecord === record );
};

/**
 * Remove a pending message record and its current action, if any
 *
 * @param {mw.editcheck.Controller} controller
 * @param {Object} record
 */
mw.editcheck.SystemMessageEditCheck.static.dismissRecord = function ( controller, record ) {
	const pending = controller.pendingSystemMessages;
	const index = pending.indexOf( record );
	if ( index === -1 ) {
		// Already gone, e.g. dismissed by the user or discarded as stale
		return;
	}
	pending.splice( index, 1 );
	clearTimeout( record.autoDismissTimeout );
	const current = this.findCurrentAction( controller, record );
	if ( current ) {
		controller.removeAction( 'onSystemMessage', current, false );
	}
};

/* Methods */

/**
 * Get actions for all registered messages that are still live
 *
 * Builds a fresh action from each registered message and drops any record
 * whose fragment text no longer matches what it was when it was registered.
 *
 * @return {mw.editcheck.EditCheckAction[]}
 */
mw.editcheck.SystemMessageEditCheck.prototype.getActions = function () {
	return this.controller.pendingSystemMessages.map(
		( record ) => this.constructor.static.buildAction( this.controller, record )
	);
};

/**
 * @inheritdoc
 */
mw.editcheck.SystemMessageEditCheck.prototype.onSystemMessage = function () {
	this.controller.dropStaleSystemMessages();
	return this.getActions();
};

/**
 * @inheritdoc
 */
mw.editcheck.SystemMessageEditCheck.prototype.act = function ( choice, action ) {
	const controller = this.controller;
	if ( choice === 'publish' ) {
		controller.target.showSaveDialog( null );
		this.constructor.static.dismissRecord( controller, action.systemMessageRecord );
		return;
	}
	if ( choice === 'viewMoreSuggestions' ) {
		const position = action.getFocusSelection().getCoveringRange().start;
		const otherSuggestions = controller.getActions().filter(
			( candidate ) => candidate !== action && candidate.isSuggestion() && !candidate.check.isSystemCheck()
		);
		const nextAction = otherSuggestions.find(
			( candidate ) => candidate.getFocusSelection().getCoveringRange().start >= position
		) || otherSuggestions[ otherSuggestions.length - 1 ] || null;
		this.constructor.static.dismissRecord( controller, action.systemMessageRecord );
		if ( nextAction ) {
			controller.ensureActionIsShown( nextAction, { alignToTop: true } );
		}
	}
};

/* Registration */

mw.editcheck.editCheckFactory.register( mw.editcheck.SystemMessageEditCheck );
