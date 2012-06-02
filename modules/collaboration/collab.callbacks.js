/**
 * This contains all the callbacks used for handling the server's Socket.IO events
 * Binds all the callback methods to a `callbacks` object which can be used as a module import
**/

Session = require( './collab.Session' ).Session;
Document = require( './collab.Document' ).Document;
parse = require.( './collab.parse.js' ).parse;

callbacks = function( server ) {
	this.server = server;
};

/**
 * Callback method to be invoked when a new client initiates its session
**/
callbacks.prototype.clientConnection = function( data ) {
	var userID = data.user;
	var docTitle = data.title;
	var sessions = this.server.sessions;
	var remoteSSID = data.ssid;
	var session_doc = null;
	docHTML = '';
	
	// Parse the page by its title using the parser
	docHTML = parse( docTitle );

	for( session in sessions ) {
		var ssid = sessions[ session ].ssid;
		if( ssid = remoteSSID ) {
			session_doc = session[ session ].Document;
			break;
		}
	}
	if( session_doc == null ) {
		session_doc = new Document( docHTML );
	}
	this.session = new Session( docTitle, userID );
	this.sessionIndex = sessions.length - 1;
	sessions.push( { 'ssid': this.session.getID(), 'session': this.session } );
};

/**
 * Callback method to be invoked when a client closes its session
**/
callbacks.prototype.clientDisconnection = function( data ) {
	this.server.sessions.pop( this.sessionIndex );
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
