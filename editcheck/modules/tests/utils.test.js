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
