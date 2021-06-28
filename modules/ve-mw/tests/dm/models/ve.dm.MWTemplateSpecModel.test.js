( function () {

	QUnit.module( 've.dm.MWTemplateSpecModel', ve.test.utils.mwEnvironment );

	/**
	 * @param {string[]} [parameterNames]
	 * @return {ve.dm.MWTemplateModel} but it's a mock
	 */
	function createTemplateMock( parameterNames ) {
		const params = {};
		( parameterNames || [] ).forEach( ( name ) => {
			params[ name ] = {};
		} );
		return {
			params,
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
		assert.deepEqual( spec.getDocumentedParameterOrder(), [], 'getDocumentedParameterOrder' );
		assert.strictEqual( spec.isKnownParameterOrAlias( 'unknown' ), false, 'isKnownParameterOrAlias' );
		assert.strictEqual( spec.isParameterAlias( 'unknown' ), false, 'isParameterAlias' );
		assert.strictEqual( spec.getParameterLabel( 'unknown' ), 'unknown', 'getParameterLabel' );
		assert.strictEqual( spec.getParameterDescription( 'unknown' ), null, 'getParameterDescription' );
		assert.deepEqual( spec.getParameterSuggestedValues( 'unknown' ), [], 'getParameterSuggestedValues' );
		assert.strictEqual( spec.getParameterDefaultValue( 'unknown' ), '', 'getParameterDefaultValue' );
		assert.strictEqual( spec.getParameterExampleValue( 'unknown' ), null, 'getParameterExampleValue' );
		assert.strictEqual( spec.getParameterAutoValue( 'unknown' ), '', 'getParameterAutoValue' );
		assert.strictEqual( spec.getParameterType( 'unknown' ), 'string', 'getParameterType' );
		assert.deepEqual( spec.getParameterAliases( 'unknown' ), [], 'getParameterAliases' );
		assert.strictEqual( spec.getPrimaryParameterName( 'unknown' ), 'unknown', 'getPrimaryParameterName' );
		assert.strictEqual( spec.isParameterRequired( 'unknown' ), false, 'isParameterRequired' );
		assert.strictEqual( spec.isParameterSuggested( 'unknown' ), false, 'isParameterSuggested' );
		assert.strictEqual( spec.isParameterDeprecated( 'unknown' ), false, 'isParameterDeprecated' );
		assert.strictEqual( spec.getParameterDeprecationDescription( 'unknown' ), '', 'getParameterDeprecationDescription' );
		assert.deepEqual( spec.getKnownParameterNames(), [], 'getKnownParameterNames' );
		assert.deepEqual( spec.getParameterSets(), [], 'getParameterSets' );
		assert.deepEqual( spec.getMaps(), {}, 'getMaps' );
	} );

	QUnit.test( 'Basic behavior on non-empty template', ( assert ) => {
		const template = createTemplateMock( [ 'p1', 'p2' ] ),
			spec = new ve.dm.MWTemplateSpecModel( template );

		assert.strictEqual( spec.getLabel(), 'RawTemplateName', 'getLabel' );
		assert.strictEqual( spec.getDescription(), null, 'getDescription' );
		assert.deepEqual( spec.getDocumentedParameterOrder(), [], 'getDocumentedParameterOrder' );
		assert.strictEqual( spec.isKnownParameterOrAlias( 'p2' ), true, 'isKnownParameterOrAlias' );
		assert.strictEqual( spec.isParameterAlias( 'p2' ), false, 'isParameterAlias' );
		assert.strictEqual( spec.getParameterLabel( 'p2' ), 'p2', 'getParameterLabel' );
		assert.strictEqual( spec.getParameterDescription( 'p2' ), null, 'getParameterDescription' );
		assert.deepEqual( spec.getParameterSuggestedValues( 'p2' ), [], 'getParameterSuggestedValues' );
		assert.strictEqual( spec.getParameterDefaultValue( 'p2' ), '', 'getParameterDefaultValue' );
		assert.strictEqual( spec.getParameterExampleValue( 'p2' ), null, 'getParameterExampleValue' );
		assert.strictEqual( spec.getParameterAutoValue( 'p2' ), '', 'getParameterAutoValue' );
		assert.strictEqual( spec.getParameterType( 'p2' ), 'string', 'getParameterType' );
		assert.deepEqual( spec.getParameterAliases( 'p2' ), [], 'getParameterAliases' );
		assert.strictEqual( spec.getPrimaryParameterName( 'p2' ), 'p2', 'getPrimaryParameterName' );
		assert.strictEqual( spec.isParameterRequired( 'p2' ), false, 'isParameterRequired' );
		assert.strictEqual( spec.isParameterSuggested( 'p2' ), false, 'isParameterSuggested' );
		assert.strictEqual( spec.isParameterDeprecated( 'p2' ), false, 'isParameterDeprecated' );
		assert.strictEqual( spec.getParameterDeprecationDescription( 'p2' ), '', 'getParameterDeprecationDescription' );
		assert.deepEqual( spec.getKnownParameterNames(), [ 'p1', 'p2' ], 'getKnownParameterNames' );
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
		assert.deepEqual( spec.getDocumentedParameterOrder(), [], 'getDocumentedParameterOrder' );
		assert.strictEqual( spec.isKnownParameterOrAlias( 'p2' ), true, 'isKnownParameterOrAlias' );
		assert.strictEqual( spec.isParameterAlias( 'p2' ), false, 'isParameterAlias' );
		assert.strictEqual( spec.getParameterLabel( 'p2' ), 'p2', 'getParameterLabel' );
		assert.strictEqual( spec.getParameterDescription( 'p2' ), null, 'getParameterDescription' );
		assert.deepEqual( spec.getParameterSuggestedValues( 'p2' ), [], 'getParameterSuggestedValues' );
		assert.strictEqual( spec.getParameterDefaultValue( 'p2' ), '', 'getParameterDefaultValue' );
		assert.strictEqual( spec.getParameterExampleValue( 'p2' ), null, 'getParameterExampleValue' );
		assert.strictEqual( spec.getParameterAutoValue( 'p2' ), '', 'getParameterAutoValue' );
		assert.strictEqual( spec.getParameterType( 'p2' ), 'string', 'getParameterType' );
		assert.deepEqual( spec.getParameterAliases( 'p2' ), [], 'getParameterAliases' );
		assert.strictEqual( spec.getPrimaryParameterName( 'p2' ), 'p2', 'getPrimaryParameterName' );
		assert.strictEqual( spec.isParameterRequired( 'p2' ), false, 'isParameterRequired' );
		assert.strictEqual( spec.isParameterSuggested( 'p2' ), false, 'isParameterSuggested' );
		assert.strictEqual( spec.isParameterDeprecated( 'p2' ), false, 'isParameterDeprecated' );
		assert.strictEqual( spec.getParameterDeprecationDescription( 'p2' ), '', 'getParameterDeprecationDescription' );
		assert.deepEqual( spec.getKnownParameterNames(), [ 'p1', 'p2' ], 'getKnownParameterNames' );
		assert.deepEqual( spec.getParameterSets(), [], 'getParameterSets' );
		assert.deepEqual( spec.getMaps(), {}, 'getMaps' );
	} );

	QUnit.test( 'Basic behavior with most minimal extend()', ( assert ) => {
		const template = createTemplateMock( [ 'p1' ] ),
			spec = new ve.dm.MWTemplateSpecModel( template );

		spec.extend( { params: { p2: {} } } );

		assert.strictEqual( spec.getLabel(), 'RawTemplateName', 'getLabel' );
		assert.strictEqual( spec.getDescription(), null, 'getDescription' );
		assert.deepEqual( spec.getDocumentedParameterOrder(), [ 'p2' ], 'getDocumentedParameterOrder' );
		assert.strictEqual( spec.isKnownParameterOrAlias( 'p2' ), true, 'isKnownParameterOrAlias' );
		assert.strictEqual( spec.isParameterAlias( 'p2' ), false, 'isParameterAlias' );
		assert.strictEqual( spec.getParameterLabel( 'p2' ), 'p2', 'getParameterLabel' );
		assert.strictEqual( spec.getParameterDescription( 'p2' ), null, 'getParameterDescription' );
		assert.deepEqual( spec.getParameterSuggestedValues( 'p2' ), [], 'getParameterSuggestedValues' );
		assert.strictEqual( spec.getParameterDefaultValue( 'p2' ), '', 'getParameterDefaultValue' );
		assert.strictEqual( spec.getParameterExampleValue( 'p2' ), null, 'getParameterExampleValue' );
		assert.strictEqual( spec.getParameterAutoValue( 'p2' ), '', 'getParameterAutoValue' );
		assert.strictEqual( spec.getParameterType( 'p2' ), 'string', 'getParameterType' );
		assert.deepEqual( spec.getParameterAliases( 'p2' ), [], 'getParameterAliases' );
		assert.strictEqual( spec.getPrimaryParameterName( 'p2' ), 'p2', 'getPrimaryParameterName' );
		assert.strictEqual( spec.isParameterRequired( 'p2' ), false, 'isParameterRequired' );
		assert.strictEqual( spec.isParameterSuggested( 'p2' ), false, 'isParameterSuggested' );
		assert.strictEqual( spec.isParameterDeprecated( 'p2' ), false, 'isParameterDeprecated' );
		assert.strictEqual( spec.getParameterDeprecationDescription( 'p2' ), '', 'getParameterDeprecationDescription' );
		assert.deepEqual( spec.getKnownParameterNames(), [ 'p1', 'p2' ], 'getKnownParameterNames' );
		assert.deepEqual( spec.getParameterSets(), [], 'getParameterSets' );
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
		assert.deepEqual( spec.getDocumentedParameterOrder(), [ 'DummyOrder' ], 'getDocumentedParameterOrder' );
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
		assert.deepEqual( spec.getKnownParameterNames(), [ 'p' ], 'getKnownParameterNames' );
		assert.deepEqual( spec.getParameterSets(), [ 'DummySet' ], 'getParameterSets' );
		assert.deepEqual( spec.getMaps(), { dummyMap: true }, 'getMaps' );
	} );

	QUnit.test( 'Template uses aliases', ( assert ) => {
		const template = createTemplateMock( [ 'p1-alias', 'p2' ] ),
			spec = new ve.dm.MWTemplateSpecModel( template );

		assert.strictEqual( spec.isParameterAlias( 'p1-alias' ), false );
		assert.strictEqual( spec.getParameterLabel( 'p1-alias' ), 'p1-alias' );
		assert.deepEqual( spec.getKnownParameterNames(), [ 'p1-alias', 'p2' ] );

		spec.extend( { params: { p1: { aliases: [ 'p1-alias' ] } } } );

		assert.strictEqual( spec.isParameterAlias( 'p1-alias' ), true );
		assert.strictEqual( spec.getParameterLabel( 'p1-alias' ), 'p1-alias' );
		assert.deepEqual( spec.getKnownParameterNames(), [ 'p2', 'p1' ] );
	} );

	QUnit.test( 'Alias conflicts with another parameter', ( assert ) => {
		const template = createTemplateMock(),
			spec = new ve.dm.MWTemplateSpecModel( template );

		spec.extend( { params: {
			p1: {
				label: 'Parameter one'
			},
			p2: {
				label: 'Parameter two',
				// Note: This is impossible in real-world scenarios, but better be safe than sorry
				aliases: [ 'p1' ]
			}
		} } );

		assert.strictEqual( spec.getParameterLabel( 'p1' ), 'Parameter two' );
		assert.strictEqual( spec.getParameterLabel( 'p2' ), 'Parameter two' );
	} );

	QUnit.test( 'fillFromTemplate() must skip aliases', ( assert ) => {
		const template = createTemplateMock( [ 'colour' ] ),
			spec = new ve.dm.MWTemplateSpecModel( template );

		spec.extend( { params: { color: { aliases: [ 'colour' ] } } } );

		assert.deepEqual( spec.getKnownParameterNames(), [ 'color' ] );

		spec.fillFromTemplate();

		assert.deepEqual( spec.getKnownParameterNames(), [ 'color' ] );
	} );

	QUnit.test( 'Parameter deprecation with empty string', ( assert ) => {
		const template = createTemplateMock(),
			spec = new ve.dm.MWTemplateSpecModel( template );

		spec.extend( { params: { p: { deprecated: '' } } } );

		assert.strictEqual( spec.isParameterDeprecated( 'p' ), true );
		assert.strictEqual( spec.getParameterDeprecationDescription( 'p' ), '' );
	} );

}() );
