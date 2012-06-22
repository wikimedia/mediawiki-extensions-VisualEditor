/**
 * Module for establishing/maintaining socket connection with server
**/

collab.client = function( editorSurface ) {
	this.editor = editorSurface;
	var options = {
	};
}

collab.client.prototype.connect = function( username, responseCallback ) {
	var _this = this;
	var settings = collab.settings;
	try {
		var socket = io.connect( settings.host + ':' + settings.port );
	}
	catch( e ) {
		responseCallback( {
			success: false,
			message: 'Could not connect to server.'
		} );
		return
	}

	socket.on( 'connection', function() {
		socket.callbacks = new collab.callbacks( _this, socket );
		_this.bindEvents( socket );
		// TODO: User has to be handled using the MW auth
		_this.userID = username;
		socket.emit( 'client_connect', { user: username, title: 'Main_Page' } );
		responseCallback( {
			success: true,
			message: 'Connected.'
		} );
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
