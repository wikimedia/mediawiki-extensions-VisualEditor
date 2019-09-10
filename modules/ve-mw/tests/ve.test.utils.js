/*!
 * VisualEditor MediaWiki test utilities.
 *
 * @copyright 2011-2019 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

( function () {
	var getDomElementSummaryCore;

	function MWDummyTarget() {
		MWDummyTarget.super.call( this );
	}
	OO.inheritClass( MWDummyTarget, ve.test.utils.DummyTarget );
	MWDummyTarget.prototype.setDefaultMode = function () {};
	MWDummyTarget.prototype.isSaveable = function () {
		return true;
	};
	MWDummyTarget.prototype.parseWikitextFragment = function () {
		// Ensure a mock server is used (e.g. as in ve.ui.MWWikitextStringTransferHandler)
		return new mw.Api().post();
	};
	ve.test.utils.MWDummyTarget = MWDummyTarget;
	// Copy import rules from mw target, for paste tests.
	ve.test.utils.MWDummyTarget.static.importRules = ve.init.mw.Target.static.importRules;

	function MWDummyPlatform() {
		MWDummyPlatform.super.apply( this, arguments );
		// Disable some API requests from platform
		this.imageInfoCache = null;
	}
	OO.inheritClass( MWDummyPlatform, ve.init.mw.Platform );
	MWDummyPlatform.prototype.getMessage = function () {
		return Array.prototype.join.call( arguments, ',' );
	};
	MWDummyPlatform.prototype.getHtmlMessage = function () {
		var $wrapper = $( '<div>' );
		Array.prototype.forEach.call( arguments, function ( arg, i, args ) {
			$wrapper.append( arg );
			if ( i < args.length - 1 ) {
				$wrapper.append( ',' );
			}
		} );
		// Merge text nodes
		// eslint-disable-next-line no-restricted-properties
		$wrapper[ 0 ].normalize();
		return $wrapper.contents().toArray();
	};
	ve.test.utils.MWDummyPlatform = MWDummyPlatform;

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
		var mwPlatform, corePlatform, mwTarget, coreTarget,
			setEditorPreference = mw.libs.ve.setEditorPreference,
			dummySetEditorPreference = function () { return $.Deferred().resolve().promise(); },
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
		coreTarget = ve.init.target;
		mwPlatform = new ve.test.utils.MWDummyPlatform();
		// Unregister mwPlatform
		ve.init.platform = corePlatform;

		mwTarget = new ve.test.utils.MWDummyTarget();
		// Unregister mwTarget
		ve.init.target = coreTarget;

		function setupOverrides() {
			var i;
			for ( i = 0; i < overrides.length; i++ ) {
				ve.dm.modelRegistry.register( overrides[ i ] );
			}
			for ( i = 0; i < overridden.length; i++ ) {
				ve.dm.modelRegistry.unregister( overridden[ i ] );
			}
			ve.init.platform = mwPlatform;
			ve.init.target = mwTarget;
			mw.libs.ve.setEditorPreference = dummySetEditorPreference;
			// Ensure the current target is appended to the current fixture
			// eslint-disable-next-line no-jquery/no-global-selector
			$( '#qunit-fixture' ).append( ve.init.target.$element );
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
			ve.init.target = coreTarget;
			mw.libs.ve.setEditorPreference = setEditorPreference;
		}

		// On load, teardown overrides so the first core tests run correctly
		teardownOverrides();

		return {
			setup: setupOverrides,
			teardown: teardownOverrides
		};
	}() );

	getDomElementSummaryCore = ve.getDomElementSummary;

	/**
	 * Override getDomElementSummary to extract HTML from data-mw/body.html
	 * and make it comparable.
	 *
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
