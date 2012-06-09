/**
 * This contains all the callbacks used for handling the client's Socket.IO events
**/

collab.callbacks = function( client ) {
	this.client = client;
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
//	var linearData = ve.dm.HTMLConverter.getLinearModel( $( data.html)[0] );
	var html = $('<div>' + data.html + '</div>' );
	console.log( html[0] );
	init_doc( html[0] );
	// load data
};
