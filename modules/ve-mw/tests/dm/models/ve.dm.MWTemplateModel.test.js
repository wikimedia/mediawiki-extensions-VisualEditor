( function () {

	QUnit.module( 've.dm.MWTemplateModel' );

	/**
	 * @return {ve.dm.MWTransclusionModel} but it's a mock
	 */
	function createTransclusionModel() {
		return {
			getUniquePartId: () => 0
		};
	}

	[
		[ 'a', 'b', 'Template:A', 'prefers .wt when it is a valid title' ],
		[ '{{a}}', 'subst:b', 'subst:b', 'falls back to unmodified getTitle' ],
		[ 'subst:a', 'b', 'Template:A', 'strips subst:' ],
		[ 'safesubst:a', 'b', 'Template:A', 'strips safesubst:' ],
		[ ' SUBST: a', 'b', 'Template:A', 'ignores capitalization and whitespace' ],
		[ 'subst :a', 'b', 'Template:Subst :a', 'leaves bad whitespace untouched' ],
		[ 'int:a', 'b', 'Template:Int:a', 'leaves other prefixes untouched' ]
	].forEach( ( [ wt, href, expected, message ] ) =>
		QUnit.test( 'getTemplateDataQueryTitle: ' + message, ( assert ) => {
			const data = { target: { wt, href } },
				model = ve.dm.MWTemplateModel.newFromData( createTransclusionModel(), data );

			assert.strictEqual( model.getTemplateDataQueryTitle(), expected );
		} )
	);

	[
		[ {}, false, 'no parameters' ],
		[ { p1: {}, p2: { wt: 'foo' } }, true, 'multiple parameters' ],
		[ { p1: {} }, false, 'undefined' ],
		[ { p1: { wt: null } }, false, 'null' ],
		[ { p1: { wt: '' } }, false, 'empty string' ],
		[ { p1: { wt: ' ' } }, true, 'space' ],
		[ { p1: { wt: '0' } }, true, '0' ],
		[ { p1: { wt: '\nfoo' } }, true, 'newline' ]
	].forEach( ( [ params, expected, message ] ) =>
		QUnit.test( 'containsValuableData: ' + message, ( assert ) => {
			const data = { target: {}, params },
				model = ve.dm.MWTemplateModel.newFromData( createTransclusionModel(), data );

			assert.strictEqual( model.containsValuableData(), expected );
		} )
	);

}() );
