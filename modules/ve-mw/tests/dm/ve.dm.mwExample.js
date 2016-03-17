/*!
 * VisualEditor DataModel MediaWiki-specific example data sets.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * @class
 * @singleton
 * @ignore
 */
ve.dm.mwExample = {};

ve.dm.mwExample.createExampleDocument = function ( name, store ) {
	return ve.dm.example.createExampleDocumentFromObject( name, store, ve.dm.mwExample );
};

ve.dm.mwExample.MWTransclusion = {
	blockOpen:
		'<div about="#mwt1" typeof="mw:Transclusion"' +
			' data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;Test&quot;,&quot;href&quot;:&quot;./Template:Test&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;Hello, world!&quot;}},&quot;i&quot;:0}}]}"' +
		'>' +
		'</div>',
	blockOpenModified:
		'<div about="#mwt1" typeof="mw:Transclusion"' +
			' data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;Test&quot;,&quot;href&quot;:&quot;./Template:Test&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;Hello, globe!&quot;}},&quot;i&quot;:0}}]}"' +
		'>' +
		'</div>',
	blockOpenFromData:
		'<span typeof="mw:Transclusion"' +
			' data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;Test&quot;,&quot;href&quot;:&quot;./Template:Test&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;Hello, world!&quot;}},&quot;i&quot;:0}}]}"' +
		'>' +
		'</span>',
	blockOpenClipboard:
		'<div about="#mwt1" typeof="mw:Transclusion"' +
			' data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;Test&quot;,&quot;href&quot;:&quot;./Template:Test&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;Hello, world!&quot;}},&quot;i&quot;:0}}]}"' +
			' data-ve-no-generated-contents="true"' +
		'>' +
			'&nbsp;' +
		'</div>',
	blockOpenFromDataModified:
		'<span typeof="mw:Transclusion"' +
			' data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;Test&quot;,&quot;href&quot;:&quot;./Template:Test&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;Hello, globe!&quot;}},&quot;i&quot;:0}}]}"' +
		'>' +
		'</span>',
	blockOpenModifiedClipboard:
		'<span typeof="mw:Transclusion"' +
			' data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;Test&quot;,&quot;href&quot;:&quot;./Template:Test&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;Hello, globe!&quot;}},&quot;i&quot;:0}}]}"' +
			' data-ve-no-generated-contents="true"' +
		'>' +
			'&nbsp;' +
		'</span>',
	blockContent: '<p about="#mwt1" data-parsoid="{}">Hello, world!</p>',
	blockContentClipboard: '<p about="#mwt1" data-parsoid="{}" data-ve-ignore="true">Hello, world!</p>',
	inlineOpen:
		'<span about="#mwt1" typeof="mw:Transclusion"' +
			' data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;Inline&quot;,&quot;href&quot;:&quot;./Template:Inline&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;1,234&quot;}},&quot;i&quot;:0}}]}"' +
		'>',
	inlineOpenModified:
		'<span about="#mwt1" typeof="mw:Transclusion"' +
			' data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;Inline&quot;,&quot;href&quot;:&quot;./Template:Inline&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;5,678&quot;}},&quot;i&quot;:0}}]}"' +
		'>',
	inlineOpenFromData:
		'<span typeof="mw:Transclusion"' +
			' data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;Inline&quot;,&quot;href&quot;:&quot;./Template:Inline&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;1,234&quot;}},&quot;i&quot;:0}}]}"' +
		'>',
	inlineOpenClipboard:
		'<span about="#mwt1" typeof="mw:Transclusion"' +
			' data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;Inline&quot;,&quot;href&quot;:&quot;./Template:Inline&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;1,234&quot;}},&quot;i&quot;:0}}]}"' +
			' data-ve-no-generated-contents="true"' +
		'>',
	inlineOpenFromDataModified:
		'<span typeof="mw:Transclusion"' +
			' data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;Inline&quot;,&quot;href&quot;:&quot;./Template:Inline&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;5,678&quot;}},&quot;i&quot;:0}}]}"' +
		'>',
	inlineOpenModifiedClipboard:
		'<span typeof="mw:Transclusion"' +
			' data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;Inline&quot;,&quot;href&quot;:&quot;./Template:Inline&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;5,678&quot;}},&quot;i&quot;:0}}]}"' +
			' data-ve-no-generated-contents="true"' +
		'>' +
			'&nbsp;',
	inlineContent: '$1,234.00',
	inlineClose: '</span>',
	mixed:
		'<link about="#mwt1" rel="mw:PageProp/Category" typeof="mw:Transclusion"' +
			' data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;Inline&quot;,&quot;href&quot;:&quot;./Template:Inline&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;5,678&quot;}},&quot;i&quot;:0}}]}"' +
		'>' +
		'<span about="#mwt1">Foo</span>',
	mixedFromData:
		'<span typeof="mw:Transclusion"' +
			' data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;Inline&quot;,&quot;href&quot;:&quot;./Template:Inline&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;5,678&quot;}},&quot;i&quot;:0}}]}"' +
		'></span>',
	mixedClipboard:
		'<span typeof="mw:Transclusion"' +
			' data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;Inline&quot;,&quot;href&quot;:&quot;./Template:Inline&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;5,678&quot;}},&quot;i&quot;:0}}]}"' +
			' data-ve-no-generated-contents="true"' +
		'>&nbsp;</span>' +
		'<span about="#mwt1" data-ve-ignore="true">Foo</span>',
	pairOne:
		'<p about="#mwt1" typeof="mw:Transclusion"' +
			' data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;echo&quot;,&quot;href&quot;:&quot;./Template:Echo&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;foo&quot;}},&quot;i&quot;:0}}]}" data-parsoid="1"' +
		'>foo</p>',
	pairTwo:
		'<p about="#mwt2" typeof="mw:Transclusion"' +
			' data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;echo&quot;,&quot;href&quot;:&quot;./Template:Echo&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;foo&quot;}},&quot;i&quot;:0}}]}" data-parsoid="2"' +
		'>foo</p>',
	pairFromData:
		'<span typeof="mw:Transclusion"' +
			' data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;echo&quot;,&quot;href&quot;:&quot;./Template:Echo&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;foo&quot;}},&quot;i&quot;:0}}]}"' +
		'></span>',
	pairClipboard:
		'<p about="#mwt1" typeof="mw:Transclusion"' +
			' data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;echo&quot;,&quot;href&quot;:&quot;./Template:Echo&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;foo&quot;}},&quot;i&quot;:0}}]}"' +
			' data-parsoid="1"' +
			' data-ve-no-generated-contents="true"' +
		'>foo</p>',
	meta: '<link rel="mw:PageProp/Category" href="./Category:Page" about="#mwt1" typeof="mw:Transclusion"' +
		' data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;Template:Echo&quot;,&quot;href&quot;:&quot;./Template:Echo&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;[[Category:Page]]\\n[[Category:Book]]&quot;}},&quot;i&quot;:0}}]}">' +
		'<span about="#mwt1" data-parsoid="{}">\n</span>' +
		'<link rel="mw:PageProp/Category" href="./Category:Book" about="#mwt1">',
	metaFromData:
		'<span typeof=\"mw:Transclusion\"' +
		' data-mw=\"{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;Template:Echo&quot;,&quot;href&quot;:&quot;./Template:Echo&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;' +
			'[[Category:Page]]\\n[[Category:Book]]&quot;}},&quot;i&quot;:0}}]}\"></span>',
	metaClipboard:
		'<span typeof=\"mw:Transclusion\"' +
		' data-mw=\"{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;Template:Echo&quot;,&quot;href&quot;:&quot;./Template:Echo&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;' +
			'[[Category:Page]]\\n[[Category:Book]]&quot;}},&quot;i&quot;:0}}]}\"' +
		' data-ve-no-generated-contents=\"true\">&nbsp;</span>'
};
ve.dm.mwExample.MWTransclusion.blockData = {
	type: 'mwTransclusionBlock',
	attributes: {
		mw: {
			parts: [
				{
					template: {
						target: {
							wt: 'Test',
							href: './Template:Test'
						},
						params: {
							1: {
								wt: 'Hello, world!'
							}
						},
						i: 0
					}
				}
			]
		},
		originalMw: '{"parts":[{"template":{"target":{"wt":"Test","href":"./Template:Test"},"params":{"1":{"wt":"Hello, world!"}},"i":0}}]}'
	}
};
ve.dm.mwExample.MWTransclusion.inlineData = {
	type: 'mwTransclusionInline',
	attributes: {
		mw: {
			parts: [
				{
					template: {
						target: {
							wt: 'Inline',
							href: './Template:Inline'
						},
						params: {
							1: {
								wt: '1,234'
							}
						},
						i: 0
					}
				}
			]
		},
		originalMw: '{"parts":[{"template":{"target":{"wt":"Inline","href":"./Template:Inline"},"params":{"1":{"wt":"1,234"}},"i":0}}]}'
	}
};
ve.dm.mwExample.MWTransclusion.mixedDataOpen = {
	type: 'mwTransclusionInline',
	attributes: {
		mw: {
			parts: [
				{
					template: {
						target: {
							wt: 'Inline',
							href: './Template:Inline'
						},
						params: {
							1: {
								wt: '5,678'
							}
						},
						i: 0
					}
				}
			]
		},
		originalMw: '{"parts":[{"template":{"target":{"wt":"Inline","href":"./Template:Inline"},"params":{"1":{"wt":"5,678"}},"i":0}}]}'
	}
};
ve.dm.mwExample.MWTransclusion.mixedDataClose = { type: '/mwTransclusionInline' };

