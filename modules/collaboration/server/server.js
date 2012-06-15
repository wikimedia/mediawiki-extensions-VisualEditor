/**
 * This is the collaboration server for VisualEditor
 * 
 * Uses Socket.IO to establish connections with clients
 * This module implements all the Socket.IO events and calls the respective callback functions
**/

io = require( 'socket.io' );
callbacks = require( './collab.callbacks.js' ).callbacks;
settings = require( '../settings.js' ).settings;

/**
 * CollaborationServer binds all the functionality of the server and
 * can be imported as a module.
 * Accepts a port number to run on, 
**/

CollaborationServer = function () {
	var io_service = io.listen( settings.port );

	// Document-wise closures of callback instances
	this.docRoutes = [];
	_this = this;

	io_service.on( 'connection', function( socket ) {
		socket.emit( 'connection', {} );
		var socket_callbacks = new callbacks( collab );
		socket_callbacks.socket = socket;
		collab.bindEvents( socket_callbacks );
	});
};	

/**
 * Binds all socket events to the corresponding callback functions
**/
CollaborationServer.prototype.bindEvents = function( callbacksObj ) {
	var io_socket = callbacksObj.socket;
	io_socket.on( 'client_connect', function( data ) {
		callbacksObj.clientConnection( data, function( docHTML ) {
			io_socket.emit( 'document_transfer', { html: docHTML } );
		});
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

collab = new CollaborationServer();
