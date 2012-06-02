/**
 * This contains all the callbacks used for handling the client's Socket.IO events
**/

collab.callbacks = function( server ) {
	this.client = client;
};

/**
 * Callback method to be invoked when a new client initiates its session
**/
collab.callbacks.prototype.userConnect = function( data ) {
	// do something on the front-end
};

/**
 * Callback method to be invoked when a client disconnects from the server
**/
collab.callbacks.prototype.clientDisconnection = function( data ) {
	// do something on the front-end
};

/**
 * Callback method to be invoked when a new transaction arrives at the client
**/
callbacks.prototype.newTransaction = function( trasaction ) {
	//apply the transaction through the transaction processor
};
