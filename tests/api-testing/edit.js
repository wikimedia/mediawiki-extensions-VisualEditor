'use strict';

const { action, assert, utils } = require( 'api-testing' );

describe( 'Visual Editor API', function () {
	const title = utils.title( 'VisualEditor' );

	let alice;
	let pageInfo;

	before( async () => {
		const textX = 'Hello World! {{Template Requests}}';

		alice = await action.alice();
		pageInfo = await alice.edit( title, { text: textX } );
	} );

	// VisualEditor: 'visualeditor' action API ///
	it( 'can load metadata', async () => {
		const result = await alice.action( 'visualeditor', { page: title, paction: 'metadata' } );
		assert.equal( result.visualeditor.oldid, pageInfo.newrevid );
	} );

	it( 'able to parse', async () => {
		const result = await alice.action( 'visualeditor', { page: title, paction: 'parse' } );
		assert.equal( result.visualeditor.result, 'success' );
	} );

	it( 'able to parsedoc', async () => {
		const result = await alice.action( 'visualeditor', { page: title, paction: 'parsedoc', wikitext: 'test' } );
		assert.equal( result.visualeditor.result, 'success' );
	} );

	it( 'able to parsefragment', async () => {
		const result = await alice.action( 'visualeditor', { page: title, paction: 'parsefragment', wikitext: 'test' } );
		assert.equal( result.visualeditor.result, 'success' );
	} );

	it( 'templatesUsed', async () => {
		const result = await alice.action( 'visualeditor', { page: title, paction: 'templatesused', wikitext: 'test' } );
		assert.include( result.visualeditor, 'Template Requests' );
	} );

	it( 'can load metadata', async () => {
		const result = await alice.action( 'visualeditor', { page: title, paction: 'wikitext' } );
		assert.equal( result.visualeditor.result, 'success' );
	} );

	// VisualEditor edit: 'visualeditoredit' action API ///
	const page = utils.title( 'VisualEditorNew' );

	it( 'Should create page, edit and save page', async () => {
		const token = await alice.token();
		const html = '<p>save paction</p>';
		const summary = 'save test workflow';
		const result = await alice.action(
			'visualeditoredit',
			{
				page: page,
				paction: 'save',
				token: token,
				html: html,
				summary: summary
			},
			'post'
		);

		assert.equal( result.visualeditoredit.result, 'success' );
	} );

	it( 'Should edit page and save with Wikitext', async () => {
		const token = await alice.token();
		const html = '<p>save paction</p>';
		const summary = 'save test workflow';
		const wikitext = 'wikitext string in page test';
		const result = await alice.action(
			'visualeditoredit',
			{
				page: page,
				paction: 'save',
				token: token,
				html: html,
				wikitext: wikitext,
				summary: summary
			},
			'post'
		);
		assert.equal( result.visualeditoredit.result, 'success' );
		assert.include( result.visualeditoredit.content, wikitext );
	} );

	it( 'Should show page diff', async () => {
		const token = await alice.token();
		const html = '<p>diff paction</p>';
		const summary = 'diff page test workflow';
		const result = await alice.action(
			'visualeditoredit',
			{
				page: page,
				paction: 'diff',
				token: token,
				html: html,
				summary: summary
			},
			'post'
		);
		assert.equal( result.visualeditoredit.result, 'success' );
	} );

	it( 'Should serialize page', async () => {
		const token = await alice.token();
		const html = '<h2>serialize paction test</h2>';
		const summary = 'serialize page test workflow';
		const result = await alice.action(
			'visualeditoredit',
			{
				page: page,
				paction: 'serialize',
				token: token,
				html: html,
				summary: summary
			},
			'post'
		);
		assert.equal( result.visualeditoredit.result, 'success' );

		// Trim to remove trailing newline in the content
		assert.equal( result.visualeditoredit.content.trim(), '== serialize paction test ==' );
	} );

	it( 'Should serialize page for cache', async () => {
		const token = await alice.token();
		const html = '<p>serialize for cache paction</p>';
		const summary = 'serializeforcache create page test workflow';
		const result = await alice.action(
			'visualeditoredit',
			{
				page: page,
				paction: 'serializeforcache',
				token: token,
				html: html,
				summary: summary
			},
			'post'
		);
		assert.equal( result.visualeditoredit.result, 'success' );
	} );
} );
