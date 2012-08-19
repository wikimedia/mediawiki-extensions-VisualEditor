/**
 * collab.Session global object to create an instance per editing session.
 * References the collab.Document currently being edited in the session.
 * Also stores information of the user who initiated the editing session.
**/

var ve = require( './collab.ve.js' ).ve,
	settings = require( '../settings.js' ).settings,
	request = require( 'request');

/**
 * @class
 * @constructor
 * @param{collab.Document} document Reference to the document to associate with.
 * @param{String} userName User name who initiates this session.
**/
Session = function( document, userName ) {
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

Session.prototype.authenticate = function( userName, validationToken, callback ) {
	var authUrl = settings.authUrl;
	var data = '&username=' + userName + '&token=' + validationToken;
	var r = request( authUrl + data, function( error, response, body ) {
		if( !error ) {
			var result = body.TokenValidationResult.matches === 'true' ? true : false;
			callback( result );
		}
	} ); 
}

/**
 * Set publishing rights for the current user/session
 *
 * @method
 * @param{Boolean} key True/False for invoking/revoking publishing right on the session.
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
