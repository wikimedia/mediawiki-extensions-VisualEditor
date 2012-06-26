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
		console.log(e);
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

collab.Client.prototype.bindEvents = function( callbacksObj ) {
	var io_socket = callbacksObj.socket;
	io_socket.on( 'new_transaction', function( data ) {
		callbacksObj.newTransaction( data );
	});

	io_socket.on( 'client_auth', function( data ) {
		callbacksObj.authenticate( 'downstream', data );
	});

	io_socket.on( 'client_connect', function( data ) {
		callbacksObj.userConnect( data );
	});

	io_socket.on( 'client_disconnect', function( data ) {
		callbacksObj.userDisconnect( data );
	});
	io_socket.on( 'document_transfer', function( data ) {
		callbacksObj.docTransfer( data );
	});
};
