module( 'collab.Callbacks' );

/* Stub */

collab.CallbacksStub = function() {
	var surfaceMock = new collab.mocks.Surface( '<p>Test data</p>' );
	var clientMock = {
		editor: surfaceMock,
		userName: 'testUser',
		isConnected: true
	};
	var socket = {};
	collab.Callbacks.call( this, clientMock, socket );
};

ve.extendClass( collab.CallbacksStub, collab.Callbacks );

collab.CallbacksStub.prototype.loadDoc = function( data ) {
	return data;
};

/* Tests */

test( 'newTransaction', function() {
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
	var callbacksObj = new collab.CallbacksStub()
	callbacksObj.newTransaction( transactionData );

	// Check the document state here and assert
	var expectedData = ve.dm.converter.getDataFromDom(  $( '<p>Test Data</p>' )[ 0 ] );
	var dm = callbacksObj.client.editor.getDocumentModel();
	deepEqual( dm.data, expectedData );

} );

asyncTest( 'docTransfer', function() {
	expect( 1 );

	var callbacksObj = new collab.CallbacksStub();
	var docData = {
		html: '<p>Test data</p>',
		allowPublish: true
	};
	
	callbacksObj.isPublisher = true;
	callbacksObj.docTransfer( docData, true );
	callbacksObj.on( 'new_transaction', function( transactionData ) {
		ok( true );
		start();
	} );

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
	
	callbacksObj.client.editor.getModel().emit( 'transact', transactionData );

} );
