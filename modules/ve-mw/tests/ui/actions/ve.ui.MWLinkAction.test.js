/*!
 * VisualEditor UserInterface Actions MWLinkAction tests.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

QUnit.module( 've.ui.MWLinkAction' );

/* Tests */

function runMWAutolinkTest( assert, html, method, range, expectedRange, expectedRangeAfterUndo, expectedData, expectedOriginalData, msg ) {
	var status, actualData,
		expectFail = /^Don't/.test( msg ),
		surface = ve.test.utils.createModelOnlySurfaceFromHtml( html || ve.dm.example.html ),
		linkAction = new ve.ui.MWLinkAction( surface ),
		data = ve.copy( surface.getModel().getDocument().getFullData() ),
		originalData = ve.copy( data ),
		makeLinkAnnotation = function ( linktext ) {
			return linkAction.getLinkAnnotation( linktext ).element;
		};

	ve.dm.example.postprocessAnnotations( data, surface.getModel().getDocument().getStore() );
	expectedData( data, makeLinkAnnotation );
	if ( expectedOriginalData ) {
		expectedOriginalData( originalData );
	}
	surface.getModel().setLinearSelection( range );
	status = linkAction[ method ]();
	assert.equal( status, !expectFail, msg + ': action return value' );

	actualData = surface.getModel().getDocument().getFullData();
	ve.dm.example.postprocessAnnotations( actualData, surface.getModel().getDocument().getStore() );
	assert.equalLinearData( actualData, data, msg + ': data models match' );
	assert.equalRange( surface.getModel().getSelection().getRange(), expectedRange, msg + ': ranges match' );

	if ( status ) {
		surface.getModel().undo();
	}

	assert.equalLinearData( surface.getModel().getDocument().getFullData(), originalData, msg + ' (undo): data models match' );
	assert.equalRange( surface.getModel().getSelection().getRange(), expectedRangeAfterUndo || expectedRange, msg + ' (undo): ranges match' );
}

QUnit.test( 'MW autolink', function ( assert ) {
	var i,
		cases = [
			{
				msg: 'Strip trailing punctuation (but not matched parens)',
				html: '<p><b>https://en.wikipedia.org/wiki/Red_(disambiguation) xyz</b></p>',
				range: new ve.Range( 1, 52 ),
				method: 'autolinkUrl',
				expectedRange: new ve.Range( 52, 52 ),
				expectedData: function ( data, makeAnnotation ) {
					var i,
						a = makeAnnotation( 'https://en.wikipedia.org/wiki/Red_(disambiguation)' );
					for ( i = 1; i < 51; i++ ) {
						data[ i ][ 1 ].push( a );
					}
				}
			},
			{
				msg: 'Autolink valid RFC',
				html: '<p><b>RFC 1234 xyz</b></p>',
				range: new ve.Range( 1, 10 ),
				method: 'autolinkMagicLink',
				expectedRange: new ve.Range( 4, 4 ),
				expectedRangeAfterUndo: new ve.Range( 10, 10 ),
				expectedData: function ( data /*, makeAnnotation */ ) {
					data.splice( 1, 8, {
						type: 'link/mwMagic',
						attributes: {
							content: 'RFC 1234'
						},
						annotations: data[ 1 ][ 1 ]
					}, {
						type: '/link/mwMagic',
						annotations: data[ 1 ][ 1 ]
					} );
				}
			},
			{
				msg: 'Don\'t autolink invalid RFC',
				html: '<p><b>RFC 123x xyz</b></p>',
				range: new ve.Range( 1, 10 ),
				method: 'autolinkMagicLink',
				expectedRange: new ve.Range( 1, 10 ),
				expectedData: function ( /*data, makeAnnotation*/ ) {
					/* no change, no link */
				}
			},
			{
				msg: 'Autolink valid PMID',
				html: '<p><b>PMID 1234 xyz</b></p>',
				range: new ve.Range( 1, 11 ),
				method: 'autolinkMagicLink',
				expectedRange: new ve.Range( 4, 4 ),
				expectedRangeAfterUndo: new ve.Range( 11, 11 ),
				expectedData: function ( data /*, makeAnnotation */ ) {
					data.splice( 1, 9, {
						type: 'link/mwMagic',
						attributes: {
							content: 'PMID 1234'
						},
						annotations: data[ 1 ][ 1 ]
					}, {
						type: '/link/mwMagic',
						annotations: data[ 1 ][ 1 ]
					} );
				}
			},
			{
				msg: 'Don\'t autolink invalid PMID',
				html: '<p><b>PMID 123x xyz</b></p>',
				range: new ve.Range( 1, 11 ),
				method: 'autolinkMagicLink',
				expectedRange: new ve.Range( 1, 11 ),
				expectedData: function ( /*data, makeAnnotation*/ ) {
					/* no change, no link */
				}
			},
			{
				msg: 'Autolink valid ISBN',
				html: '<p><b>ISBN 978-0596517748 xyz</b></p>',
				range: new ve.Range( 1, 21 ),
				method: 'autolinkMagicLink',
				expectedRange: new ve.Range( 4, 4 ),
				expectedRangeAfterUndo: new ve.Range( 21, 21 ),
				expectedData: function ( data /*, makeAnnotation */ ) {
					data.splice( 1, 19, {
						type: 'link/mwMagic',
						attributes: {
							content: 'ISBN 978-0596517748'
						},
						annotations: data[ 1 ][ 1 ]
					}, {
						type: '/link/mwMagic',
						annotations: data[ 1 ][ 1 ]
					} );
				}
			},
			{
				msg: 'Don\'t autolink invalid ISBN',
				html: '<p><b>ISBN 978-059651774 xyz</b></p>',
				range: new ve.Range( 1, 20 ),
				method: 'autolinkMagicLink',
				expectedRange: new ve.Range( 1, 20 ),
				expectedData: function ( /*data, makeAnnotation*/ ) {
					/* no change, no link */
				}
			}
		];

	QUnit.expect( cases.length * 5 );
	for ( i = 0; i < cases.length; i++ ) {
		runMWAutolinkTest( assert, cases[ i ].html, cases[ i ].method, cases[ i ].range, cases[ i ].expectedRange, cases[ i ].expectedRangeAfterUndo, cases[ i ].expectedData, cases[ i ].expectedOriginalData, cases[ i ].msg );
	}
} );
