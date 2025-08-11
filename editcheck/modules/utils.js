/**
 * @param {Function} handler A deterministic asynchronous function taking a string and returning Any
 * @return {Function} Memoized version (returns the original promise on subsequent calls)
 */
mw.editcheck.memoize = function ( handler ) {
	const memory = new Map();
	return ( arg, bypass ) => {
		if ( typeof arg !== 'string' ) {
			throw new Error( 'Argument must be a string' );
		}

		if ( bypass || !memory.has( arg ) ) {
			memory.set( arg, handler( arg ) );
		}
		return memory.get( arg );
	};
};
