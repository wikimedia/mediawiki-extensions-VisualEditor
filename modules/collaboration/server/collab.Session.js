/**
 * collab.Session global object to create an instance per editing session.
 * References the collab.Document currently being edited in the session.
 * Also stores information of the user who initiated the editing session.
**/

var ve = require( './collab.ve.js' ).ve;

Session = function( document, userName, sessionIndex ) {
	ve.EventEmitter.call( this );

	this.Document = document;
	this.userName = userName
	this.isPublisher = false;
	// Un-authenticated session
	this.sessionID = null;
};

/**
 * Generates a unique session id for this session.
 * Should use document's title and user to generate the unique id.
**/
Session.generateID = function( params ) {
	// Generate unique key for the client and send it
	// Could use the information of other documents in the server,
	var hasher = crypto.createHash( 'sha1' );
	var hashInput = params.join('');
	hasher.update( hashInput );
	var hashOut = hasher.digest( 'hex' );
	return hashOut;
};

/**
 * Set publishing rights for the current user/session
**/
Session.prototype.allowPublish = function( key ) {
	// key is either true for having atleast one publisher or false for no publisher
	this.isPublisher = key;
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