ve.dm.mwExample.MWTransclusion.blockParamsHash = OO.getHash( [ ve.dm.MWTransclusionNode.static.getHashObject( ve.dm.mwExample.MWTransclusion.blockData ), undefined ] );
ve.dm.mwExample.MWTransclusion.blockStoreItems = {
	hash: ve.dm.mwExample.MWTransclusion.blockParamsHash,
	value: $( ve.dm.mwExample.MWTransclusion.blockOpen + ve.dm.mwExample.MWTransclusion.blockContent ).toArray()
};

ve.dm.mwExample.MWTransclusion.inlineParamsHash = OO.getHash( [ ve.dm.MWTransclusionNode.static.getHashObject( ve.dm.mwExample.MWTransclusion.inlineData ), undefined ] );
ve.dm.mwExample.MWTransclusion.inlineStoreItems = {
	hash: ve.dm.mwExample.MWTransclusion.inlineParamsHash,
	value: $( ve.dm.mwExample.MWTransclusion.inlineOpen + ve.dm.mwExample.MWTransclusion.inlineContent + ve.dm.mwExample.MWTransclusion.inlineClose ).toArray()
};

ve.dm.mwExample.MWTransclusion.mixedParamsHash = OO.getHash( [ ve.dm.MWTransclusionNode.static.getHashObject( ve.dm.mwExample.MWTransclusion.mixedDataOpen ), undefined ] );
ve.dm.mwExample.MWTransclusion.mixedStoreItems = {
	hash: ve.dm.mwExample.MWTransclusion.mixedParamsHash,
	value: $( ve.dm.mwExample.MWTransclusion.mixed ).toArray()
};

ve.dm.mwExample.MWInternalLink = {
	absoluteHref: ve.resolveUrl( '/wiki/Foo/Bar', ve.dm.example.base )
};

ve.dm.mwExample.MWInternalLink.absoluteOpen = '<a rel="mw:WikiLink" href="' + ve.dm.mwExample.MWInternalLink.absoluteHref + '">';
ve.dm.mwExample.MWInternalLink.absoluteData = {
	type: 'link/mwInternal',
	attributes: {
		title: 'Foo/Bar',
		origTitle: 'Foo/Bar',
		normalizedTitle: 'Foo/Bar',
		lookupTitle: 'Foo/Bar',
		hrefPrefix: ''
	}
};

ve.dm.mwExample.MWInternalSectionLink = {
	absoluteHref: ve.resolveUrl( '/wiki/Foo#Bar', ve.dm.example.base )
};

ve.dm.mwExample.MWInternalSectionLink.absoluteOpen = '<a rel="mw:WikiLink" href="' + ve.dm.mwExample.MWInternalSectionLink.absoluteHref + '">';
ve.dm.mwExample.MWInternalSectionLink.absoluteData = {
	type: 'link/mwInternal',
	attributes: {
		title: 'Foo#Bar',
		origTitle: 'Foo#Bar',
		normalizedTitle: 'Foo#Bar',
		lookupTitle: 'Foo',
		hrefPrefix: ''
	}
};

ve.dm.mwExample.MWBlockImage = {
	html:
		'<figure typeof="mw:Image/Thumb" class="mw-halign-right foobar">' +
			'<a href="Foo"><img src="' + ve.ce.minImgDataUri + '" width="1" height="2" resource="FooBar"></a>' +
			'<figcaption>abc</figcaption>' +
		'</figure>',
	data: [
		{
			type: 'mwBlockImage',
			attributes: {
				type: 'thumb',
				align: 'right',
				href: 'Foo',
				src: ve.ce.minImgDataUri,
				width: 1,
				height: 2,
				resource: 'FooBar',
				originalClasses: 'mw-halign-right foobar',
				unrecognizedClasses: [ 'foobar' ]
			}
		},
		{ type: 'mwImageCaption' },
		{ type: 'paragraph', internal: { generated: 'wrapper' } },
		'a', 'b', 'c',
		{ type: '/paragraph' },
		{ type: '/mwImageCaption' },
		{ type: '/mwBlockImage' }
	],
	storeItems: [
		{
			hash: '[{"height":2,"resource":"FooBar","type":"mwBlockImage","width":1},null]',
			value: 'Bar'
		}
	]
};

