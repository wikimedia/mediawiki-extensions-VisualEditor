/**
 * This contains all the callbacks used for handling the server's Socket.IO events
 * Binds all the callback methods to a `callbacks` object which can be used as a module import
**/

var Session = require( './collab.Session.js' ).Session,
	Document = require( './collab.Document.js' ).Document,
	parse = require( './collab.parse.js' ).parse,
	crypto = require( 'crypto' );

Callbacks = function( server, socket ) {
	this.server = server;
	this.socket = socket;
};

/**
 * Broadcastes an event to all the connected clients.
 * Iterates over all the callback instances of the routeCallbacks, and emits the event for each.
 *
 * @method
 * @param{String} event Event name to broadcast.
 * @param{Object} args Associated data to send.
**/
Callbacks.prototype.broadcast = function( event, args ) {
	var routeCallbacks = this.sessionRoute.callbacks;
	for( cb in routeCallbacks ) {
		var socket = routeCallbacks[ cb ].socket;
		socket.emit( event, args );
	}
};

Callbacks.prototype.authenticate = function( authData ) {
	var ssID = Session.generateID( [ authData.userName, 
			authData.docTitle, this.server.docRoutes.length ] );
	this.socket.emit( 'client_auth', { sessionID: ssID } );
};

/**
 * Callback method to be invoked when a new client initiates its session.
 * A new Session instance is created, and is associated with a docRoute if
 * the document requested is already being edited. If the requested document
 * is not being edited then the document is parsed and new docRoute is created.
 *
 * @method
 * @param{Object} data Event data received from the server.
**/
Callbacks.prototype.clientConnection = function( data ) {
	var userID = data.user,
		docTitle = data.title,
		docRoutes = this.server.docRoutes,
		remoteSSID = data.ssid,
		sessionRoute = null,
		_this = this,
		docHTML = '',
		sessionDoc = null,
		argAllowPublish = false;

	var postDocInit = function() {
		_this.sessionRoute = sessionRoute;
		_this.session = new Session( sessionDoc, userID );
		var routeCallbacks = sessionRoute.callbacks;
		// Bind some session events here
		_this.session.on( 'allowPublish', function( e ) {
			if( e ) {
				sessionRoute.document.hasPublisher = true;
			}			
			else {
				sessionRoute.document.hasPublisher = false;
				for( cb in routeCallbacks ) {
					var callback = routeCallbacks[ cb ];
					if( callback.session.isPublisher == true ) {
						sessionRoute.document.hasPublisher = true;
						break;
					}
				}
			}
		} );
		_this.session.allowPublish( argAllowPublish );
		_this.socket.emit( 'document_transfer', { 
			html: docHTML,
			users: function() {
				var users = [];
				for( cb in routeCallbacks ) {
					if( routeCallbacks[ cb ] != _this ) {
						var session = routeCallbacks[ cb ].session;
						users.push( {
							userName: session.userName,
							isPublisher: session.isPublisher
						} );
					}
				}
				return users;
			}(),
			allowPublish: argAllowPublish 
		} );
		_this.broadcast( 'client_connect', { userName: userID, isPublisher: argAllowPublish } );
	};

	var sessionRoute = this.server.lookupRoutes( docTitle );
	if( sessionRoute ) {
		var sessionDoc = sessionRoute.document;
		sessionRoute.callbacks.push( this );
		if( sessionDoc.hasPublisher ) {
			argAllowPublish = false;
		}
		else {
			argAllowPublish = true;
		}
		docHTML = sessionDoc.getHTML();
		postDocInit();
	}

	if( sessionRoute == null ) {
		// Parse the page by its title using the external parsoid service
		parse( true, docTitle, function( html ) {
			/** 
			 * Proceed with creating a new route with a new document,
			 * if no existing document route was found.
			**/
			docHTML = html
			sessionDoc = new Document( docTitle, html );
			sessionRoute = {
				document: sessionDoc,
				callbacks: [ _this ]
			};
			argAllowPublish = true;
			docRoutes.push( sessionRoute );
			postDocInit();
		} );
	}
};

/**
 * Callback method to be invoked when a client closes its session
 *
 * @method
 * @param{Object} data Event data received from the server.
**/
Callbacks.prototype.clientDisconnection = function( data ) {
	if( this.session ) {
		// Revoke publisher if the session could publish
		if( this.session.isPublisher ) {
			this.session.Document.hasPublisher = false;
		}

		var sessionIndex = this.sessionRoute.callbacks.indexOf( this );
		this.sessionRoute.callbacks.splice( sessionIndex, 1 );

		// Remove the document route if no session is linked to it.
		if( this.sessionRoute.callbacks.length === 0 ) {
			var docRoutes = this.server.docRoutes;
			var routeIndex = docRoutes.indexOf( this.sessionRoute );
			docRoutes.splice( routeIndex, 1 );
		}

		this.broadcast( 'client_disconnect', this.session.userName );
	}

};

/**
 * Callback method to be invoked when a new transaction arrives at the server
 *
 * @method
 * @param{Object} transactionData Event data received from the client. 
**/
Callbacks.prototype.newTransaction = function( transactionData ) {
	var doc = this.session.Document;
	var transaction = transactionData;
	doc.applyTransaction( this.session, transactionData );
	this.broadcast( 'new_transaction', transactionData );
};

/**
 * Callback method to be invoked when a save document command is received from the client
 * This passes control to the parser's page Save pipeline
**/
Callbacks.prototype.saveDocument = function( transaction ) {

};

if ( typeof module == 'object' ) {
	module.exports.Callbacks = Callbacks;
}
