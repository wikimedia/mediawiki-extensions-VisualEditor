/**
 * This contains all the callbacks used for handling the server's Socket.IO events
 * Binds all the callback methods to a `callbacks` object which can be used as a module import
**/

callbacks = function() {

};

/**
 * Callback method to be invoked when a new client initiates its session
**/

callbacks.prototype.clientConnection = function( user ) {

};

/**
 * Callback method to be invoked when a client closes its session
**/

callbacks.prototype.clientDisconnection = function( user ) {

};

/**
 * Callback method to be invoked when a new transaction arrives at the server
**/

callbacks.prototype.newTransaction = function( trasaction ) {

};

if ( typeof module == 'object' ) {
  module.exports.callbacks = callbacks;
}
