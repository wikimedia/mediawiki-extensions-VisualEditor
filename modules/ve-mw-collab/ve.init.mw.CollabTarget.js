/*!
 * VisualEditor MediaWiki Initialization CollabTarget class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki mobile article target.
 *
 * @class
 * @extends ve.init.mw.Target
 *
 * @constructor
 * @param {mw.Title} title Page sub-title
 * @param {rebaserUrl} string Rebaser server URL
 * @param {Object} [config] Configuration options
 */
ve.init.mw.CollabTarget = function VeInitMwCollabTarget( title, rebaserUrl, config ) {
	config = config || {};
	config.toolbarConfig = $.extend( {
		shadow: true,
		actions: true,
		floatable: true
	}, config.toolbarConfig );

	this.title = title;
	this.rebaserUrl = rebaserUrl;

	// Parent constructor
	ve.init.mw.CollabTarget.super.call( this, config );

	// HACK: Disable history commands until supported (T185706)
	ve.ui.commandRegistry.unregister( 'undo' );
	ve.ui.commandRegistry.unregister( 'redo' );

	this.$originalContent = $( '<div>' ).addClass( 've-init-mw-desktopArticleTarget-originalContent' );
	this.$editableContent = $( '#mw-content-text' );

	// Initialization
	this.$element.addClass( 've-init-mw-articleTarget ve-init-mw-desktopArticleTarget ve-init-mw-collabTarget' ).append( this.$originalContent );
};

/* Inheritance */

OO.inheritClass( ve.init.mw.CollabTarget, ve.init.mw.Target );

/* Static Properties */

ve.init.mw.CollabTarget.static.name = 'collab';

ve.init.mw.CollabTarget.static.trackingName = 'collab';

ve.init.mw.CollabTarget.static.actionGroups = [
	{ include: [ 'help' ] },
	{
		type: 'list',
		icon: 'menu',
		indicator: null,
		title: ve.msg( 'visualeditor-pagemenu-tooltip' ),
		include: [ 'changeDirectionality', 'findAndReplace' ]
	},
	{ include: [ 'authorList' ] }
];

/* Methods */

/**
 * Page modifications after editor load.
 */
ve.init.mw.CollabTarget.prototype.transformPage = function () {
	this.$originalContent.append( this.$element.siblings() );
};

/**
 * Page modifications after editor teardown.
 */
ve.init.mw.CollabTarget.prototype.restorePage = function () {
	this.$element.parent().append( this.$originalContent.children() );
};

/**
 * @inheritdoc
 */
ve.init.mw.CollabTarget.prototype.surfaceReady = function () {
	// Parent method
	ve.init.mw.CollabTarget.super.prototype.surfaceReady.apply( this, arguments );

	this.getSurface().getView().focus();
};

/**
 * @inheritdoc
 */
ve.init.mw.CollabTarget.prototype.attachToolbar = function () {
	this.toolbar.$element.addClass(
		've-init-mw-desktopArticleTarget-toolbar ve-init-mw-desktopArticleTarget-toolbar-open ve-init-mw-desktopArticleTarget-toolbar-opened'
	);
	this.$element.prepend( this.toolbar.$element );
	this.toolbar.initialize();
};

/**
 * @inheritdoc
 */
ve.init.mw.CollabTarget.prototype.setSurface = function ( surface ) {
	var synchronizer, surfaceView;

	if ( surface !== this.surface ) {
		this.$editableContent.after( surface.$element );

		surfaceView = surface.getView();

		synchronizer = new ve.dm.SurfaceSynchronizer(
			surface.getModel(),
			this.title.toString(),
			{ server: this.rebaserUrl }
		);

		surfaceView.setSynchronizer( synchronizer );
	}

	// Parent method
	ve.init.mw.CollabTarget.super.prototype.setSurface.apply( this, arguments );
};

/* Registration */

ve.init.mw.targetFactory.register( ve.init.mw.CollabTarget );
