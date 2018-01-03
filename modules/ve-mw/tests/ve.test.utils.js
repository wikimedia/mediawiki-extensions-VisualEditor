/*!
 * VisualEditor MediaWiki test utilities.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

ve.test.utils.createSurfaceFromDocument = function ( doc ) {
	// eslint-disable-next-line no-unused-vars
	var target, mwTarget, surface;

	// Prevent the target from setting up the surface immediately
	ve.init.platform.initialized = $.Deferred();

	// HACK: MW targets are async and heavy, use a DummyTarget
	// but override the global registration
	target = new ve.test.utils.DummyTarget();

	// HACK: Mock setDefaultMode() because it causes untracked
	// ajax requests (T162810)
	// HACK: Has to be a subclass instead of assignment to mwTarget
	// because it is called in the constructor
	function SubMwArticleTarget() {
		SubMwArticleTarget.super.call( this );
	}
	OO.inheritClass( SubMwArticleTarget, ve.init.mw.ArticleTarget );
	SubMwArticleTarget.prototype.setDefaultMode = function () {};

	mwTarget = new SubMwArticleTarget();

	$( '#qunit-fixture' ).append( target.$element );
	target.addSurface( doc );

	ve.init.platform.initialized.resolve();
	mwTarget = null;
	surface = target.addSurface( doc );
	// HACK HACK HACK: The target fuckery above results in the surface not being attached to the DOM.
	// I'm not debugging that, screw it. Let's add another hack on top, surely that won't be a problem.
	$( '#qunit-fixture' ).append( surface.$element );
	return surface;
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
	var mwPlatform, corePlatform,
		overrides = [
			ve.dm.MWHeadingNode,
			ve.dm.MWPreformattedNode,
			ve.dm.MWTableNode,
			ve.dm.MWExternalLinkAnnotation
		],
		overridden = [
			ve.dm.InlineImageNode,
			ve.dm.BlockImageNode
		];

	corePlatform = ve.init.platform;
	mwPlatform = new ve.init.mw.Platform();
	// Disable some API requests from platform
	mwPlatform.imageInfoCache = null;
	// Unregister mwPlatform
	ve.init.platform = corePlatform;

	function setupOverrides() {
		var i;
		for ( i = 0; i < overrides.length; i++ ) {
			ve.dm.modelRegistry.register( overrides[ i ] );
		}
		for ( i = 0; i < overridden.length; i++ ) {
			ve.dm.modelRegistry.unregister( overridden[ i ] );
		}
		ve.init.platform = mwPlatform;
	}

	function teardownOverrides() {
		var i;
		for ( i = 0; i < overrides.length; i++ ) {
			ve.dm.modelRegistry.unregister( overrides[ i ] );
		}
		for ( i = 0; i < overridden.length; i++ ) {
			ve.dm.modelRegistry.register( overridden[ i ] );
		}
		ve.init.platform = corePlatform;
	}

	// On load, teardown overrides so the first core tests run correctly
	teardownOverrides();

	return {
		setup: setupOverrides,
		teardown: teardownOverrides
	};
}() );

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
}() );
