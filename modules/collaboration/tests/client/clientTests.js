module( 'collab.Callbacks' );

test( 'newTransaction', function() {
	var surfaceMock = new collab.mocks.Surface( '<p>Test data</p>' );
	var clientMock = {
		editor: surfaceMock,
		userName: 'testUser'
	};
	var transactionData = { 
		args:	{ publisherID: 'testUser2' },
		transaction:  {
			lengthDifference: 1,
			operations: [
				{ type: 'retain', length: 6 },
				{ type: 'replace', insert: ['D'], remove: ['d'] },
				{ type: 'retain', length: 9 }
			],
			isBroadcasted: true
		}
	};

	// Dummy socket object not of use in the test but required for Callbacks constructor
	var socket = {};
	var callbacksObj = new collab.Callbacks( clientMock, socket );
	callbacksObj.newTransaction( transactionData );

	// Check the document state here and assert
	var expectedData = ve.dm.converter.getDataFromDom(  $( '<p>Test Data</p>' )[ 0 ] );
	var dm = surfaceMock.getDocumentModel();
	deepEqual( dm.data, expectedData );
} );
