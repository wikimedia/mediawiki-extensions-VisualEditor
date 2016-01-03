/*!
 * VisualEditor ContentEditable MediaWiki-specific Surface tests.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

QUnit.module( 've.ce.Surface (MW)', ve.test.utils.mwEnvironment );

/* Tests */

QUnit.test( 'handleLinearDelete', function ( assert ) {
	var i,
		blocklength = ve.dm.mwExample.MWBlockImage.data.length,
		cases = [
			// This asserts that getRelativeRange (via getRelativeOffset) doesn't try to
			// enter a handleOwnChildren node
			{
				html:
					ve.dm.mwExample.MWBlockImage.html +
					'<ul><li><p>Foo</p></li><li><p>Bar</p></li></ul>',
				range: new ve.Range( blocklength + 3 ),
				operations: [ 'backspace' ],
				expectedData: function ( data ) {
					// remove the first list item, and replace its wrapped paragraph outside
					// the start of the list
					data.splice(
						blocklength, 8,
						{ type: 'paragraph' },
						'F', 'o', 'o',
						{ type: '/paragraph' },
						{ type: 'list', attributes: { style: 'bullet' } }
					);
				},
				expectedSelection: {
					type: 'linear',
					range: new ve.Range( blocklength + 1 )
				},
				msg: 'Backspace in a list next to a block image doesn\'t merge into the caption'
			},
			{
				html:
					ve.dm.mwExample.MWBlockImage.html +
					'<ul><li><p></p></li></ul>',
				range: new ve.Range( blocklength + 3 ),
				operations: [ 'backspace' ],
				expectedData: function ( data ) {
					data.splice(
						blocklength, 6,
						{ type: 'paragraph' },
						{ type: '/paragraph' }
					);
				},
				expectedSelection: {
					type: 'linear',
					range: new ve.Range( blocklength + 1 )
				},
				msg: 'Backspace in an empty list next to a block image removes the list'
			}
		];

	QUnit.expect( cases.length * 2 );

	for ( i = 0; i < cases.length; i++ ) {
		ve.test.utils.runSurfaceHandleSpecialKeyTest(
			assert, cases[ i ].html, cases[ i ].range, cases[ i ].operations,
			cases[ i ].expectedData, cases[ i ].expectedSelection, cases[ i ].msg
		);
	}
} );
