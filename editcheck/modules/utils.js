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

mw.editcheck.fetchTimeout = function ( resource, options = {} ) {
	const abortController = window.AbortController ? new AbortController() :
		{ signal: undefined, abort: () => {} };
	const timeoutID = setTimeout( () => abortController.abort(), options.timeout || 6000 );

	options.signal = abortController.signal;
	return fetch( resource, options ).then( ( response ) => {
		clearTimeout( timeoutID );
		return response;
	} ).catch( ( error ) => {
		clearTimeout( timeoutID );
		if ( error instanceof DOMException && error.name === 'AbortError' ) {
			throw new Error( `fetch failed: ${ resource }` );
		}
		throw error;
	} );
};

/**
 * Fetch pages that are expected to be JSON from the mediawiki API
 *
 * @param {string[]} pagenames
 * @return {mw.Api~AbortablePromise} Resolves to a Map of pagename to parsed JSON
 */
mw.editcheck.getMediaWikiJSON = function ( pagenames ) {
	// TODO: we *could* enforce that these be `MediaWiki:*.json`
	return new mw.Api().get( {
		action: 'query',
		format: 'json',
		prop: 'revisions',
		titles: pagenames.join( '|' ),
		formatversion: '2',
		rvprop: 'content'
	} ).then( ( response ) => {
		const pageMap = new Map();
		const pages = response.query.pages || [];
		pages.forEach( ( page ) => {
			if ( !page || !page.revisions ) {
				mw.log.warn( ' Could not fetch imported config: ' + page.title );
				return;
			}
			try {
				pageMap.set( page.title, JSON.parse( page.revisions[ 0 ].content ) );
			} catch ( err ) {
				mw.log.error( ' Failed to parse imported config: ' + page.title, err );
			}
		} );
		return pageMap;
	} );
};

/**
 * Add click tracking to all links in an element
 *
 * @param {jQuery} $element Element containing links
 * @param {string} name Name of the edit check
 * @param {string} action Action name for tracking
 */
mw.editcheck.trackActionLinks = function ( $element, name, action ) {
	$element.find( 'a' ).on( 'click', () => {
		ve.track( 'activity.editCheck-' + name, { action } );
	} );
};

/**
 * Polyfill for Promise.allSettled
 *
 * @param {Promise[]} promises
 * @return {Promise}
 */
mw.editcheck.allSettled = function ( promises ) {
	/* eslint-disable es-x/no-promise-all-settled */
	if ( Promise.allSettled ) {
		return Promise.allSettled( promises );
	}
	/* eslint-enable es-x/no-promise-all-settled */
	return Promise.all( promises.map( ( promise ) => Promise.resolve( promise ).then(
		( value ) => ( {
			status: 'fulfilled',
			value
		} ),
		( reason ) => ( {
			status: 'rejected',
			reason
		} )
	) ) );
};

/**
 * Once all promises are settled, return only the results of resolved promises
 *
 * @param {Array} promises
 * @return {Promise}
 */
mw.editcheck.allSettledFulfilledOnly = function ( promises ) {
	return mw.editcheck.allSettled( promises ).then( ( results ) => {
		const fulfilled = [];
		for ( const result of results ) {
			if ( result.status === 'fulfilled' ) {
				fulfilled.push( result.value );
			}
		}
		return fulfilled;
	} );
};

/**
 * Polyfill for Array.prototype.flat
 *
 * @param {Array} arr
 * @param {number} [depth = 1]
 * @return {Array}
 */
mw.editcheck.flattenArray = function ( arr, depth = 1 ) {
	const result = [];
	// Stack entries are [ array, currentDepth ]
	const stack = [ [ arr, 0 ] ];

	while ( stack.length > 0 ) {
		const [ current, d ] = stack.pop();

		for ( let i = current.length - 1; i >= 0; i-- ) {
			const item = current[ i ];
			if ( Array.isArray( item ) && d < depth ) {
				stack.push( [ item, d + 1 ] );
			} else {
				result.push( item );
			}
		}
	}

	return result;
};

/**
 * Given item/rect pairs, find nearest surrounding items to user's current position
 *
 * Note: This was created for finding the nearest EditCheckActions, but doesn't do
 * anything specific to actions or suggestions, so we'll keep it generic.
 *
 * @param {Array.<{item: any, rect: DOMRect|Object}>} itemRects
 * @param {ve.ui.Surface} surface
 * @return {{above: any, below: any}}
 */
mw.editcheck.findNearestByRect = function ( itemRects, surface ) {
	const nearest = { above: null, below: null };

	const dimensions = surface.getViewportDimensions();
	if ( !dimensions ) {
		return nearest;
	}
	const anchorY = dimensions.top + dimensions.height / 2;

	// Callers order by start offset of the entire action, which isn't top order once an item has several rects
	const sorted = itemRects.slice().sort( ( a, b ) => a.rect.top - b.rect.top );

	// Bottoms aren't in order, as items vary in length, so every item before the anchor
	// stays a candidate for nearest above
	let nearestDistance = Infinity;
	for ( const { item, rect } of sorted ) {
		// Sorted, so the first item starting past the anchor is the nearest below,
		// and nothing after it can be above
		if ( rect.top > anchorY ) {
			nearest.below = item;
			break;
		}
		// Zero when the item covers the anchor
		const distance = Math.max( 0, anchorY - rect.bottom );
		// <= so the latest of equally near items wins, being the one starting nearest
		if ( distance <= nearestDistance ) {
			nearestDistance = distance;
			nearest.above = item;
		}
	}

	return nearest;
};

/**
 * Apply uppercasing rules to a phrase, using another string as a model
 *
 * Either the phrase is fully uppercased, or just initial letters are uppercased, or no change,
 * depending which best matches the model. The phrase will never be lowercased.
 *
 * For TextMatch, this means that the dictionary form is the lowest case that will ever be offered
 * as a replacement. Words like 'French' or 'USA' are never turned into invalid forms, even if
 * replacing something fully lowercased. So TextMatch replacements should be configured in
 * lowercase unless the term requires specific casing.
 *
 * @param {string} phrase
 * @param {string} model
 * @param {string} lang BCP47 language code. Certain languages have special casing rules, e.g. tr, az, lt
 * @return {string} The phrase, with uppercasing rules applied
 */
mw.editcheck.applyCase = function ( phrase, model, lang ) {
	// Default to no language-specific casing rules, which is the same as en-US
	lang = lang || 'en-US';

	const toUpperFirst = ( s ) => s.replace( mw.editcheck.applyCase.lowerFirst,
		( _, prefix, ch ) => prefix + ch.toLocaleUpperCase( lang )
	);

	const upperCase = model.toLocaleUpperCase( lang );
	const lowerCase = model.toLocaleLowerCase( lang );
	const titleCase = toUpperFirst( lowerCase );

	if ( model === lowerCase ) {
		// return unaltered phrase if there is no case information
		return phrase;
	}
	if ( model === upperCase ) {
		return phrase.toLocaleUpperCase( lang );
	}
	if ( model === titleCase ) {
		return toUpperFirst( phrase );
	}
	// Else model has mixed casing; return phrase unaltered
	return phrase;
};

// Match any lowercase letter, unless preceded by a letter that can have case (or a combining mark)
// We must compile the RegExp at runtime because eslint does not understand \p yet
// eslint-disable-next-line prefer-regex-literals, no-useless-escape
mw.editcheck.applyCase.lowerFirst = new RegExp( '(^|[^\\p{Lu}\\p{Ll}\p{Lt}\\p{M}])(\\p{Ll})', 'gu' );
