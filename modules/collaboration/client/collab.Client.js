/**
 * Client adapter for establishing/maintaining socket connection with server
 *
 * @class
 * @constructor
 * @param {ve.Surface} editorSurface Editor surface to hook the client adapter into
**/

collab.Client = function( editorSurface ) {
	this.editor = editorSurface;
	var options = {
	};

	// Initialize the UI binding object
	this.ui = new collab.UI( this );
}

collab.Client.prototype.connect = function( userName, docTitle, responseCallback ) {
	var _this = this;
	var settings = collab.settings;
	this.userName = userName;
	this.docTitle = docTitle;
	try {
		if( !this.socket ) {
			var socket = io.connect( settings.host + ':' + settings.port );
			this.socket = socket;
			var callbacks = new collab.Callbacks( _this, socket );
			_this.callbacks = callbacks;
			_this.bindEvents( callbacks );
			socket.on( 'connection', function() {
				// callbacks.authenticate( 'upstream' ); Deferred
				// TODO: User has to be handled using the MW auth
				_this.isConnected = true;
				socket.emit( 'client_connect', { user: _this.userName, title: _this.docTitle } );
				responseCallback( {
					success: true,
					message: 'Connected.'
				} );
			});
		}
		else {
			this.socket.socket.connect( settings.host + ':' + settings.port );
		}
	}
	catch( e ) {
		console.log(e);
		responseCallback( {
			success: false,
			message: 'Could not connect to server.'
		} );
		return
	}
};

collab.Client.prototype.disconnect = function() {
	this.callbacks.selfDisconnect();
	this.isConnected = false;
};

/**
 * Single method to bind all I/O events with their callbacks
 *
 * @method
 * @param {collab.Callbacks} callbacksObj Callbacks object for the session
**/
collab.Client.prototype.bindEvents = function( callbacksObj ) {
	var io_socket = callbacksObj.socket;
	var ui = this.ui;
	io_socket.on( 'new_transaction', function( data ) {
		callbacksObj.newTransaction( data );
	});

	io_socket.on( 'client_auth', function( data ) {
		callbacksObj.authenticate( 'downstream', data );
	});

	io_socket.on( 'client_connect', function( data ) {
		callbacksObj.userConnect( data );
		ui.userConnect( data );
	});

	io_socket.on( 'client_disconnect', function( data ) {
		callbacksObj.userDisconnect( data );
		ui.userDisconnect( data );
	});

	io_socket.on( 'document_transfer', function( data ) {
		callbacksObj.docTransfer( data );
		ui.populateUsersList( data.users );
	});
};
