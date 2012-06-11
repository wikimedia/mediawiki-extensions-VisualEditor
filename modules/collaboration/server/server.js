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
	this.sessionIndex = -1;
	this.sessions = [];
	_this = this;
	io_service.on( 'connection', function( socket ) {
		socket.emit( 'connection', {} );
		var socket_callbacks = new callbacks( collab );
		socket.callbacks = socket_callbacks;
		collab.bindEvents( socket );
	});
};

/**
 * Binds all socket events to the corresponding callback functions
**/
CollaborationServer.prototype.bindEvents = function( io_socket ) {
	var socket_callbacks = io_socket.callbacks;
	io_socket.on( 'client_connect', function( data ) {
		socket_callbacks.clientConnection( data, function( docHTML ) {
			io_socket.emit( 'document_transfer', { html: docHTML } );
		});
	});

	io_socket.on( 'client_disconnect', function( data ) {
		socket_callbacks.clientDisconnection( data );
	});
	
	io_socket.on( 'new_trasaction', function( data ) {
		socket_callbacks.newTrasaction( data );
	});

	io_socket.on( 'document_save', function( data ) {
		socket_callbacks.saveDocument( data );
	});
};

collab = new CollaborationServer();
