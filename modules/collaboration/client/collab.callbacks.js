/**
 * This contains all the callbacks used for handling the client's Socket.IO events
**/

collab.callbacks = function( client, socket ) {
	this.client = client;
	this.socket = socket;
};

/**
 * Callback method to be invoked when a new client initiates its session
**/
collab.callbacks.prototype.userConnect = function( data ) {
	// do something on the front-end
};

/**
 * Callback method to be invoked when a client disconnects from the editing session
**/
collab.callbacks.prototype.clientDisconnection = function( data ) {
	// do something on the front-end
};

/**
 * Callback method to be invoked when a new transaction arrives at the client
**/
collab.callbacks.prototype.newTransaction = function( trasaction ) {
	//apply the transaction through the transaction processor
};

collab.callbacks.prototype.docTransfer = function( data ) {
	var html = $('<div>' + data.html + '</div>' );
	// FIXME: this needs to be rewritten in the server's code
	// rather than calling the one defined in sandbox.js
	init_doc( html[0] );
	var socket = this.socket;	
	var editorSurface = window.sandboxEditor,
		surfaceModel = editorSurface.getSurfaceModel();
	surfaceModel.on( 'transact', function( transaction ) {
		socket.emit( 'new_transaction', transaction );
	});
};
