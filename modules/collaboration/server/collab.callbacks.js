/**
 * This contains all the callbacks used for handling the server's Socket.IO events
 * Binds all the callback methods to a `callbacks` object which can be used as a module import
**/

Session = require( './collab.Session.js' ).Session;
Document = require( './collab.Document.js' ).Document;
parse = require( './collab.parse.js' ).parse;

callbacks = function( server, socket ) {
	this.server = server;
	this.socket = socket;
};

callbacks.prototype.broadcaste = function( event, args ) {
	var routeCallbacks = this.sessionRoute.callbacks;
	for( cb in routeCallbacks ) {
		var socket = routeCallbacks[ cb ].socket;
		socket.emit( event, args );
	}
}

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
		var sessionRoute = _this.server.lookupRoutes( docTitle );
		if( sessionRoute ) {
			sessionDoc = sessionRoute.document;
			sessionRoute.callbacks.push( _this );
			var argAllowPublish = false;
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
			var argAllowPublish = true;
			docRoutes.push( sessionRoute );
		}
		_this.sessionRoute = sessionRoute;
		_this.session = new Session( sessionDoc, userID, sessionRoute.callbacks.length - 1 );
		_this.session.allowPublish( argAllowPublish );
		_this.socket.emit( 'document_transfer', { html: docHTML, allowPublish: argAllowPublish } );

		// Bind some session events here
		_this.session.on( 'allowPublish', function( e ) {
			var routeCallbacks = sessionRoute.callbacks;
			sessionRoute.document.hasPublisher = false;
			if( !e ) {
				for( cb in routeCallbacks ) {
					var callback = routeCallbacks[ cb ];
					if( callback.session.isPublisher == true ) {
						sessionRoute.document.hasPublisher = true;
						break;
					}
				}
			}
		} );
		
		_this.broadcaste( 'client_connect', userID );

	} );

};

/**
 * Callback method to be invoked when a client closes its session
**/
callbacks.prototype.clientDisconnection = function( data ) {
	var sessionIndex = this.session.sessionIndex;
	this.sessionRoute.callbacks.pop( sessionIndex );
	this.broadcaste( 'client_disconnect', this.session.user );
};

/**
 * Callback method to be invoked when a new transaction arrives at the server
**/
callbacks.prototype.newTransaction = function( transactionData ) {
	var doc = this.session.Document;
	var transaction = transactionData;
	doc.applyTransaction( this.session, transactionData );
	this.broadcaste( 'new_transaction', transactionData );
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
