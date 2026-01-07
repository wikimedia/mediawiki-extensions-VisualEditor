QUnit.module( 'mw.editcheck.BaseEditCheck', ve.test.utils.newMwEnvironment() );

function makeDocumentWithHeadings( headings ) {
	// Build a ve.dm.Document with:
	// - a lead paragraph
	// - for each heading: an mwHeading followed by a paragraph

	const data = [];
	const sectionOffsets = [];

	// Lead paragraph
	data.push( { type: 'paragraph' }, ...'Lead', { type: '/paragraph' } );
	sectionOffsets.push( data.length - 2 );

	headings.forEach( ( heading ) => {
		data.push(
			{ type: 'mwHeading', attributes: { level: heading.level } }, ...heading.text, { type: '/mwHeading' },
			{ type: 'paragraph' }, ...'Paragraph', { type: '/paragraph' }
		);
		sectionOffsets.push( data.length - 2 );
	} );

	const doc = new ve.dm.Document( data );
	return { doc, sectionOffsets };
}

const cases = [
	{
		name: 'Lead section ignored when ignoreLeadSection=true and later heading exists',
		config: { ignoreSections: [], ignoreLeadSection: true },
		headings: [ { level: 2, text: 'History' } ],
		section: 0,
		expectedHierarchy: [],
		expectedValid: false
	},
	{
		name: 'Section allowed when no sections ignored',
		config: { ignoreSections: [], ignoreLeadSection: true },
		headings: [ { level: 2, text: 'History' } ],
		section: 1,
		expectedHierarchy: [ 'History' ],
		expectedValid: true
	},
	{
		name: 'Lead section allowed in stub (no headings) when ignoreLeadSection=true',
		config: { ignoreSections: [], ignoreLeadSection: true },
		headings: [],
		section: 0,
		expectedHierarchy: [],
		expectedValid: true
	},
	{
		name: 'Parent section (h3 inside h2) checked',
		config: { ignoreSections: [ 'External links' ], ignoreLeadSection: false },
		headings: [ { level: 2, text: 'External links' }, { level: 3, text: 'Archived' } ],
		section: 2,
		expectedHierarchy: [ 'Archived', 'External links' ],
		expectedValid: false
	},
	{
		name: 'Same-level earlier heading not in scope (previous h2)',
		config: { ignoreSections: [ 'Foo' ], ignoreLeadSection: false },
		headings: [ { level: 2, text: 'Foo' }, { level: 2, text: 'Bar' } ],
		section: 2,
		expectedHierarchy: [ 'Bar' ],
		expectedValid: true
	},
	{
		name: 'Chain stops at same-or-higher heading (sibling h2 closes previous h2)',
		config: { ignoreSections: [ 'Parent' ], ignoreLeadSection: false },
		headings: [
			{ level: 2, text: 'Parent' },
			{ level: 3, text: 'Foo' },
			{ level: 2, text: 'Sibling' },
			{ level: 3, text: 'Bar' }
		],
		section: 4,
		expectedHierarchy: [ 'Bar', 'Sibling' ],
		expectedValid: true
	}
];

QUnit.test( 'isRangeInValidSection data-driven cases', ( assert ) => {
	cases.forEach( ( caseItem ) => {
		const check = new mw.editcheck.BaseEditCheck( {}, caseItem.config, false );

		const { doc, sectionOffsets } = makeDocumentWithHeadings( caseItem.headings );
		const start = sectionOffsets[ caseItem.section ];
		assert.deepEqual(
			check.getHeadingHierarchyFromOffset( start, doc ).map(
				( heading ) => doc.data.getText( false, heading.getRange() )
			),
			caseItem.expectedHierarchy,
			caseItem.name + ': hierarchy'
		);
		assert.strictEqual(
			check.isRangeInValidSection( new ve.Range( start ), doc ),
			caseItem.expectedValid,
			caseItem.name + ': validity'
		);
	} );
} );
