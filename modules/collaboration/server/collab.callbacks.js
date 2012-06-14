/**
 * This contains all the callbacks used for handling the server's Socket.IO events
 * Binds all the callback methods to a `callbacks` object which can be used as a module import
**/

Session = require( './collab.Session.js' ).Session;
Document = require( './collab.Document.js' ).Document;
parse = require( './collab.parse.js' ).parse;

callbacks = function( server ) {
	this.server = server;
};

/**
 * Callback method to be invoked when a new client initiates its session
**/
callbacks.prototype.clientConnection = function( data, callback ) {
	var userID = data.user;
	var docTitle = data.title;
	var sessions = this.server.sessions;
	var remoteSSID = data.ssid;
	var session_doc = null;
	_this = this;
	docHTML = '';
	// Parse the page by its title using the parser
	parse( docTitle, function( docHTML ) {
		for( session in sessions ) {
			var docID = sessions[ session ].Document.getID();
			/*if( docID == remotedocID ) {
				session_doc = session[ session ].Document;
				break;
			}*/
		}
		if( session_doc == null ) {
			session_doc = new Document( docHTML );
		}
		_this.session = new Session( session_doc, userID );
		sessions.push( { 'ssid': _this.session.getID(), 'session': _this.session } );
		_this.server.sessionIndex++;
		callback( docHTML );
	});
};

/**
 * Callback method to be invoked when a client closes its session
**/
callbacks.prototype.clientDisconnection = function( data ) {
	this.server.sessions.pop( this.sessionIndex );
	this.server.sessionIndex--;
};

/**
 * Callback method to be invoked when a new transaction arrives at the server
**/
callbacks.prototype.newTransaction = function( data ) {
	var doc = this.session.Document;
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
