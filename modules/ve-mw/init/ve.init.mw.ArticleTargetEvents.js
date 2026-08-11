/*!
 * VisualEditor MediaWiki Initialization class.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Initialization MediaWiki Article Target Analytics.
 *
 * @class
 *
 * @constructor
 * @param {ve.init.mw.ArticleTarget} target Target class to log events for
 */
ve.init.mw.ArticleTargetEvents = function VeInitMwArticleTargetEvents( target ) {
	this.target = target;
	this.timings = { saveRetries: 0 };
	// Events
	this.target.connect( this, {
		saveWorkflowBegin: 'onSaveWorkflowBegin',
		saveWorkflowEnd: 'onSaveWorkflowEnd',
		saveInitiated: 'onSaveInitiated',
		save: 'onSaveComplete',
		saveReview: 'onSaveReview',
		saveError: 'trackSaveError',
		surfaceReady: 'onSurfaceReady',
		showChanges: 'onShowChanges',
		showChangesError: 'onShowChangesError',
		noChanges: 'onNoChanges',
		serializeComplete: 'onSerializeComplete',
		serializeError: 'onSerializeError'
	} );
};

/**
 * Target specific ve.track wrapper
 *
 * @param {string} topic Event name
 * @param {Object} data Additional data describing the event, encoded as an object
 */
ve.init.mw.ArticleTargetEvents.prototype.track = function ( topic, data ) {
	ve.track( topic, ve.extendObject( {
		mode: this.target.surface ? this.target.surface.getMode() : this.target.getDefaultMode()
	}, data ) );
};

/**
 * Target specific ve.track wrapper, focused on timing
 *
 * @param {string} topic Event name, must match [A-Za-z0-9_]+
 * @param {Object} data Additional data describing the event, encoded as an object
 * @param {number} data.duration Time in milliseconds associated with the event
 * @param {string} [data.type] Type of event, added to submitted labels
 */
ve.init.mw.ArticleTargetEvents.prototype.trackTiming = function ( topic, data ) {
	if ( !Number.isFinite( data.duration ) ) {
		mw.log.warn( 'Couldn\'t track timing for ' + topic );
		return;
	}
	if ( topic.startsWith( 'performance_system_serializeforcache' ) ) {
		// HACK: track serializeForCache duration here, because there's no event for that
		this.timings.serializeForCache = data.duration;
	}

	const labels = { target: this.target.constructor.static.trackingName };

	if ( data.type ) {
		labels.type = data.type;
	}

	mw.track( 'stats.mediawiki_ve_' + topic + '_seconds', data.duration, labels );
};

/**
 * Track when the user makes their first transaction
 */
ve.init.mw.ArticleTargetEvents.prototype.onFirstTransaction = function () {
	this.track( 'editAttemptStep', { action: 'firstChange' } );

	this.trackTiming( 'behavior_firstTransaction', {
		duration: ve.now() - this.timings.surfaceReady
	} );
};

/**
 * Track when user begins the save workflow
 */
ve.init.mw.ArticleTargetEvents.prototype.onSaveWorkflowBegin = function () {
	this.timings.saveWorkflowBegin = ve.now();
	this.trackTiming( 'behavior_lastTransactionTillSaveDialogOpen', {
		duration: this.timings.saveWorkflowBegin - this.timings.lastTransaction
	} );
	this.track( 'editAttemptStep', { action: 'saveIntent' } );
};

/**
 * Track when user ends the save workflow
 */
ve.init.mw.ArticleTargetEvents.prototype.onSaveWorkflowEnd = function () {
	this.trackTiming( 'behavior_saveDialogClose', { duration: ve.now() - this.timings.saveWorkflowBegin } );
	this.timings.saveWorkflowBegin = null;
};

/**
 * Track when document save is initiated
 */
ve.init.mw.ArticleTargetEvents.prototype.onSaveInitiated = function () {
	this.timings.saveInitiated = ve.now();
	this.timings.saveRetries++;
	this.trackTiming( 'behavior_saveDialogOpenTillSave', {
		duration: this.timings.saveInitiated - this.timings.saveWorkflowBegin
	} );
	this.track( 'editAttemptStep', { action: 'saveAttempt' } );
};

/**
 * Track when the save is complete
 *
 * @param {Object} data Save data from the API, see ve.init.mw.ArticleTarget#saveComplete
 */
