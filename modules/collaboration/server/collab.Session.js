/**
 * collab.Session global object to create an instance per editing session.
 * References the collab.Document currently being edited in the session.
 * Also stores information of the user who initiated the editing session.
**/

Session = function( document, user ) {
	this.Document = document;
	this.user = user
	this.sessionID = this.generateID();
	this.publisher = false;
};

/**
 * Generates a unique session id for this session.
 * Should use document's title and user to generate the unique id.
**/
Session.prototype.generateID = function() {

};

/**
 * Set publishing rights for the current user/session
**/
Session.prototype.allowPublish = function() {
	this.publisher = true;
};

Session.prototype.getID = function() {
	return this.sessionID;
};

if( typeof module == 'object' ) { 
	module.exports.Session = Session;
}
