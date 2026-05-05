QUnit.module( 'mw.editcheck.ExternalLinkEditCheck', ve.test.utils.newEditCheckEnvironment() );

QUnit.test( 'onDocumentChange', ( assert ) => {
	const done = assert.async();

	const link = ( href ) => ( {
		type: 'link/mwExternal',
		attributes: {
			href,
			rel: 'mw:ExtLink'
		}
	} );

	const cases = [
		{
			name: 'Non-interwiki external link produces action',
			data: [
				{ type: 'paragraph' },
				...ve.dm.example.annotateText( 'Foo', link( 'https://example.org/Foo' ) ),
				{ type: '/paragraph' }
			],
			isInterwiki: false,
			expectedActions: 1,
			expectedData: ( data ) => {
				data.splice( 1, 3, ...'Foo' );
			}
		},
		{
			name: 'Interwiki external link ignored',
			data: [
				{ type: 'paragraph' },
				...ve.dm.example.annotateText( 'Foo', link( 'https://en.wikipedia.org/wiki/Foo' ) ),
				{ type: '/paragraph' }
			],
			isInterwiki: true,
			expectedActions: 0
		}
	];

	Promise.all( cases.map( ( caseItem ) => {
		const doc = ve.dm.example.createExampleDocumentFromData( [
			...caseItem.data,
			{ type: 'internalList' },
			{ type: '/internalList' }
		] );
		const surfaceModel = new ve.dm.Surface( doc );
		const check = new mw.editcheck.ExternalLinkEditCheck( ve.test.utils.EditCheck.dummyController, {}, true );
		const isInterwikiUrlOrig = check.controller.getTarget().isInterwikiUrl;
		check.controller.getTarget().isInterwikiUrl = () => Promise.resolve( caseItem.isInterwiki );

		return Promise.all( check.onDocumentChange( surfaceModel ) ).then( ( results ) => {
			const actions = results.filter( Boolean );
			assert.strictEqual( actions.length, caseItem.expectedActions, caseItem.name );
			if ( caseItem.expectedActions ) {
				assert.strictEqual( actions[ 0 ].getName(), 'externalLink', caseItem.name + ': name' );
			}
			if ( caseItem.expectedData ) {
				const data = ve.copy( surfaceModel.getDocument().getFullData() );
				caseItem.expectedData( data );
				const dummySurface = ve.test.utils.createModelOnlySurface( surfaceModel );
				actions.forEach( ( action ) => {
					check.act( 'remove', action, dummySurface );
				} );
				assert.equalLinearData(
					surfaceModel.getDocument().getFullData(),
					data,
					caseItem.name + ': data'
				);
			}
			check.controller.getTarget().isInterwikiUrl = isInterwikiUrlOrig;
		} );
	} ) ).then( () => {
		done();
	} );
} );
