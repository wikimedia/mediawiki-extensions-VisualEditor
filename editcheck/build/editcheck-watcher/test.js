import QUnit from 'qunit';
import { collapseToMinimalPaths, formatJsonDiff, fetchRevisionContent } from './lib.js';

// ---------------------------------------------------------------------------
// collapseToMinimalPaths
// ---------------------------------------------------------------------------

QUnit.module( 'collapseToMinimalPaths', () => {
	QUnit.test( 'returns an empty array for empty input', ( assert ) => {
		assert.deepEqual( collapseToMinimalPaths( [] ), [] );
	} );

	QUnit.test( 'keeps a single path unchanged', ( assert ) => {
		assert.deepEqual( collapseToMinimalPaths( [ 'foo/bar' ] ), [ 'foo/bar' ] );
	} );

	QUnit.test( 'keeps unrelated paths', ( assert ) => {
		const result = collapseToMinimalPaths( [ 'foo/bar', 'baz/qux' ] );
		assert.deepEqual( result.sort(), [ 'baz/qux', 'foo/bar' ] );
	} );

	QUnit.test( 'keeps foo/bar and drops foo/bar/baz', ( assert ) => {
		assert.deepEqual( collapseToMinimalPaths( [ 'foo/bar/baz', 'foo/bar' ] ), [ 'foo/bar' ] );
	} );

	QUnit.test( 'keeps both paths when they share only a parent, not a listed ancestor', ( assert ) => {
		const result = collapseToMinimalPaths( [ 'foo/bar/baz', 'foo/qux' ] );
		assert.deepEqual( result.sort(), [ 'foo/bar/baz', 'foo/qux' ] );
	} );

	QUnit.test( 'strips [] array markers from paths', ( assert ) => {
		assert.deepEqual( collapseToMinimalPaths( [ 'items/0[]', 'items/1[]' ] ), [ 'items' ] );
	} );

	QUnit.test( 'strips numeric index segments, collapsing array item paths to their parent', ( assert ) => {
		assert.deepEqual(
			collapseToMinimalPaths( [ 'query/2', 'query/3', 'query/4' ] ),
			[ 'query' ]
		);
	} );

	QUnit.test( 'strips numeric segments mid-path', ( assert ) => {
		assert.deepEqual(
			collapseToMinimalPaths( [ 'rules/0/config', 'rules/1/config' ] ),
			[ 'rules/config' ]
		);
	} );

	QUnit.test( 'deduplicates identical paths', ( assert ) => {
		assert.deepEqual( collapseToMinimalPaths( [ 'foo/bar', 'foo/bar' ] ), [ 'foo/bar' ] );
	} );
} );

QUnit.module( 'formatJsonDiff', () => {
	QUnit.test( 'returns empty string when nothing changed', ( assert ) => {
		assert.strictEqual( formatJsonDiff( { a: 1 }, { a: 1 } ), '' );
	} );

	QUnit.test( 'reports a top-level added key', ( assert ) => {
		const result = formatJsonDiff( { a: 1 }, { a: 1, b: 2 } );
		assert.true( /Added.*`b`/.test( result ) );
		assert.false( /Removed|Edited/.test( result ) );
	} );

	QUnit.test( 'reports a top-level removed key', ( assert ) => {
		const result = formatJsonDiff( { a: 1, b: 2 }, { a: 1 } );
		assert.true( /Removed.*`b`/.test( result ) );
		assert.false( /Added|Edited/.test( result ) );
	} );

	QUnit.test( 'reports a top-level edited key', ( assert ) => {
		const result = formatJsonDiff( { a: 1 }, { a: 2 } );
		assert.true( /Edited.*`a`/.test( result ) );
		assert.false( /Added|Removed/.test( result ) );
	} );

	QUnit.test( 'collapses nested edited paths to the highest shared ancestor', ( assert ) => {
		const old = { rules: { x: 1, y: 2 } };
		const nw = { rules: { x: 9, y: 2 } };
		const result = formatJsonDiff( old, nw );
		assert.true( /Edited.*`rules\/x`/.test( result ) );
		assert.false( /`rules`(?!\/x)/.test( result ) );
	} );

	QUnit.test( 'treats new array elements appended to an existing array as edited, not added', ( assert ) => {
		// query existed before; only new indices were added → should be Edited
		const old = { query: [ 'a', 'b' ] };
		const nw = { query: [ 'a', 'b', 'c', 'd' ] };
		const result = formatJsonDiff( old, nw );
		assert.true( /Edited.*`query`/.test( result ) );
		assert.false( /Added/.test( result ) );
	} );

	QUnit.test( 'reports a wholly new key containing an array as added', ( assert ) => {
		const old = { a: 1 };
		const nw = { a: 1, query: [ 'x', 'y' ] };
		const result = formatJsonDiff( old, nw );
		assert.true( /Added.*`query`/.test( result ) );
		assert.false( /Edited|Removed/.test( result ) );
	} );

	QUnit.test( 'collapses multiple added array-item paths and sibling keys correctly', ( assert ) => {
		// Mirrors the real-world case from the user's example
		const old = {
			textMatch: { matchRules: { 'nonneutral-comments': { query: [ 'a', 'b' ] } } }
		};
		const nw = {
			textMatch: {
				matchRules: {
					'nonneutral-comments': { query: [ 'a' ] },
					'potential-nonneutral-comments': {
						config: { showAsCheck: true, showAsSuggestion: false },
						query: [ 'x', 'y', 'z' ]
					}
				}
			}
		};
		const result = formatJsonDiff( old, nw );
		// New whole key added
		assert.true( /Added.*potential-nonneutral-comments/.test( result ) );
		// query existed in nonneutral-comments and was modified
		assert.true( /Edited|Removed/.test( result ) );
		// query of the new key should NOT appear separately as added items
		assert.false( /potential-nonneutral-comments\/query` /.test( result ) );
	} );
} );

QUnit.module( 'fetchRevisionContent', () => {
	const makeApiResponse = ( content ) => ( {
		query: {
			pages: {
				123: {
					revisions: [ {
						slots: { main: { '*': content } }
					} ]
				}
			}
		}
	} );

	const mockFetch = ( responseBody ) => () => Promise.resolve( {
		json: () => Promise.resolve( responseBody )
	} );

	QUnit.test( 'parses and returns JSON content from a valid API response', async ( assert ) => {
		const config = { rules: [ { id: 'test' } ] };
		const fetch = mockFetch( makeApiResponse( JSON.stringify( config ) ) );
		const result = await fetchRevisionContent( 'https://en.wikipedia.org', 42, fetch );
		assert.deepEqual( result, config );
	} );

} );
