/**
 * This contains all the callbacks used for handling the client's Socket.IO events
 *
 * @class
 * @constructor
 * @param {collab.Client} client Client adapter that the Callbacks object is to be attached to
 * @param {Socket} socket Socket.IO socket for network I/O
**/
collab.Callbacks = function( client, socket ) {
	ve.EventEmitter.call( this );

	this.client = client;
};

/**
 * Initiate authentication with the server using current logged in user's info
 * The method is called in upstream mode to initiate authentication, and
 * downstream mode when used as a callback for receiving authentication from server.
 *
 * @method
 * @param {String} direction upstream/downstream mode
 * @param {Object} authData Authentication data received from the server
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
			this.emit( 'client_auth', { userName: user, docTitle: docTitle } );
		}
		else {
			// For non-logged in users
		}
	}
	else {
		// Downstream mode for receiving auth info from the server
		var sessionID = authData.sessionID;
		this.emit( 'client_connect', { userName: user, docTitle: docTitle,
			sessionID: sessionID } );
	}
};

/**
 * Load data model into VE surface
 *
 * @method
 * @param {Object} data Data model to be loaded into the surface
**/
collab.Callbacks.prototype.loadDoc = function( data ) {
	var surfaceModel = this.client.editor.getModel(),
		documentModel = this.client.editor.getDocumentModel(),
		documentNode = documentModel.documentNode;
	
	// Create a new document model object and load it into the surface model
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
};

/**
 * Initiate disconnection from the collaboration server.
 *
 * @method
**/
collab.Callbacks.prototype.selfDisconnect = function() {
	this.loadDoc( this.preservedData );
	this.emit( 'enableEditing' );
};

/**
 * Callback method to be invoked when a new client initiates its session
**/
collab.Callbacks.prototype.userConnect = function( userName ) {
	
};

/**
 * Callback method to be invoked when a client disconnects from the editing session
**/
collab.Callbacks.prototype.userDisconnect = function( userName ) {

};

/**
 * Callback method to be invoked when a new transaction arrives at the client
 *
 * @method
 * @param{Object} transactionData Transaction data received from the server.
**/
collab.Callbacks.prototype.newTransaction = function( transactionData ) {
	var surfaceModel = this.client.editor.getModel();
	var transaction = transactionData.transaction;
	var args = transactionData.args;

	// Construct a new transaction object from transactionData
	var transactionObj = new ve.dm.Transaction();
	transactionObj.operations = transaction.operations;
	transactionObj.lengthDifference = transaction.lengthDifference;
	/*
	 isBroadcasted flag so we know this comes from the server after it is
	 handed to the surface model.
	*/
	transactionObj.isBroadcasted = true;

	if( args.publisherID != this.client.userName ) {
		transactionObj.isBroadcasted = true;

		var selection = surfaceModel.getSelection();
		// Create a default selection if there is no selection
		if( !selection ) {
			selection = new ve.Range( 1, 1 );
		}

		surfaceModel.change( transactionObj, selection );
	}
};

/**
 * Prepare the editor's layer for collaboration.
 *
 * @method
 * @param{Object} docData Document related data received from the server.
 * @param{Boolean} firstLoad If docTransfer is happening for the first time.
**/
collab.Callbacks.prototype.docTransfer = function( docData, firstLoad ) {
	var html = $('<div>' + docData.html + '</div>' );
	var socket = this.socket,
		client = this.client,
		editor = client.editor,
		surfaceModel = editor.getModel(),
		documentModel = editor.getDocumentModel(),
		_this = this;
	
	this.isPublisher = docData.allowPublish;

	// Store the data for recovery before purging
	this.preservedData = documentModel.getData();

	// Convert HTML into data model and load it
	var data = ve.dm.converter.getDataFromDom( html[0] );
	this.loadDoc( data );

	// Bind with surfaceModel's transact event
	if( docData.allowPublish == true ) {
		if( firstLoad == false ) {
			return;
		}
		surfaceModel.on( 'transact', function( transaction ) {
			// Don't proceed if the client is not connected
			// Also, exit if the session cannot publish(in case,
			// the session could publish earlier when the event listener was issued,
			// and after reconnection it cannot).
			if( !_this.client.isConnected || !_this.isPublisher ) {
				return;
			}

			// Send the transaction if it originates locally; Not received from the server
			if( !transaction.isBroadcasted ) {
				// Inject transaction arguments before sending transaction data
				var transactionData = {
					args: {
						publisherID: client.userName
					},
					transaction: transaction
				};
				_this.emit( 'new_transaction', transactionData );
			}
		} );
	}

	else {
		// Disable editing entirely
		this.emit( 'disableEditing' );
	}
};

ve.extendClass( collab.Callbacks, ve.EventEmitter );
