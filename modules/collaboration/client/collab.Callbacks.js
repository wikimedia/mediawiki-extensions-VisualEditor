/**
 * This contains all the callbacks used for handling the client's Socket.IO events
**/

collab.Callbacks = function( client, socket ) {
	this.client = client;
	this.socket = socket;
};

/**
 * Initiate authentication with the server using current logged in user's info
**/
collab.Callbacks.prototype.authenticate = function( direction, authData ) {
	var socket = this.socket;
	if( direction == 'upstream' ) {
		// Upstream mode for sending auth info to the server
		var user = mw.config.get( 'wgUserName' );
		var docTitle = mw.config.get( 'wgPageName' );
		if( user ) {
			this.userName = user;
			// Logged in; Proceed with authentication with server
			socket.emit( 'client_auth', { userName: user, docTitle: docTitle } );
		}
		else {
			// For non-logged in users
		}
	else {
		// Downstream mode for recieving auth info from the server
		var sessionID = authData.sessionID;
		socket.emit( 'client_connect', { userName: user, docTitle: docTitle,
			sessionID: sessionID } );
	}
};

/**
 * Callback method to be invoked when a new client initiates its session
**/
collab.Callbacks.prototype.userConnect = function( userID ) {
	// do something on the front-end
};

/**
 * Callback method to be invoked when a client disconnects from the editing session
**/
collab.Callbacks.prototype.userDisconnect = function( userID ) {
	// do something on the front-end
};

/**
 * Callback method to be invoked when a new transaction arrives at the client
**/
collab.Callbacks.prototype.newTransaction = function( transactionData ) {
	var surfaceModel = this.client.editor.getModel();
	
	var transactionObj = new ve.dm.Transaction();
	var transaction = transactionData.transaction;
	var args = transactionData.args;
	transactionObj.operations = transaction.operations;
	transactionObj.lengthDifference = transaction.lengthDifference;
	transactionObj.isBroadcasted = true;
	console.log(transactionData.args);
	if( args.publisherID != this.client.userID ) {
		transactionObj.isBroadcasted = true;
		var selection = surfaceModel.getSelection();
		if( !selection ) {
			selection = new ve.Range( 1, 1 );
			//surfaceModel.setSelection( selection );
		}
		surfaceModel.change( transactionObj, selection );
	}
	//apply the transaction through the transaction processor
};

collab.Callbacks.prototype.docTransfer = function( docData ) {
	var html = $('<div>' + docData.html + '</div>' );
	var socket = this.socket,
		client = this.client,
		editor = client.editor,
		surfaceModel = editor.getModel(),
		documentModel = editor.getDocumentModel(),
		documentNode = documentModel.documentNode;
	
	// Load the document data recieved into the editor instance
	var data = ve.dm.converter.getDataFromDom( html[0] );
	var newDocumentModel = new ve.dm.Document( data );
	documentModel.data.splice( 0, documentModel.data.length );
	ve.insertIntoArray( documentModel.data, 0, newDocumentModel.data );
	surfaceModel.selection = new ve.Range( 1, 1 );
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
