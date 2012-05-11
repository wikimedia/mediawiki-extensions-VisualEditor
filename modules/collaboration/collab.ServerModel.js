/**
 * This module handles all the data and core functionality of the collaboration server.
 * Involves client data and VE's data models.
**/

ve = require( 'collab.ve' ).ve;

/**
 * ServerModel object to bind everything in this module.
 * Should be used as a module export in the top level modules.
**/
ServerModel = function() {

};

/**
 * Initiates the ServerModel with an empty document, no connected clients and
 * empty history.
**/
ServerModel.prototype.init = function() {

};

/**
 * Reset the current document state
**/
ServerModel.prototype.purgeDocument = function() {

};

if ( typeof module == 'object' ) {
  module.exports.ServerModel = ServerModel;
}
