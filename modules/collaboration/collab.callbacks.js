/**
 * This contains all the callbacks used for handling the server's Socket.IO events
 * Binds all the callback methods to a `callbacks` object which can be used as a module import
**/

Session = require( './collab.Session' ).Session;
Document = require( './collab.Document' ).Document;

callbacks = function( server ) {
	this.server = server;
};

/**
 * Callback method to be invoked when a new client initiates its session
**/
callbacks.prototype.clientConnection = function( data ) {
	var userID = data.user;
	var docTitle = data.title;
	/**
	* TODO: look for a session if there exists one for the requested document
	* if exists, reference the document in a new session object
	* if not create a new document object and reference it in the session object
	**/
	this.session = new Session( docTitle, userID );
	this.server.push( { 'ssid': this.session.getID(), 'session': this.session } );
};

/**
 * Callback method to be invoked when a client closes its session
**/
callbacks.prototype.clientDisconnection = function( user ) {

};

/**
 * Callback method to be invoked when a new transaction arrives at the server
**/
callbacks.prototype.newTransaction = function( trasaction ) {

};

/**
 * Callback method to be invoked when a save document command is received from the client
 * This passes control to the parser's page Save pipeline
**/
callbacks.prototype.saveDocument = function( transaction ) {

};

if ( typeof module == 'object' ) {
	module.exports.callbacks = callbacks;
}
