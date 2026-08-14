/*!
 * VisualEditor MediaWiki DiffLoader tests.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

QUnit.module( 've.init.mw.DiffLoader', ve.test.utils.newMwEnvironment( {
	config: {
		// Special pages carry no wgVisualEditor, but createModelFromDom reads the page language
		wgVisualEditor: ve.extendObject( {}, mw.config.get( 'wgVisualEditor' ), {
			pageLanguageCode: 'en',
			pageLanguageDir: 'ltr'
		} )
	}
} ) );

( function () {
	const style = '<style data-mw-deduplicate="TemplateStyles:r1" typeof="mw:Extension/templatestyles" about="#mwt2" data-mw=\'{"name":"templatestyles","attrs":{"src":"X.css"}}\'>.mw-parser-output .a{color:red}</style>',
		deduplicatedStyle = '<link rel="mw-deduplicated-inline-style" href="mw-data:TemplateStyles:r1" about="#mwt3" typeof="mw:Extension/templatestyles" data-mw=\'{"name":"templatestyles","attrs":{"src":"X.css"}}\'/>',
		fallbackId = '<span id="Legacy_id" typeof="mw:FallbackId"></span>',
		// The style and the placeholder that refers to it are in the same section, so that
		// a single section can still be re-duplicated on its own.
		sectionedHtml =
			'<section data-mw-section-id="0"><p>Intro</p></section>' +
			'<section data-mw-section-id="1"><h2 id="Heading">Heading</h2>' +
			'<p>Body' + style + '</p>' +
			'<p>More' + deduplicatedStyle + '</p>' +
			'<p>' + fallbackId + 'Tail</p></section>';

	/**
	 * Convert a model back to a document, so the result can be inspected as DOM.
	 *
	 * @param {ve.dm.Document} model
	 * @return {HTMLDocument}
	 */
	function domFromModel( model ) {
		return ve.dm.converter.getDomFromModel( model );
	}

	// A whole document takes the cheap path, where the section wrappers come off the HTML
	// string instead of the DOM. That path must still do everything parseDocument does,
	// so these assert the steps that are easy to lose when the string is parsed directly.
	QUnit.test( 'getModelFromHtml (whole document)', ( assert ) => {
		const doc = domFromModel( mw.libs.ve.diffLoader.getModelFromHtml( sectionedHtml, null ) );

		assert.strictEqual(
			doc.body.querySelectorAll( 'section' ).length, 0,
			'section wrappers are removed'
		);
		assert.strictEqual(
			doc.body.querySelectorAll( 'style' ).length, 2,
			'deduplicated TemplateStyles are re-duplicated'
		);
		assert.strictEqual(
			doc.body.querySelectorAll( 'link[rel="mw-deduplicated-inline-style"]' ).length, 0,
			'no TemplateStyles placeholders are left behind'
		);
		assert.strictEqual(
			doc.body.querySelectorAll( 'span[typeof="mw:FallbackId"]' ).length, 0,
			'legacy Parsoid fallback IDs are stripped'
		);
	} );

	QUnit.test( 'getModelFromHtml (single section)', ( assert ) => {
		const doc = domFromModel( mw.libs.ve.diffLoader.getModelFromHtml( sectionedHtml, '1' ) );

		assert.strictEqual(
			doc.body.querySelectorAll( 'h2' ).length, 1,
			'the requested section is kept'
		);
		assert.strictEqual(
			doc.body.textContent.includes( 'Intro' ), false,
			'other sections are dropped'
		);
		assert.strictEqual(
			doc.body.querySelectorAll( 'link[rel="mw-deduplicated-inline-style"]' ).length, 0,
			'TemplateStyles are re-duplicated for a single section too'
		);
	} );

	QUnit.test( 'getModelFromHtml (no HTML)', ( assert ) => {
		assert.strictEqual( mw.libs.ve.diffLoader.getModelFromHtml( null, null ), null, 'null HTML gives null' );
	} );
}() );
