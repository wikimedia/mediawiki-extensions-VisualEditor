var handlers = require( './collab.handlers.js' ).handlers,
	Document = require( './collab.Document.js' ).Document,
	Session = require( './collab.Session.js' ).Session,
	ve = require( './collab.ve.js' ).ve; 

/**
 * @class
 * @constructor
 * @param{Socket} socket Network socket that is used by this connection.
 */
Connection = function( server, socket ) {
	// Init some instance members.
	this.socket = socket;
	this.session = null;
	this.server = server;

	// Event-handler pairs.
	// This encloses the entire protocol used by the collaboration server.
	this.events = [
		[ 'CLIENT_AUTH', handlers.authenticate ],
		[ 'CLIENT_CONNECT', handlers.clientConnection ],
		//[ 'DOCUMENT_TRANSFER', handlers.documentTransfer ],
		[ 'disconnect', handlers.clientDisconnection ],
		[ 'NEW_TRANSACTION', handlers.newTransaction ],
		//[ 'DOCUMENT_SAVE', handlers.saveDocument ]
	];

	// Bind all socket events with the handlers
	this.bindEvents();

	// Emit a success event
	this.emit( 'CONNECTION', {} );
};

/**
 * Emit an event through network socket associated with this connection.
 *
 * @method
 * @param{String} event Event name to emit.
 * @param{Object} data Associative array containing the data to send along the event.
 */
Connection.prototype.emit = function( event, data ) {
	this.socket.emit( event, data );
	
	// Log the sent event if applicable.
}

/**
 * Method to get the list of connections bind to the same document.
 *
 * @method
 */
Connection.prototype.getSiblingConnections = function() {
	var docTitle = this.session.document.title;
	return this.server.documents[ docTitle ];
}

/**
 * Get a list of users that are currently bound to the same document.
 *
 * @method
 */
Connection.prototype.getUsers = function() {
	var users = [];
	var connections = this.getSiblingConnections();
	for( var i=0, j=connections.length; i<j; i++) {
		var userName = connections[ i ].session.userName;
		if( userName !== this.session.userName ) {
			users.push( {
				userName: userName,
				isPublisher: connections[ i ].session.isPublisher
			} );
		}
	}
	return users;
}

/**
 * Broadcast an event through network socket associated with this connection.
 *
 * @param{String} event Event name to broadcast.
 * @param{Object} data Associative array containing the data to send along the event.
 */
Connection.prototype.broadcast = function( event, data ) {
	var connections = this.getSiblingConnections();
	for( var i=0, j=connections.length; i<j; i++) {
		var conn = connections[ i ];
		conn.emit( event, data );
	}
	
	// Log the sent event if applicable.
}

/**
 * Method to bind events with their handlers from the
 * array of event-handler pairs.
 *
 * @method
 */
Connection.prototype.bindEvents = function() {
	var _this = this;
	var events = this.events;
	for( var i = 0, j = events.length; i < j; i++ ) {
		var eventPair = events[i];
		var eventName = eventPair[0];
		this.socket.on( eventName, function( handler ) {
			function proxyCallback( data ) {
				handler( _this, data );
			} 
			return proxyCallback;
		} ( eventPair[1] ) );
		
	}
};

if( typeof module == 'object' ) {
	module.exports.Connection = Connection;
}