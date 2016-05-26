/*!
 * VisualEditor MediaWiki Initialization DesktopWikitextArticleTarget class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 *
 * @class
 * @extends ve.init.mw.DesktopArticleTarget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.init.mw.DesktopWikitextArticleTarget = function VeInitMwDesktopWikitextArticleTarget( config ) {
	// Parent constructor
	ve.init.mw.DesktopWikitextArticleTarget.super.call( this, config );

	// Initialization
	this.$element.addClass( 've-init-mw-desktopWikitextArticleTarget' );
};

/* Inheritance */

OO.inheritClass( ve.init.mw.DesktopWikitextArticleTarget, ve.init.mw.DesktopArticleTarget );

/* Events */

/* Static Properties */

ve.init.mw.DesktopWikitextArticleTarget.static.trackingName = 'desktopWikitext';

ve.init.mw.DesktopWikitextArticleTarget.static.importRules = ve.extendObject( {},
	ve.init.mw.DesktopWikitextArticleTarget.static.importRules, {
	all: {
		keepEmptyContentBranches: true
	}
} );

/* Methods */

/**
 * @inheritdoc
 */
ve.init.mw.DesktopWikitextArticleTarget.prototype.restorePage = function () {
	$( '#ca-edit' ).removeClass( 'selected' );

	// Parent method
	ve.init.mw.DesktopWikitextArticleTarget.super.prototype.restorePage.apply( this, arguments );
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopWikitextArticleTarget.prototype.switchToWikitextEditor = function ( discardChanges, modified ) {
	var dataPromise,
		target = this;

	this.serialize( this.docToSave || this.getSurface().getDom() );
	dataPromise = this.serializing.then( function ( response ) {
		// HACK
		var data = response.visualeditor;
		data.etag = target.etag;
		data.fromEditedState = modified;
		data.notices = target.remoteNotices;
		data.protectedClasses = target.protectedClasses;
		data.basetimestamp = target.baseTimeStamp;
		data.starttimestamp = target.startTimeStamp;
		data.oldid = target.revid;
		return response;
	} );
	this.setMode( 'source' );

	this.reloadSurface( dataPromise );
};

ve.init.mw.DesktopWikitextArticleTarget.prototype.switchToVisualEditor = function () {
	this.setMode( 'visual' );
	this.reloadSurface();
};

ve.init.mw.DesktopWikitextArticleTarget.prototype.reloadSurface = function ( dataPromise ) {
	var target = this;
	// Create progress - will be discarded when surface is destroyed.
	this.getSurface().createProgress( $.Deferred().promise() );
	this.activating = true;
	this.activatingDeferred = $.Deferred();
	this.load( dataPromise );
	this.activatingDeferred.done( function () {
		target.afterActivate();
		target.setupTriggerListeners();
	} );
	this.toolbarSetupDeferred.resolve();
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopWikitextArticleTarget.prototype.setupToolbar = function ( surface ) {
	var actionGroups;

	// Parent method
	ve.init.mw.DesktopWikitextArticleTarget.super.prototype.setupToolbar.apply( this, arguments );

	if ( this.mode === 'source' ) {
		/* HACK: Hide meta dialog tools as they aren't supported (yet?) */
		actionGroups = ve.copy( this.constructor.static.actionGroups );
		actionGroups[ 1 ].include = OO.simpleArrayDifference(
			actionGroups[ 1 ].include,
			[ 'meta', 'settings', 'advancedSettings', 'categories', 'languages' ]
		);
		actionGroups[ 2 ].include[ 0 ] = 'editModeVisual';
		this.getActions().setup( actionGroups, surface );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopWikitextArticleTarget.prototype.parseHtml = function ( content ) {
	var doc;
	if ( this.mode === 'source' ) {
		doc = ve.createDocumentFromHtml( '' );

		content.split( '\n' ).forEach( function ( line ) {
			var p = doc.createElement( 'p' );
			p.innerText = line;
			doc.body.appendChild( p );
		} );

		return doc;
	} else {
		// Parent method
		return ve.init.mw.DesktopWikitextArticleTarget.super.prototype.parseHtml.apply( this, arguments );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopWikitextArticleTarget.prototype.createTargetWidget = function ( dmDoc, config ) {
	if ( this.mode === 'source' ) {
		return new ve.ui.MWTargetWidget( dmDoc, ve.extendObject( {
			commandRegistry: ve.ui.commandRegistry,
			sequenceRegistry: ve.ui.sequenceRegistry,
			dataTransferHandlerFactory: ve.ui.dataTransferHandlerFactory
		}, config ) );
	} else {
		// Parent method
		return ve.init.mw.DesktopWikitextArticleTarget.super.prototype.createTargetWidget.apply( this, arguments );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopWikitextArticleTarget.prototype.createSurface = function ( dmDoc, config ) {
	// Use a regular surface in target widgets
	if ( this.mode !== 'source' || ( config && config.inTargetWidget ) ) {
		// Parent method
		return ve.init.mw.DesktopWikitextArticleTarget.super.prototype.createSurface.apply( this, arguments );
	} else {
		return new ve.ui.MWDesktopWikitextSurface( dmDoc,  this.getSurfaceConfig( {
			commandRegistry: ve.ui.wikitextCommandRegistry,
			sequenceRegistry: ve.ui.wikitextSequenceRegistry,
			dataTransferHandlerFactory: ve.ui.wikitextDataTransferHandlerFactory
		} ) );
	}
};

/**
 * Get a wikitext fragment from a document
 *
 * @param {ve.dm.Document} doc Document
 * @return {jQuery.Promise} Abortable promise which resolves with a wikitext string
 */
ve.init.mw.DesktopWikitextArticleTarget.prototype.getWikitextFragment = function ( doc ) {
	var promise,
		xhr = new mw.Api().post(
			{
				action: 'visualeditor',
				paction: 'serialize',
				html: ve.dm.converter.getDomFromModel( doc ).body.innerHTML,
				page: this.pageName,
				oldid: this.revid
			},
			{ contentType: 'multipart/form-data' }
		);

	promise = xhr.then( function ( response ) {
		if ( response.visualeditor ) {
			return response.visualeditor.content;
		}
		return $.Deferred.reject();
	} );

	promise.abort = function () {
		xhr.abort();
	};

	return promise;
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopWikitextArticleTarget.prototype.prepareCacheKey = function () {
	if ( this.mode !== 'source' ) {
		// Parent method
		return ve.init.mw.DesktopWikitextArticleTarget.super.prototype.prepareCacheKey.apply( this, arguments );
	}
	// else: No need, just wikitext
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopWikitextArticleTarget.prototype.tryWithPreparedCacheKey = function ( doc, options ) {
	var data;
	if ( this.mode === 'source' ) {
		data = ve.extendObject( {}, options, { format: 'json' } );

		data.wikitext = Array.prototype.map.call( doc.body.children, function ( p ) { return p.innerText; } ).join( '\n' );

		return new mw.Api().post( data, { contentType: 'multipart/form-data' } );
	} else {
		// Parent method
		return ve.init.mw.DesktopWikitextArticleTarget.super.prototype.tryWithPreparedCacheKey.apply( this, arguments );
	}
};

/* Registration */

ve.init.mw.targetFactory.register( ve.init.mw.DesktopWikitextArticleTarget );

/**
 * MediaWiki UserInterface edit mode visual tool.
 *
 * @class
 * @extends ve.ui.MWEditModeTool
 * @constructor
 * @param {OO.ui.ToolGroup} toolGroup
 * @param {Object} [config] Config options
 */
ve.ui.MWEditModeVisualTool = function VeUiMWEditModeVisualTool() {
	ve.ui.MWEditModeVisualTool.super.apply( this, arguments );
};
OO.inheritClass( ve.ui.MWEditModeVisualTool, ve.ui.MWEditModeTool );
ve.ui.MWEditModeVisualTool.static.name = 'editModeVisual';
ve.ui.MWEditModeVisualTool.static.icon = 'edit';
ve.ui.MWEditModeVisualTool.static.title =
	OO.ui.deferMsg( 'visualeditor-mweditmodevisual-tool' );
/**
 * @inheritdoc
 */
ve.ui.MWEditModeVisualTool.prototype.onSelect = function () {
	this.toolbar.getTarget().switchToVisualEditor();
	this.setActive( false );
};
ve.ui.toolFactory.register( ve.ui.MWEditModeVisualTool );
