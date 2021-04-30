/*!
 * VisualEditor DataModel MWTemplateModel tests.
 *
 * @copyright 2011-2020 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

( function () {
	const transclusionData = {
		params: {
			foo: { wt: 'Foo value' },
			bar: { wt: 'Bar value' },
			empty: { wt: '' }
		},
		target: {
			href: './Template:Test',
			wt: 'Test'
		}
	};

	QUnit.module( 've.dm.MWTemplateModel', ve.test.utils.mwEnvironment );

	/**
	 * Create a new MWTemplateModel initialized with a static transclusion data fixture.
	 *
	 * @return {ve.dm.MWTemplateModel}
	 */
	function newTemplateModel() {
		const doc = ve.dm.Document.static.newBlankDocument(),
			transclusion = new ve.dm.MWTransclusionModel( doc ),
			clonedTransclusionData = ve.extendObject( {}, transclusionData );

		return ve.dm.MWTemplateModel.newFromData( transclusion, clonedTransclusionData );
	}

	/* Tests */

	QUnit.test( 'serialize input parameters', function ( assert ) {
		const templateModel = newTemplateModel(),
			serializedTransclusionData = templateModel.serialize();

		assert.deepEqual( serializedTransclusionData, { template: transclusionData } );
	} );

	QUnit.test( 'serialize changed input parameters', function ( assert ) {
		const templateModel = newTemplateModel(),
			newParameterModel = new ve.dm.MWParameterModel( templateModel, 'baz', 'Baz value' );

		templateModel.addParameter( newParameterModel );

		const serializedTransclusionData = templateModel.serialize();

		assert.deepEqual( serializedTransclusionData.template.params.baz, { wt: 'Baz value' } );
	} );

	// T75134
	QUnit.test( 'serialize after parameter was removed', function ( assert ) {
		const templateModel = newTemplateModel(),
			barParam = templateModel.getParameter( 'bar' );

		templateModel.removeParameter( barParam );

		const serializedTransclusionData = templateModel.serialize();

		assert.deepEqual( serializedTransclusionData.template.params, { foo: { wt: 'Foo value' }, empty: { wt: '' } } );
	} );

	// T101075
	QUnit.test( 'serialize without empty parameter not present in original parameter set', function ( assert ) {
		const templateModel = newTemplateModel(),
			newEmptyParam = new ve.dm.MWParameterModel( templateModel, 'new_empty', '' );

		templateModel.addParameter( newEmptyParam );

		const serializedTransclusionData = templateModel.serialize();

		assert.deepEqual( serializedTransclusionData, { template: transclusionData } );
	} );
}() );
