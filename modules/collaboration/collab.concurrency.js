/**
 * Concurrency control module for VisualEditor.
 */

collab.concurrency.Controller = function ( buffer ) {
	// Initialize empty transactions log
	this.history = [];

	// Buffered transactions
	this.buffer = buffer;
};

/**
 * Get the current parent index.
 *
 * @method
 * @return {Number} Current reference to the parent index.
 */
collab.concurrency.Controller.prototype.getParentId = function () {
	return this.history.length;
}

/**
 * Push a transaction into the transaction history.
 *
 * @method
 * @param {Transaction} transaction Transaction to be pushed into history.
 * @return {Number} The index of the pushed transaction. Will be used as a reference to a parent state based at 1.
 */
collab.concurrency.Controller.prototype.pushIntoHistory = function ( transaction ) {
	this.history.push( transaction )
	return this.history.length;
}

/**
 * Return the part of history that succeeds reference index.
 *
 * @method
 * @param {reference}
 * @return {Array} Transactions in the history succeeding the reference index.
 */
collab.concurrency.Controller.prototype.getHistoricalSet = function ( reference ) {
	var history = this.history;
	return history.slice( i ).join( this.buffer );
}

/**
 * Prepare and output a transaction that is ready to be applied on the document.
 *
 * @param {Object} transaction Transaction to be prepared.
 * @return {Object} Transaction that is trasformed and ready to be applied to the document.
 */
collab.concurrency.Controller.prototype.process = function ( transaction ) {
	var refId = transaction.parentIndex;
	var transactions = this.getHistoricalSet( refId );

	if ( transactions.length > 0 ) {
		historyTransaction = transactions[0];
	}

	var transformed = collab.concurrency.transformTransaction( transaction, historyTransaction );
	var parentId = this.pushIntoHistory( transaction );

	return { parentId: parentId, transformed: transformed };
}

/**
 * Method to get a transform of a transaction against another applied on same document state.
 * IMPORTANT: Both the transactions should have been applied on the same document state.
 * 
 * @method
 * @static
 * @param {Transaction} t1 Transaction applied first.
 * @param {Transaction} t2 Transaction applied second.
 * @return {Transaction} Transform of t2.
 */
collab.concurrency.transformTransaction = function( t1, t2 ) {
	var ops1 = t1.operations,
		ops2 = t2.operations,
		pos1 = 0,
		pos2 = 0,
		retainPos2 = 0;

	for ( var i = 0; i < ops1.length; i++ ) {
		var op1 = ops1[i];
		switch( op1.type ) {
			case 'retain':
				pos1 = pos1 + op1.length;
				for ( var j = 0; j < ops2.length; j++ ) {
					var op2 = ops2[j];
					if ( op2.type === 'retain' ) {
						//pos2 = pos2 + op2.length;
					}
				}
				break;

			case 'replace':
				var changedRetains = [];
				pos2 = 0;
				for ( var j = 0; j < ops2.length; j++ ) {
					op2 = ops2[j];
					var lengthDifference = op1.insert.length - op1.remove.length;
					if ( op2.type === 'retain' ) {
						pos2 = pos2 + op2.length;
						var shift = 0;
						if ( pos2 >= pos1 ) {
							if ( pos2 <= pos1 + op1.insert.length ) {
								shift = pos1 + op1.insert.length - pos2;
							}
							else {
								shift = op1.insert.length;
								if( pos2 <= pos1 + op1.remove.length ) {
									shift -= pos2 - pos1;
								}
								else {
									shift -= op1.remove.length;
								}
							}
							op2.length = pos2 + shift - retainPos2;
						}
						retainPos2 = pos2 + shift;

					}

					else if ( op2.type === 'replace' ) {

						// resolve remove vectors
						var removeSize = op2.remove.length;

						// positions where the removal ends
						var endOf1 = pos1 + op1.remove.length;
						var endOf2 = pos2 + op2.remove.length;

						if ( pos2 >= pos1 && pos2 <= endOf1) {
							// case when the remove vector of 2 is completely overlapped by the remove vector of 1
							if( endOf2 <= endOf1 ) {
								overlapSize = op2.remove.length;
								op2.remove = [];
							}
							else {
								op2.remove = op2.remove.slice( endOf1 - pos2 );
							}
						}
						else if ( pos1 >= pos2 && pos1 <= endOf2 ) {
							// case when the remove vector of 1 is completely overlapped by the remove vector of 2
							if ( endOf1 <= endOf2 ) {
								op2.remove = op2.remove.slice( 0, pos1 - pos2 )
									.concat( new Array( endOf1 - pos1 ).join( ',' ).split( ',' ) )
									.concat( op2.remove.slice( -( endOf2 - endOf1 ) ) );

							}
							else {
								op2.remove = op2.remove.slice( 0, -( endOf2 - pos1 ) );
							}
						}
						var posShift = op2.remove.length;
						pos2 += removeSize;
						retainPos2 += posShift;
					}
				}
				pos1 += op1.remove.length;
				break;
		}
	}
	return t2;
};

/**
 * Method to compose a number of transactions into a single transaction.
 *
 * @method
 * @static
 * @param {Array} transactions Array of transactions to be composed.
 * @return {Transaction} Composed transaction.
 */
collab.concurrency.composeTransactions = function ( transactions ) {
	// Prepare the operations map
	var opMap = {};
	var pos = 0;
	var lengthDifference = 0;
	for ( var i = 0; i < transactions.length; i++ ) {
		pos = 0;
		var transaction = transactions[i];
		lengthDifference += transaction.lengthDifference;
		for ( var j = 0; j < transaction.operations.length; j++ ) {
			var op = transaction.operations[j];
			if ( op.type === 'retain' ) {
				pos += op.length;
			} 
			else if ( op.type === 'replace' ) {
				if ( pos in opMap ) ) {
					opMap[pos] = [op];
				} else {
					opMap[pos].push(op);
				}
			}
		}
	}

	// Traverse the operations map and build the composed transaction
	pos = 0;
	var ops = [];
	for ( index in opMap ) {
		var retainLength = index - pos;
		var retainOp = { type: 'retain', length: retainLength };
		ops.push( retainOp );
		ops.push( opMap[index] );
		pos = index;
	}

	return {
		operations: ops,
		lengthDifference: lengthDifference
	};
}

if ( typeof module == 'object' ) {
	module.exports.concurrency = concurrency;
}