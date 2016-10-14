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
				htmlOrDoc:
					ve.dm.mwExample.MWBlockImage.html +
					'<ul><li><p>Foo</p></li><li><p>Bar</p></li></ul>',
				rangeOrSelection: new ve.Range( blocklength + 3 ),
				keys: [ 'BACKSPACE' ],
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
				expectedRangeOrSelection: new ve.Range( blocklength + 1 ),
				msg: 'Backspace in a list next to a block image doesn\'t merge into the caption'
			},
			{
				htmlOrDoc:
					ve.dm.mwExample.MWBlockImage.html +
					'<ul><li><p></p></li></ul>',
				rangeOrSelection: new ve.Range( blocklength + 3 ),
				keys: [ 'BACKSPACE' ],
				expectedData: function ( data ) {
					data.splice(
						blocklength, 6,
						{ type: 'paragraph' },
						{ type: '/paragraph' }
					);
				},
				expectedRangeOrSelection: new ve.Range( blocklength + 1 ),
				msg: 'Backspace in an empty list next to a block image removes the list'
			}
		];

	QUnit.expect( cases.length * 2 );

	for ( i = 0; i < cases.length; i++ ) {
		ve.test.utils.runSurfaceHandleSpecialKeyTest(
			assert, cases[ i ].htmlOrDoc, cases[ i ].rangeOrSelection, cases[ i ].keys,
			cases[ i ].expectedData, cases[ i ].expectedRangeOrSelection, cases[ i ].msg
		);
	}
} );

QUnit.test( 'beforePaste/afterPaste', function ( assert ) {
	var i, expected = 0,
		cases = [
			{
				documentHtml: '<p></p>',
				rangeOrSelection: new ve.Range( 1 ),
				pasteHtml: '<span typeof="mw:Entity" id="mwAB">-</span><span typeof="mw:Entity" id="mw-reference-cite">-</span>',
				fromVe: true,
				expectedRangeOrSelection: new ve.Range( 5 ),
				expectedHtml: '<p><span typeof="mw:Entity">-</span><span typeof="mw:Entity" id="mw-reference-cite">-</span></p>',
				msg: 'RESTBase IDs stripped'
			}
		];

	for ( i = 0; i < cases.length; i++ ) {
		if ( cases[ i ].expectedOps ) {
			expected++;
		}
		if ( cases[ i ].expectedRangeOrSelection ) {
			expected++;
		}
		if ( cases[ i ].expectedHtml ) {
			expected++;
		}
	}
	QUnit.expect( expected );

	for ( i = 0; i < cases.length; i++ ) {
		ve.test.utils.runSurfacePasteTest(
			assert, cases[ i ].documentHtml,
			cases[ i ].pasteHtml, cases[ i ].internalSourceRangeOrSelection, cases[ i ].fromVe, cases[ i ].useClipboardData,
			cases[ i ].pasteTargetHtml, cases[ i ].rangeOrSelection, cases[ i ].pasteSpecial,
			cases[ i ].expectedOps, cases[ i ].expectedRangeOrSelection, cases[ i ].expectedHtml,
			cases[ i ].store, false, cases[ i ].msg
		);
	}
} );