ve.dm.mwExample.MWInlineImage = {
	html:
		'<span typeof="mw:Image" class="foo mw-valign-text-top">' +
			'<a href="./File:Wiki.png">' +
				'<img resource="./File:Wiki.png" src="http://upload.wikimedia.org/wikipedia/en/b/bc/Wiki.png" height="155" width="135">' +
			'</a>' +
		'</span>',
	data: {
		type: 'mwInlineImage',
		attributes: {
			src: 'http://upload.wikimedia.org/wikipedia/en/b/bc/Wiki.png',
			href: './File:Wiki.png',
			width: 135,
			height: 155,
			isLinked: true,
			valign: 'text-top',
			resource: './File:Wiki.png',
			type: 'none',
			originalClasses: 'foo mw-valign-text-top',
			unrecognizedClasses: [ 'foo' ]
		}
	},
	storeItems: [
		{
			hash: '[{"height":155,"resource":"./File:Wiki.png","type":"mwInlineImage","width":135},null]',
			value: 'http://upload.wikimedia.org/wikipedia/en/b/bc/Wiki.png'
		}
	]
};

ve.dm.mwExample.mwNowikiAnnotation = {
	type: 'mwNowiki'
};

ve.dm.mwExample.mwNowiki = [
	{ type: 'paragraph' },
	'F', 'o', 'o',
	[ '[', [ ve.dm.mwExample.mwNowikiAnnotation ] ],
	[ '[', [ ve.dm.mwExample.mwNowikiAnnotation ] ],
	[ 'B', [ ve.dm.mwExample.mwNowikiAnnotation ] ],
	[ 'a', [ ve.dm.mwExample.mwNowikiAnnotation ] ],
	[ 'r', [ ve.dm.mwExample.mwNowikiAnnotation ] ],
	[ ']', [ ve.dm.mwExample.mwNowikiAnnotation ] ],
	[ ']', [ ve.dm.mwExample.mwNowikiAnnotation ] ],
	'B', 'a', 'z',
	{ type: '/paragraph' },
	{ type: 'internalList' },
	{ type: '/internalList' }
];

ve.dm.mwExample.mwNowikiHtml = '<body><p>Foo<span typeof="mw:Nowiki">[[Bar]]</span>Baz</p></body>';

ve.dm.mwExample.mwNowikiHtmlFromData = '<body><p>Foo[[Bar]]Baz</p></body>';

ve.dm.mwExample.withMeta = [
	{
		type: 'paragraph',
		internal: {
			generated: 'wrapper'
		}
	},
	{
		type: 'comment',
		attributes: {
			text: ' No content conversion '
		}
	},
	{ type: '/comment' },
	{ type: '/paragraph' },
	{
		type: 'mwAlienMeta',
		originalDomElements: $( '<meta property="mw:ThisIsAnAlien" />' ).toArray()
	},
	{ type: '/mwAlienMeta' },
	{ type: 'paragraph' },
	'F',
	'o',
	'o',
	{
		type: 'mwCategory',
		attributes: {
			hrefPrefix: './',
			category: 'Category:Bar',
			origCategory: 'Category:Bar',
			sortkey: '',
			origSortkey: ''
		}
	},
	{ type: '/mwCategory' },
	'B',
	'a',
	'r',
	{
		type: 'mwAlienMeta',
		originalDomElements: $( '<meta property="mw:foo" content="bar" />' ).toArray()
	},
	{ type: '/mwAlienMeta' },
	'B',
	'a',
	{
		type: 'comment',
		attributes: {
			text: ' inline '
		}
	},
	{ type: '/comment' },
	'z',
	{ type: '/paragraph' },
	{
		type: 'mwAlienMeta',
		originalDomElements: $( '<meta property="mw:bar" content="baz" />' ).toArray()
	},
	{ type: '/mwAlienMeta' },
	{
		type: 'paragraph',
		internal: {
			generated: 'wrapper'
		}
	},
	{
		type: 'comment',
		attributes: {
			text: 'barbaz'
		}
	},
	{ type: '/comment' },
	{ type: '/paragraph' },
	{
		type: 'mwCategory',
		attributes: {
			hrefPrefix: './',
			category: 'Category:Foo foo',
			origCategory: 'Category:Foo_foo',
			sortkey: 'Bar baz#quux',
			origSortkey: 'Bar baz%23quux'
		}
	},
	{ type: '/mwCategory' },
	{
		type: 'mwAlienMeta',
		originalDomElements: $( '<meta typeof="mw:Placeholder" data-parsoid="foobar" />' ).toArray()
	},
	{ type: '/mwAlienMeta' },
	{ type: 'internalList' },
	{ type: '/internalList' }
];

ve.dm.mwExample.withMetaPlainData = [
	{ type: 'paragraph' },
	'F',
	'o',
	'o',
	'B',
	'a',
	'r',
	'B',
	'a',
	'z',
	{ type: '/paragraph' },
	{ type: 'internalList' },
	{ type: '/internalList' }
];

ve.dm.mwExample.withMetaMetaData = [
	[
		{
			type: 'alienMeta',
			originalDomElements: $( '<!-- No content conversion -->' ).toArray()
		},
		{
			type: 'mwAlienMeta',
			originalDomElements: $( '<meta property="mw:ThisIsAnAlien" />' ).toArray()
		}
	],
	undefined,
	undefined,
	undefined,
	[
		{
			type: 'mwCategory',
			attributes: {
				hrefPrefix: './',
				category: 'Category:Bar',
				origCategory: 'Category:Bar',
				sortkey: '',
				origSortkey: ''
			}
		}
	],
	undefined,
	undefined,
	[
		{
			type: 'mwAlienMeta',
			originalDomElements: $( '<meta property="mw:foo" content="bar" />' ).toArray()
		}
	],
	undefined,
	[
		{
			type: 'alienMeta',
			originalDomElements: $( '<!-- inline -->' ).toArray()
		}
	],
	undefined,
	[
		{
			type: 'mwAlienMeta',
			originalDomElements: $( '<meta property="mw:bar" content="baz" />' ).toArray()
		},
		{
			type: 'comment',
			attributes: {
				text: 'barbaz'
			}
		},
		{
			type: 'mwCategory',
			attributes: {
				hrefPrefix: './',
				category: 'Category:Foo foo',
				origCategory: 'Category:Foo_foo',
				sortkey: 'Bar baz#quux',
				origSortkey: 'Bar baz%23quux'
			}
		},
		{
			type: 'mwAlienMeta',
			originalDomElements: $( '<meta typeof="mw:Placeholder" data-parsoid="foobar" />' ).toArray()
		}
	],
	undefined,
	undefined
];

