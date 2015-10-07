/*!
 * VisualEditor MediaWiki UserInterface image transfer handler class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see http://ve.mit-license.org
 */

/* global File */

/**
 * Image transfer handler.
 *
 * @class
 * @extends ve.ui.DataTransferHandler
 *
 * @constructor
 * @param {ve.ui.Surface} surface
 * @param {ve.ui.DataTransferItem} item
 */
ve.ui.MWImageTransferHandler = function VeUiMWImageTransferHandler() {
	// Parent constructor
	ve.ui.MWImageTransferHandler.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWImageTransferHandler, ve.ui.DataTransferHandler );

/* Static properties */

ve.ui.MWImageTransferHandler.static.name = 'image';

ve.ui.MWImageTransferHandler.static.kinds = [ 'file' ];

// TODO: Pull available types and extensions from MW config
ve.ui.MWImageTransferHandler.static.types = [ 'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml' ];

ve.ui.MWImageTransferHandler.static.extensions = [ 'jpg', 'jpeg', 'png', 'gif', 'svg' ];

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWImageTransferHandler.prototype.process = function () {
	var action,
		file = this.item.getAsFile();

	// File upload doesn't support pasted Blobs yet
	if ( file instanceof File ) {
		action = ve.ui.actionFactory.create( 'window', this.surface );
		action.open( 'media', { file: file } );
	}
	this.insertableDataDeferred.reject();
};

/* Registration */

ve.ui.dataTransferHandlerFactory.register( ve.ui.MWImageTransferHandler );
