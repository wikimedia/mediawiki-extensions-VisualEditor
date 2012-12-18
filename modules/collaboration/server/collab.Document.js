/**
 * collab.Document object binds the document model and other data
 * of the document that is used in single or multiple editing sessions.
 */

$ = require( 'jquery' );
var jsdom = require( 'jsdom' );
var ve = require( './collab.ve.js' ).ve;
var utils = require( '../collab.utils.js' ).utils;

/**
 * collab.Document object to bind everything in this module.
 * Should be referenced in the instances of collab.Session.
 *
 * @class
 * @constructor
 * @param {String} title Title of the document(pageName).
 * @param {String} html HTML content of the page.
 */
Document = function( title, html ) {
	var dom = $('<div>' + html + '</div>');
	var data = ve.dm.converter.getDataFromDom( dom[0] );
	var doc = new ve.dm.Document( data );
	this.dmDoc = doc;
	this.history = [];
	this.id = Document.generateID( title );
	this.title = title;
}

// Generate unique ID based on the title of the document
Document.generateID = function( title ) {
// FIXME: title is used as ID ONLY for testing
	return title;
};

/**
 * Convert the data model of the document into HTML and return it.
 *
 * @method
 */
Document.prototype.getHTML = function() {
	var data = this.dmDoc.getData();
	console.log(data);
	var dom = ve.dm.converter.getDomFromData( data );
	var html = $( dom ).html();
	console.log(html);
	return html;
};

Document.prototype.getID = function() {
	return this.id;
};

/**
 * Reset the current document state
 */
Document.prototype.purgeDocument = function() {
	this.dmSurface = null;
	this.history = [];
};

/**
 * Apply the incoming transaction to the document.
 *
 * @method
 * @param {collab.Session} session Reference to the session which contains this document.
 * @param {Object} transactionData Transaction data recieved from the client.
 */
Document.prototype.applyTransaction = function( session, transactionData ) {
	// Abort if the session cannot publish
	if( session.isPublisher == false ) {
		return false;
	}

	var deserializeTransaction = function( transaction ) {
		var operations = transaction.operations;
		for( var i=0, j=operations.length; i<j; i++ ) {
			if( operations[i].type === 'replace' ) {
				var annotations = operations[i].insert[0][1];
				console.log(annotations);
				var annotationObj = new ve.AnnotationSet();
				for( prop in annotations ) {
					annotationObj[prop] = annotations[prop];
				}
				operations[i].insert[0][1] = annotationObj;
				transaction.operations = operations;
			}
		}

		var transactionObj = new ve.dm.Transaction();
		for( prop in transaction ) {
			transactionObj[prop] = transaction[prop];
		}
		transactionObj.applied = false;
		return transactionObj;
	};

	var transactions = transactionData.transaction;
	if( !(transactions instanceof Array) ) {
		transactions = [transactions];
	}
	for( var i=0, j=transactions.length; i<j; i++ ) {
		var transaction = utils.deserializeTransaction( transactions[i] );
		transaction.applied = false;
		this.dmDoc.commit( transaction );
		this.history.push( transaction );
	}

	return true;
};

if ( typeof module == 'object' ) {
	module.exports.Document = Document;
}