/**
 * collab.Document object binds the document model and other data
 * of the document that is used in single or multiple editing sessions.
**/

$ = require( 'jquery' );
ve = require( './collab.ve.js' ).ve;

/**
 * collab.Document object to bind everything in this module.
 * Should be referenced in the instances of collab.Session.
**/
Document = function( title, html ) {
	var dom = $('<div>' + html + '</div>');
	var data = ve.dm.converter.getDataFromDom( dom[0] );
	var doc = new ve.dm.Document( data );
	var surfaceModel = this.dmSurface = new ve.dm.Surface( doc );
	surfaceModel.setSelection( new ve.Range( 1, 1 ) );
	this.history = [];
	this.generateID( title );
}

// Generate unique ID based on the title of the document
Document.prototype.generateID = function( title ) {
// this.id = id;
};

Document.prototype.getID = function() {
	return this.id;
};

/**
 * Reset the current document state
**/
Document.prototype.purgeDocument = function() {

};

Document.prototype.applyTransaction = function( session, transactionData ) {
	// Abort if the session cannot publish
	if( session.publisher == false ) {
		return false;
	}

	var transaction = new ve.dm.Transaction();
	transaction.operations = transactionData.operations;
	transaction.lengthDifference = transactionData.lengthDifference;
	this.dmSurface.transact( transaction );
	// TODO: document state hash should also be pushed into the history
	this.history.push( transaction );

	return true;
};

if ( typeof module == 'object' ) {
	module.exports.Document = Document;
}
