/**
 * This is the collaboration server for VisualEditor.
 *
 * Uses Socket.IO to establish connections with clients.
 * This module implements all the Socket.IO events and calls the respective callback functions.
**/

var io = require( 'socket.io' ),
	Connection = require( './collab.Connection.js' ).Connection,
	Document = require( './collab.Document.js' ).Document,
	settings = require( '../settings.js' ).settings;

/**
 * CollaborationServer binds all the functionality of the server and,
 * can be imported as a module.
 *
 * @class
 * @constructor
 */
CollaborationServer = function() {
	this.sessions = [];
	this.connections = [];

	// Initialize an empty map of documents and associated connections.
	this.documents = {};
};	

/**
 * Start listening.
 *
 * @method
 */
CollaborationServer.prototype.listen = function() {
	var _this = this;
	var io_service = io.listen( settings.port );

	io_service.on( 'connection', function( socket ) {
		// Create a new Connection instance to handle the new client.
		var connection = new Connection( _this, socket );
		socket.on('test', function() {
			console.log('hi');
		});
	});
};

/**
 * Lookup a route with matching docTitle in the docRoutes.
 *
 * @method
 * @param{String} docTitle The title of the document to lookup.
 */
CollaborationServer.prototype.lookupRoutes = function( docTitle ) {
	var lookupRoute = null;
	var docRoutes = this.docRoutes;

	for( route in docRoutes ) {
		var docID = docRoutes[ route ].document.getID();
		if( docID == Document.generateID( docTitle ) ) {
			lookupRoute = docRoutes[ route ];
			break;
		}
	}

	return lookupRoute;
};

// Run the collaboration server if the module is not imported.
if( module.parent ) {
	module.exports.CollaborationServer = CollaborationServer;
}
else {
	var collab = new CollaborationServer();
	collab.listen();
}