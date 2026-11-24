/**
 * VisualEditor MediaWiki article copy handler tests.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

QUnit.module( 've.init.mw.ArticleCopyHandler', ve.test.utils.newMwEnvironment( {
	config: {
		wgParsoidHtmlVersion: '2.8.0'
	},
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
		const $html = $( '<div>' ).html( e.data[ 'text/html' ] );
		const $marker = $html.find( '[data-mw-clipboard]' );
		assert.deepEqual(
			[ $marker.length, $marker.parent().prop( 'nodeName' ) ],
			[ 1, 'A' ],
			'HTML has the metadata marker before the text'
		);
		$marker.remove();
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
			normalizeHtml( $html[ 0 ].innerHTML ),
			$expected[ 0 ].innerHTML,
			'HTML has the span and no <style>, and the URL is absolute'
		);
		assert.strictEqual( e.data[ 'text/plain' ], '1', 'plain text is the selection' );
		assert.strictEqual( this.$root.find( '[data-ve-no-generated-contents]' ).length, 0, 'spans removed from the page' );
		assert.strictEqual( this.$root.find( '[data-mw-clipboard]' ).length, 0, 'marker removed from the page' );
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

	QUnit.test( 'Metadata marker', function ( assert ) {
		const done = assert.async();
		const p = this.$root.find( 'p' )[ 0 ];
		const html = p.innerHTML;
		const text = p.firstChild;
		const range = document.createRange();
		range.setStart( text, 2 );
		range.setEnd( text, 5 );

		const e = copy( range );

		assert.false( e.defaultPrevented, 'default action not prevented' );
		const marker = p.querySelector( '[data-mw-clipboard]' );
		assert.deepEqual(
			JSON.parse( marker.getAttribute( 'data-mw-clipboard' ) ),
			{ domain: location.hostname },
			'marker has the domain'
		);
		assert.true( document.getSelection().getRangeAt( 0 ).intersectsNode( marker ), 'marker is in the selection' );
		assert.strictEqual( document.getSelection().toString(), 'for', 'selected text is the same' );
		setTimeout( () => {
			assert.strictEqual( p.innerHTML, html, 'marker removed after the copy' );
			assert.strictEqual( p.firstChild.data, 'Before ', 'split text node merged' );
			const selection = document.getSelection();
			assert.deepEqual(
				[ selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset ],
				[ p.firstChild, 2, p.firstChild, 5 ],
				'selection restored'
			);
			done();
		} );
	} );

	QUnit.test( 'Metadata marker on a legacy parser view', function ( assert ) {
		mw.config.set( 'wgParsoidHtmlVersion', null );
		const range = document.createRange();
		range.selectNodeContents( this.$root.find( 'a' )[ 0 ] );

		const e = copy( range );

		assert.false( e.defaultPrevented, 'default action not prevented' );
		assert.strictEqual( this.$root.find( '[data-ve-no-generated-contents]' ).length, 0, 'no data-mw spans' );
		assert.strictEqual( this.$root.find( 'a [data-mw-clipboard]' ).length, 1, 'marker inserted' );
	} );

	QUnit.test( 'Metadata marker skips whitespace and styles', function ( assert ) {
		this.$root.html( '<style>.x{}</style><table>\n<tbody>\n<tr>\n<td>Cell</td></tr></tbody></table>' );
		const range = document.createRange();
		range.setStart( this.$root[ 0 ], 0 );
		range.setEnd( this.$root[ 0 ], 2 );

		copy( range );

		assert.strictEqual( this.$root.find( '[data-mw-clipboard]' ).parent().prop( 'nodeName' ), 'TD', 'marker is in the cell' );
	} );

	QUnit.test( 'Metadata marker skips text that the browser does not copy', function ( assert ) {
		this.$root.html(
			'<p><span style="user-select:none">Unselectable</span><span style="display:none">Hidden</span>' +
			'<span style="visibility:hidden">Invisible</span><b>Visible</b></p>'
		);
		const p = this.$root.find( 'p' )[ 0 ];
		const range = document.createRange();
		range.selectNodeContents( p );

		copy( range );

		assert.strictEqual( this.$root.find( '[data-mw-clipboard]' ).parent().prop( 'nodeName' ), 'B', 'marker is next to the visible text' );
	} );

	QUnit.test( 'No metadata marker without copyable text', function ( assert ) {
		this.$root.html( '<p><span style="display:none">Hidden</span> </p><p>After</p>' );
		const p = this.$root.find( 'p' )[ 0 ];
		const range = document.createRange();
		range.selectNodeContents( p );

		copy( range );

		assert.strictEqual( this.$root.find( '[data-mw-clipboard]' ).length, 0, 'no marker' );
	} );

	QUnit.test( 'No metadata marker outside content', ( assert ) => {
		const $outside = $( '<p>' ).text( 'Outside' ).appendTo( '#qunit-fixture' );
		const range = document.createRange();
		range.selectNodeContents( $outside[ 0 ] );

		const e = copy( range );

		assert.false( e.defaultPrevented, 'default action not prevented' );
		assert.strictEqual( $outside.find( '[data-mw-clipboard]' ).length, 0, 'no marker' );
	} );

	QUnit.test( 'Copy from a form field', function ( assert ) {
		const $input = $( '<input>' ).val( 'text' ).appendTo( this.$root.find( '.copytest' ).first() );
		$input[ 0 ].focus();
		const range = document.createRange();
		range.selectNode( $input[ 0 ] );

		const e = copy( range );

		assert.false( e.defaultPrevented, 'default action not prevented' );
		assert.strictEqual( this.$root.find( '[data-ve-no-generated-contents]' ).length, 0, 'no spans inserted' );
		assert.strictEqual( this.$root.find( '[data-mw-clipboard]' ).length, 0, 'no marker inserted' );
	} );

	QUnit.test( 'Copy that is already handled', function ( assert ) {
		const range = document.createRange();
		range.selectNodeContents( this.$root.find( 'a' )[ 0 ] );

		const e = copy( range, true );

		assert.deepEqual( e.data, {}, 'no clipboard data written' );
		assert.strictEqual( this.$root.find( '[data-ve-no-generated-contents]' ).length, 0, 'no spans inserted' );
	} );
}() );
