/**
 * Module for establishing/maintaining socket connection with server
**/

collab.Client = function( editorSurface ) {
	this.editor = editorSurface;
	var options = {
	};
}

collab.Client.prototype.connect = function( username, responseCallback ) {
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
		var callbacks = new collab.Callbacks( _this, socket );
		// callbacks.authenticate( 'upstream' ); Deferred
		_this.bindEvents( callbacks );
		// TODO: User has to be handled using the MW auth
		_this.userID = username;
		socket.emit( 'client_connect', { user: username, title: 'Main_Page' } );
		responseCallback( {
			success: true,
			message: 'Connected.'
		} );
	});
};

collab.Client.prototype.bindEvents = function( callbackObj ) {
	var io_socket = callbacksObj.socket;
	io_socket.on( 'new_transaction', function( data ) {
		socket_callbacks.newTransaction( data );
	});

	io_socket.on( 'client_auth', function( data ) {
		socket_callbacks.authenticate( 'downstream', data );
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
