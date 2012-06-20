/**
 * This contains all the callbacks used for handling the client's Socket.IO events
**/

collab.callbacks = function( client, socket ) {
	this.client = client;
	this.socket = socket;
};

/**
 * Callback method to be invoked when a new client initiates its session
**/
collab.callbacks.prototype.userConnect = function( userID ) {
	// do something on the front-end
};

/**
 * Callback method to be invoked when a client disconnects from the editing session
**/
collab.callbacks.prototype.userDisconnect = function( userID ) {
	// do something on the front-end
};

/**
 * Callback method to be invoked when a new transaction arrives at the client
**/
collab.callbacks.prototype.newTransaction = function( transactionData ) {
	var surfaceModel = this.client.editor.getModel();

	var transactionObj = new ve.dm.Transaction();
	var transaction = transactionData.transaction;
	var args = transactionData.args;
	transactionObj.operations = transaction.operations;
	transactionObj.lengthDifference = transaction.lengthDifference;
	transactionObj.isBroadcasted = true;
	if( args.publisherID != this.client.userID ) {
		transactionObj.isBroadcasted = true;
		var selection = surfaceModel.getSelection();
		if( !selection ) {
			selection = new ve.Range( 1, 1 );
			surfaceModel.setSelection( selection );
		}
		surfaceModel.transact( transactionObj );
	}
	//apply the transaction through the transaction processor
};

collab.callbacks.prototype.docTransfer = function( docData ) {
	var html = $('<div>' + docData.html + '</div>' );
	var socket = this.socket,
		client = this.client,
		editor = client.editor,
		surfaceModel = editor.getModel(),
		documentModel = editor.getDocumentModel(),
		documentNode = documentModel.documentNode;
	// FIXME: this needs to be rewritten in the server's code
	// rather than calling the one defined in sandbox.js
	
	// Load the document data recieved into the editor instance
	var data = ve.dm.converter.getDataFromDom( html[0] );
	var newDocumentModel = new ve.dm.Document( data );
	documentModel.data.splice( 0, documentModel.data.length );
	ve.insertIntoArray( documentModel.data, 0, newDocumentModel.data );
	surfaceModel.setSelection( new ve.Range( 1, 1 ) );
	documentNode.splice.apply(
		documentNode,
		[0, documentNode.getChildren().length]
		.concat( newDocumentModel.documentNode.getChildren() )
	);
	surfaceModel.purgeHistory();
	// Bind with surfaceModel's transact event
	if( docData.allowPublish == true ) {
		surfaceModel.on( 'transact', function( transaction ) {
			if( !transaction.isBroadcasted ) {
				// Inject transaction arguments before sending transaction data
				var transactionData = {
					args: {
						publisherID: client.userID
					},
					transaction: transaction
				};
				console.log(transactionData);
				socket.emit( 'new_transaction', transactionData );
			}
		});
	}
	else {
		// Disable editing entirely
		var view = editor.view;
		var documentNode = view.documentView.documentNode;
		documentNode.$.attr( 'contenteditable', false );
	}

};
