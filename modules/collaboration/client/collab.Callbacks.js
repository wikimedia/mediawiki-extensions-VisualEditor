/**
 * This contains all the callbacks used for handling the client's Socket.IO events.
 *
 * @class
 * @constructor
 * @param {collab.Client} client Client adapter that the Callbacks object is to be attached to.
 * @param {Socket} socket Socket.IO socket for network I/O.
 */
collab.Callbacks = function( client, socket ) {
	ve.EventEmitter.call( this );

	this.client = client;
	var surfaceModel = client.editor.getModel();
	var _this = this;

	// Bind with surface model's transact event, so we can pick up new transactions.
	surfaceModel.on( 'transact', function( transaction ) {
		/** 
		 * Don't proceed if the client is not connected.
		 * Also, exit if the session cannot publish(in case,
		 * the session could publish earlier when the event listener was issued,
		 * and after reconnection it cannot).
		 */
		if( !_this.client.isConnected || !_this.isPublisher ) {
			return;
		}

		// Send the transaction if it originates locally; Not received from the server.
		if( !transaction.isBroadcasted ) {
			// TODO:: Do this on the server!
			// Inject transaction arguments before sending transaction data.
			var transactionData = {
				args: {
					publisherID: client.userName
				},
				transaction: transaction
			};
			console.log(transactionData);
			_this.emit( 'new_transaction', transactionData );
		}
	} );
};

ve.inheritClass( collab.Callbacks, ve.EventEmitter );

/**
 * Initiate authentication with the server using current logged in user's info
 * The method is called in upstream mode to initiate authentication, and
 * downstream mode when used as a callback for receiving authentication from server.
 *
 * @method
 * @param {Object} authData Authentication data received from the server
 */
collab.Callbacks.prototype.authenticate = function( authData ) {
	var socket = this.socket;
	var userName = this.client.userName;
	var docTitle = this.client.docTitle;
	if( authData.sessionId ) {
		// Downstream mode for receiving auth info from the server
		var sessionId = authData.sessionId;
		this.emit( 'CLIENT_CONNECT', { userName: userName, docTitle: docTitle,
			sessionId: sessionId } );
	}
};

/**
 * Load data model into VE surface.
 *
 * @method
 * @param {Object} data Data model to be loaded into the surface.
 */
collab.Callbacks.prototype.loadDoc = function( data ) {
	var surfaceModel = this.client.editor.getModel(),
		documentModel = this.client.editor.getDocumentModel(),
		documentNode = documentModel.documentNode;
	
	// Create a new document model object and load it into the surface model.
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
 */
collab.Callbacks.prototype.selfDisconnect = function() {
	this.loadDoc( this.preservedData );
	this.emit( 'enableEditing' );
};

/**
 * Callback method to be invoked when a new client initiates its session.
 */
collab.Callbacks.prototype.userConnect = function( userName ) {
	
};

/**
 * Callback method to be invoked when a client disconnects from the editing session.
 */
collab.Callbacks.prototype.userDisconnect = function( userName ) {

};

/**
 * Callback method to be invoked when a new transaction arrives at the client.
 *
 * @method
 * @param{Object} transactionData Transaction data received from the server.
 */
collab.Callbacks.prototype.newTransaction = function( transactionData ) {
	var surfaceModel = this.client.editor.getModel(),
		transaction = transactionData.transaction,
		args = transactionData.args,
		doc = surfaceModel.getDocument();

	if( args.publisherID == this.client.userName ) { return; }

	var deserializeTransaction = function( transaction ) {
		var operations = transaction.operations;
		for( var i=0, j=operations.length; i<j; i++ ) {
			if( operations[i].type === 'replace' ) {
				var annotations = operations[i].insert[1];
				var annotationObj = new ve.dm.Annotation.call( annotations );
				annotations = annotationObj;
			}
		}

		var transactionObj = new ve.dm.Transaction.call( transaction );
		return transactionObj;
	};

	if( !(transaction instanceof Array) ) {
		transaction = [transaction];
	}
	for( var i=0, j=transaction.length; i<j; i++ ) {
		var transaction = deserializeTransaction( transaction[i] );
		doc.commit( transaction );
	}

	/**
	 * isBroadcasted flag so we know this comes from the server after it is
	 * handed over to the surface model.
	 */
	transactionObj.isBroadcasted = true;

	if( args.publisherID != this.client.userName ) {
		transactionObj.isBroadcasted = true;


		/*var selection = surfaceModel.getSelection();
		// Create a default selection if there is no selection.
		if( !selection ) {
			selection = new ve.Range( 1, 1 );
		}*/

		surfaceModel.change( transactionObj, selection );
	}
};

/**
 * Prepare the editor's layer for collaboration.
 *
 * @method
 * @param{Object} docData Document related data received from the server.
 */
collab.Callbacks.prototype.docTransfer = function( docData ) {
	var html = $( '<div>' + docData.html + '</div>' );
	var socket = this.socket,
		client = this.client,
		editor = client.editor,
		surfaceModel = editor.getModel(),
		documentModel = editor.getDocumentModel(),
		_this = this;
	
	this.isPublisher = docData.allowPublish;

	// Store the data for recovery before purging.
	this.preservedData = documentModel.getData();

	// Convert HTML into data model and load it.
	var data = ve.dm.converter.getDataFromDom( html[0] );
	this.loadDoc( data );

	// Bind with surfaceModel's transact event.
	if( docData.allowPublish !== true ) {
		// Disable editing entirely.
		this.emit( 'disableEditing' );
	}
};