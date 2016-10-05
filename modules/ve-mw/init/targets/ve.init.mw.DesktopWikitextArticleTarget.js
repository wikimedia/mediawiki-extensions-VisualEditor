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
ve.init.mw.DesktopWikitextArticleTarget.prototype.switchToWikitextEditor = function ( discardChanges, modified ) {
	var dataPromise,
		target = this;

	if ( discardChanges ) {
		dataPromise = mw.libs.ve.targetLoader.requestPageData(
			'source',
			this.pageName,
			this.requestedRevId,
			this.constructor.name
		).then(
			function ( response ) { return response; },
			function () {
				// TODO: Some sort of progress bar?
				ve.init.mw.DesktopWikitextArticleTarget.super.prototype.switchToWikitextEditor.call(
					target,
					discardChanges,
					modified
				);
				// Keep everything else waiting so our error handler can do its business
				return $.Deferred().promise();
			}
		);
	} else {
		this.serialize( this.getDocToSave() );
		dataPromise = this.serializing;
	}
	this.setMode( 'source' );
	this.reloadSurface( dataPromise );
};

/**
 * Switch to the visual editor.
 */
ve.init.mw.DesktopWikitextArticleTarget.prototype.switchToVisualEditor = function () {
	var dataPromise, windowManager, switchWindow,
		target = this;

	if ( this.section !== null ) {
		// WT -> VE switching is not yet supported in sections, so
		// show a discard-only confirm dialog, then reload the whole page.
		windowManager = new OO.ui.WindowManager();
		switchWindow = new mw.libs.ve.SwitchConfirmDialog();
		$( 'body' ).append( windowManager.$element );
		windowManager.addWindows( [ switchWindow ] );
		windowManager.openWindow( switchWindow, { mode: 'simple' } )
			.then( function ( opened ) {
				return opened;
			} )
			.then( function ( closing ) { return closing; } )
			.then( function ( data ) {
				if ( data && data.action === 'discard' ) {
					target.setMode( 'visual' );
					target.reloadSurface();
				}
				windowManager.destroy();
			} );
	} else {
		dataPromise = mw.libs.ve.targetLoader.requestParsoidData(
			this.pageName,
			this.revid,
			this.constructor.name,
			this.edited,
			this.getDocToSave()
		);

		this.setMode( 'visual' );
		this.reloadSurface( dataPromise );
	}
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopWikitextArticleTarget.prototype.onWindowPopState = function ( e ) {
	var veaction, mode;

	if ( !this.verifyPopState( e.state ) ) {
		return;
	}

	// Parent method
	ve.init.mw.DesktopWikitextArticleTarget.super.prototype.onWindowPopState.apply( this, arguments );

	veaction = this.currentUri.query.veaction;
	mode = veaction === 'editsource' ? 'source' : 'visual';

	if ( this.active ) {
		if ( veaction === 'editsource' && this.mode === 'visual' ) {
			this.actFromPopState = true;
			this.switchToWikitextEditor();
		} else if ( veaction === 'edit' && this.mode === 'source' ) {
			this.actFromPopState = true;
			this.switchToVisualEditor();
		}
	}
};

/**
 * Reload the target surface in the new editor mode
 */
ve.init.mw.DesktopWikitextArticleTarget.prototype.reloadSurface = function ( dataPromise ) {
	var target = this;
	// Create progress - will be discarded when surface is destroyed.
	this.getSurface().createProgress(
		$.Deferred().promise(),
		ve.msg( this.mode === 'source' ? 'visualeditor-mweditmodesource-progress' : 'visualeditor-mweditmodeve-progress' ),
		true /* non-cancellable */
	);
	this.activating = true;
	this.activatingDeferred = $.Deferred();
	this.load( dataPromise );
	this.activatingDeferred.done( function () {
		target.updateHistoryState();
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
			p.appendChild( doc.createTextNode( line ) );
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
 * @inheritdoc
 */
ve.init.mw.DesktopWikitextArticleTarget.prototype.restoreEditSection = function () {
	if ( this.mode !== 'source' ) {
		// Parent method
		return ve.init.mw.DesktopWikitextArticleTarget.super.prototype.restoreEditSection.apply( this, arguments );
	}
};

/**
 * Get a wikitext fragment from a document
 *
 * @param {ve.dm.Document} doc Document
 * @param {boolean} [useRevision=true] Whether to use the revision ID + ETag
 * @return {jQuery.Promise} Abortable promise which resolves with a wikitext string
 */
ve.init.mw.DesktopWikitextArticleTarget.prototype.getWikitextFragment = function ( doc, useRevision ) {
	var promise, xhr,
		params = {
			action: 'visualeditor',
			paction: 'serialize',
			html: ve.dm.converter.getDomFromModel( doc ).body.innerHTML,
			page: this.pageName
		};

	if ( useRevision === undefined || useRevision ) {
		params.oldid = this.revid;
		params.etag = this.etag;
	}

	xhr = new mw.Api().post(
		params,
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
ve.init.mw.DesktopWikitextArticleTarget.prototype.createModelFromDom = function ( doc ) {
	var i, l, conf, children, data;

	if ( this.mode !== 'source' ) {
		// Parent method
		return ve.init.mw.DesktopWikitextArticleTarget.super.prototype.createModelFromDom.apply( this, arguments );
	}

	conf = mw.config.get( 'wgVisualEditor' );
	children = doc.body.children;
	data = [];

	// Wikitext documents are just plain text paragraphs, so we can just do a simple manual conversion.
	for ( i = 0, l = children.length; i < l; i++ ) {
		data.push( { type: 'paragraph' } );
		ve.batchPush( data, children[ i ].textContent.split( '' ) );
		data.push( { type: '/paragraph' } );
	}
	data.push( { type: 'internalList' }, { type: '/internalList' } );
	return new ve.dm.Document( data, doc, null, null, null, conf.pageLanguageCode, conf.pageLanguageDir );
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
ve.init.mw.DesktopWikitextArticleTarget.prototype.createDocToSave = function () {
	var i, l, text, data;

	if ( this.mode !== 'source' ) {
		// Parent method
		return ve.init.mw.DesktopWikitextArticleTarget.super.prototype.createDocToSave.apply( this, arguments );
	}

	text = '';
	data = this.getSurface().getModel().getDocument().data.data;
	for ( i = 0, l = data.length; i < l; i++ ) {
		if ( data[ i ].type === '/paragraph' && data[ i + 1 ].type === 'paragraph' ) {
			text += '\n';
		} else if ( !data[ i ].type ) {
			text += data[ i ];
		}
	}

	return text;
};

/**
 * @inheritdoc
 */
ve.init.mw.DesktopWikitextArticleTarget.prototype.tryWithPreparedCacheKey = function ( doc, options ) {
	var data;
	if ( this.mode === 'source' ) {
		data = {
			wikitext: doc,
			format: 'json'
		};
		if ( this.section !== null ) {
			data.section = this.section;
		}
		return new mw.Api().post(
			ve.extendObject( {}, options, data ),
			{ contentType: 'multipart/form-data' }
		);
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
	OO.ui.deferMsg( 'visualeditor-mweditmodeve-tool' );
/**
 * @inheritdoc
 */
ve.ui.MWEditModeVisualTool.prototype.onSelect = function () {
	this.toolbar.getTarget().switchToVisualEditor();
	this.setActive( false );
};
/**
 * @inheritdoc
 */
ve.ui.MWEditModeVisualTool.prototype.onUpdateState = function () {
	// Parent method
	ve.ui.MWEditModeVisualTool.super.prototype.onUpdateState.apply( this, arguments );

	this.setDisabled( !mw.libs.ve.isVisualAvailable );
};
ve.ui.toolFactory.register( ve.ui.MWEditModeVisualTool );
