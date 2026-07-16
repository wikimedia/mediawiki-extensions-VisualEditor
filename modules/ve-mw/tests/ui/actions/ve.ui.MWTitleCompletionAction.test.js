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

QUnit.test( 'getSuggestionFromTitle', ( assert ) => {
	const surface = ve.test.utils.createSurfaceFromHtml( '<p></p>' );

	const templateAction = new ve.ui.MWTemplateCompletionAction( surface );
	const cases = [
		{
			title: 'Template:Citation needed',
			expected: 'Citation needed',
			msg: 'strips the Template: prefix'
		},
		{
			title: 'Template:Foo/doc',
			expected: 'Foo/doc',
			msg: 'strips the Template: prefix but keeps subpage'
		},
		{
			title: 'User:Example',
			expected: 'User:Example',
			msg: 'keeps prefix for a different namespace'
		},
		{
			title: 'Foo',
			expected: 'Foo',
			msg: 'leaves a bare (main namespace) title unchanged'
		}
	];
	cases.forEach( ( caseItem ) => {
		assert.strictEqual(
			templateAction.getSuggestionFromTitle( caseItem.title ),
			caseItem.expected,
			'template action ' + caseItem.msg
		);
	} );

	const linkAction = new ve.ui.MWLinkCompletionAction( surface );
	assert.strictEqual(
		linkAction.getSuggestionFromTitle( 'Foo' ),
		'Foo',
		'link action inherits identity getSuggestionFromTitle'
	);
	assert.strictEqual(
		linkAction.getSuggestionFromTitle( 'Template:Citation needed' ),
		'Template:Citation needed',
		'link action does not strip any prefix'
	);

	surface.destroy();
} );

QUnit.test( 'getSuggestions queries opensearch and filters the result', ( assert ) => {
	const surface = ve.test.utils.createSurfaceFromHtml( '<p></p>' );

	const linkAction = new ve.ui.MWLinkCompletionAction( surface );
	const getStub = sinon.stub().returns(
		ve.createDeferred().resolve( [ 'ham', [ 'Hamburg', 'Hammer' ], [], [] ] ).promise()
	);
	const abortSpy = sinon.spy();
	linkAction.api = { abort: abortSpy, get: getStub };

	return linkAction.getSuggestions( '  ham  ' ).then( ( suggestions ) => {
		assert.true( abortSpy.calledOnce, 'previous requests aborted' );
		assert.deepEqual(
			getStub.firstCall.args[ 0 ],
			{
				action: 'opensearch',
				namespace: 0,
				search: 'ham',
				limit: ve.ui.MWLinkCompletionAction.static.defaultLimit * 2
			},
			'opensearch queried with the main namespace and trimmed input'
		);
		assert.true( suggestions.includes( 'Hamburg' ), 'Hamburg suggested' );
		assert.true( suggestions.includes( 'Hammer' ), 'Hammer suggested' );
	} ).always( () => {
		surface.destroy();
	} );
} );

QUnit.test( 'getSuggestions returns nothing for empty input without querying', ( assert ) => {
	const surface = ve.test.utils.createSurfaceFromHtml( '<p></p>' );

	const linkAction = new ve.ui.MWLinkCompletionAction( surface );
	const getStub = sinon.stub().throws( new Error( 'API should not be queried for empty input' ) );
	const abortSpy = sinon.spy();
	linkAction.api = { abort: abortSpy, get: getStub };

	return ve.promiseAll( [
		linkAction.getSuggestions( '' ).then( ( suggestions ) => {
			assert.deepEqual( suggestions, [], 'empty input resolves to no suggestions' );
		} ),
		linkAction.getSuggestions( '   ' ).then( ( suggestions ) => {
			assert.deepEqual( suggestions, [], 'whitespace-only input resolves to no suggestions' );
		} )
	] ).then( () => {
		assert.true( getStub.notCalled, 'opensearch is never queried for empty input' );
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

QUnit.test( 'getSuggestions strips the Template: prefix from opensearch results', ( assert ) => {
	const surface = ve.test.utils.createSurfaceFromHtml( '<p></p>' );

	const templateAction = new ve.ui.MWTemplateCompletionAction( surface );
	const templateNamespace = mw.config.get( 'wgNamespaceIds' ).template;
	const getStub = sinon.stub().returns(
		ve.createDeferred().resolve(
			[ 'cit', [ 'Template:Citation needed', 'Template:Cite web' ], [], [] ]
		).promise()
	);
	const abortSpy = sinon.spy();
	templateAction.api = { abort: abortSpy, get: getStub };

	return templateAction.getSuggestions( 'cit' ).then( ( suggestions ) => {
		assert.true( abortSpy.calledOnce, 'previous requests aborted' );
		assert.deepEqual(
			getStub.firstCall.args[ 0 ],
			{
				action: 'opensearch',
				namespace: templateNamespace,
				search: 'cit',
				limit: ve.ui.MWTemplateCompletionAction.static.defaultLimit * 2
			},
			'opensearch queried with the template namespace'
		);
		assert.true(
			suggestions.includes( 'Citation needed' ),
			'Citation needed suggested with prefix stripped'
		);
		assert.true(
			suggestions.includes( 'Cite web' ),
			'Cite web suggested with prefix stripped'
		);
		assert.false(
			suggestions.includes( 'Template:Citation needed' ),
			'prefixed title is not present in the suggestions'
		);
	} ).always( () => {
		surface.destroy();
	} );
} );
