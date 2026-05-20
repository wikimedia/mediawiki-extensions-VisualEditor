/*!
 * VisualEditor tests for ve.init.mw.Platform.
 *
 * @copyright See AUTHORS.txt
 */

/* eslint-disable mediawiki/no-storage */

QUnit.module( 've.init.mw.Platform' );

QUnit.test( 'formatNumber methods', ( assert ) => {
	const platform = new ve.init.mw.Platform();

	return platform.getInitializedPromise().then( () => {
		assert.strictEqual(
			platform.formatNumber( 1234 ),
			'1,234',
			'Standalone number formatting'
		);

		assert.strictEqual(
			platform.formatNumberWithoutSeparators( 1234 ),
			'1234',
			'Standalone number formatting without separators'
		);
	} );
} );
