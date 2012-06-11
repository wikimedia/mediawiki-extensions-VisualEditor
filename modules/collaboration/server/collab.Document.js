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
Document = function( html ) {
	var data = ve.dm.converter.getDataFromDom( $( html )[0] );
	var doc = new ve.dm.Document( data );
	this.dmSurface = new ve.dm.Surface( doc );
}

/**
 * Reset the current document state
**/
Document.prototype.purgeDocument = function() {

};

if ( typeof module == 'object' ) {
	module.exports.Document = Document;
}
