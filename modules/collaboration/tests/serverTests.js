var collabServer = require( '../server/server.js' ).CollaborationServer,
		settings = require( '../settings.js' ).settings,
		collabDocument = require( '../server/collab.Document.js' ).Document,
		collabSession = require( '../server/collab.Session.js' ).Session,
		collabCallbacks = require( '../server/collab.Callbacks.js' ).Callbacks,
		io = require( 'socket.io-client' ),
		parsoid = require( './fakeParsoid.js' ).app;

var server = new collabServer();
server.listen();
parsoid.listen( 8000 );

options = {
	transports: [ 'websocket' ],
	'force new connection': true
};
module.exports = {
	testConnection: function( test ) {
											test.expect( 1 );
											var client = io.connect( settings.host + ':' + settings.port, options );
											client.on( 'connection', function() {
												test.ok( true, 'Connection Failed' );
												test.done();
											});
											client.disconnect();
										},
	testInit: function( test ) {
							test.expect( 2 );
							var client = io.connect( settings.host + ':' + settings.port, options );
							client.on( 'connection', function() {
								this.emit( 'client_connect', { user: 'testUser', title: 'testPage' } );
							});
							client.on( 'document_transfer', function() {
								test.ok( true, 'Document transfer failed' );
							});
							client.on( 'client_connect', function() {
								test.ok( true, 'Client init ack failed' );
								test.done();
							});

						}
};
