/*!
 * VisualEditor DataModel MWExtensionNode tests.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

QUnit.module( 've.dm.MWExtensionNode', ve.test.utils.newMwEnvironment() );

QUnit.test.each( 'getText', {
	'extension which renders its own source': {
		nodeClass: ve.dm.MWPreNode,
		mw: { name: 'pre', attrs: {}, body: { extsrc: 'hello\nworld' } },
		text: 'hello\nworld'
	},
	'extension with no body': {
		nodeClass: ve.dm.MWPreNode,
		mw: { name: 'pre', attrs: {} },
		text: ''
	},
	'extension which does not render its own source': {
		nodeClass: ve.dm.MWAlienBlockExtensionNode,
		mw: { name: 'unknown', attrs: {}, body: { extsrc: 'hello' } },
		text: ''
	}
}, ( assert, caseItem ) => {
	const element = {
		type: caseItem.nodeClass.static.name,
		attributes: { mw: caseItem.mw }
	};
	assert.strictEqual( caseItem.nodeClass.static.getText( element ), caseItem.text );
} );
