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
callbacks.prototype.clientConnection = function( data ) {
	console.log('new connection');
	console.log(data);
	var userID = data.user,
		docTitle = data.title,
		docRoutes = this.server.docRoutes,
		remoteSSID = data.ssid,
		sessionRoute = null,
		_this = this,
		docHTML = '';

	// Parse the page by its title using the parser
	parse( docTitle, function( docHTML ) {
		for( route in docRoutes ) {
			console.log( docRoutes );
			var docID = docRoutes[ route ].document.getID();
			if( docID == Document.generateID( docTitle ) ) {
				sessionRoute = docRoutes[ route ];
				var sessionDoc = sessionRoute.document;
				sessionRoute.callbacks.push( _this );
				break;
			}
		}

		/** 
		 * Proceed with creating a new route with a new document,
		 * if no existing document route was found.
		**/
		if( sessionRoute == null ) {
			var sessionDoc = new Document( docTitle, docHTML );
			sessionRoute = {
				document: sessionDoc,
				callbacks: [ _this ]
			};
			docRoutes.push( sessionRoute );
		}
		_this.sessionRoute = sessionRoute;
		_this.session = new Session( sessionDoc, userID );
		_this.socket.emit( 'document_transfer', { html: docHTML } );
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
callbacks.prototype.newTransaction = function( transaction ) {
	var doc = this.session.Document;
	doc.applyTransaction( this.session, transaction );
	
	var routeCallbacks = this.sessionRoute.callbacks;
	for( cb in routeCallbacks ) {
		var socket = routeCallbacks[ cb ].socket;
		socket.emit( 'new_transaction', transaction );
	}
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
