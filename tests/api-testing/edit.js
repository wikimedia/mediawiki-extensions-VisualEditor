'use strict';

const { action, assert, utils } = require( 'api-testing' );

describe( 'Visual Editor API', function () {
	// const titles = ( list ) => list.map( ( p ) => utils.dbkey( p.title ) );

	const title = utils.title( 'VisualEditor' );
	const newPage = utils.title( 'VisualEditorNew' );

	let alice;
	let pageInfo;

	before( async () => {
		alice = await action.alice();

		const textX = 'Hello World! {{Template Requests}}';

		pageInfo = await
		alice.edit( title, { text: textX } );

	} );
	// https://en.wikipedia.org/w/api.php?action=visualeditor&format=json&page=Davido%20Adeleke&paction=metadata

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

	it( 'Should create page, edit and save page', async () => {
		const token = await alice.token();
		const html = '<p>save paction</p>';
		const summary = 'save test workflow';
		const result = await alice.action(
			'visualeditoredit',
			{
				page: newPage,
				paction: 'save',
				token: token,
				html: html,
				summary: summary
			},
			'post'
		);
		assert.equal( result.visualeditoredit.result, 'success' );
	} );
} );
