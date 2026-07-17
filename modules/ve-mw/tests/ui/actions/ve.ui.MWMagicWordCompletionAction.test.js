/*!
 * VisualEditor UserInterface Actions MWMagicWordCompletionAction tests.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

QUnit.module( 've.ui.MWMagicWordCompletionAction', ve.test.utils.newMwEnvironment() );

/* Tests */

QUnit.test( 'compareSuggestionToInput matches the word without its underscores', ( assert ) => {
	const surface = ve.test.utils.createSurfaceFromHtml( '<p></p>' );
	const action = new ve.ui.MWMagicWordCompletionAction( surface );

	assert.true( action.compareSuggestionToInput( '__NOTOC__', 'no' ).isMatch, 'prefix of inner word matches' );
	assert.false( action.compareSuggestionToInput( '__TOC__', 'no' ).isMatch, 'non-prefix does not match' );
	assert.true( action.compareSuggestionToInput( '__TOC__', 'toc' ).isExact, 'full inner word is exact' );
	assert.false( action.compareSuggestionToInput( '__TOC__', 'to' ).isExact, 'partial inner word is not exact' );

	surface.destroy();
} );

QUnit.test( 'getSuggestions filters the configured words and never adds the raw input', ( assert ) => {
	const surface = ve.test.utils.createSurfaceFromHtml( '<p></p>' );
	const action = new ve.ui.MWMagicWordCompletionAction( surface );

	// The default list is populated server-side, so set a known one to test against.
	const original = ve.ui.MWMagicWordCompletionAction.static.magicWords;
	ve.ui.MWMagicWordCompletionAction.static.magicWords = [ '__TOC__', '__NOTOC__', '__NOINDEX__' ];

	return action.getSuggestions( 'no' ).then( ( suggestions ) => {
		assert.true( suggestions.includes( '__NOTOC__' ), '__NOTOC__ offered' );
		assert.true( suggestions.includes( '__NOINDEX__' ), '__NOINDEX__ offered' );
		assert.false( suggestions.includes( '__TOC__' ), 'non-matching word excluded' );

		// alwaysIncludeInput is false, so unknown input yields nothing.
		return action.getSuggestions( 'zzz' );
	} ).then( ( suggestions ) => {
		assert.deepEqual( suggestions, [], 'no suggestion for input that matches no word' );
	} ).always( () => {
		ve.ui.MWMagicWordCompletionAction.static.magicWords = original;
		surface.destroy();
	} );
} );