ve.dm.mwExample.domToDataCases = {
	'adjacent annotations (data-parsoid)': {
		preserveAnnotationDomElements: true,
		body: '<b>a</b><b data-parsoid="1">b</b><b data-parsoid="2">c</b> ' +
			'<b>d</b><b>d</b>',
		data: [
			{ type: 'paragraph', internal: { generated: 'wrapper' } },
			[
				'a',
				[ {
					type: 'textStyle/bold',
					attributes: { nodeName: 'b' },
					originalDomElements: $( '<b>a</b>' ).toArray()
				} ]
			],
			[
				'b',
				[ {
					type: 'textStyle/bold',
					attributes: { nodeName: 'b' },
					originalDomElements: $( '<b data-parsoid="1">b</b>' ).toArray()
				} ]
			],
			[
				'c',
				[ {
					type: 'textStyle/bold',
					attributes: { nodeName: 'b' },
					originalDomElements: $( '<b data-parsoid="2">c</b>' ).toArray()
				} ]
			],
			' ',
			[
				'd',
				[ {
					type: 'textStyle/bold',
					attributes: { nodeName: 'b' },
					originalDomElements: $( '<b>a</b>' ).toArray()
				} ]
			],
			[
				'd',
				[ {
					type: 'textStyle/bold',
					attributes: { nodeName: 'b' },
					originalDomElements: $( '<b>a</b>' ).toArray()
				} ]
			],
			{ type: '/paragraph' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		],
		modify: function ( model ) {
			var data = [ 'x', [ ve.dm.example.bold ] ],
				linearData = ve.dm.example.preprocessAnnotations( [ data ], model.getStore() );
			model.data.data.splice( 3, 0, linearData.data[ 0 ] );
		},
		normalizedBody: '<b>a</b><b data-parsoid="1">bx</b><b data-parsoid="2">c</b> ' +
			'<b>dd</b>',
		fromDataBody: '<b>a</b><b data-parsoid="1">bx</b><b data-parsoid="2">c</b> ' +
			'<b>dd</b>'
	},
	'adjacent annotations (Parsoid IDs)': {
		preserveAnnotationDomElements: true,
		body: '<b>a</b><b id="mwAB">b</b><b id="mwCD">c</b> ' +
			'<b>d</b><b>d</b>',
		data: [
			{ type: 'paragraph', internal: { generated: 'wrapper' } },
			[
				'a',
				[ {
					type: 'textStyle/bold',
					attributes: { nodeName: 'b' },
					originalDomElements: $( '<b>a</b>' ).toArray()
				} ]
			],
			[
				'b',
				[ {
					type: 'textStyle/bold',
					attributes: { nodeName: 'b' },
					originalDomElements: $( '<b id="mwAB">b</b>' ).toArray()
				} ]
			],
			[
				'c',
				[ {
					type: 'textStyle/bold',
					attributes: { nodeName: 'b' },
					originalDomElements: $( '<b id="mwCD">c</b>' ).toArray()
				} ]
			],
			' ',
			[
				'd',
				[ {
					type: 'textStyle/bold',
					attributes: { nodeName: 'b' },
					originalDomElements: $( '<b>a</b>' ).toArray()
				} ]
			],
			[
				'd',
				[ {
					type: 'textStyle/bold',
					attributes: { nodeName: 'b' },
					originalDomElements: $( '<b>a</b>' ).toArray()
				} ]
			],
			{ type: '/paragraph' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		],
		modify: function ( model ) {
			var data = [ 'x', [ ve.dm.example.bold ] ],
				linearData = ve.dm.example.preprocessAnnotations( [ data ], model.getStore() );
			model.data.data.splice( 3, 0, linearData.data[ 0 ] );
		},
		normalizedBody: '<b>a</b><b id="mwAB">bx</b><b id="mwCD">c</b> ' +
			'<b>dd</b>',
		fromDataBody: '<b>a</b><b id="mwAB">bx</b><b id="mwCD">c</b> ' +
			'<b>dd</b>'
	},
	mwImage: {
		body: '<p>' + ve.dm.mwExample.MWInlineImage.html + '</p>',
		data: [
			{ type: 'paragraph' },
			ve.dm.mwExample.MWInlineImage.data,
			{ type: '/mwInlineImage' },
			{ type: '/paragraph' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		]
	},
	'mwHeading and mwPreformatted nodes': {
		body: '<h2>Foo</h2><pre>Bar</pre>',
		data: [
			{
				type: 'mwHeading',
				attributes: {
					level: 2
				}
			},
			'F', 'o', 'o',
			{ type: '/mwHeading' },
			{ type: 'mwPreformatted' },
			'B', 'a', 'r',
			{ type: '/mwPreformatted' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		]
	},
	'mwTable with duplicate class attributes': {
		body: '<table class="wikitable sortable wikitable"><tr><td>Foo</td></tr></table>',
		data: [
			{
				type: 'mwTable',
				attributes: {
					wikitable: true,
					sortable: true,
					originalClasses: 'wikitable sortable wikitable',
					unrecognizedClasses: []
				}
			},
			{ type: 'tableSection', attributes: { style: 'body' } },
			{ type: 'tableRow' },
			{ type: 'tableCell', attributes: { style: 'data' } },
			{ type: 'paragraph', internal: { generated: 'wrapper' } },
			'F', 'o', 'o',
			{ type: '/paragraph' },
			{ type: '/tableCell' },
			{ type: '/tableRow' },
			{ type: '/tableSection' },
			{ type: '/mwTable' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		]
	},
	'mw:Transclusion (block level)': {
		body: ve.dm.mwExample.MWTransclusion.blockOpen + ve.dm.mwExample.MWTransclusion.blockContent,
		data: [
			ve.dm.mwExample.MWTransclusion.blockData,
			{ type: '/mwTransclusionBlock' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		],
		storeItems: [
			ve.dm.mwExample.MWTransclusion.blockStoreItems
		],
		normalizedBody: ve.dm.mwExample.MWTransclusion.blockOpen + ve.dm.mwExample.MWTransclusion.blockContent,
		fromDataBody: ve.dm.mwExample.MWTransclusion.blockOpenFromData,
		clipboardBody: ve.dm.mwExample.MWTransclusion.blockOpenClipboard + ve.dm.mwExample.MWTransclusion.blockContentClipboard
	},
	'mw:Transclusion (block level - modified)': {
		body: ve.dm.mwExample.MWTransclusion.blockOpen + ve.dm.mwExample.MWTransclusion.blockContent,
		data: [
			ve.dm.mwExample.MWTransclusion.blockData,
			{ type: '/mwTransclusionBlock' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		],
		storeItems: [
			ve.dm.mwExample.MWTransclusion.blockStoreItems
		],
		modify: function ( model ) {
			model.data.data[ 0 ].attributes.mw.parts[ 0 ].template.params[ '1' ].wt = 'Hello, globe!';
		},
		normalizedBody: ve.dm.mwExample.MWTransclusion.blockOpenModified,
		fromDataBody: ve.dm.mwExample.MWTransclusion.blockOpenFromDataModified,
		clipboardBody: ve.dm.mwExample.MWTransclusion.blockOpenModifiedClipboard
	},
	'mw:Transclusion (inline)': {
		body: ve.dm.mwExample.MWTransclusion.inlineOpen + ve.dm.mwExample.MWTransclusion.inlineContent + ve.dm.mwExample.MWTransclusion.inlineClose,
		data: [
			{ type: 'paragraph', internal: { generated: 'wrapper' } },
			ve.dm.mwExample.MWTransclusion.inlineData,
			{ type: '/mwTransclusionInline' },
			{ type: '/paragraph' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		],
		storeItems: [
			ve.dm.mwExample.MWTransclusion.inlineStoreItems
		],
		normalizedBody: ve.dm.mwExample.MWTransclusion.inlineOpen + ve.dm.mwExample.MWTransclusion.inlineContent + ve.dm.mwExample.MWTransclusion.inlineClose,
		fromDataBody: ve.dm.mwExample.MWTransclusion.inlineOpenFromData + ve.dm.mwExample.MWTransclusion.inlineClose,
		clipboardBody: ve.dm.mwExample.MWTransclusion.inlineOpenClipboard + ve.dm.mwExample.MWTransclusion.inlineContent + ve.dm.mwExample.MWTransclusion.inlineClose
	},
	'mw:Transclusion (inline - modified)': {
		body: ve.dm.mwExample.MWTransclusion.inlineOpen + ve.dm.mwExample.MWTransclusion.inlineContent + ve.dm.mwExample.MWTransclusion.inlineClose,
		data: [
			{ type: 'paragraph', internal: { generated: 'wrapper' } },
			ve.dm.mwExample.MWTransclusion.inlineData,
			{ type: '/mwTransclusionInline' },
			{ type: '/paragraph' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		],
		storeItems: [
			ve.dm.mwExample.MWTransclusion.inlineStoreItems
		],
		modify: function ( model ) {
			model.data.data[ 1 ].attributes.mw.parts[ 0 ].template.params[ '1' ].wt = '5,678';
		},
		normalizedBody: ve.dm.mwExample.MWTransclusion.inlineOpenModified + ve.dm.mwExample.MWTransclusion.inlineClose,
		fromDataBody: ve.dm.mwExample.MWTransclusion.inlineOpenFromDataModified + ve.dm.mwExample.MWTransclusion.inlineClose,
		clipboardBody: ve.dm.mwExample.MWTransclusion.inlineOpenModifiedClipboard + ve.dm.mwExample.MWTransclusion.inlineClose
	},
	'two mw:Transclusion nodes with identical params but different htmlAttributes': {
		body: ve.dm.mwExample.MWTransclusion.pairOne + ve.dm.mwExample.MWTransclusion.pairTwo,
		fromDataBody: ve.dm.mwExample.MWTransclusion.pairFromData + ve.dm.mwExample.MWTransclusion.pairFromData,
		clipboardBody: ve.dm.mwExample.MWTransclusion.pairClipboard + ve.dm.mwExample.MWTransclusion.pairClipboard,
		data: [
			{
				type: 'mwTransclusionBlock',
				attributes: {
					mw: {
						parts: [
							{
								template: {
									target: {
										wt: 'echo',
										href: './Template:Echo'
									},
									params: {
										1: {
											wt: 'foo'
										}
									},
									i: 0
								}
							}
						]
					},
					originalMw: '{"parts":[{"template":{"target":{"wt":"echo","href":"./Template:Echo"},"params":{"1":{"wt":"foo"}},"i":0}}]}'
				}
			},
			{ type: '/mwTransclusionBlock' },
			{
				type: 'mwTransclusionBlock',
				attributes: {
					mw: {
						parts: [
							{
								template: {
									target: {
										wt: 'echo',
										href: './Template:Echo'
									},
									params: {
										1: {
											wt: 'foo'
										}
									},
									i: 0
								}
							}
						]
					},
					originalMw: '{"parts":[{"template":{"target":{"wt":"echo","href":"./Template:Echo"},"params":{"1":{"wt":"foo"}},"i":0}}]}'
				}
			},
			{ type: '/mwTransclusionBlock' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		],
		storeItems: [
			{
				hash: '[{"mw":{"parts":[{"template":{"i":0,"params":{"1":{"wt":"foo"}},"target":{"href":"./Template:Echo","wt":"echo"}}}]},"type":"mwTransclusionBlock"},null]',
				value: $( '<p about="#mwt1" typeof="mw:Transclusion" data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;echo&quot;,&quot;href&quot;:&quot;./Template:Echo&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;foo&quot;}},&quot;i&quot;:0}}]}" data-parsoid="1">foo</p>' ).toArray()
			}
		]
	},
	'mw:Transclusion containing only meta data': {
		body: ve.dm.mwExample.MWTransclusion.meta,
		fromDataBody: ve.dm.mwExample.MWTransclusion.metaFromData,
		clipboardBody: ve.dm.mwExample.MWTransclusion.metaClipboard,
		data: [
			{
				internal: { generated: 'wrapper' },
				type: 'paragraph'
			},
			{
				type: 'mwTransclusionInline',
				attributes: {
					mw: {
						parts: [ {
							template: {
								target: {
									wt: 'Template:Echo',
									href: './Template:Echo'
								},
								params: {
									1: { wt: '[[Category:Page]]\n[[Category:Book]]' }
								},
								i: 0
							}
						} ]
					},
					originalMw: '{\"parts\":[{\"template\":{\"target\":{\"wt\":\"Template:Echo\",\"href\":\"./Template:Echo\"},\"params\":{\"1\":{\"wt\":\"[[Category:Page]]\\n[[Category:Book]]\"}},\"i\":0}}]}'
				}
			},
			{ type: '/mwTransclusionInline' },
			{ type: '/paragraph' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		]
	},
	'mw:Transclusion which is also a language annotation': {
		body: '<span dir="ltr" about="#mwt1" typeof="mw:Transclusion" data-mw="{}">content</span>',
		data: [
			{ type: 'paragraph', internal: { generated: 'wrapper' } },
			{
				type: 'mwTransclusionInline',
				attributes: {
					mw: {},
					originalMw: '{}'
				},
				originalDomElements: $( '<span dir="ltr" about="#mwt1" typeof="mw:Transclusion" data-mw="{}">content</span>' ).toArray()
			},
			{ type: '/mwTransclusionInline' },
			{ type: '/paragraph' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		],
		clipboardBody: '<span dir="ltr" about="#mwt1" typeof="mw:Transclusion" data-mw="{}" data-ve-no-generated-contents="true">content</span>'
	},
	'mw:AlienBlockExtension': {
		body:
			'<div about="#mwt1" typeof="mw:Extension/syntaxhighlight"' +
				' data-mw="{&quot;name&quot;:&quot;syntaxhighlight&quot;,&quot;attrs&quot;:{&quot;lang&quot;:&quot;php&quot;},&quot;body&quot;:{&quot;extsrc&quot;:&quot;\\n$foo = bar;\\n&quot;}}"' +
				' data-parsoid="1"' +
			'>' +
				'<div><span>Rendering</span></div>' +
			'</div>',
		normalizedBody:
			'<div typeof="mw:Extension/syntaxhighlight"' +
				' data-mw="{&quot;name&quot;:&quot;syntaxhighlight&quot;,&quot;attrs&quot;:{&quot;lang&quot;:&quot;php5&quot;},&quot;body&quot;:{&quot;extsrc&quot;:&quot;\\n$foo = bar;\\n&quot;}}"' +
				' about="#mwt1" data-parsoid="1"' +
			'>' +
			'</div>',
		data: [
			{
				type: 'mwAlienBlockExtension',
				attributes: {
					mw: {
						name: 'syntaxhighlight',
						attrs: {
							lang: 'php'
						},
						body: {
							extsrc: '\n$foo = bar;\n'
						}
					},
					originalMw: '{"name":"syntaxhighlight","attrs":{"lang":"php"},"body":{"extsrc":"\\n$foo = bar;\\n"}}'
				},
				originalDomElements: $( '<div about="#mwt1" data-parsoid="1"></div>' ).toArray()
			},
			{ type: '/mwAlienBlockExtension' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		],
		modify: function ( model ) {
			model.data.data[ 0 ].attributes.mw.attrs.lang = 'php5';
		}
	},
	'mw:AlienInlineExtension': {
		body:
			'<p>' +
				'<img src="' + ve.ce.minImgDataUri + '" width="100" height="20" alt="Bar" typeof="mw:Extension/score"' +
					' data-mw="{&quot;name&quot;:&quot;score&quot;,&quot;attrs&quot;:{},&quot;body&quot;:{&quot;extsrc&quot;:&quot;\\\\relative c&#39; { e d c d e e e }&quot;}}" ' +
					' data-parsoid="1" about="#mwt1" />' +
			'</p>',
		normalizedBody:
			'<p>' +
				'<span typeof="mw:Extension/score"' +
					' data-mw="{&quot;name&quot;:&quot;score&quot;,&quot;attrs&quot;:{},&quot;body&quot;:{&quot;extsrc&quot;:&quot;\\\\relative c&#39; { d d d e e e }&quot;}}" ' +
					' src="' + ve.ce.minImgDataUri + '" width="100" height="20" alt="Bar" data-parsoid="1" about="#mwt1" />' +
			'</p>',
		data: [
			{ type: 'paragraph' },
			{
				type: 'mwAlienInlineExtension',
				attributes: {
					mw: {
						name: 'score',
						attrs: {},
						body: {
							extsrc: '\\relative c\' { e d c d e e e }'
						}
					},
					originalMw: '{"name":"score","attrs":{},"body":{"extsrc":"\\\\relative c\' { e d c d e e e }"}}'
				},
				originalDomElements: $( '<img src="' + ve.ce.minImgDataUri + '" width="100" height="20" alt="Bar" about="#mwt1" data-parsoid="1"></img>' ).toArray()
			},
			{ type: '/mwAlienInlineExtension' },
			{ type: '/paragraph' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		],
		modify: function ( model ) {
			model.data.data[ 1 ].attributes.mw.body.extsrc = '\\relative c\' { d d d e e e }';
		}
	},
	'internal link with ./ and ../': {
		body: '<p><a rel="mw:WikiLink" href="./../../../Foo/Bar">Foo</a></p>',
		head: '<base href="http://example.com/one/two/three/four/five" />',
		data: [
			{ type: 'paragraph' },
			[
				'F',
				[ {
					type: 'link/mwInternal',
					attributes: {
						title: 'Foo/Bar',
						origTitle: 'Foo/Bar',
						normalizedTitle: 'Foo/Bar',
						lookupTitle: 'Foo/Bar',
						hrefPrefix: './../../../'
					}
				} ]
			],
			[
				'o',
				[ {
					type: 'link/mwInternal',
					attributes: {
						title: 'Foo/Bar',
						origTitle: 'Foo/Bar',
						normalizedTitle: 'Foo/Bar',
						lookupTitle: 'Foo/Bar',
						hrefPrefix: './../../../'
					}
				} ]
			],
			[
				'o',
				[ {
					type: 'link/mwInternal',
					attributes: {
						title: 'Foo/Bar',
						origTitle: 'Foo/Bar',
						normalizedTitle: 'Foo/Bar',
						lookupTitle: 'Foo/Bar',
						hrefPrefix: './../../../'
					}
				} ]
			],
			{ type: '/paragraph' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		]
	},
	'internal link with absolute path': {
		body: '<p>' + ve.dm.mwExample.MWInternalLink.absoluteOpen + 'Foo</a></p>',
		data: [
			{ type: 'paragraph' },
			[
				'F',
				[ ve.dm.mwExample.MWInternalLink.absoluteData ]
			],
			[
				'o',
				[ ve.dm.mwExample.MWInternalLink.absoluteData ]
			],
			[
				'o',
				[ ve.dm.mwExample.MWInternalLink.absoluteData ]
			],
			{ type: '/paragraph' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		],
		normalizedBody: '<p><a rel="mw:WikiLink" href="Foo/Bar">Foo</a></p>',
		mwConfig: {
			wgArticlePath: '/wiki/$1'
		}
	},
	'internal link with absolute path and section': {
		body: '<p>' + ve.dm.mwExample.MWInternalSectionLink.absoluteOpen + 'Foo</a></p>',
		data: [
			{ type: 'paragraph' },
			[
				'F',
				[ ve.dm.mwExample.MWInternalSectionLink.absoluteData ]
			],
			[
				'o',
				[ ve.dm.mwExample.MWInternalSectionLink.absoluteData ]
			],
			[
				'o',
				[ ve.dm.mwExample.MWInternalSectionLink.absoluteData ]
			],
			{ type: '/paragraph' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		],
		normalizedBody: '<p><a rel="mw:WikiLink" href="Foo#Bar">Foo</a></p>',
		mwConfig: {
			wgArticlePath: '/wiki/$1'
		}
	},
	'internal link with href set to ./': {
		body: '<p><a rel="mw:WikiLink" href="./">x</a></p>',
		head: '<base href="http://example.com" />',
		data: [
			{ type: 'paragraph' },
			[
				'x',
				[ {
					type: 'link/mwInternal',
					attributes: {
						title: '',
						origTitle: '',
						normalizedTitle: '',
						lookupTitle: '',
						hrefPrefix: './'
					}
				} ]
			],
			{ type: '/paragraph' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		]
	},
	'numbered external link (empty mw:Extlink)': {
		body: '<p>Foo<a rel="mw:ExtLink" href="http://www.example.com"></a>Bar</p>',
		data: [
			{ type: 'paragraph' },
			'F', 'o', 'o',
			{
				type: 'link/mwNumberedExternal',
				attributes: {
					href: 'http://www.example.com'
				}
			},
			{ type: '/link/mwNumberedExternal' },
			'B', 'a', 'r',
			{ type: '/paragraph' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		]
	},
	'URL link': {
		body: '<p><a rel="mw:ExtLink" href="http://www.mediawiki.org/">mw</a></p>',
		data: [
			{ type: 'paragraph' },
			[
				'm',
				[ {
					type: 'link/mwExternal',
					attributes: {
						href: 'http://www.mediawiki.org/',
						rel: 'mw:ExtLink'
					}
				} ]
			],
			[
				'w',
				[ {
					type: 'link/mwExternal',
					attributes: {
						href: 'http://www.mediawiki.org/',
						rel: 'mw:ExtLink'
					}
				} ]
			],
			{ type: '/paragraph' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		]
	},
	'whitespace preservation with wrapped comments and language links': {
		body: 'Foo\n' +
			'<link rel="mw:PageProp/Language" href="http://de.wikipedia.org/wiki/Foo">\n' +
			'<link rel="mw:PageProp/Language" href="http://fr.wikipedia.org/wiki/Foo">',
		data: [
			{
				type: 'paragraph',
				internal: {
					generated: 'wrapper',
					whitespace: [ undefined, undefined, undefined, '\n' ]
				}
			},
			'F',
			'o',
			'o',
			{ type: '/paragraph' },
			{
				type: 'mwLanguage',
				attributes: {
					href: 'http://de.wikipedia.org/wiki/Foo'
				},
				internal: { whitespace: [ '\n', undefined, undefined, '\n' ] }
			},
			{ type: '/mwLanguage' },
			{
				type: 'mwLanguage',
				attributes: {
					href: 'http://fr.wikipedia.org/wiki/Foo'
				},
				internal: { whitespace: [ '\n' ] }
			},
			{ type: '/mwLanguage' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		]
	},
	'document with meta elements': {
		body: '<!-- No content conversion --><meta property="mw:ThisIsAnAlien" /><p>Foo' +
			'<link rel="mw:PageProp/Category" href="./Category:Bar" />Bar' +
			'<meta property="mw:foo" content="bar" />Ba<!-- inline -->z</p>' +
			'<meta property="mw:bar" content="baz" /><!--barbaz-->' +
			'<link rel="mw:PageProp/Category" href="./Category:Foo_foo#Bar baz%23quux" />' +
			'<meta typeof="mw:Placeholder" data-parsoid="foobar" />',
		clipboardBody: '<span rel="ve:Comment" data-ve-comment=" No content conversion ">&nbsp;</span><meta property="mw:ThisIsAnAlien" /><p>Foo' +
			'<link rel="mw:PageProp/Category" href="./Category:Bar" />Bar' +
			'<meta property="mw:foo" content="bar" />Ba<span rel="ve:Comment" data-ve-comment=" inline ">&nbsp;</span>z</p>' +
			'<meta property="mw:bar" content="baz" /><span rel="ve:Comment" data-ve-comment="barbaz">&nbsp;</span>' +
			'<link rel="mw:PageProp/Category" href="./Category:Foo_foo#Bar baz%23quux" />' +
			'<meta typeof="mw:Placeholder" data-parsoid="foobar" />',
		head: '<base href="http://example.com" />',
		data: ve.dm.mwExample.withMeta
	},
	'RDFa types spread across two attributes, about grouping is forced': {
		body: ve.dm.mwExample.MWTransclusion.mixed,
		fromDataBody: ve.dm.mwExample.MWTransclusion.mixedFromData,
		clipboardBody: ve.dm.mwExample.MWTransclusion.mixedClipboard,
		data: [
			{ type: 'paragraph', internal: { generated: 'wrapper' } },
			ve.dm.mwExample.MWTransclusion.mixedDataOpen,
			ve.dm.mwExample.MWTransclusion.mixedDataClose,
			{ type: '/paragraph' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		],
		storeItems: [
			ve.dm.mwExample.MWTransclusion.mixedStoreItems
		]
	},
	'mw:Entity': {
		body: '<p>a<span typeof="mw:Entity">¢</span>b<span typeof="mw:Entity">¥</span><span typeof="mw:Entity">™</span></p>',
		data: [
			{ type: 'paragraph' },
			'a',
			{
				type: 'mwEntity',
				attributes: { character: '¢' }
			},
			{ type: '/mwEntity' },
			'b',
			{
				type: 'mwEntity',
				attributes: { character: '¥' }
			},
			{ type: '/mwEntity' },
			{
				type: 'mwEntity',
				attributes: { character: '™' }
			},
			{ type: '/mwEntity' },
			{ type: '/paragraph' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		]
	},
	'wrapping with mw:Entity': {
		body: 'a<span typeof="mw:Entity">¢</span>b<span typeof="mw:Entity">¥</span><span typeof="mw:Entity">™</span>',
		data: [
			{ type: 'paragraph', internal: { generated: 'wrapper' } },
			'a',
			{
				type: 'mwEntity',
				attributes: { character: '¢' }
			},
			{ type: '/mwEntity' },
			'b',
			{
				type: 'mwEntity',
				attributes: { character: '¥' }
			},
			{ type: '/mwEntity' },
			{
				type: 'mwEntity',
				attributes: { character: '™' }
			},
			{ type: '/mwEntity' },
			{ type: '/paragraph' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		]
	},
	'whitespace preservation with mw:Entity': {
		body: '<p> a  <span typeof="mw:Entity"> </span>   b    <span typeof="mw:Entity">¥</span>\t<span typeof="mw:Entity">™</span></p>',
		data: [
			{ type: 'paragraph', internal: { whitespace: [ undefined, ' ' ] } },
			'a',
			' ',
			' ',
			{
				type: 'mwEntity',
				attributes: { character: ' ' }
			},
			{ type: '/mwEntity' },
			' ',
			' ',
			' ',
			'b',
			' ',
			' ',
			' ',
			' ',
			{
				type: 'mwEntity',
				attributes: { character: '¥' }
			},
			{ type: '/mwEntity' },
			'\t',
			{
				type: 'mwEntity',
				attributes: { character: '™' }
			},
			{ type: '/mwEntity' },
			{ type: '/paragraph' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		]
	},
	'category default sort key': {
		body: '<meta property="mw:PageProp/categorydefaultsort" content="foo">',
		data: [
			{
				type: 'mwDefaultSort',
				attributes: {
					content: 'foo'
				}
			},
			{ type: '/mwDefaultSort' },
			{ type: 'paragraph', internal: { generated: 'empty' } },
			{ type: '/paragraph' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		]
	},
	'thumb image': {
		body: ve.dm.mwExample.MWBlockImage.html,
		data: ve.dm.mwExample.MWBlockImage.data.concat( [
			{ type: 'internalList' },
			{ type: '/internalList' }
		] )
	},
	'attribute preservation does not crash due to text node split': {
		body:
			'<figure typeof="mw:Image/Thumb" data-parsoid="{}">' +
				'<a href="Foo" data-parsoid="{}">' +
					'<img src="' + ve.ce.minImgDataUri + '" width="1" height="2" resource="FooBar" data-parsoid="{}">' +
				'</a>' +
				'<figcaption data-parsoid="{}">' +
				' foo <a rel="mw:WikiLink" href="./Bar" data-parsoid="{}">bar</a> baz' +
				'</figcaption>' +
			'</figure>',
		fromDataBody:
			'<figure typeof="mw:Image/Thumb">' +
				'<a href="Foo">' +
					'<img src="' + ve.ce.minImgDataUri + '" width="1" height="2" resource="FooBar">' +
				'</a>' +
				'<figcaption>' +
				' foo <a rel="mw:WikiLink" href="./Bar">bar</a> baz' +
				'</figcaption>' +
			'</figure>',
		head: '<base href="http://example.com" />',
		data: [
			{
				type: 'mwBlockImage',
				attributes: {
					type: 'thumb',
					align: 'default',
					href: 'Foo',
					src: ve.ce.minImgDataUri,
					width: 1,
					height: 2,
					resource: 'FooBar'
				}
			},
			{ type: 'mwImageCaption', internal: { whitespace: [ undefined, ' ' ] } },
			{ type: 'paragraph', internal: { generated: 'wrapper', whitespace: [ ' ' ] } },
			'f', 'o', 'o', ' ',
			[
				'b',
				[ {
					type: 'link/mwInternal',
					attributes: {
						title: 'Bar',
						origTitle: 'Bar',
						normalizedTitle: 'Bar',
						lookupTitle: 'Bar',
						hrefPrefix: './'
					}
				} ]
			],
			[
				'a',
				[ {
					type: 'link/mwInternal',
					attributes: {
						title: 'Bar',
						origTitle: 'Bar',
						normalizedTitle: 'Bar',
						lookupTitle: 'Bar',
						hrefPrefix: './'
					}
				} ]
			],
			[
				'r',
				[ {
					type: 'link/mwInternal',
					attributes: {
						title: 'Bar',
						origTitle: 'Bar',
						normalizedTitle: 'Bar',
						lookupTitle: 'Bar',
						hrefPrefix: './'
					}
				} ]
			],
			' ', 'b', 'a', 'z',
			{ type: '/paragraph' },
			{ type: '/mwImageCaption' },
			{ type: '/mwBlockImage' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		]
	},
	'mw:Nowiki': {
		body: ve.dm.mwExample.mwNowikiHtml,
		data: ve.dm.mwExample.mwNowiki,
		fromDataBody: ve.dm.mwExample.mwNowikiHtmlFromData
	},
	'mw:Nowiki unwraps when text modified': {
		data: ve.dm.mwExample.mwNowiki,
		modify: function ( model ) {
			model.data.data[ 7 ][ 0 ] = 'z';
		},
		normalizedBody: '<p>Foo[[Bzr]]Baz</p>'
	},
	'mw:Nowiki unwraps when annotations modified': {
		data: ve.dm.mwExample.mwNowiki,
		modify: function ( model ) {
			model.data.data[ 7 ][ 1 ].push( model.getStore().index( ve.dm.example.createAnnotation( ve.dm.example.bold ) ) );
		},
		normalizedBody: '<p>Foo[[B<b>a</b>r]]Baz</p>'
	},
	'mwHeading with no content': {
		data: [
			{ type: 'mwHeading', attributes: { level: 1 } },
			{ type: '/mwHeading' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		],
		normalizedBody: '<p></p>'
	},
	'mwHeading with whitespace content': {
		data: [
			{ type: 'mwHeading', attributes: { level: 2 } },
			' ', ' ', '\t', ' ',
			{ type: '/mwHeading' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		],
		normalizedBody: '<p>  \t </p>'
	},
	'mwHeading containing metadata': {
		data: [
			{ type: 'mwHeading', attributes: { level: 3 } },
			{ type: 'alienMeta', originalDomElements: $( '<meta />' ).toArray() },
			{ type: '/alienMeta' },
			{ type: '/mwHeading' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		],
		normalizedBody: '<p><meta /></p>'
	},
	'mwHeading containing alienated text': {
		data: [
			{
				type: 'mwHeading',
				attributes: { level: 4 }
			},
			{ type: 'alienInline', originalDomElements: $( '<span rel="ve:Alien">Alien</span>' ).toArray() },
			{ type: '/alienInline' },
			{ type: '/mwHeading' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		],
		body: '<h4><span rel="ve:Alien">Alien</span></h4>'
	},
	'existing empty mwHeading is not converted to paragraph': {
		data: [
			{
				type: 'mwHeading',
				attributes: {
					level: 5,
					noconvert: true
				}
			},
			{ type: '/mwHeading' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		],
		body: '<h5></h5>'
	},
	'adding whitespace to existing empty mwHeading does not convert to paragraph': {
		data: [
			{
				type: 'mwHeading',
				attributes: {
					level: 6,
					noconvert: true
				}
			},
			{ type: '/mwHeading' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		],
		modify: function ( doc ) {
			doc.data.data.splice( 1, 0, ' ' );
		},
		body: '<h6></h6>',
		normalizedBody: '<h6> </h6>'
	},
	'emptying existing meta-only mwHeading does not convert to paragraph': {
		data: [
			{
				type: 'mwHeading',
				attributes: {
					level: 1,
					noconvert: true
				}
			},
			{ type: 'alienMeta', originalDomElements: $( '<meta />' ).toArray() },
			{ type: '/alienMeta' },
			{ type: '/mwHeading' },
			{ type: 'internalList' },
			{ type: '/internalList' }
		],
		modify: function ( doc ) {
			doc.metadata.data[ 1 ].splice( 0, 1 );
		},
		normalizedBody: '<h1></h1>'
	},
	'Plain external links (e.g. on paste) are converted to link/mwExternal': {
		body: '<a href="http://www.mediawiki.org/">ab</a>',
		data: [
			{
				type: 'paragraph',
				internal: {
					generated: 'wrapper'
				}
			},
			[
				'a',
				[ {
					type: 'link/mwExternal',
					attributes: {
						href: 'http://www.mediawiki.org/'
					}
				} ]
			],
			[
				'b',
				[ {
					type: 'link/mwExternal',
					attributes: {
						href: 'http://www.mediawiki.org/'
					}
				} ]
			],
			{
				type: '/paragraph'
			},
			{
				type: 'internalList'
			},
			{
				type: '/internalList'
			}
		],
		normalizedBody: '<a href="http://www.mediawiki.org/" rel="mw:ExtLink">ab</a>'
	},
	'Plain internal links (e.g. on paste) are converted to link/mwInternal': {
		body: '<a href="' + ve.dm.mwExample.MWInternalLink.absoluteHref + '">ab</a>',
		data: [
			{
				type: 'paragraph',
				internal: {
					generated: 'wrapper'
				}
			},
			[
				'a',
				[ {
					type: 'link/mwInternal',
					attributes: {
						title: 'Foo/Bar',
						normalizedTitle: 'Foo/Bar',
						lookupTitle: 'Foo/Bar'
					}
				} ]
			],
			[
				'b',
				[ {
					type: 'link/mwInternal',
					attributes: {
						title: 'Foo/Bar',
						normalizedTitle: 'Foo/Bar',
						lookupTitle: 'Foo/Bar'
					}
				} ]
			],
			{
				type: '/paragraph'
			},
			{
				type: 'internalList'
			},
			{
				type: '/internalList'
			}
		],
		normalizedBody: '<a href="Foo/Bar" rel="mw:WikiLink">ab</a>',
		mwConfig: {
			wgArticlePath: '/wiki/$1'
		}
	}
};
