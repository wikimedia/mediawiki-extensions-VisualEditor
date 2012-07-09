/**
 * This is the collaboration server for VisualEditor
 * 
 * Uses Socket.IO to establish connections with clients
 * This module implements all the Socket.IO events and calls the respective callback functions
**/

var io = require( 'socket.io' ),
	Callbacks = require( './collab.Callbacks.js' ).Callbacks,
	Document = require( './collab.Document.js' ).Document,
	settings = require( '../settings.js' ).settings;

/**
 * CollaborationServer binds all the functionality of the server and
 * can be imported as a module.
**/

CollaborationServer = function() {
	// Document-wise closures of callback instances
	this.docRoutes = [];
};	

CollaborationServer.prototype.listen = function() {
	var _this = this;
	var io_service = io.listen( settings.port );

	io_service.on( 'connection', function( socket ) {
		var socket_callbacks = new Callbacks( _this, socket );
		_this.bindEvents( socket_callbacks );
		socket.emit( 'connection', {} );
	});
};

/**
 * Binds all socket events to the corresponding callback functions
**/
CollaborationServer.prototype.bindEvents = function( callbacksObj ) {
	// Socket events are registered here
	var io_socket = callbacksObj.socket;
	io_socket.on( 'client_connect', function( data ) {
		callbacksObj.clientConnection( data );
	});
	
	io_socket.on( 'client_auth', function( data ) {
		callbacksObj.authenticate( data );
	});

	io_socket.on( 'disconnect', function( data ) {
		callbacksObj.clientDisconnection( data );
	});

	io_socket.on( 'client_disconnect', function( data ) {
		callbacksObj.clientDisconnection( data );
	});
	
	io_socket.on( 'new_transaction', function( data ) {
		callbacksObj.newTransaction( data );
	});

	io_socket.on( 'document_save', function( data ) {
		callbacksObj.saveDocument( data );
	});

};

/**
 * Lookup a route with matching docTitle in the docRoutes
**/
CollaborationServer.prototype.lookupRoutes = function( docTitle ) {
	var lookupRoute = null;
	var docRoutes = this.docRoutes;

	for( route in docRoutes ) {
		var docID = docRoutes[ route ].document.getID();
		if( docID == Document.generateID( docTitle ) ) {
			lookupRoute = docRoutes[ route ];
			break;
		}
	}

	return lookupRoute;
};

if( module.parent ) {
	module.exports.CollaborationServer = CollaborationServer;
}
else {
	var collab = new CollaborationServer();
	collab.listen();
}
