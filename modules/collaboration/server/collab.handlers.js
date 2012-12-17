/**
 * This contains all the handlers for the socket events.
 *
 * Every handler is a static method which accepts the following parameters:
 * - a `Connection` object as first parameter,
 * - the second parameter is an object which contains data received along with the socket event.
 */

var Session = require( './collab.Session.js' ).Session,
	Document = require( './collab.Document.js' ).Document,
	parse = require( './collab.parse.js' ).parse,
	crypto = require( 'crypto' );

var handlers = {};

handlers.authenticate = function( connection, authData ) {
	var ssID = Session.generateID( [ authData.userName,
			authData.docTitle, this.server.docRoutes.length ] );
	var _this = this;
	
 	Session.authenticate( authData.userName, authData.validationToken, function( res ) {
		if( res ) {
			var authResponse = { sessionId: ssID };
		}
		else {
			var authResponse = { error: 'Cannot Authenticate.' };
		}
		connection.emit( 'CLIENT_AUTH', authResponse );
	} );
};

/**
 * Handler method to be invoked when a new client initiates its session.
 * A new Session instance is created, and is bound with the connection.
 * If the requested document is available, then it is used in the session,
 * otherwise, a new document is created.
 *
 * @method
 * @param{Object} data Event data received from the client.
 */
handlers.clientConnection = function( connection, data ) {
	var userName = data.userName,
		docTitle = data.docTitle;

	// We'll call this method after we have the requested document instance ready.
	var postDocInit = function( doc, argAllowPublish ) {
		// Initialize a new Session object.
		var newSession = new Session( doc, userName );
		connection.session = newSession;
		newSession.allowPublish( argAllowPublish );
		
		// Send document data to the client.
		connection.emit( 'DOCUMENT_TRANSFER', {
			html: doc.getHTML(),
			users: connection.getUsers(),
			allowPublish: argAllowPublish
		} );

		// Notify all the connected clients about the new client.
		connection.broadcast( 'CLIENT_CONNECT', { userName: userName, isPublisher: argAllowPublish } );
	};

	var connections = connection.server.documents[docTitle];

	// If an instance for the requested document is available, we'll use it.
	if( typeof connections != 'undefined' || connections != null ) {
		var sessionDoc = connections[0].session.document;
		connections.push( connection );

		if( sessionDoc.hasPublisher ) {
			var argAllowPublish = false;
		} else {
			var argAllowPublish = true;
		}
		postDocInit( sessionDoc, argAllowPublish );
	} else {
		// Start parsing of the requested page by the external parsoid service.
		parse( true, docTitle, function( html ) {
			// Create a new Document object using HTML output from the parser.
			var sessionDoc = new Document( docTitle, html );

			// Store reference to the connection.
			connection.server.documents[ docTitle ] = [ connection ];
			argAllowPublish = true;
			postDocInit( sessionDoc, argAllowPublish );
		} );
	}
};

/**
 * Handler method to be invoked when a client closes its session.
 *
 * @method
 * @param{Object} data Event data received from the server.
 */
handlers.clientDisconnection = function( connection, data ) {
	var session = connection.session;
	var server = connection.server;
	var docTitle = session.document.docTitle;

	if( session ) {
		// Revoke publisher if the session could publish.
		if( session.isPublisher ) {
			session.document.hasPublisher = false;
		}

		var connList = server.documents[ docTitle ];
		var connIndex = connList.indexOf( connection );
		connList.splice( sessionIndex, 1 );

		// Remove the document route if no session is linked to it.
		if( connList.length === 0 ) {
			delete connList;
		}

		connection.broadcast( 'CLIENT_DISCONNECT', this.session.userName );
	}
};

/**
 * Callback method to be invoked when a new transaction arrives at the server
 *
 * @method
 * @param{Object} transactionData Event data received from the client.
 */
handlers.newTransaction = function( connection, transactionData ) {
	var session = connection.session;
	if( session ) {
		var doc = connection.session.document;
		var transaction = transactionData;
		doc.applyTransaction( connection.session, transactionData );
		connection.broadcast( 'NEW_TRANSACTION', transactionData );
	}
};

if ( typeof module == 'object' ) {
	module.exports.handlers = handlers;
}