/*!
 * VisualEditor MediaWiki Initialization MobileViewTarget class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/*global mw*/

/**
 *
 * @class
 * @extends ve.init.mw.Target
 *
 * @constructor
 * @param {jQuery} $container Container to render target into
 */
ve.init.mw.MobileViewTarget = function VeInitMwMobileViewTarget( $el ) {
	var currentUri = new mw.Uri();

	// Parent constructor
	ve.init.mw.Target.call(
		this, $el, mw.config.get( 'wgRelevantPageName' ), currentUri.query.oldid
	);

	// Events
	this.connect( this, {
		'surfaceReady': 'onSurfaceReady'
	} );
};

/* Inheritance */

OO.inheritClass( ve.init.mw.MobileViewTarget, ve.init.mw.Target );

/* Static Properties */
$.extend( ve.init.mw.Target.static.iconModuleStyles, {
	'raster': [],
	'vector': []
} );

ve.init.mw.MobileViewTarget.static.toolbarGroups = [
	{ 'include': [ 'bold', 'italic' ] }
];

ve.init.mw.MobileViewTarget.static.surfaceCommands = [
	'bold',
	'italic'
];

/* Methods */

/**
 * Once surface is ready ready, init UI.
 */
ve.init.mw.MobileViewTarget.prototype.onSurfaceReady = function () {
	this.$document[0].focus();
};

/**
 * Show the toolbar.
 *
 * This also transplants the toolbar to a new location.
 *
 * @method
 */
ve.init.mw.Target.prototype.setUpToolbar = function () {
	this.toolbar = new ve.ui.TargetToolbar( this, this.surface, { 'shadow': true, 'actions': true } );
	this.toolbar.setup( this.constructor.static.toolbarGroups );
	this.surface.addCommands( this.constructor.static.surfaceCommands );
	this.toolbar.$element
		.addClass( 've-init-mw-viewPageTarget-toolbar' )
		.appendTo( '.overlay-header > div' );
};
