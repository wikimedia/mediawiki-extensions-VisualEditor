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
 * @param {Object} [config] Configuration options
 */
ve.init.mw.CollabTarget = function VeInitMwCollabTarget( config ) {
	config = config || {};
	config.toolbarConfig = $.extend( {
		shadow: true,
		actions: true,
		floatable: true
	}, config.toolbarConfig );

	// Parent constructor
	ve.init.mw.CollabTarget.super.call( this, config );

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

/* Methods */

/**
 * Page modifications after editor load.
 */
ve.init.mw.CollabTarget.prototype.transformPage = function () {
	this.$originalContent.append( this.$element.siblings() );
};

/**
 * @inheritdoc
 */
ve.init.mw.CollabTarget.prototype.attachToolbar = function () {
	this.toolbar.$element.addClass( 've-init-mw-desktopArticleTarget-toolbar ve-init-mw-desktopArticleTarget-toolbar-opened' );
	this.$element.prepend( this.toolbar.$element );
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

/* Registration */

ve.init.mw.targetFactory.register( ve.init.mw.CollabTarget );
