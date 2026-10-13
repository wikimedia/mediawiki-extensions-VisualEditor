/*!
 * VisualEditor DataModel MWLanguageVariantNode tests.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

QUnit.module( 've.dm.MWLanguageVariantNode', ve.test.utils.newMwEnvironment() );

QUnit.test.each( 'getPreviewHtml escapes language codes', {
	name: {
		variantInfo: { name: { t: '<img src=x onerror=alert(1)>' } },
		expected: '&lt;img src=x onerror=alert(1)&gt;'
	},
	twoway: {
		variantInfo: {
			describe: true,
			twoway: [ { l: '<img src=x onerror=alert(1)>', t: '<b>foo</b>' } ]
		},
		expected: '&lt;img src=x onerror=alert(1)&gt;:<b>foo</b>;'
	},
	oneway: {
		variantInfo: {
			describe: true,
			oneway: [ { f: '<i>a</i>', l: '"><img src=x>', t: 'b' } ]
		},
		expected: '<i>a</i>⇒&quot;&gt;&lt;img src=x&gt;:b;'
	}
}, function ( assert, data ) {
	// Make all codes unknown, so that the raw code is returned.
	this.sandbox.stub( ve.init.platform, 'getLanguageName' ).callsFake( ( code ) => code );

	assert.strictEqual(
		ve.dm.MWLanguageVariantNode.static.getPreviewHtml( data.variantInfo ),
		data.expected
	);
} );

QUnit.test( 'insertPreviewElements does not create elements from language codes', function ( assert ) {
	this.sandbox.stub( ve.init.platform, 'getLanguageName' ).callsFake( ( code ) => code );
	// Use an inert document, so that a failure does not run the payload.
	const element = document.implementation.createHTMLDocument( '' ).createElement( 'span' );

	ve.dm.MWLanguageVariantNode.static.insertPreviewElements( element, {
		describe: true,
		twoway: [ { l: '<img src=x onerror=alert(1)>', t: 'foo' } ]
	} );

	assert.strictEqual( element.querySelector( 'img' ), null );
	assert.strictEqual( element.textContent, '<img src=x onerror=alert(1)>:foo;' );
} );

QUnit.test( 'language codes entered in the editor are stored unescaped', function ( assert ) {
	this.sandbox.stub( ve.init.platform, 'getLanguageName' ).callsFake( ( code ) => code );
	// Use an inert document, so that a failure does not run the payload.
	const doc = document.implementation.createHTMLDocument( '' ),
		// As if typed into the language input of the language variant inspector
		variantInfo = {
			describe: true,
			twoway: [ { l: '<img src=x onerror=alert(1)>', t: 'foo' } ]
		},
		dataElement = { type: 'mwLanguageVariantInline', attributes: { variantInfo } },
		converter = {
			doesModeNeedRendering: () => true,
			isExpectingContent: () => true,
			isInWrapper: () => false
		};

	const domElement = ve.dm.MWLanguageVariantInlineNode.static.toDomElements( dataElement, doc, converter )[ 0 ];
	assert.deepEqual( JSON.parse( domElement.getAttribute( 'data-mw-variant' ) ), variantInfo, 'data-mw-variant' );
	assert.strictEqual( domElement.querySelector( 'img' ), null, 'preview has no elements from the code' );
	assert.strictEqual( domElement.textContent, '<img src=x onerror=alert(1)>:foo;', 'preview is escaped once' );

	assert.deepEqual(
		ve.dm.MWLanguageVariantInlineNode.static.toDataElement( [ domElement ], converter ).attributes.variantInfo,
		variantInfo,
		'round trip'
	);
	assert.strictEqual(
		ve.ce.MWLanguageVariantNode.static.getDescription( new ve.dm.MWLanguageVariantInlineNode( dataElement ) ),
		ve.msg( 'visualeditor-mwlanguagevariant-twoway', '<img src=x onerror=alert(1)>' ),
		'plain-text description is not escaped'
	);
} );
