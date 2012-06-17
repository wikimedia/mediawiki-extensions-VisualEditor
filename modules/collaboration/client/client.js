/**
 * Module for establishing/maintaining socket connection with server
**/

collab.client = function( surfaceModel ) {
	var settings = collab.settings;
	this.surfaceModel = surfaceModel;
	var options = {
	};
	_this = this;
	var socket = io.connect( settings.host + ':' + settings.port );
	socket.on( 'connection', function() {
		socket.callbacks = new collab.callbacks( _this, socket );
		_this.bindEvents( socket );
		// TODO: User has to be handled using the MW auth
		var user = prompt( 'enter username' );
		_this.userID = user;
		socket.emit( 'client_connect', { user: user, title: 'Main_Page' } );
	});
};

collab.client.prototype.bindEvents = function( io_socket ) {
	var socket_callbacks = io_socket.callbacks;
	io_socket.on( 'new_transaction', function( data ) {
		socket_callbacks.newTransaction( data );
	});
	
	io_socket.on( 'client_connect', function( data ) {
		socket_callbacks.userConnect( data );
	});

	io_socket.on( 'client_disconnect', function( data ) {
		socket_callbacks.userDisconnect( data );
	});
	io_socket.on( 'document_transfer', function( data ) {
		socket_callbacks.docTransfer( data );
	});
};
