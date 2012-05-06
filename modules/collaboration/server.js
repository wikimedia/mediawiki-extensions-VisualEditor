/**
 * This is the collaboration server for VisualEditor
 * 
 * Responsible for powering the collaborative editing feature
 * Uses Socket.IO to establish connections with clients
 * This module implements all the Socket.IO events and calls the respective callback functions
**/

io = require( 'socket.io' );
callbacks = require( 'collab.callbacks' ).callbacks;

/**
 * CollaborationServer binds all the functionality of the server and
 * can be imported as a module.
 * Accepts a port number to run on, 
**/

CollaborationServer = function ( port ) {
  var io_service = io.listen( port );
  io_service.on( 'connection', function( socket ) {
    this.bindEvents( socket );
  });
};

/**
 * Binds all socket events to the corresponding callback functions
**/
                                                                            i 
CollaborationServer.prototype.bindEvents = function( io_socket ) {
  io_socket.on('client_connect', function( data ) {
    callbacks.clientConnection( data );
  });
  
  io_socket.on('client_disconnect', function( data ) {
    callbacks.clientDisconnection( data );
  });
  
  io_socket.on('new_trasaction', function( data ) {
    callbacks.newTrasaction( data );
  });
};
