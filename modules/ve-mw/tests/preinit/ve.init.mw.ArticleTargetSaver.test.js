/*!
 * VisualEditor MediaWiki ArticleTargetSaver tests.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

QUnit.module( 've.init.mw.ArticleTargetSaver', ve.test.utils.newMwEnvironment() );

( function () {
	/**
	 * Make an API stub that answers each request from a plan.
	 *
	 * @param {Object[]} plan One entry for each expected request. An entry with an
	 *  `error` code rejects. All other entries resolve as a successful save.
	 * @return {Object} Stub with a postWithToken method
	 */
	function stubApi( plan ) {
		let call = 0;
		return {
			postWithToken: function () {
				const step = plan[ call++ ] || {};
				if ( step.error ) {
					return ve.createDeferred().reject( step.error, { xhr: { responseText: '{}' } } ).promise();
				}
				return ve.createDeferred().resolve(
					{ visualeditoredit: { result: 'success', content: '' } },
					{ responseText: '{}' }
				).promise();
			}
		};
	}

	/**
	 * Make saver options that record the type of each tracked timing.
	 *
	 * @param {Object[]} plan Request plan for the API stub
	 * @param {string[]} types Array that collects the tracked types
	 * @return {Object} Options for postHtml or postContent
	 */
	function trackingOptions( plan, types ) {
		return {
			api: stubApi( plan ),
			now: () => 0,
			eventName: 'save',
			trackTiming: ( topic, eventData ) => {
				types.push( eventData.type );
			}
		};
	}

	QUnit.test( 'postHtml tracks a request that sent a cache key', ( assert ) => {
		const types = [];
		return mw.libs.ve.targetSaver.postHtml(
			'<p>a</p>', 'CACHEKEY', {}, trackingOptions( [ {} ], types )
		).then( () => {
			assert.deepEqual( types, [ 'cachekey' ], 'the type comes from the request' );
		} );
	} );

	QUnit.test( 'postHtml tracks a request that sent HTML', ( assert ) => {
		const types = [];
		return mw.libs.ve.targetSaver.postHtml(
			'<p>a</p>', null, {}, trackingOptions( [ {} ], types )
		).then( () => {
			assert.deepEqual( types, [ 'nocachekey' ], 'no cache key in the request' );
		} );
	} );

	QUnit.test( 'postHtml tracks both attempts after a bad cache key', ( assert ) => {
		const types = [];
		return mw.libs.ve.targetSaver.postHtml(
			'<p>a</p>', 'STALE', {}, trackingOptions( [ { error: 'badcachekey' }, {} ], types )
		).then( () => {
			assert.deepEqual(
				types, [ 'badcachekey', 'nocachekey' ],
				'the failed attempt and the retry are tracked separately'
			);
		} );
	} );

	QUnit.test( 'postContent keeps the type when a request fails for another reason', ( assert ) => {
		const types = [];
		return mw.libs.ve.targetSaver.postContent(
			{ cachekey: 'CACHEKEY' }, trackingOptions( [ { error: 'readonly' } ], types )
		).then( null, () => {
			assert.deepEqual( types, [ 'cachekey' ], 'an unrelated failure is not reported as nocachekey' );
		} );
	} );
}() );
