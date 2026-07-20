/*!
 * VisualEditor UserInterface Actions MWTitleCompletionAction tests.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

QUnit.module( 've.ui.MWTitleCompletionAction', ve.test.utils.newMwEnvironment() );

/* Tests */

QUnit.test( 'getInsertionText wraps the suggestion in the right markup', ( assert ) => {
	const surface = ve.test.utils.createSurfaceFromHtml( '<p></p>' );

	const linkAction = new ve.ui.MWLinkCompletionAction( surface );
	assert.strictEqual( linkAction.getInsertionText( 'Foo' ), '[[Foo]]', 'link action wraps in [[ ]]' );

	const templateAction = new ve.ui.MWTemplateCompletionAction( surface );
	assert.strictEqual( templateAction.getInsertionText( 'Foo' ), '{{Foo}}', 'template action wraps in {{ }}' );

	surface.destroy();
} );

QUnit.test( 'getSuggestions returns nothing for empty input without querying', ( assert ) => {
	const surface = ve.test.utils.createSurfaceFromHtml( '<p></p>' );

	const linkAction = new ve.ui.MWLinkCompletionAction( surface );
	const getStub = sinon.stub().throws( new Error( 'API should not be queried for empty input' ) );
	// Stub only `get`, so the widget's own abort plumbing still works. getContentApi
	// hands out a new mw.Api per action, so this can't leak into other tests.
	linkAction.titleWidget.api.get = getStub;

	return ve.promiseAll( [
		linkAction.getSuggestions( '' ).then( ( suggestions ) => {
			assert.deepEqual( suggestions, [], 'empty input resolves to no suggestions' );
		} ),
		linkAction.getSuggestions( '   ' ).then( ( suggestions ) => {
			assert.deepEqual( suggestions, [], 'whitespace-only input resolves to no suggestions' );
		} )
	] ).then( () => {
		assert.true( getStub.notCalled, 'API is never queried for empty input' );
	} ).always( () => {
		surface.destroy();
	} );
} );

QUnit.test( 'getSuggestions caps the list at defaultLimit', ( assert ) => {
	const surface = ve.test.utils.createSurfaceFromHtml( '<p></p>' );

	const linkAction = new ve.ui.MWLinkCompletionAction( surface );
	const limit = ve.ui.MWLinkCompletionAction.static.defaultLimit;
	// The API limit bounds the prefix search only. TitleWidget adds the source of each
	// resolved redirect as its own suggestion, so an uncapped list would be twice as long.
	const pages = [];
	const redirects = [];
	for ( let i = 0; i < limit; i++ ) {
		pages.push( { title: 'Ham ' + i, ns: 0, index: i + 1 } );
		redirects.push( { from: 'Hamr ' + i, to: 'Ham ' + i, index: i + 1 } );
	}
	linkAction.titleWidget.getSuggestionsPromise = () => ve.createDeferred()
		.resolve( { query: { pages, redirects } } ).promise();

	return linkAction.getSuggestions( 'ham' ).then( ( suggestions ) => {
		assert.strictEqual( suggestions.length, limit, 'suggestion count capped at defaultLimit' );
	} ).always( () => {
		surface.destroy();
	} );
} );

QUnit.test( 'getHeaderLabel is suppressed when there are no suggestions', ( assert ) => {
	const surface = ve.test.utils.createSurfaceFromHtml( '<p></p>' );

	const linkAction = new ve.ui.MWLinkCompletionAction( surface );
	assert.strictEqual(
		linkAction.getHeaderLabel( '', [] ),
		null,
		'no header when the suggestion list is empty'
	);
	assert.notStrictEqual(
		linkAction.getHeaderLabel( 'ham', [ 'Hamburg' ] ),
		null,
		'header shown when there are suggestions'
	);
	assert.notStrictEqual(
		linkAction.getHeaderLabel( 'ham' ),
		null,
		'header shown before suggestions have resolved'
	);

	surface.destroy();
} );

QUnit.test( 'shouldAbandon when input moves on from the link markup', ( assert ) => {
	const surface = ve.test.utils.createSurfaceFromHtml( '<p></p>' );

	const linkAction = new ve.ui.MWLinkCompletionAction( surface );
	// A non-zero match count, so the parent's "whitespace with no matches" clause
	// stays out of the way and each case exercises only the override's logic.
	const matches = 3;
	const cases = [
		{ input: 'Foo', expected: false, msg: 'keeps completing while typing a title' },
		{ input: 'Foo bar', expected: false, msg: 'a space mid-title does not abandon' },
		{ input: 'Foo]', expected: true, msg: 'abandons on a closing ] (leaving a wikilink)' },
		{ input: 'Foo}', expected: true, msg: 'abandons on a closing } (leaving a template)' },
		{ input: 'Foo|', expected: true, msg: 'abandons on a | (moving to a parameter)' }
	];
	cases.forEach( ( caseItem ) => {
		// strictEqual against a boolean also asserts the method returns a real boolean,
		// not the Array|null that String#match would yield.
		assert.strictEqual(
			linkAction.shouldAbandon( caseItem.input, matches ),
			caseItem.expected,
			caseItem.msg
		);
	} );

	// The parent's own abandon conditions still apply through the override.
	assert.strictEqual(
		linkAction.shouldAbandon( '   ', matches ),
		true,
		'inherits abandoning on whitespace-only input'
	);
	assert.strictEqual(
		linkAction.shouldAbandon( 'Foo ', 0 ),
		true,
		'inherits abandoning on trailing whitespace with no matches'
	);

	surface.destroy();
} );
