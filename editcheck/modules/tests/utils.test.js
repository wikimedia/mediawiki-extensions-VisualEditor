QUnit.module( 'mw.editcheck.utils', ve.test.utils.newEditCheckEnvironment() );

// Copies of the limits in WikimediaEvents' statsd.js.
const legalLabelValue = /^[A-Za-z0-9_.+-]+$/;
const maxLabelLength = 48;

QUnit.test( 'sanitizeStatsvLabel', ( assert ) => {
	const cases = [
		{
			name: 'Legal ID passes through',
			value: 'british-english',
			expected: 'british-english'
		},
		{
			name: 'Every legal character passes through',
			value: 'a_b.c+d-e',
			expected: 'a_b.c+d-e'
		},
		{
			name: 'Illegal character is mapped, and digested to stay unique',
			// A real rule on ruwiki
			value: 'LLM-100%-indicators',
			expected: 'LLM-100--indicators.ixxbjs'
		},
		{
			name: 'Non-Latin script keeps only the digest',
			value: 'права человека',
			expected: '--------------.4ci2y7'
		},
		{
			name: 'Maximum length passes through',
			value: 'x'.repeat( maxLabelLength ),
			expected: 'x'.repeat( maxLabelLength )
		},
		{
			name: 'Longer than the maximum is cut and digested',
			value: 'x'.repeat( maxLabelLength + 1 ),
			expected: 'x'.repeat( 41 ) + '.ptwnk6'
		},
		{
			name: 'Empty value stays legal',
			value: '',
			expected: '.0'
		}
	];

	cases.forEach( ( caseItem ) => {
		const actual = mw.editcheck.sanitizeStatsvLabel( caseItem.value );
		assert.strictEqual( actual, caseItem.expected, caseItem.name );
		assert.true(
			legalLabelValue.test( actual ),
			caseItem.name + ': legal statsv label value'
		);
		assert.true(
			actual.length <= maxLabelLength,
			caseItem.name + ': at most ' + maxLabelLength + ' characters'
		);
	} );
} );

QUnit.test( 'sanitizeStatsvLabel keeps different IDs apart', ( assert ) => {
	const cases = [
		{
			name: 'Same shape in a non-Latin script',
			value: 'тест1',
			otherValue: 'иной1'
		},
		{
			name: 'Same characters up to the maximum length',
			value: 'x'.repeat( maxLabelLength + 1 ),
			otherValue: 'x'.repeat( maxLabelLength ) + 'y'
		},
		{
			name: 'Only an illegal character differs',
			value: 'rule%one',
			otherValue: 'rule&one'
		}
	];

	cases.forEach( ( caseItem ) => {
		assert.notStrictEqual(
			mw.editcheck.sanitizeStatsvLabel( caseItem.value ),
			mw.editcheck.sanitizeStatsvLabel( caseItem.otherValue ),
			caseItem.name
		);
	} );
} );

QUnit.test( 'mergeConfigs', ( assert ) => {
	const cases = [
		{
			msg: 'Plain keys replace',
			configs: [ { a: [ 1 ], b: 1 }, { a: [ 2 ] } ],
			expected: { a: [ 2 ], b: 1 }
		},
		{
			msg: 'Empty and missing configs are ignored',
			configs: [ { a: 1 }, undefined, {} ],
			expected: { a: 1 }
		},
		{
			msg: '+ joins arrays with no duplicates',
			configs: [ { a: [ 1, 2 ] }, { '+a': [ 2, 3 ] } ],
			expected: { a: [ 1, 2, 3 ] }
		},
		{
			msg: '+ applies through a chain of configs',
			configs: [ { a: [ 1 ] }, { '+a': [ 2 ] }, { '+a': [ 3 ] } ],
			expected: { a: [ 1, 2, 3 ] }
		},
		{
			msg: '+ with no earlier value sets the value',
			configs: [ {}, { '+a': [ 1 ] } ],
			expected: { a: [ 1 ] }
		},
		{
			msg: '+ merges objects, with later keys taking priority',
			configs: [ { a: { x: true, y: true } }, { '+a': { y: false, z: true } } ],
			expected: { a: { x: true, y: false, z: true } }
		},
		{
			msg: 'Prefixes apply in nested objects',
			configs: [
				{ a: { x: { list: [ 1 ] }, y: { j: 1, k: 2 } } },
				{ '+a': { '+x': { '+list': [ 2 ] }, '-y': 'k' } }
			],
			expected: { a: { x: { list: [ 1, 2 ] }, y: { j: 1 } } }
		},
		{
			msg: 'Prefixes in a new nested object are resolved',
			configs: [ {}, { '+a': { '+x': [ 1 ], '-y': 'y' } } ],
			expected: { a: { x: [ 1 ] } }
		},
		{
			msg: '+ with an empty array on an object changes nothing',
			configs: [ { a: { x: true } }, { '+a': [] } ],
			expected: { a: { x: true } }
		},
		{
			msg: '+ with an object on an empty array merges the object',
			configs: [ { a: [] }, { '+a': { '+x': [ 1 ] } } ],
			expected: { a: { x: [ 1 ] } }
		},
		{
			msg: '+ on a scalar replaces it',
			configs: [ { a: 1 }, { '+a': 2 } ],
			expected: { a: 2 },
			warns: 1
		},
		{
			msg: '+ with an object on a scalar resolves the object',
			configs: [ { a: 1 }, { '+a': { '+x': [ 1 ] } } ],
			expected: { a: { x: [ 1 ] } },
			warns: 1
		},
		{
			msg: '- removes array items',
			configs: [ { a: [ 1, 2, 3 ] }, { '-a': [ 1, 3 ] } ],
			expected: { a: [ 2 ] }
		},
		{
			msg: '- removes a single array item',
			configs: [ { a: [ 'x', 'y' ] }, { '-a': 'x' } ],
			expected: { a: [ 'y' ] }
		},
		{
			msg: '- removes object keys',
			configs: [ { a: { x: 1, y: 2, z: 3 } }, { '-a': [ 'x', 'z' ] } ],
			expected: { a: { y: 2 } }
		},
		{
			msg: '- with no earlier value does nothing',
			configs: [ {}, { '-a': [ 1 ] } ],
			expected: {}
		},
		{
			msg: '- on a scalar does nothing',
			configs: [ { a: 1 }, { '-a': 1 } ],
			expected: { a: 1 },
			warns: 1
		},
		{
			msg: 'In one config, plain keys apply first, then +, then -',
			configs: [ { a: [ 1 ] }, { '-a': [ 2 ], '+a': [ 2, 3 ], a: [ 0 ] } ],
			expected: { a: [ 0, 3 ] }
		},
		{
			msg: 'A key that is only a prefix character is a plain key',
			configs: [ { '+': 1 }, { '-': 2 } ],
			expected: { '+': 1, '-': 2 }
		}
	];

	const warn = mw.log.warn;
	cases.forEach( ( caseItem ) => {
		let warns = 0;
		mw.log.warn = () => {
			warns++;
		};
		const configs = ve.copy( caseItem.configs );
		try {
			assert.deepEqual( mw.editcheck.mergeConfigs( ...configs ), caseItem.expected, caseItem.msg );
		} finally {
			mw.log.warn = warn;
		}
		assert.strictEqual( warns, caseItem.warns || 0, caseItem.msg + ': warnings' );
		assert.deepEqual( configs, caseItem.configs, caseItem.msg + ': inputs are not changed' );
	} );
} );