ve.init.mw.ArticleTargetEvents.prototype.onSaveComplete = function ( data ) {
	this.trackTiming( 'performance_user_saveComplete', { duration: ve.now() - this.timings.saveInitiated } );
	this.timings.saveRetries = 0;
	this.track( 'editAttemptStep', {
		action: 'saveSuccess',
		timing: ve.now() - this.timings.saveInitiated + ( this.timings.serializeForCache || 0 ),
		// eslint-disable-next-line camelcase
		revision_id: data.newrevid
	} );
};

/**
 * Track a save error by type
 *
 * @param {string} code Error code
 */
ve.init.mw.ArticleTargetEvents.prototype.trackSaveError = function ( code ) {
	// Maps error codes to editAttemptStep types
	const typeMap = {
		badtoken: 'userBadToken',
		assertanonfailed: 'userNewUser',
		assertuserfailed: 'userNewUser',
		assertnameduserfailed: 'userNewUser',
		'abusefilter-disallowed': 'extensionAbuseFilter',
		'abusefilter-warning': 'extensionAbuseFilter',
		captcha: 'extensionCaptcha',
		spamblacklist: 'extensionSpamBlacklist',
		'titleblacklist-forbidden': 'extensionTitleBlacklist',
		pagedeleted: 'editPageDeleted',
		editconflict: 'editConflict'
	};

	this.trackTiming( 'performance_user_saveError', {
		duration: ve.now() - this.timings.saveInitiated,
		type: typeMap[ code ] || 'responseUnknown'
	} );

	this.track( 'editAttemptStep', {
		action: 'saveFailure',
		message: code,
		type: typeMap[ code ] || 'responseUnknown',
		timing: ve.now() - this.timings.saveInitiated + ( this.timings.serializeForCache || 0 )
	} );
};

/**
 * Record activation having started.
 *
 * @param {number} [startTime] Timestamp activation started. Defaults to current time
 */
ve.init.mw.ArticleTargetEvents.prototype.trackActivationStart = function ( startTime ) {
	this.timings.activationStart = startTime || ve.now();
};

/**
 * Record activation being complete.
 */
ve.init.mw.ArticleTargetEvents.prototype.trackActivationComplete = function () {
	this.trackTiming( 'performance_system_activation', { duration: ve.now() - this.timings.activationStart } );
};

/**
 * Record the time of the last transaction in response to a 'transact' event on the document.
 */
ve.init.mw.ArticleTargetEvents.prototype.recordLastTransactionTime = function () {
	this.timings.lastTransaction = ve.now();
};

/**
 * Track time elapsed from beginning of save workflow to review
 */
ve.init.mw.ArticleTargetEvents.prototype.onSaveReview = function () {
	this.timings.saveReview = ve.now();
	this.trackTiming( 'behavior_saveDialogOpenTillReview', {
		duration: this.timings.saveReview - this.timings.saveWorkflowBegin
	} );
};

ve.init.mw.ArticleTargetEvents.prototype.onSurfaceReady = function () {
	this.timings.surfaceReady = ve.now();
	this.target.surface.getModel().getDocument().connect( this, {
		transact: 'recordLastTransactionTime'
	} ).once( 'transact', this.onFirstTransaction.bind( this ) );
};

/**
 * Track when the user enters the review workflow
 */
ve.init.mw.ArticleTargetEvents.prototype.onShowChanges = function () {
	this.trackTiming( 'performance_user_reviewComplete', { duration: ve.now() - this.timings.saveReview } );
};

/**
 * Track when the diff request fails in the review workflow
 */
ve.init.mw.ArticleTargetEvents.prototype.onShowChangesError = function () {
	this.trackTiming( 'performance_user_reviewError', { duration: ve.now() - this.timings.saveReview } );
};

/**
 * Track when the diff request detects no changes
 */
ve.init.mw.ArticleTargetEvents.prototype.onNoChanges = function () {
	this.trackTiming( 'performance_user_reviewComplete', { duration: ve.now() - this.timings.saveReview } );
};

/**
 * Track when serialization is complete in review workflow
 */
ve.init.mw.ArticleTargetEvents.prototype.onSerializeComplete = function () {
	this.trackTiming( 'performance_user_reviewComplete', { duration: ve.now() - this.timings.saveReview } );
};

/**
 * Track when there is a serialization error
 */
ve.init.mw.ArticleTargetEvents.prototype.onSerializeError = function () {
	if ( this.timings.saveWorkflowBegin ) {
		// This function can be called by the switch to wikitext button as well, so only log
		// reviewError if we actually got here from the save workflow
		this.trackTiming( 'performance_user_reviewError', { duration: ve.now() - this.timings.saveReview } );
	}
};
