/**
 * collab.Session global object to create an instance per editing session.
 * References the collab.Document currently being edited in the session.
 * Also stores information of the user who initiated the editing session.
**/

Session = function( document, user ) {
	this.Document = document;
	this.user = user
	this.isPublisher = false;
	this.id = Session.generateID( document.title, user );
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
Session.prototype.allowPublish = function() {
	this.isPublisher = true;
};

Session.prototype.getID = function() {
	return this.id;
};

if( typeof module == 'object' ) { 
	module.exports.Session = Session;
}
