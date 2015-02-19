/*!
 * VisualEditor MediaWiki Initialization MobileViewTarget class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 *
 * @class
 * @extends ve.init.mw.Target
 *
 * @constructor
 * @param {jQuery} $container Container to render target into
 * @param {Object} [config] Configuration options
 * @cfg {number} [section] Number of the section target should scroll to
 * @cfg {boolean} [isIos=false] Whether the platform is an iOS device
 */
ve.init.mw.MobileViewTarget = function VeInitMwMobileViewTarget( config ) {
	var currentUri = new mw.Uri();
	config = config || {};

	// Parent constructor
	ve.init.mw.Target.call(
		this, mw.config.get( 'wgRelevantPageName' ), currentUri.query.oldid
	);

	this.section = config.section;
	this.isIos = !!config.isIos;

	// Events
	this.connect( this, {
		surfaceReady: 'onSurfaceReady'
	} );
};

/* Inheritance */

OO.inheritClass( ve.init.mw.MobileViewTarget, ve.init.mw.Target );

/* Static Properties */

ve.init.mw.MobileViewTarget.static.toolbarGroups = [
	// Style
	{ include: [ 'bold', 'italic' ] },
	// Link
	{ include: [ 'link' ] },
	// Cite
	{
		header: OO.ui.deferMsg( 'visualeditor-toolbar-cite-label' ),
		indicator: 'down',
		type: 'list',
		icon: 'reference',
		title: OO.ui.deferMsg( 'visualeditor-toolbar-cite-label' ),
		include: [ { group: 'cite' }, 'reference/existing' ]
	}
];

ve.init.mw.MobileViewTarget.static.excludeCommands = [];

ve.init.mw.MobileViewTarget.static.name = 'mobile';

/* Methods */

/**
 * Once surface is ready ready, init UI.
 */
ve.init.mw.MobileViewTarget.prototype.onSurfaceReady = function () {
	this.restoreEditSection();
};

/**
 * Create a surface.
 *
 * @method
 * @param {ve.dm.Document} dmDoc Document model
 * @param {Object} [config] Configuration options
 * @returns {ve.ui.MobileSurface}
 */
ve.init.mw.MobileViewTarget.prototype.createSurface = function ( dmDoc, config ) {
	return new ve.ui.MobileSurface( dmDoc, config );
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileViewTarget.prototype.setupToolbar = function ( surface ) {
	// Parent method
	ve.init.mw.Target.prototype.setupToolbar.call( this, surface );

	// Append the context to the toolbar
	this.toolbar.$element.append( surface.context.$element );
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileViewTarget.prototype.attachToolbar = function () {
	// Move the toolbar to the overlay header
	this.toolbar.$element.appendTo( '.overlay-header > .toolbar' );
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileViewTarget.prototype.goToHeading = function ( headingNode ) {
	this.scrollToHeading( headingNode );
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileViewTarget.prototype.scrollToHeading = function ( headingNode ) {
	var position,
		target = this;

	setTimeout( function () {
		if ( target.isIos ) {
			position = headingNode.$element.offset().top - target.toolbar.$element.height();
			target.surface.$element.closest( '.overlay-content' ).scrollTop( position );
		} else {
			ve.init.mw.MobileViewTarget.super.prototype.scrollToHeading.call( target, headingNode );
		}
	} );
};
