/**
 * VisualEditor MediaWiki article copy handler tests.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

QUnit.module( 've.init.mw.ArticleCopyHandler', ve.test.utils.newMwEnvironment( {
	beforeEach: function () {
		const dataMw = ( n ) => JSON.stringify( {
			parts: [ { template: { target: { wt: 'CopyTest' }, params: { 1: { wt: n } }, i: 0 } } ]
		} );
		this.$root = $( '<div>' ).addClass( 'mw-parser-output' ).appendTo( '#qunit-fixture' );
		this.$root.html(
			'<p>Before ' +
			'<style about="#mwt1" typeof="mw:Extension/templatestyles mw:Transclusion">.copytest{}</style>' +
			'<span class="copytest" about="#mwt1"><a href="./Special:BookSources/1">1</a></span>' +
			' middle ' +
			'<link rel="mw-deduplicated-inline-style" href="mw-data:TemplateStyles:r1" about="#mwt2" typeof="mw:Extension/templatestyles mw:Transclusion">' +
			'<span class="copytest" about="#mwt2"><img src="//upload.example/a.png" srcset="//upload.example/a.png, //upload.example/a,b.png 1.5x, //upload.example/c.png 2x"></span>' +
			' after <b>plain</b></p>'
		);
		this.$root.find( '[about="#mwt1"]' ).first().attr( 'data-mw', dataMw( '1' ) );
		this.$root.find( '[about="#mwt2"]' ).first().attr( 'data-mw', dataMw( '2' ) );
		this.dataMw = dataMw;
	},
	afterEach: function () {
		document.getSelection().removeAllRanges();
	}
} ) );

( function () {
	/**
	 * Select a range and send a fake copy event to the handler
	 *
	 * @param {Range} range
	 * @param {boolean} [defaultPrevented=false] The event was already cancelled
	 * @return {Object} Event, with the clipboard contents in `data`
	 */
	function copy( range, defaultPrevented = false ) {
		const selection = document.getSelection();
		selection.removeAllRanges();
		selection.addRange( range );
		const e = {
			data: {},
			defaultPrevented,
			clipboardData: {
				setData: function ( type, value ) {
					e.data[ type ] = value;
				}
			},
			preventDefault: function () {
				e.defaultPrevented = true;
			}
		};
		mw.libs.ve.onArticleCopy( e );
		return e;
	}

	function normalizeHtml( html ) {
		return $( '<div>' ).html( html )[ 0 ].innerHTML;
	}

	function absolute( url ) {
		return new URL( url, document.baseURI ).href;
	}

	QUnit.test( 'Selection that starts inside a transclusion', function ( assert ) {
		const range = document.createRange();
		range.selectNodeContents( this.$root.find( 'a' )[ 0 ] );

		const e = copy( range );

		assert.true( e.defaultPrevented, 'default action prevented' );
		const $expected = $( '<div>' ).append(
			$( '<span>' ).attr( {
				typeof: 'mw:Transclusion',
				about: '#mwt1',
				'data-mw': this.dataMw( '1' ),
				'data-ve-no-generated-contents': 'true'
			} ),
			$( '<span>' ).addClass( 'copytest' ).attr( 'about', '#mwt1' ).append(
				$( '<a>' ).attr( 'href', absolute( './Special:BookSources/1' ) ).text( '1' )
			)
		);
		assert.strictEqual(
			normalizeHtml( e.data[ 'text/html' ] ),
			$expected[ 0 ].innerHTML,
			'HTML has the span and no <style>, and the URL is absolute'
		);
		assert.strictEqual( e.data[ 'text/plain' ], '1', 'plain text is the selection' );
		assert.strictEqual( this.$root.find( '[data-ve-no-generated-contents]' ).length, 0, 'spans removed from the page' );
	} );

	QUnit.test( 'Selection that starts inside a transclusion with an image', function ( assert ) {
		const range = document.createRange();
		range.selectNode( this.$root.find( 'img' )[ 0 ] );

		const e = copy( range );

		const $html = $( '<div>' ).html( e.data[ 'text/html' ] );
		assert.strictEqual( $html.find( 'link' ).length, 0, 'no <link>' );
		assert.strictEqual( $html.find( '[typeof="mw:Transclusion"]' ).attr( 'about' ), '#mwt2', 'span for the <link> head' );
		assert.strictEqual( $html.find( 'img' ).attr( 'src' ), absolute( '//upload.example/a.png' ), 'src is absolute' );
		assert.strictEqual(
			$html.find( 'img' ).attr( 'srcset' ),
			absolute( '//upload.example/a.png' ) + ', ' + absolute( '//upload.example/a,b.png' ) + ' 1.5x, ' +
				absolute( '//upload.example/c.png' ) + ' 2x',
			'srcset URLs are absolute'
		);
	} );

	QUnit.test( 'Selection that starts before a transclusion', function ( assert ) {
		const done = assert.async();
		const range = document.createRange();
		range.setStart( this.$root.find( 'p' )[ 0 ].firstChild, 0 );
		range.setEndAfter( this.$root.find( 'b' )[ 0 ] );

		const e = copy( range );

		assert.false( e.defaultPrevented, 'default action not prevented' );
		assert.deepEqual( e.data, {}, 'no clipboard data written' );
		const $spans = this.$root.find( '[data-ve-no-generated-contents]' );
		assert.deepEqual(
			$spans.toArray().map( ( span ) => [ span.getAttribute( 'about' ), span.nextSibling.nodeName ] ),
			[ [ '#mwt1', 'STYLE' ], [ '#mwt2', 'LINK' ] ],
			'spans inserted before each head, which stays in place'
		);
		setTimeout( () => {
			assert.strictEqual( this.$root.find( '[data-ve-no-generated-contents]' ).length, 0, 'spans removed after the copy' );
			done();
		} );
	} );

	QUnit.test( 'Selection with no transclusion', function ( assert ) {
		const range = document.createRange();
		range.selectNodeContents( this.$root.find( 'b' )[ 0 ] );

		const e = copy( range );

		assert.false( e.defaultPrevented, 'default action not prevented' );
		assert.strictEqual( this.$root.find( '[data-ve-no-generated-contents]' ).length, 0, 'no spans inserted' );
	} );

	QUnit.test( 'Copy from a form field', function ( assert ) {
		const $input = $( '<input>' ).val( 'text' ).appendTo( this.$root.find( '.copytest' ).first() );
		$input[ 0 ].focus();
		const range = document.createRange();
		range.selectNode( $input[ 0 ] );

		const e = copy( range );

		assert.false( e.defaultPrevented, 'default action not prevented' );
		assert.strictEqual( this.$root.find( '[data-ve-no-generated-contents]' ).length, 0, 'no spans inserted' );
	} );

	QUnit.test( 'Copy that is already handled', function ( assert ) {
		const range = document.createRange();
		range.selectNodeContents( this.$root.find( 'a' )[ 0 ] );

		const e = copy( range, true );

		assert.deepEqual( e.data, {}, 'no clipboard data written' );
		assert.strictEqual( this.$root.find( '[data-ve-no-generated-contents]' ).length, 0, 'no spans inserted' );
	} );
}() );
