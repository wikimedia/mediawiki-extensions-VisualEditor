/*!
 * VisualEditor MediaWiki Initialization MobileCollabTarget class.
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
ve.init.mw.MobileCollabTarget = function VeInitMwMobileCollabTarget( title, rebaserUrl, config ) {
	// Parent constructor
	ve.init.mw.MobileCollabTarget.super.call( this, title, rebaserUrl, config );

	// Initialization
	this.$element.addClass( 've-init-mw-mobileArticleTarget ve-init-mw-mobileCollabTarget' );

	$( 'body' ).removeClass( 'ns-special' );
};

/* Inheritance */

OO.inheritClass( ve.init.mw.MobileCollabTarget, ve.init.mw.CollabTarget );

/* Static Properties */

ve.init.mw.MobileCollabTarget.static.actionGroups = [
	{
		name: 'authorList',
		include: [ 'authorList' ]
	}
];

/* Methods */

/**
 * @inheritdoc
 */
ve.init.mw.MobileCollabTarget.prototype.setSurface = function ( surface ) {
	surface.$element.addClass( 'content' );

	// Parent method
	ve.init.mw.MobileCollabTarget.super.prototype.setSurface.apply( this, arguments );
};

/* Registration */

ve.init.mw.targetFactory.register( ve.init.mw.MobileCollabTarget );
