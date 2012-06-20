/**
 * collab.Session global object to create an instance per editing session.
 * References the collab.Document currently being edited in the session.
 * Also stores information of the user who initiated the editing session.
**/

ve = require( './collab.ve.js' ).ve;

Session = function( document, user, sessionIndex ) {
	ve.EventEmitter.call( this );

	this.Document = document;
	this.user = user
	this.isPublisher = false;
	this.id = Session.generateID( document.title, user );
	this.sessionIndex = sessionIndex;
};

/**
 * Generates a unique session id for this session.
 * Should use document's title and user to generate the unique id.
**/
Session.generateID = function( docTitle, user ) {
	return docTitle + '' + user;
};

/**
 * Set publishing rights for the current user/session
**/
Session.prototype.allowPublish = function( key ) {
	// key is either true for having atleast one publisher or false for no publisher
	this.Document.hasPublisher = key;
	this.emit( 'allowPublish', key );
};

Session.prototype.getID = function() {
	return this.id;
};

ve.extendClass( Session, ve.EventEmitter );

if( typeof module == 'object' ) { 
	module.exports.Session = Session;
}
