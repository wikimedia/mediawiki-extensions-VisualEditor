( function () {

	QUnit.module( 've.dm.MWTemplateSpecModel', ve.test.utils.mwEnvironment );

	/**
	 * @param {string[]} [parameterNames]
	 * @return {ve.dm.MWTemplateModel} but it's a mock
	 */
	function createTemplateMock( parameterNames ) {
		const x = {};
		( parameterNames || [] ).forEach( ( name ) => {
			x[ name ] = {};
		} );
		return {
			params: x,
			getTitle: () => null,
			getTarget: () => {
				return { wt: 'RawTemplateName' };
			},
			getParameters: function () {
				return this.params;
			}
		};
	}

	QUnit.test( 'Basic behavior on empty template', ( assert ) => {
		const template = createTemplateMock(),
			spec = new ve.dm.MWTemplateSpecModel( template );

		assert.strictEqual( spec.getLabel(), 'RawTemplateName', 'getLabel' );
		assert.strictEqual( spec.getDescription(), null, 'getDescription' );
		assert.deepEqual( spec.getCanonicalParameterOrder(), [], 'getCanonicalParameterOrder' );
		assert.strictEqual( spec.isKnownParameterOrAlias( 'unknown' ), false, 'isKnownParameterOrAlias' );
		assert.strictEqual( spec.getParameterDefaultValue( 'unknown' ), '', 'getParameterDefaultValue' );
		assert.strictEqual( spec.getParameterAutoValue( 'unknown' ), '', 'getParameterAutoValue' );
		assert.deepEqual( spec.getParameterNames(), [], 'getParameterNames' );
		assert.deepEqual( spec.getParameterSets(), [], 'getParameterSets' );
		assert.deepEqual( spec.getMaps(), {}, 'getMaps' );
	} );

	QUnit.test( 'Basic behavior on non-empty template', ( assert ) => {
		const template = createTemplateMock( [ 'p1', 'p2' ] ),
			spec = new ve.dm.MWTemplateSpecModel( template );

		assert.strictEqual( spec.getLabel(), 'RawTemplateName', 'getLabel' );
		assert.strictEqual( spec.getDescription(), null, 'getDescription' );
		assert.deepEqual( spec.getCanonicalParameterOrder(), [], 'getCanonicalParameterOrder' );
		assert.strictEqual( spec.isKnownParameterOrAlias( 'p2' ), true, 'isKnownParameterOrAlias' );
		assert.strictEqual( spec.isParameterAlias( 'p2' ), false, 'isParameterAlias' );
		assert.strictEqual( spec.getParameterLabel( 'p2' ), 'p2', 'getParameterLabel' );
		assert.strictEqual( spec.getParameterDescription( 'p2' ), null, 'getParameterDescription' );
		assert.deepEqual( spec.getParameterSuggestedValues( 'p2' ), [], 'getParameterSuggestedValues' );
		assert.strictEqual( spec.getParameterDefaultValue( 'p2' ), '', 'getParameterDefaultValue' );
		assert.strictEqual( spec.getParameterExampleValue( 'p2' ), undefined, 'getParameterExampleValue' );
		assert.strictEqual( spec.getParameterAutoValue( 'p2' ), undefined, 'getParameterAutoValue' );
		assert.strictEqual( spec.getParameterType( 'p2' ), 'string', 'getParameterType' );
		assert.deepEqual( spec.getParameterAliases( 'p2' ), [], 'getParameterAliases' );
		assert.strictEqual( spec.getPrimaryParameterName( 'p2' ), 'p2', 'getPrimaryParameterName' );
		assert.strictEqual( spec.isParameterRequired( 'p2' ), false, 'isParameterRequired' );
		assert.strictEqual( spec.isParameterSuggested( 'p2' ), false, 'isParameterSuggested' );
		assert.strictEqual( spec.isParameterDeprecated( 'p2' ), false, 'isParameterDeprecated' );
		assert.strictEqual( spec.getParameterDeprecationDescription( 'p2' ), '', 'getParameterDeprecationDescription' );
		assert.deepEqual( spec.getParameterNames(), [ 'p1', 'p2' ], 'getParameterNames' );
		assert.deepEqual( spec.getParameterSets(), [], 'getParameterSets' );
		assert.deepEqual( spec.getMaps(), {}, 'getMaps' );
	} );

	QUnit.test( 'Basic behavior with later fillFromTemplate()', ( assert ) => {
		const template = createTemplateMock( [ 'p1' ] ),
			spec = new ve.dm.MWTemplateSpecModel( template );

		template.params.p2 = {};
		spec.fillFromTemplate();

		assert.strictEqual( spec.getLabel(), 'RawTemplateName', 'getLabel' );
		assert.strictEqual( spec.getDescription(), null, 'getDescription' );
		assert.deepEqual( spec.getCanonicalParameterOrder(), [], 'getCanonicalParameterOrder' );
		assert.strictEqual( spec.isKnownParameterOrAlias( 'p2' ), true, 'isKnownParameterOrAlias' );
		assert.strictEqual( spec.isParameterAlias( 'p2' ), false, 'isParameterAlias' );
		assert.strictEqual( spec.getParameterLabel( 'p2' ), 'p2', 'getParameterLabel' );
		assert.strictEqual( spec.getParameterDescription( 'p2' ), null, 'getParameterDescription' );
		assert.deepEqual( spec.getParameterSuggestedValues( 'p2' ), [], 'getParameterSuggestedValues' );
		assert.strictEqual( spec.getParameterDefaultValue( 'p2' ), '', 'getParameterDefaultValue' );
		assert.strictEqual( spec.getParameterExampleValue( 'p2' ), undefined, 'getParameterExampleValue' );
		assert.strictEqual( spec.getParameterAutoValue( 'p2' ), undefined, 'getParameterAutoValue' );
		assert.strictEqual( spec.getParameterType( 'p2' ), 'string', 'getParameterType' );
		assert.deepEqual( spec.getParameterAliases( 'p2' ), [], 'getParameterAliases' );
		assert.strictEqual( spec.getPrimaryParameterName( 'p2' ), 'p2', 'getPrimaryParameterName' );
		assert.strictEqual( spec.isParameterRequired( 'p2' ), false, 'isParameterRequired' );
		assert.strictEqual( spec.isParameterSuggested( 'p2' ), false, 'isParameterSuggested' );
		assert.strictEqual( spec.isParameterDeprecated( 'p2' ), false, 'isParameterDeprecated' );
		assert.strictEqual( spec.getParameterDeprecationDescription( 'p2' ), '', 'getParameterDeprecationDescription' );
		assert.deepEqual( spec.getParameterNames(), [ 'p1', 'p2' ], 'getParameterNames' );
		assert.deepEqual( spec.getParameterSets(), [], 'getParameterSets' );
		assert.deepEqual( spec.getMaps(), {}, 'getMaps' );
	} );

	QUnit.test( 'Basic behavior with most minimal extend()', ( assert ) => {
		const template = createTemplateMock( [ 'p1' ] ),
			spec = new ve.dm.MWTemplateSpecModel( template );

		spec.extend( { params: { p2: {} } } );

		assert.strictEqual( spec.getLabel(), 'RawTemplateName', 'getLabel' );
		assert.strictEqual( spec.getDescription(), undefined, 'getDescription' );
		assert.deepEqual( spec.getCanonicalParameterOrder(), [ 'p2' ], 'getCanonicalParameterOrder' );
		assert.strictEqual( spec.isKnownParameterOrAlias( 'p2' ), true, 'isKnownParameterOrAlias' );
		assert.strictEqual( spec.isParameterAlias( 'p2' ), false, 'isParameterAlias' );
		assert.strictEqual( spec.getParameterLabel( 'p2' ), 'p2', 'getParameterLabel' );
		assert.strictEqual( spec.getParameterDescription( 'p2' ), null, 'getParameterDescription' );
		assert.deepEqual( spec.getParameterSuggestedValues( 'p2' ), [], 'getParameterSuggestedValues' );
		assert.strictEqual( spec.getParameterDefaultValue( 'p2' ), '', 'getParameterDefaultValue' );
		assert.strictEqual( spec.getParameterExampleValue( 'p2' ), undefined, 'getParameterExampleValue' );
		assert.strictEqual( spec.getParameterAutoValue( 'p2' ), undefined, 'getParameterAutoValue' );
		assert.strictEqual( spec.getParameterType( 'p2' ), 'string', 'getParameterType' );
		assert.deepEqual( spec.getParameterAliases( 'p2' ), [], 'getParameterAliases' );
		assert.strictEqual( spec.getPrimaryParameterName( 'p2' ), 'p2', 'getPrimaryParameterName' );
		assert.strictEqual( spec.isParameterRequired( 'p2' ), false, 'isParameterRequired' );
		assert.strictEqual( spec.isParameterSuggested( 'p2' ), false, 'isParameterSuggested' );
		assert.strictEqual( spec.isParameterDeprecated( 'p2' ), false, 'isParameterDeprecated' );
		assert.strictEqual( spec.getParameterDeprecationDescription( 'p2' ), '', 'getParameterDeprecationDescription' );
		assert.deepEqual( spec.getParameterNames(), [ 'p1', 'p2' ], 'getParameterNames' );
		assert.strictEqual( spec.getParameterSets(), undefined, 'getParameterSets' );
		assert.deepEqual( spec.getMaps(), {}, 'getMaps' );
	} );

	QUnit.test( 'Complex extend() with alias', ( assert ) => {
		const template = createTemplateMock(),
			spec = new ve.dm.MWTemplateSpecModel( template );

		spec.extend( {
			description: 'TemplateDescription',
			params: {
				p: {
					label: 'ParamLabel',
					description: 'ParamDescription',
					suggestedvalues: [ 'SuggestedValue' ],
					default: 'ParamDefault',
					example: 'ParamExample',
					autovalue: 'ParamAutoValue',
					type: 'DummyType',
					aliases: [ 'a' ],
					required: true,
					suggested: true,
					deprecated: 'DeprecationText'
				}
			},
			paramOrder: [ 'DummyOrder' ],
			sets: [ 'DummySet' ],
			maps: { dummyMap: true }
		} );

		assert.strictEqual( spec.getLabel(), 'RawTemplateName', 'getLabel' );
		assert.strictEqual( spec.getDescription(), 'TemplateDescription', 'getDescription' );
		assert.deepEqual( spec.getCanonicalParameterOrder(), [ 'DummyOrder' ], 'getCanonicalParameterOrder' );
		assert.strictEqual( spec.isKnownParameterOrAlias( 'a' ), true, 'isKnownParameterOrAlias' );
		assert.strictEqual( spec.isParameterAlias( 'a' ), true, 'isParameterAlias' );
		assert.strictEqual( spec.getParameterLabel( 'a' ), 'ParamLabel', 'getParameterLabel' );
		assert.strictEqual( spec.getParameterDescription( 'a' ), 'ParamDescription', 'getParameterDescription' );
		assert.deepEqual( spec.getParameterSuggestedValues( 'a' ), [ 'SuggestedValue' ], 'getParameterSuggestedValues' );
		assert.strictEqual( spec.getParameterDefaultValue( 'a' ), 'ParamDefault', 'getParameterDefaultValue' );
		assert.strictEqual( spec.getParameterExampleValue( 'a' ), 'ParamExample', 'getParameterExampleValue' );
		assert.strictEqual( spec.getParameterAutoValue( 'a' ), 'ParamAutoValue', 'getParameterAutoValue' );
		assert.strictEqual( spec.getParameterType( 'a' ), 'DummyType', 'getParameterType' );
		assert.deepEqual( spec.getParameterAliases( 'a' ), [ 'a' ], 'getParameterAliases' );
		assert.strictEqual( spec.getPrimaryParameterName( 'a' ), 'p', 'getPrimaryParameterName' );
		assert.strictEqual( spec.isParameterRequired( 'a' ), true, 'isParameterRequired' );
		assert.strictEqual( spec.isParameterSuggested( 'a' ), true, 'isParameterSuggested' );
		assert.strictEqual( spec.isParameterDeprecated( 'a' ), true, 'isParameterDeprecated' );
		assert.strictEqual( spec.getParameterDeprecationDescription( 'a' ), 'DeprecationText', 'getParameterDeprecationDescription' );
		assert.deepEqual( spec.getParameterNames(), [ 'p' ], 'getParameterNames' );
		assert.deepEqual( spec.getParameterSets(), [ 'DummySet' ], 'getParameterSets' );
		assert.deepEqual( spec.getMaps(), { dummyMap: true }, 'getMaps' );
	} );

}() );
