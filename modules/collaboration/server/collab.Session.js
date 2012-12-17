/**
 * Session class for storing user and document information of an editing session.
 *
 * Contains a reference to the Document object for the document in use.
 * Also, does some useful stuff like user authentication.
 */

var ve = require( './collab.ve.js' ).ve,
	settings = require( '../settings.js' ).settings,
	request = require( 'request'),
	crypto = require( 'crypto' );

/**
 * @class
 * @constructor
 * @param{collab.Document} document Reference to the document to associate with.
 * @param{String} userName User name who initiates this session.
 */
Session = function( document, userName ) {
	ve.EventEmitter.call( this );

	this.document = document;
	this.userName = userName
	this.isPublisher = false;
	
	// Un-authenticated session
	this.sessionID = null;
};

ve.inheritClass( Session, ve.EventEmitter );

/**
 * Generates a unique session ID for this session.
 * Should use document's title and user to generate the unique id.
 */
Session.generateID = function( params ) {
	// Generate unique key for the client and send it
	// Could use the information of other documents in the server,
	var hasher = crypto.createHash( 'sha1' );
	var hashInput = params.join('');
	hasher.update( hashInput );
	var hashOut = hasher.digest( 'hex' );
	return hashOut;
};

Session.authenticate = function( userName, validationToken, callback ) {
	var authUrl = settings.authUrl;
	var data = '&mode=verify&username=' + userName + '&token=' + validationToken;
	var r = request( authUrl + data, function( error, response, body ) {
		if( !error ) {
			var jsonResponse = JSON.parse( body );
			var result = jsonResponse.TokenValidationResponse.matches === 'true' ? true : false;
			callback( result );
		}
	} ); 
}

/**
 * Set publishing rights for the current user/session.
 *
 * @method
 * @param{Boolean} key True/False for invoking/revoking publishing right on the session.
 */
Session.prototype.allowPublish = function( key ) {
	// key is either true for having atleast one publisher or false for no publisher
	this.isPublisher = key;
	this.document.hasPublisher = key;
	this.emit( 'allowPublish', key );
};

Session.prototype.getID = function() {
	return this.id;
};

if( typeof module == 'object' ) {
	module.exports.Session = Session;
}