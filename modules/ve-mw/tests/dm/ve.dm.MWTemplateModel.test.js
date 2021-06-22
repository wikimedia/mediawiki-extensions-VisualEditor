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

	QUnit.test( 'serialize input parameters', ( assert ) => {
		const templateModel = newTemplateModel(),
			serializedTransclusionData = templateModel.serialize();

		assert.deepEqual( serializedTransclusionData, { template: transclusionData } );
	} );

	QUnit.test( 'serialize changed input parameters', ( assert ) => {
		const templateModel = newTemplateModel(),
			newParameterModel = new ve.dm.MWParameterModel( templateModel, 'baz', 'Baz value' );

		templateModel.addParameter( newParameterModel );

		const serializedTransclusionData = templateModel.serialize();

		assert.deepEqual( serializedTransclusionData.template.params.baz, { wt: 'Baz value' } );
	} );

	// T75134
	QUnit.test( 'serialize after parameter was removed', ( assert ) => {
		const templateModel = newTemplateModel(),
			barParam = templateModel.getParameter( 'bar' );

		templateModel.removeParameter( barParam );

		const serializedTransclusionData = templateModel.serialize();

		assert.deepEqual( serializedTransclusionData.template.params, { foo: { wt: 'Foo value' }, empty: { wt: '' } } );
	} );

	// T101075
	QUnit.test( 'serialize without empty parameter not present in original parameter set', ( assert ) => {
		const templateModel = newTemplateModel(),
			newEmptyParam = new ve.dm.MWParameterModel( templateModel, 'new_empty', '' );

		templateModel.addParameter( newEmptyParam );

		const serializedTransclusionData = templateModel.serialize();

		assert.deepEqual( serializedTransclusionData, { template: transclusionData } );
	} );

	[
		{
			name: 'no spec retrieved',
			spec: null,
			expected: [
				'bar',
				'empty',
				'foo'
			]
		},
		{
			name: 'empty spec',
			spec: {},
			expected: [
				'bar',
				'empty',
				'foo'
			]
		},
		{
			name: 'spec with explicit paramOrder and all known params',
			spec: {
				params: {
					bar: {},
					empty: {},
					unused: {},
					foo: {}
				},
				paramOrder: [ 'foo', 'empty', 'bar', 'unused' ]
			},
			expected: [
				'foo',
				'empty',
				'bar'
			]
		},
		{
			name: 'spec with explicit paramOrder and some unknown params',
			spec: {
				params: {
					empty: {},
					unused: {},
					foo: {}
				},
				paramOrder: [ 'foo', 'empty', 'unused' ]
			},
			expected: [
				'foo',
				'empty',
				'bar'
			]
		},
		{
			name: 'spec with explicit paramOrder but all unknown params',
			spec: {
				params: {},
				paramOrder: []
			},
			expected: [
				'bar',
				'empty',
				'foo'
			]
		},
		{
			name: 'spec with no paramOrder, all known params',
			spec: {
				params: {
					bar: {},
					foo: {},
					unused: {},
					empty: {}
				}
			},
			expected: [
				'bar',
				'empty',
				'foo'
			]
		},
		{
			name: 'spec with no paramOrder and some unknown params',
			spec: {
				params: {
					empty: {},
					unused: {},
					foo: {}
				}
			},
			expected: [
				'bar',
				'empty',
				'foo'
			]
		}
	].forEach( ( { name, spec, expected } ) => {
		QUnit.test( 'getOrderedParameterNames: ' + name, ( assert ) => {
			const templateModel = newTemplateModel();
			if ( spec !== null ) {
				templateModel.getSpec().extend( spec );
			}
			assert.deepEqual( templateModel.getOrderedParameterNames(), expected );
		} );
	} );

	[
		{
			name: 'no spec retrieved',
			spec: null,
			expected: [
				'bar',
				'empty',
				'foo'
			]
		},
		{
			name: 'spec with explicit paramOrder and all known params',
			spec: {
				params: {
					bar: {},
					empty: {},
					unused: {},
					foo: {}
				},
				paramOrder: [ 'foo', 'empty', 'unused', 'bar' ]
			},
			expected: [
				'foo',
				'empty',
				'unused',
				'bar'
			]
		},
		{
			name: 'spec with explicit paramOrder and some unknown params',
			spec: {
				params: {
					empty: {},
					unused: {},
					foo: {}
				},
				paramOrder: [ 'foo', 'empty', 'unused' ]
			},
			expected: [
				'foo',
				'empty',
				'unused',
				'bar'
			]
		},
		{
			name: 'spec with explicit paramOrder but all unknown params',
			spec: {
				params: {},
				paramOrder: []
			},
			expected: [
				'bar',
				'empty',
				'foo'
			]
		},
		{
			name: 'spec with no paramOrder, all known params',
			spec: {
				params: {
					bar: {},
					foo: {},
					unused: {},
					empty: {}
				}
			},
			expected: [
				'bar',
				'empty',
				'foo'
				// FIXME: 'unused'
			]
		},
		{
			name: 'spec with no paramOrder and some unknown params',
			spec: {
				params: {
					empty: {},
					unused: {},
					foo: {}
				}
			},
			expected: [
				'bar',
				'empty',
				// FIXME: 'unused'
				'foo'
			]
		}
	].forEach( ( { name, spec, expected } ) => {
		QUnit.test( 'getAllParametersOrdered: ' + name, ( assert ) => {
			const templateModel = newTemplateModel();
			if ( spec !== null ) {
				templateModel.getSpec().extend( spec );
			}
			assert.deepEqual( templateModel.getAllParametersOrdered(), expected );
		} );
	} );
}() );
