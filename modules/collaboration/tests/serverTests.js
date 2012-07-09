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

/**
 * Test server's I/O events by emitting an event in each test
**/
exports['events'] = {
	'connection': function( test ) {
		test.expect( 1 );
		var client = io.connect( settings.host + ':' + settings.port, options );
		client.on( 'connection', function() {
			test.ok( true, 'Connection Failed' );
			test.done();
		});
		client.disconnect();
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
		client.on( 'connection', function() {
			this.emit( 'client_connect', { user: 'testUser', title: 'testPage' } );
			var second_client = io.connect( settings.host + ':' + settings.port, options );
			second_client.on( 'connection', function() {
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
				
			second_client.on( 'document_transfer', function( data ) {
				console.log(data);
				test.ok( data.users[0].userName === 'testUser', 'Unexpected users list.' );
				test.ok( data.users[0].isPublisher === true, 'Unexpected publishing right.' );
			});
			second_client.on( 'client_connect', function() {
				test.done();
			});
		});
		client.on( 'client_connect', function() {
			// Do nothing now
		});
	},
};
