/*!
 * VisualEditor MediaWiki test utilities.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

ve.test.utils.createSurfaceFromDocument = function ( doc ) {
	var target, mwTarget;

	// Prevent the target from setting up the surface immediately
	ve.init.platform.initialized = $.Deferred();

	// HACK: MW targets are async and heavy, use an SA target but
	// override the global registration
	target = new ve.init.sa.Target();
	mwTarget = new ve.init.mw.ArticleTarget();

	$( '#qunit-fixture' ).append( target.$element );
	target.addSurface( doc );

	ve.init.platform.initialized.resolve();
	mwTarget = null;
	target.addSurface( doc );
	return target.surface;
};

// Unregister MW override nodes.
// They are temporarily registered in setup/teardown.
ve.dm.modelRegistry.unregister( ve.dm.MWHeadingNode );
ve.dm.modelRegistry.unregister( ve.dm.MWPreformattedNode );
ve.dm.modelRegistry.unregister( ve.dm.MWTableNode );
ve.dm.modelRegistry.unregister( ve.dm.MWExternalLinkAnnotation );
// Re-register unregistered nodes.
ve.dm.modelRegistry.register( ve.dm.InlineImageNode );
ve.dm.modelRegistry.register( ve.dm.BlockImageNode );

ve.test.utils.mwEnvironment = ( function () {
	var overrides = [
			ve.dm.MWHeadingNode,
			ve.dm.MWPreformattedNode,
			ve.dm.MWTableNode,
			ve.dm.MWExternalLinkAnnotation
		],
		overridden = [
			ve.dm.InlineImageNode,
			ve.dm.BlockImageNode
		];

	function setupOverrides() {
		var i;
		for ( i = 0; i < overrides.length; i++ ) {
			ve.dm.modelRegistry.register( overrides[ i ] );
		}
		for ( i = 0; i < overridden.length; i++ ) {
			ve.dm.modelRegistry.unregister( overridden[ i ] );
		}
	}

	function teardownOverrides() {
		var i;
		for ( i = 0; i < overrides.length; i++ ) {
			ve.dm.modelRegistry.unregister( overrides[ i ] );
		}
		for ( i = 0; i < overridden.length; i++ ) {
			ve.dm.modelRegistry.register( overridden[ i ] );
		}
	}

	// On load, teardown overrides so the first core tests run correctly
	teardownOverrides();

	return QUnit.newMwEnvironment( {
		setup: setupOverrides,
		teardown: teardownOverrides
	} );
} )();

( function () {
	var getDomElementSummaryCore = ve.getDomElementSummary;

	/**
	 * Override getDomElementSummary to extract HTML from data-mw/body.html
	 * and make it comparable.
	 *
	 * @method
	 * @inheritdoc ve#getDomElementSummary
	 */
	ve.getDomElementSummary = function ( element, includeHtml ) {
		// "Parent" method
		return getDomElementSummaryCore( element, includeHtml, function ( name, value ) {
			var obj, html;
			if ( name === 'data-mw' ) {
				obj = JSON.parse( value );
				html = ve.getProp( obj, 'body', 'html' );
				if ( html ) {
					obj.body.html = ve.getDomElementSummary( $( '<div>' ).html( html )[ 0 ] );
				}
				return obj;
			}
			return value;
		} );
	};
} )();
