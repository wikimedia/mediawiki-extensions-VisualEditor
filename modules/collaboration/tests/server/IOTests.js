var collabServer = require( '../../server/server.js' ).CollaborationServer,
		settings = require( '../../settings.js' ).settings,
		collabDocument = require( '../../server/collab.Document.js' ).Document,
		collabSession = require( '../../server/collab.Session.js' ).Session,
		collabCallbacks = require( '../../server/collab.Callbacks.js' ).Callbacks,
		io = require( 'socket.io-client' ),
		parsoid = require( './fakeParsoid.js' ).app;

var server = new collabServer();
server.listen();
parsoid.listen( 8000 );

options = {
	transports: [ 'websocket' ],
	'force new connection': true
};

/**
 * Test server's I/O events by emitting an event in each test
**/
exports['events'] = {
	'connection': function( test ) {
		test.expect( 1 );
		var client = io.connect( settings.host + ':' + settings.port, options );
		client.on( 'connection', function() {
			test.ok( true, 'Connection Failed' );
			client.disconnect();
			test.done();
		});
	},

	'client_connect(single client)': function( test ) {
		var client = io.connect( settings.host + ':' + settings.port, options );

		client.on( 'connection', function() {
			this.emit( 'client_connect', { user: 'testUser', title: 'testPage' } );
		});

		client.on( 'document_transfer', function( data ) {
			test.ok( data.html === '<p>testPage</p>', 'Document HTML fail.' );
		});

		client.on( 'client_connect', function( data ) {
			test.ok( data.userName === 'testUser', 
				'Expected username -> testUser' +
				'. Received -> ' + data.userName );
			test.ok( data.isPublisher === true,
				'Expected publish right -> true' +
				'. Received -> ' + data.isPublisher);
			client.disconnect();
			test.done();
		});
	},
	
	'client_connect(two clients)': function( test ) {
		var client = io.connect( settings.host + ':' + settings.port, options );
		client.on( 'connection', function( data ) {
			this.emit( 'client_connect', { user: 'testUser', title: 'testPage' } );
			var secondClient = io.connect( settings.host + ':' + settings.port, options );
			secondClient.on( 'connection', function( data ) {
				client.on( 'client_connect', function( data ) {
					test.ok( data.userName === 'testUser2',
						'Expected username -> testUser2' +
						'. Received -> ' + data.userName );

					test.ok( data.isPublisher === false,
						'Expected publish right -> false' +
						'. Received -> ' + data.isPublisher );
				});

				this.emit( 'client_connect', { user: 'testUser2', title: 'testPage' } );
			});
				
			secondClient.on( 'document_transfer', function( data ) {
				test.ok( data.users[0].userName === 'testUser', 'Unexpected users list.' );
				test.ok( data.users[0].isPublisher === true, 'Unexpected publishing right.' );
			});
			secondClient.on( 'client_connect', function( data ) {
				client.disconnect();
				secondClient.disconnect();
				test.done();
			});
		});
		client.on( 'client_connect', function( data ) {
			// Do nothing now
		});
	},

	'new_transaction': function( test ) {
		var client = io.connect( settings.host + ':' + settings.port, options );

		client.on( 'document_transfer', function() {

			// Dummy transaction to transform 'testPage' into 'testpage'
			var dummyTransaction = {
				lengthDifference: 1,
				operations: [
					{ type: 'retain', length: 5 },
					{ type: 'replace', insert: ['p'], remove: ['P'] },
					{ type: 'retain', length: 9 }
				]
			};
			client.emit( 'new_transaction', { transaction: dummyTransaction } );
		});
		client.on( 'new_transaction', function() {
			var html = server.docRoutes[0].document.getHTML();
			test.ok( html === '<p>testpage</p>', 'unexpected document' );
			test.done();
		});

		client.on( 'connection', function() {
			client.emit( 'client_connect', { user: 'testUser', title: 'testPage' } );
		});
	},
};
