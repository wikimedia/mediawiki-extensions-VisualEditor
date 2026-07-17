/*!
 * VisualEditor UserInterface Actions MWTagCompletionAction tests.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

QUnit.module( 've.ui.MWTagCompletionAction', ve.test.utils.newMwEnvironment() );

/* Tests */

QUnit.test( 'getTags gates entries on ve.dm node availability', ( assert ) => {
	const surface = ve.test.utils.createSurfaceFromHtml( '<p></p>' );
	const action = new ve.ui.MWTagCompletionAction( surface );
	const names = () => action.getTags().map( ( tag ) => tag.name );

	assert.true( names().includes( 'code' ), 'an HTML tag is always offered' );
	assert.true( names().includes( 'nowiki' ), 'a parser tag is always offered' );

	// <syntaxhighlight> is gated on ve.dm.MWSyntaxHighlightNode, which is not
	// loaded in the core VisualEditor test environment. Toggle it to exercise
	// both branches, restoring the original state afterwards.
	const had = Object.prototype.hasOwnProperty.call( ve.dm, 'MWSyntaxHighlightNode' );
	const original = ve.dm.MWSyntaxHighlightNode;
	try {
		delete ve.dm.MWSyntaxHighlightNode;
		assert.false( names().includes( 'syntaxhighlight' ), 'gated tag hidden when its node class is absent' );

		ve.dm.MWSyntaxHighlightNode = function () {};
		assert.true( names().includes( 'syntaxhighlight' ), 'gated tag offered when its node class is registered' );
	} finally {
		if ( had ) {
			ve.dm.MWSyntaxHighlightNode = original;
		} else {
			delete ve.dm.MWSyntaxHighlightNode;
		}
	}

	surface.destroy();
} );

QUnit.test( 'getTags gates entries on ResourceLoader module availability', ( assert ) => {
	const surface = ve.test.utils.createSurfaceFromHtml( '<p></p>' );
	const action = new ve.ui.MWTagCompletionAction( surface );
	const names = () => action.getTags().map( ( tag ) => tag.name );

	const stub = sinon.stub( mw.loader, 'getState' ).returns( null );
	try {
		assert.false( names().includes( 'timeline' ), 'module-gated tag hidden when its module is unregistered' );
		stub.withArgs( 'ext.timeline.styles' ).returns( 'registered' );
		assert.true( names().includes( 'timeline' ), 'module-gated tag offered when its module is registered' );
	} finally {
		stub.restore();
	}

	surface.destroy();
} );

QUnit.test( 'getTags includes the HTML tags and marks void ones self-closing', ( assert ) => {
	const surface = ve.test.utils.createSurfaceFromHtml( '<p></p>' );
	const action = new ve.ui.MWTagCompletionAction( surface );
	const tags = action.getTags();
	const byName = ( name ) => tags.find( ( tag ) => tag.name === name );

	assert.true( !!byName( 'b' ), 'a plain HTML tag is offered' );
	assert.true( byName( 'br' ).selfClosing, 'a void HTML tag is marked self-closing' );
	assert.strictEqual( byName( 'code' ).selfClosing, false, 'a paired HTML tag is not self-closing' );

	surface.destroy();
} );

QUnit.test( 'getSuggestions filters by prefix and never adds the raw input', ( assert ) => {
	const surface = ve.test.utils.createSurfaceFromHtml( '<p></p>' );
	const action = new ve.ui.MWTagCompletionAction( surface );

	return action.getSuggestions( 'co' ).then( ( suggestions ) => {
		const names = suggestions.map( ( suggestion ) => suggestion.name );
		assert.true( names.includes( 'code' ), 'prefix match is offered' );
		assert.false( names.includes( 'nowiki' ), 'non-matching tag is excluded' );

		// alwaysIncludeInput is false, so unknown input yields nothing.
		return action.getSuggestions( 'notatag' );
	} ).then( ( suggestions ) => {
		assert.deepEqual( suggestions, [], 'no suggestion for input that matches no tag' );
	} ).always( () => {
		surface.destroy();
	} );
} );

QUnit.test( 'getOpenTag builds paired, attribute and self-closing tags', ( assert ) => {
	const surface = ve.test.utils.createSurfaceFromHtml( '<p></p>' );
	const action = new ve.ui.MWTagCompletionAction( surface );

	assert.strictEqual(
		action.getOpenTag( { name: 'code' } ),
		'<code>',
		'paired tag'
	);
	assert.strictEqual(
		action.getOpenTag( { name: 'syntaxhighlight', attributes: { lang: '' } } ),
		'<syntaxhighlight lang="">',
		'tag with attribute'
	);
	assert.strictEqual(
		action.getOpenTag( { name: 'br', selfClosing: true } ),
		'<br />',
		'void tag'
	);
	assert.strictEqual(
		action.getOpenTag( { name: 'templatestyles', selfClosing: true, attributes: { src: '' } } ),
		'<templatestyles src="" />',
		'void tag with attribute'
	);

	surface.destroy();
} );

QUnit.test( 'insertCompletion inserts markup and positions the caret', ( assert ) => {
	const cases = [
		{
			suggestion: { name: 'code' },
			// Caret between the opening and closing tags.
			beforeCaret: '<code>'
		},
		{
			suggestion: { name: 'syntaxhighlight', attributes: { lang: '' } },
			// Caret inside the empty attribute value.
			beforeCaret: '<syntaxhighlight lang="'
		},
		{
			suggestion: { name: 'br', selfClosing: true },
			// Void tag: caret after the self-closing tag.
			beforeCaret: '<br />'
		},
		{
			suggestion: { name: 'templatestyles', selfClosing: true, attributes: { src: '' } },
			beforeCaret: '<templatestyles src="'
		}
	];

	cases.forEach( ( caseItem ) => {
		const surface = ve.test.utils.createSurfaceFromHtml( '<p></p>' );
		const action = new ve.ui.MWTagCompletionAction( surface );
		// Offset 1 is the content position inside the empty paragraph.
		const start = 1;
		const fragment = action.insertCompletion( caseItem.suggestion, new ve.Range( start ) );

		const caret = fragment.getSelection().getCoveringRange().start;
		const inserted = surface.getModel().getDocument().data.getText( false, new ve.Range( start, caret ) );
		assert.strictEqual(
			inserted,
			caseItem.beforeCaret,
			action.getOpenTag( caseItem.suggestion ) + ' places the caret correctly'
		);

		surface.destroy();
	} );
} );
