/**
 * Client adapter for establishing/maintaining socket connection with server
 *
 * @class
 * @constructor
 * @param {ve.Surface} editorSurface Editor surface to hook the client adapter into
**/

collab.Client = function( editorSurface ) {
	var _this = this;
	this.editor = editorSurface;
	var options = {
	};

	// Request and store the validaton token
	this.validationToken = collab.Client.requestValidationToken();

	// Initialize the UI binding object
	this.ui = new collab.UI( this );

	// Bind basic events that are fired by UI
	this.ui.on( 'connect', function( e ) {
		_this.connect( e.userName, e.pageName, _this.ui.setResponseStatus );
	} );
	this.ui.on( 'disconnect', function( e ) {
		_this.disconnect();
	} );


};

collab.Client.requestValidationToken = function( callback ) {
	var settings = collab.settings;
	var tokenUrl = settings.authUrl + '&mode=generate';
	console.log(callback);
	$.get( tokenUrl, function( res ) {
		console.log( res );
		var token = res.TokenValidationResponse.token;
		callback( token );
	} );
};

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
			_this.bindIOEvents( callbacks );
			_this.bindInternalEvents();

			socket.on( 'connection', function() {
				// callbacks.authenticate( 'upstream' ); Deferred
				// TODO: User has to be handled using the MW auth
				_this.isConnected = true;
				responseCallback( {
					success: true,
					message: 'Connected.'
				} );

				// Send an authentication request
				collab.Client.requestValidationToken( function( token ) {
					socket.emit( 'client_auth', { userName: _this.userName, validationToken: token } );
				} );
			} );
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
	this.socket.disconnect();
	this.isConnected = false;
};

/**
 * Single method to bind all I/O events with their callbacks
 *
 * @method
 * @param {collab.Callbacks} callbacksObj Callbacks object for the session
**/
collab.Client.prototype.bindIOEvents = function( callbacksObj ) {
	var io_socket = this.socket;
	var ui = this.ui;

	io_socket.on( 'new_transaction', function( data ) {
		callbacksObj.newTransaction( data );
	} );

	io_socket.on( 'client_auth', function( data ) {
		callbacksObj.authenticate( data );
	} );

	io_socket.on( 'client_connect', function( data ) {
		callbacksObj.userConnect( data );
		ui.userConnect( data );
	} );

	io_socket.on( 'client_disconnect', function( data ) {
		callbacksObj.userDisconnect( data );
		ui.userDisconnect( data );
	} );

	io_socket.on( 'document_transfer', function( data ) {
		callbacksObj.docTransfer( data );
		ui.populateUsersList( data.users );
	} );
};

/**
 * Bind UI and Callbacks events here and build bridges
 *
 * @method
**/
collab.Client.prototype.bindInternalEvents = function() {
	var callbacksObj = this.callbacks;
	var	 ui = this.ui;
	var _this = this;
	var io_socket = this.socket;
	ui.on( 'disconnect', function() {
		_this.disconnect();
		callbacksObj.selfDisconnect();
	} );

	callbacksObj.on( 'disableEditing', function() {
		ui.disableEditing();
	} );

	callbacksObj.on( 'enableEditing', function() {
		ui.enableEditing();
	} );

	callbacksObj.on( 'new_transaction', function( transactionData ) {
		io_socket.emit( 'new_transaction', transactionData );
	} );

	callbacksObj.on( 'client_connect', function( clientData ) {
		io_socket.emit( 'client_connect', clientData );
	} );
};
