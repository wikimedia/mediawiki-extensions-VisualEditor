/*!
 * VisualEditor MediaWiki Initialization MobileArticleTarget class.
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
ve.init.mw.MobileArticleTarget = function VeInitMwMobileArticleTarget( config ) {
	var currentUri = new mw.Uri();

	config = config || {};

	// Parent constructor
	ve.init.mw.Target.call(
		this, mw.config.get( 'wgRelevantPageName' ), currentUri.query.oldid, config
	);

	this.section = config.section;
	this.isIos = !!config.isIos;

	// Initialization
	this.$element.addClass( 've-init-mw-mobileArticleTarget' );
};

/* Inheritance */

OO.inheritClass( ve.init.mw.MobileArticleTarget, ve.init.mw.Target );

/* Events */

/**
 * @event back
 * Leave the editor
 */

/* Static Properties */

ve.init.mw.MobileArticleTarget.static.toolbarGroups = [
	// Link
	{ include: [ 'back' ] },
	// Style
	{
		classes: [ 've-test-toolbar-style' ],
		type: 'list',
		icon: 'textStyle',
		indicator: 'down',
		title: OO.ui.deferMsg( 'visualeditor-toolbar-style-tooltip' ),
		include: [ { group: 'textStyle' }, 'language', 'clear' ],
		forceExpand: [ 'bold', 'italic', 'clear' ],
		promote: [ 'bold', 'italic' ],
		demote: [ 'strikethrough', 'code', 'underline', 'language', 'clear' ]
	},
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

ve.init.mw.MobileArticleTarget.static.name = 'mobile';

/* Methods */

/**
 * Once surface is ready ready, init UI.
 */
ve.init.mw.MobileArticleTarget.prototype.onSurfaceReady = function () {
	// Parent method
	ve.init.mw.MobileArticleTarget.super.prototype.onSurfaceReady.apply( this, arguments );

	this.events.trackActivationComplete();
};

/**
 * Create a surface.
 *
 * @method
 * @param {ve.dm.Document} dmDoc Document model
 * @param {Object} [config] Configuration options
 * @returns {ve.ui.MobileSurface}
 */
ve.init.mw.MobileArticleTarget.prototype.createSurface = function ( dmDoc, config ) {
	return new ve.ui.MobileSurface( dmDoc, config );
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.setupToolbarSaveButton = function () {
	// Parent method
	ve.init.mw.MobileArticleTarget.super.prototype.setupToolbarSaveButton.call( this, {
		label: ve.msg( 'visualeditor-toolbar-savedialog-short' )
	} );
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.setupToolbar = function ( surface ) {
	// Parent method
	ve.init.mw.MobileArticleTarget.super.prototype.setupToolbar.call( this, surface );

	// Append the context to the toolbar
	this.toolbar.$element.append( surface.context.$element );
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.attachToolbar = function () {
	// Move the toolbar to the overlay header
	this.toolbar.$element.appendTo( '.overlay-header > .toolbar' );
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.goToHeading = function ( headingNode ) {
	this.scrollToHeading( headingNode );
};

/**
 * @inheritdoc
 */
ve.init.mw.MobileArticleTarget.prototype.scrollToHeading = function ( headingNode ) {
	var position,
		target = this;

	setTimeout( function () {
		if ( target.isIos ) {
			position = headingNode.$element.offset().top - target.toolbar.$element.height();
			target.surface.$element.closest( '.overlay-content' ).scrollTop( position );
		} else {
			ve.init.mw.MobileArticleTarget.super.prototype.scrollToHeading.call( target, headingNode );
		}
	} );
};

/**
 * Back tool
 */
ve.ui.MWBackTool = function VeUiMwBackTool() {
	// Parent constructor
	ve.ui.MWBackTool.super.apply( this, arguments );
};
OO.inheritClass( ve.ui.MWBackTool, ve.ui.Tool );
ve.ui.MWBackTool.static.name = 'back';
ve.ui.MWBackTool.static.group = 'history';
ve.ui.MWBackTool.static.icon = 'previous';
ve.ui.MWBackTool.static.title =
	OO.ui.deferMsg( 'visualeditor-backbutton-tooltip' );
ve.ui.MWBackTool.static.commandName = 'back';
ve.ui.toolFactory.register( ve.ui.MWBackTool );

/**
 * Back command
 */
ve.ui.MWBackCommand = function VeUiMwBackCommmand() {
	// Parent constructor
	ve.ui.MWBackCommand.super.call( this, 'back' );
};
OO.inheritClass( ve.ui.MWBackCommand, ve.ui.Command );
ve.ui.MWBackCommand.prototype.execute = function () {
	ve.init.target.emit( 'back' );
};
ve.ui.commandRegistry.register( new ve.ui.MWBackCommand() );
