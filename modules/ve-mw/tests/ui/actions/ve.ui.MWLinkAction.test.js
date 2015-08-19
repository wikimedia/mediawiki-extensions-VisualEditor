/*!
 * VisualEditor UserInterface Actions MWLinkAction tests.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

QUnit.module( 've.ui.MWLinkAction' );

/* Tests */

function runMWAutolinkTest( assert, html, method, range, expectedRange, expectedData, expectedOriginalData, msg ) {
	var status,
		expectFail = /^Don't/.test( msg ),
		surface = ve.test.utils.createModelOnlySurfaceFromHtml( html || ve.dm.example.html ),
		linkAction = new ve.ui.MWLinkAction( surface ),
		data = ve.copy( surface.getModel().getDocument().getFullData() ),
		originalData = ve.copy( data );

	expectedData( data );
	if ( expectedOriginalData ) {
		expectedOriginalData( originalData );
	}
	surface.getModel().setLinearSelection( range );
	status = linkAction[ method ]();
	assert.equal( status, !expectFail, msg + ': action return value' );

	assert.equalLinearData( surface.getModel().getDocument().getFullData(), data, msg + ': data models match' );
	assert.equalRange( surface.getModel().getSelection().getRange(), expectedRange, msg + ': ranges match' );

	if ( status ) {
		surface.getModel().undo();
	}

	assert.equalLinearData( surface.getModel().getDocument().getFullData(), originalData, msg + ' (undo): data models match' );
	assert.equalRange( surface.getModel().getSelection().getRange(), expectedRange, msg + ' (undo): ranges match' );
}

QUnit.test( 'MW autolink', function ( assert ) {
	var i,
		cases = [
			{
				html: '<p>https://en.wikipedia.org/wiki/Red_(disambiguation) xyz</p>',
				range: new ve.Range( 1, 52 ),
				method: 'autolinkUrl',
				expectedRange: new ve.Range( 52, 52 ),
				expectedData: function ( data ) {
					var i;
					for ( i = 1; i < 51; i++ ) {
						data[ i ] = [ data[ i ], [ 0 ] ];
					}
				},
				msg: 'Strip trailing punctuation (but not matched parens)'
			}
		];

	QUnit.expect( cases.length * 5 );
	for ( i = 0; i < cases.length; i++ ) {
		runMWAutolinkTest( assert, cases[ i ].html, cases[ i ].method, cases[ i ].range, cases[ i ].expectedRange, cases[ i ].expectedData, cases[ i ].expectedOriginalData, cases[ i ].msg );
	}
} );
