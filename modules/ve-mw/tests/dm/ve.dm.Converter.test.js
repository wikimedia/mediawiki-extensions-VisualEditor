/*!
 * VisualEditor DataModel MediaWiki-specific Converter tests.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

QUnit.module( 've.dm.Converter (MW)', QUnit.newMwEnvironment() );

ve.test.utils.modelRegistrySetup = function () {
	ve.dm.modelRegistry.register( ve.dm.MWHeadingNode );
	ve.dm.modelRegistry.register( ve.dm.MWPreformattedNode );
	ve.dm.modelRegistry.register( ve.dm.MWTableNode );
};

ve.test.utils.modelRegistryTeardown = function () {
	ve.dm.modelRegistry.register( ve.dm.HeadingNode );
	ve.dm.modelRegistry.register( ve.dm.PreformattedNode );
	ve.dm.modelRegistry.register( ve.dm.TableNode );
};

QUnit.test( 'getModelFromDom', function ( assert ) {
	var msg, caseItem,
		cases = ve.dm.mwExample.domToDataCases;

	QUnit.expect( ve.test.utils.countGetModelFromDomTests( cases ) );

	ve.test.utils.modelRegistrySetup();
	for ( msg in cases ) {
		caseItem = ve.copy( cases[msg] );
		if ( caseItem.mwConfig ) {
			mw.config.set( caseItem.mwConfig );
		}

		ve.test.utils.runGetModelFromDomTest( assert, caseItem, msg );
	}
	ve.test.utils.modelRegistryTeardown();
} );

QUnit.test( 'getDomFromModel', function ( assert ) {
	var msg, caseItem,
		cases = ve.dm.mwExample.domToDataCases;

	QUnit.expect( 3 * Object.keys( cases ).length );

	ve.test.utils.modelRegistrySetup();
	for ( msg in cases ) {
		caseItem = ve.copy( cases[msg] );
		if ( caseItem.mwConfig ) {
			mw.config.set( caseItem.mwConfig );
		}

		ve.test.utils.runGetDomFromModelTest( assert, caseItem, msg );
	}
	ve.test.utils.modelRegistryTeardown();
} );
