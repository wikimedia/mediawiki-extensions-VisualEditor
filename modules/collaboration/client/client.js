/**
 * Module for establishing/maintaining socket connection with server
**/

collab.client = function( host, port ) {
	var settings = collab.settings;
	_this = this;
	sockets = io.connect( settings.host + ':' + settings.port );
	sockets.on( 'connection', function( socket ) {
		socket.set( 'callbacks', new callbacks( _this ) );
		_this.bindEvents( socket )
	});
};

collab.client.prototype.bindEvents = function( io_socket ) {
	var socket_callbacks = io_socket.get( 'callbacks' );
	io_socket.on( 'new_transaction', function( data ) {
		socket_callbacks.newTransaction( data );
	});
	
	io_socket.on( 'user_connect', function( data ) {
		socket_callbacks.userConnect( data );
	});

	io_socket.on( 'user_disconnect', function( data ) {
		socket_callbacks.userDisconnect( data ):
	});
};
