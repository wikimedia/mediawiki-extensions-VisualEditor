/*!
 * VisualEditor DataModel MWTransclusionNode tests.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

QUnit.module( 've.dm.MWTransclusionNode' );

QUnit.test.each( 'getWikitext', {
		'mix of numbered and named parameters': {
			mw: {
				target: { wt: 'foo' },
				params: {
					1: { wt: 'bar' },
					baz: { wt: 'quux' }
				}
			},
			wikitext: '{{foo|1=bar|baz=quux}}'
		},
		'parameter with self-closing nowiki': {
			mw: {
				target: { wt: 'foo' },
				params: {
					bar: { wt: 'l\'<nowiki />\'\'\'Étranger\'\'\'' }
				}
			},
			wikitext: '{{foo|bar=l\'<nowiki />\'\'\'Étranger\'\'\'}}'
		},
		'parameter with self-closing nowiki without space': {
			mw: {
				target: { wt: 'foo' },
				params: {
					bar: { wt: 'l\'<nowiki/>\'\'\'Étranger\'\'\'' }
				}
			},
			wikitext: '{{foo|bar=l\'<nowiki/>\'\'\'Étranger\'\'\'}}'
		},
		'parameter with spanning-nowiki': {
			mw: {
				target: { wt: 'foo' },
				params: {
					bar: { wt: 'You should use <nowiki>\'\'\'</nowiki> to make things bold.' }
				}
			},
			wikitext: '{{foo|bar=You should use <nowiki>\'\'\'</nowiki> to make things bold.}}'
		},
		'parameter with spanning-nowiki and nested transclusion': {
			mw: {
				target: { wt: 'foo' },
				params: {
					bar: { wt: 'You should try using <nowiki>{{ping|foo=bar|2=1}}</nowiki> as a transclusion!' }
				}
			},
			wikitext: '{{foo|bar=You should try using <nowiki>{{ping|foo=bar|2=1}}</nowiki> as a transclusion!}}'
		},
		'parameter containing another template invocation': {
			mw: {
				target: { wt: 'foo' },
				params: {
					bar: { wt: '{{ping|foo=bar|2=1}}' }
				}
			},
			wikitext: '{{foo|bar={{ping|foo=bar|2=1}}}}'
		},
		'parameter containing another parameter': {
			mw: {
				target: { wt: 'foo' },
				params: {
					bar: { wt: '{{{1}}}' }
				}
			},
			wikitext: '{{foo|bar={{{1}}}}}'
		},
		'parameter containing unmatched close brackets and floating pipes': {
			mw: {
				target: { wt: 'foo' },
				params: {
					bar: { wt: '}} | {{a|{{b}}}} |' }
				}
			},
			wikitext: '{{foo|bar=<nowiki>}}</nowiki> <nowiki>|</nowiki> {{a|{{b}}}} <nowiki>|</nowiki>}}'
		},
		'parameter containing piped link': {
			mw: {
				target: { wt: 'foo' },
				params: {
					bar: { wt: '[[baz|quux]]' }
				}
			},
			wikitext: '{{foo|bar=[[baz|quux]]}}'
		}
	}, ( assert, caseItem ) => {
		const node = new ve.dm.MWTransclusionNode(
			{ type: 'mwTransclusion', attributes: { mw: caseItem.mw } }
		);
		assert.strictEqual( node.getWikitext(), caseItem.wikitext );
	}
);
