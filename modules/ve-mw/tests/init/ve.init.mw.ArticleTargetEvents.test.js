/*!
 * VisualEditor MediaWiki ArticleTargetEvents tests.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

QUnit.module( 've.init.mw.ArticleTargetEvents', ve.test.utils.newMwEnvironment() );

( function () {
	// The save_failure_type enum in the EditAttemptStep schema. EventGate drops
	// any event with a type outside this list.
	const schemaEnum = [
		'userBadToken', 'userNewUser', 'extensionAbuseFilter', 'extensionCaptcha',
		'extensionSpamBlacklist', 'extensionTitleBlacklist', 'responseEmpty',
		'responseUnknown', 'editPageDeleted', 'editConflict'
	];

	/**
	 * Run trackSaveError against a stub, and collect what each channel received.
	 *
	 * @param {string} code Error code
	 * @return {Object} Types sent to the metric and to editAttemptStep
	 */
	function trackSaveError( code ) {
		const events = {};
		const stub = Object.create( ve.init.mw.ArticleTargetEvents.prototype );
		stub.timings = { saveInitiated: ve.now() };
		stub.trackTiming = ( topic, data ) => {
			events.metric = data.type;
		};
		stub.track = ( topic, data ) => {
			events.event = data.type;
		};
		stub.trackSaveError( code );
		return events;
	}

	QUnit.test( 'a mapped code reports the same type to both channels', ( assert ) => {
		assert.deepEqual(
			trackSaveError( 'editconflict' ),
			{ metric: 'editConflict', event: 'editConflict' }
		);
	} );

	QUnit.test( 'the metric names a cause the schema cannot express', ( assert ) => {
		assert.deepEqual(
			trackSaveError( 'blocked' ),
			{ metric: 'userBlocked', event: 'responseUnknown' },
			'the metric splits it out, editAttemptStep stays inside the enum'
		);
		assert.deepEqual(
			trackSaveError( 'acct_creation_throttle_hit-temp' ),
			{ metric: 'userAccountCreationThrottle', event: 'responseUnknown' }
		);
	} );

	QUnit.test( 'a server exception is matched by prefix', ( assert ) => {
		assert.deepEqual(
			trackSaveError( 'internal_api_error_DBQueryError' ),
			{ metric: 'responseServerError', event: 'responseUnknown' },
			'one label for every exception class'
		);
	} );

	QUnit.test( 'an unknown code stays unknown', ( assert ) => {
		assert.deepEqual(
			trackSaveError( 'somethingnobodyhasseen' ),
			{ metric: 'responseUnknown', event: 'responseUnknown' }
		);
	} );

	QUnit.test( 'editAttemptStep never leaves the schema enum', ( assert ) => {
		// Codes that reach the metric map, plus the mapped and unmapped cases.
		const codes = [
			'editconflict', 'badtoken', 'captcha', 'blocked', 'autoblocked',
			'ratelimited', 'acct_creation_throttle_hit-temp', 'permissiondenied',
			'cantcreate', 'cantcreate-anon', 'protectedpage', 'readonly',
			'rest-specified-revision-unavailable', 'rest-no-stashed-content',
			'rest-parsoid-error', 'abusefilter-blocked-domains-attempted',
			'invaliddeflate', 'internal_api_error_DBQueryError', 'unmapped'
		];
		codes.forEach( ( code ) => {
			assert.true(
				schemaEnum.includes( trackSaveError( code ).event ),
				code + ' reports a save_failure_type the schema allows'
			);
		} );
	} );
}() );
