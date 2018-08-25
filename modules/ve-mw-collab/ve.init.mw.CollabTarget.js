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
 * @cfg {mw.Title} [importTitle] Title to import
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
	this.importTitle = config.importTitle || null;

	// Parent constructor
	ve.init.mw.CollabTarget.super.call( this, config );

	// HACK: Disable history commands until supported (T185706)
	ve.ui.commandRegistry.unregister( 'undo' );
	ve.ui.commandRegistry.unregister( 'redo' );

	// HACK: Disable references until supported (T194838)
	ve.ui.commandRegistry.unregister( 'reference' );
	ve.ui.commandRegistry.unregister( 'referencesList' );
	ve.ui.commandRegistry.unregister( 'citefromid' );

	this.$originalContent = $( '<div>' ).addClass( 've-init-mw-desktopArticleTarget-originalContent' );
	this.$editableContent = $( '#mw-content-text' );

	this.toolbarExportButton = new OO.ui.ButtonWidget( {
		label: ve.msg( 'visualeditor-rebase-client-export' ),
		flags: [ 'progressive', 'primary' ]
	} ).connect( this, { click: 'onExportButtonClick' } );

	// Initialization
	this.$element.addClass( 've-init-mw-articleTarget ve-init-mw-desktopArticleTarget ve-init-mw-collabTarget' ).append( this.$originalContent );
};

/* Inheritance */

OO.inheritClass( ve.init.mw.CollabTarget, ve.init.mw.Target );

/* Static Properties */

ve.init.mw.CollabTarget.static.name = 'collab';

ve.init.mw.CollabTarget.static.trackingName = 'collab';

ve.init.mw.CollabTarget.static.toolbarGroups = ve.copy( ve.init.mw.CollabTarget.static.toolbarGroups );
ve.init.mw.CollabTarget.static.toolbarGroups.splice( 4, 0, {
	name: 'commentAnnotation',
	include: [ 'commentAnnotation' ]
} );
// HACK: Disable references until supported (T194838)
ve.init.mw.CollabTarget.static.toolbarGroups = ve.init.mw.CollabTarget.static.toolbarGroups.filter( function ( group ) {
	return group.name !== 'reference';
} );

ve.init.mw.CollabTarget.static.actionGroups = [
	{
		name: 'help',
		include: [ 'help' ]
	},
	{
		name: 'pageMenu',
		type: 'list',
		icon: 'menu',
		indicator: null,
		title: ve.msg( 'visualeditor-pagemenu-tooltip' ),
		include: [ 'changeDirectionality', 'findAndReplace' ]
	},
	{
		name: 'authorList',
		include: [ 'authorList' ]
	}
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
	$( '#contentSub' ).empty();
};

/**
 * @inheritdoc
 */
ve.init.mw.CollabTarget.prototype.setupToolbar = function () {
	// Parent method
	ve.init.mw.CollabTarget.super.prototype.setupToolbar.apply( this, arguments );

	this.getToolbar().$actions.append( this.toolbarExportButton.$element );
};

/**
 * Handle click events from the export button
 */
ve.init.mw.CollabTarget.prototype.onExportButtonClick = function () {
	var surface = this.getSurface(),
		windowAction = ve.ui.actionFactory.create( 'window', surface );
	windowAction.open( 'mwExportWikitext', { surface: surface } );
};

/**
 * @inheritdoc
 */
ve.init.mw.CollabTarget.prototype.attachToolbar = function () {
	var toolbar = this.getToolbar();

	// Parent method
	ve.init.mw.CollabTarget.super.prototype.attachToolbar.apply( this, arguments );

	toolbar.$element.addClass(
		've-init-mw-desktopArticleTarget-toolbar ve-init-mw-desktopArticleTarget-toolbar-open ve-init-mw-desktopArticleTarget-toolbar-opened'
	);
	this.$element.prepend( toolbar.$element );
};

/**
 * @inheritdoc
 */
ve.init.mw.CollabTarget.prototype.setSurface = function ( surface ) {
	if ( surface !== this.surface ) {
		this.$editableContent.after( surface.$element );
	}

	// Parent method
	ve.init.mw.CollabTarget.super.prototype.setSurface.apply( this, arguments );
};

/**
 * Get the title of the imported document, if there was one
 *
 * @return {mw.Title|null} Title of imported document
 */
ve.init.mw.CollabTarget.prototype.getImportTitle = function () {
	return this.importTitle;
};

/**
 * @inheritdoc
 */
ve.init.mw.CollabTarget.prototype.getPageName = function () {
	return this.getImportTitle() || this.pageName;
};

/* Registration */

ve.init.mw.targetFactory.register( ve.init.mw.CollabTarget );
