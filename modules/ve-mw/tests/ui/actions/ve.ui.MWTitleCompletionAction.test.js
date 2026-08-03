/*!
 * VisualEditor UserInterface Actions MWTitleCompletionAction tests.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

QUnit.module( 've.ui.MWTitleCompletionAction', ve.test.utils.newMwEnvironment( {
	messages: {
		// Force the template action's documentation-subpage filters on
		'templatedata-doc-subpage': '(templatedata-doc-subpage)',
		'visualeditor-template-sandbox-subpage': '(template-sandbox-subpage)'
	}
} ) );

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
		.resolve( { query: { pages, redirects } } ).promise( { abort: () => {} } );

	return linkAction.getSuggestions( 'ham' ).then( ( suggestions ) => {
		assert.strictEqual( suggestions.length, limit, 'suggestion count capped at defaultLimit' );
	} ).always( () => {
		surface.destroy();
	} );
} );

QUnit.test( 'getSuggestions drops template documentation subpages', ( assert ) => {
	const surface = ve.test.utils.createSurfaceFromHtml( '<p></p>' );

	const templateAction = new ve.ui.MWTemplateCompletionAction( surface );
	assert.true(
		templateAction.titleWidget instanceof ve.ui.MWTemplateTitleInputWidget,
		'template action searches with the transclusion dialog\'s widget'
	);
	templateAction.titleWidget.getSuggestionsPromise = () => ve.createDeferred().resolve( {
		query: { pages: [
			{ title: 'Template:Cite', ns: 10, index: 1 },
			{ title: 'Template:Cite/(templatedata-doc-subpage)', ns: 10, index: 2 },
			{ title: 'Template:Cite/(template-sandbox-subpage)', ns: 10, index: 3 }
		] }
	} ).promise( { abort: () => {} } );

	return templateAction.getSuggestions( 'cite' ).then( ( suggestions ) => {
		assert.deepEqual(
			suggestions,
			[ 'Cite' ],
			'documentation and sandbox subpages dropped, and the namespace prefix stripped'
		);
	} ).always( () => {
		surface.destroy();
	} );
} );

QUnit.test( 'getSuggestions promotes exact matches when CirrusSearch is installed', ( assert ) => {
	const surface = ve.test.utils.createSurfaceFromHtml( '<p></p>' );

	// Config is reset by newMwEnvironment's teardown
	mw.config.set( 'wgVisualEditorConfig', ve.extendObject(
		{}, mw.config.get( 'wgVisualEditorConfig' ), { cirrusSearchLookup: true }
	) );

	const templateAction = new ve.ui.MWTemplateCompletionAction( surface );
	// CirrusSearch searches by relevance, so the widget has to put the exact match
	// back at the top. The action must not skip that step.
	const addExactMatch = sinon.stub().returnsArg( 0 );
	templateAction.titleWidget.addExactMatch = addExactMatch;
	templateAction.titleWidget.getSuggestionsPromise = () => ve.createDeferred().resolve( {
		query: { pages: [ { title: 'Template:Cite', ns: 10, index: 1 } ] }
	} ).promise( { abort: () => {} } );

	return templateAction.getSuggestions( 'cite' ).then( ( suggestions ) => {
		assert.true( addExactMatch.calledOnce, 'search results are passed to addExactMatch' );
		assert.deepEqual( suggestions, [ 'Cite' ], 'suggestion still offered' );
	} ).always( () => {
		surface.destroy();
	} );
} );

QUnit.test( 'getSuggestions abort rejects instead of resolving stale results', ( assert ) => {
	const surface = ve.test.utils.createSurfaceFromHtml( '<p></p>' );

	mw.config.set( 'wgVisualEditorConfig', ve.extendObject(
		{}, mw.config.get( 'wgVisualEditorConfig' ), { cirrusSearchLookup: true }
	) );

	const templateAction = new ve.ui.MWTemplateCompletionAction( surface );
	// A search that has already resolved, with addExactMatch still outstanding: this is
	// the window in which an abort used to be a no-op and a stale menu update followed.
	const exactMatchDeferred = ve.createDeferred();
	templateAction.titleWidget.addExactMatch = () => exactMatchDeferred.promise();
	templateAction.titleWidget.getSuggestionsPromise = () => ve.createDeferred().resolve( {
		query: { pages: [ { title: 'Template:Stale', ns: 10, index: 1 } ] }
	} ).promise( { abort: () => {} } );

	let outcome = null;
	const promise = templateAction.getSuggestions( 'stale' ).then(
		() => {
			outcome = 'resolved';
		},
		() => {
			outcome = 'rejected';
		}
	);

	templateAction.suggestionsPromise.abort();
	exactMatchDeferred.resolve( { query: { pages: [ { title: 'Template:Stale', ns: 10, index: 1 } ] } } );

	return promise.then( () => {
		assert.strictEqual( outcome, 'rejected', 'aborted request rejects, so no stale menu update' );
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
