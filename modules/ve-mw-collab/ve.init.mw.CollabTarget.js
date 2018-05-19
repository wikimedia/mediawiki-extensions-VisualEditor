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

ve.init.mw.CollabTarget.static.toolbarGroups = ve.copy( ve.init.mw.CollabTarget.static.toolbarGroups );
ve.init.mw.CollabTarget.static.toolbarGroups.splice( 4, 0, {
	name: 'commentAnnotation',
	include: [ 'commentAnnotation' ]
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
	var synchronizer, surfaceView, defaultName,
		target = this;

	if ( surface !== this.surface ) {
		// TODO: Show 'connecting' progress bar until doc is ready
		surface.getModel().setNullSelection();

		this.$editableContent.after( surface.$element );

		surfaceView = surface.getView();

		synchronizer = new ve.dm.SurfaceSynchronizer(
			surface.getModel(),
			this.title.toString(),
			{ server: this.rebaserUrl }
		);
		synchronizer.on( 'authorNameChange', function ( authorId ) {
			var newName = synchronizer.getAuthorName( authorId );
			if ( authorId === synchronizer.getAuthorId() ) {
				mw.storage.session.set( 've-collab-username', newName );
			}
		} );

		synchronizer.once( 'initDoc', function () {
			var initPromise,
				importTitle = new mw.Uri( location.href ).query.import;
			if ( importTitle && !surface.getModel().getDocument().getCompleteHistoryLength() ) {
				initPromise = mw.libs.ve.targetLoader.requestParsoidData( importTitle, { targetName: 'collabpad' } ).then( function ( response ) {
					var doc, dmDoc,
						content = ve.getProp( response, 'visualeditor', 'content' );

					if ( content ) {
						doc = target.constructor.static.parseDocument( content );
						dmDoc = target.constructor.static.createModelFromDom( doc );
						surface.getModel().getLinearFragment( new ve.Range( 0, 2 ) ).insertDocument( dmDoc );
						surface.getModel().selectFirstContentOffset();
					} else {
						// Import failed
						return $.Deferred().reject( 'No content for ' + importTitle ).promise();
					}
				} );
			} else {
				// No import, or history already exists
				initPromise = $.Deferred().resolve().promise();
			}
			initPromise.fail( function ( err ) {
				setTimeout( function () {
					throw new Error( err );
				} );
			} );
			initPromise.always( function () {
				surface.getModel().selectFirstContentOffset();
				// TODO: Hide 'connecting' progress bar
			} ); // TODO: Handle .fail
		} );

		// TODO: server could communicate with MW (via oauth?) to know the
		// current-user's name. Disable changing name if logged in?
		// Communicate an I-am-a-valid-user flag to other clients?
		defaultName = mw.storage.session.get( 've-collab-username' );
		if ( !defaultName && !mw.user.isAnon() ) {
			defaultName = mw.user.getName();
		}
		if ( defaultName ) {
			synchronizer.changeName( defaultName );
		}

		surfaceView.setSynchronizer( synchronizer );
	}

	// Parent method
	ve.init.mw.CollabTarget.super.prototype.setSurface.apply( this, arguments );
};

/* Registration */

ve.init.mw.targetFactory.register( ve.init.mw.CollabTarget );
