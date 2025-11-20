mw.editcheck.TextMatchEditCheck = function MWTextMatchEditCheck() {
	// Parent constructor
	mw.editcheck.TextMatchEditCheck.super.apply( this, arguments );

	this.lang = mw.config.get( 'wgContentLanguage' );
	this.sensitivity = 'accent'; // TODO figure out how to determine this on an editcheck level
	this.collator = new Intl.Collator( this.lang, { sensitivity: this.sensitivity } );

	const rawMatchItems = Object.assign(
		{},
		this.constructor.static.matchItems || {},
		this.config.matchItems || {}
	);
	this.matchItems = [];
	this.matchItemsById = new Map();
	// Create matchItem instances
	Object.entries( rawMatchItems ).forEach( ( [ id, item ] ) => {
		const textMatchItem = new mw.editcheck.TextMatchItem( item, id, this.collator );
		this.matchItems.push( textMatchItem );
		this.matchItemsById.set( id, textMatchItem );
	} );

	// Initialize lookup maps
	this.matchItemsSensitiveByTerm = {};
	this.matchItemsInsensitiveByTerm = {};

	this.matchItems.forEach( ( matchItem ) => {
		if ( !matchItem.expand && matchItem.config.minOccurrences ) {
			mw.log.warn( 'MatchItem \'' + matchItem.title + '\' sets minOccurrences but is missing expand value.' );
		}
		const targetMap = matchItem.isCaseSensitive() ?
			this.matchItemsSensitiveByTerm :
			this.matchItemsInsensitiveByTerm;

		Object.keys( matchItem.query ).forEach( ( key ) => {
			if ( !targetMap[ key ] ) {
				targetMap[ key ] = [];
			}
			targetMap[ key ].push( matchItem );
		} );
	} );

};

OO.inheritClass( mw.editcheck.TextMatchEditCheck, mw.editcheck.BaseEditCheck );

mw.editcheck.TextMatchEditCheck.static.name = 'textMatch';

/**
 * The configs of TextMatchEditCheck take priority over individual matchItem configs.
 * So we make TextMatch’s defaults nonrestrictive,
 * and let the finer limitations be handled by individual matchItems.
 */
mw.editcheck.TextMatchEditCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.BaseEditCheck.static.defaultConfig, {
	maximumEditcount: null
} );

mw.editcheck.TextMatchEditCheck.static.choices = [
	{
		action: 'dismiss',
		label: OO.ui.deferMsg( 'ooui-dialog-process-dismiss' ),
		modes: [ '', 'info', 'replace', 'delete' ]
	},
	{
		action: 'accept',
		label: OO.ui.deferMsg( 'ooui-dialog-message-accept' ),
		modes: [ 'replace' ]
	},
	{
		action: 'delete',
		label: OO.ui.deferMsg( 'visualeditor-contextitemwidget-label-remove' ),
		modes: [ 'delete' ]
	}
];

mw.editcheck.TextMatchEditCheck.static.matchItems = [];

/**
 * Given a term, find all the equivalent keys that exist in case-insensitive matchItem queries
 *
 * @param {string} term Term to find keys for
 * @return {string} Array of keys that match
 */
mw.editcheck.TextMatchEditCheck.prototype.getMatchingKeys = function ( term ) {
	const matches = Object.keys( this.matchItemsInsensitiveByTerm ).filter(
		( key ) => this.collator.compare( key, term ) === 0
	);
	return matches;
};

mw.editcheck.TextMatchEditCheck.prototype.handleListener = function ( surfaceModel, listener ) {
	const actions = [];
	const fragmentCountsByItem = new Map();
	const document = surfaceModel.getDocument();
	const modified = this.getModifiedContentRanges( document );

	const matchConfigs = [
		{
			caseSensitive: true,
			terms: Object.keys( this.matchItemsSensitiveByTerm ),
			lookup: ( term ) => this.matchItemsSensitiveByTerm[ term ] || [ ]
		},
		{
			caseSensitive: false,
			terms: Object.keys( this.matchItemsInsensitiveByTerm ),
			lookup: ( term ) => {
				const keys = this.getMatchingKeys( term );
				return keys
					.map( ( key ) => this.matchItemsInsensitiveByTerm[ key ] || [] )
					.reduce( ( acc, arr ) => acc.concat( arr ), [] );
			}
		}
	];

	for ( const { caseSensitive, terms, lookup } of matchConfigs ) {
		const ranges = document.findText(
			new Set( terms ),
			{
				caseSensitiveString: caseSensitive,
				wholeWord: true
			}
		);

		for ( const range of ranges ) {
			if ( !modified.some( ( modRange ) => range.touchesRange( modRange ) ) ) {
				continue;
			}
			if ( !this.isRangeInValidSection( range, surfaceModel.documentModel ) ) {
				continue;
			}
			const term = surfaceModel.getLinearFragment( range ).getText();

			const relevantMatchItems = lookup( term );
			if ( !relevantMatchItems ) {
				continue;
			}
			for ( const matchItem of relevantMatchItems ) {
				const name = this.getTagNameByMatchItem( matchItem, term );
				if ( this.isDismissedRange( range, name ) ) {
					continue;
				}
				if ( matchItem.listener && matchItem.listener !== listener ) {
					continue;
				}
				if ( !this.constructor.static.doesConfigMatch( matchItem.config ) ) {
					continue;
				}

				let fragment = surfaceModel.getLinearFragment( range );
				fragment = matchItem.getExpandedFragment( fragment );
				const id = matchItem.id;
				if ( !fragmentCountsByItem.has( id ) ) {
					fragmentCountsByItem.set( id, new Map() );
				}
				const fragRange = fragment.getSelection().getRange();
				const key = `${ fragRange.start }-${ fragRange.end }`;
				const fragMap = fragmentCountsByItem.get( id );
				// The term is only relevant to the action if the matchItem has no expansion rules.
				const entry = fragMap.get( key ) || { fragment, count: 0, term: matchItem.expand ? ' ' : term };
				entry.count++;
				fragMap.set( key, entry );
			}
		}
	}

	// Once we finish all the searches, we do another pass through the matched fragments
	// so that we can handle matchItems with a min occurrences constraint.
	for ( const [ id, fragMap ] of fragmentCountsByItem.entries() ) {
		const matchItem = this.matchItemsById.get( id );
		const min = matchItem.config.minOccurrences || 1;
		for ( const { fragment, count, term } of fragMap.values() ) {
			if ( count >= min ) {
				const isValidMode = this.constructor.static.choices.some(
					( choice ) => choice.modes.includes( matchItem.mode )
				);
				const mode = isValidMode ? matchItem.mode : '';
				actions.push(
					new mw.editcheck.TextMatchEditCheckAction( {
						fragments: [ fragment ],
						title: matchItem.title,
						message: matchItem.message,
						check: this,
						mode: mode,
						matchItem: matchItem,
						term: term
					} )
				);
			}
		}
	}
	return actions;
};

mw.editcheck.TextMatchEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	return this.handleListener( surfaceModel, 'onDocumentChange' );
};

/**
 * Get a unique tag name for a given matchItem-term pair.
 * Builds the tag name from:
 * - the name of this editcheck
 * - and the unique subtag of this matchitem-term pair
 *
 * @param {Object} matchItem
 * @param {string} term
 * @return {string} A tag name in the format 'textMatch-{subtag}'
 */
mw.editcheck.TextMatchEditCheck.prototype.getTagNameByMatchItem = function ( matchItem, term ) {
	return this.constructor.static.name + matchItem.getSubTag( term );
};

// For now it doesn't make sense to run a TextMatchEditCheck in review mode
// as there isn't a way to edit the text.
mw.editcheck.TextMatchEditCheck.prototype.onBeforeSave = null;

mw.editcheck.TextMatchEditCheck.prototype.act = function ( choice, action /* , surface */ ) {
	switch ( choice ) {
		case 'dismiss':
			this.dismiss( action );
			break;
		case 'delete':
			action.fragments[ 0 ].removeContent();
			break;
		case 'accept': {
			const fragment = action.fragments[ 0 ];
			const oldWord = fragment.getText();
			const matchItem = action.matchItem;
			if ( !matchItem ) {
				ve.log( `mw.editcheck.TextMatchEditCheck.prototype.act(): did not find matchItem for ${ oldWord }` );
				return;
			}
			const newWord = matchItem.getReplacement( oldWord );
			// TODO match case of old word
			if ( !newWord ) {
				ve.log( `mw.editcheck.TextMatchEditCheck.prototype.act(): did not find replacement for ${ oldWord }` );
				return;
			}
			fragment.removeContent().insertContent( newWord );
		}

	}
	return ve.createDeferred().resolve( {} );
};

mw.editcheck.editCheckFactory.register( mw.editcheck.TextMatchEditCheck );

/**
 * TextMatchEditCheckAction
 *
 * Subclass of EditCheckAction to include information
 * about the matchItem associated with this action
 *
 * @class
 *
 * @param {Object} config Configuration options
 * @param {Object} config.matchItem the associated matchItem for this action
 * @param {string} config.term term that prompted the action
 */
mw.editcheck.TextMatchEditCheckAction = function MWTextMatchEditCheckAction( config ) {
	mw.editcheck.TextMatchEditCheckAction.super.call( this, config );
	this.matchItem = config.matchItem;
	this.term = config.term;
};

/* Inheritance */

OO.inheritClass( mw.editcheck.TextMatchEditCheckAction, mw.editcheck.EditCheckAction );

/* Events */

/**
 * Fired when the user selects an action (e.g., clicks a suggestion button).
 *
 * @event mw.editcheck.EditCheckAction#act
 * @param {jQuery.Promise} promise A promise that resolves when the action is complete
 */

/* Methods */

/**
 * Compare to another action
 *
 * @param {mw.editcheck.EditCheckAction} other Other action
 * @return {boolean}
 */
mw.editcheck.TextMatchEditCheckAction.prototype.equals = function ( other, ...args ) {
	if ( !this.constructor.super.prototype.equals.call( this, other, ...args ) ) {
		return false;
	}
	return this.matchItem.id === other.matchItem.id;
};

/**
 * Get unique tag name for this action
 *
 * @return {string} unique tag
 */
mw.editcheck.TextMatchEditCheckAction.prototype.getTagName = function () {
	if ( !this.matchItem ) {
		return this.check.getName();
	}
	return this.check.getTagNameByMatchItem( this.matchItem, this.term );
};

/**
 * Get the name of the check type
 *
 * @return {string} Check type name
 */
mw.editcheck.TextMatchEditCheckAction.prototype.getName = function () {
	return this.check.getName() + '-' + this.matchItem.id;
};

/**
 * TextMatchItem
 *
 * Class to represent a single matchItem for TextMatchEditCheck
 *
 * @class
 *
 * @param {Object} item Match item
 * @param {string} id ID of matchitem in config
 * @param {Intl.Collator} collator Collator to use for comparisons
 */
mw.editcheck.TextMatchItem = function MWTextMatchItem( item, id, collator ) {
	this.title = item.title;
	this.mode = item.mode || '';
	this.message = item.message;
	this.config = ve.extendObject( {}, this.constructor.static.defaultConfig, item.config );
	this.expand = item.expand;
	this.listener = item.listener || null;

	this.id = id;
	this.collator = collator;

	// Normalize queries to allow support for both objects and arrays
	this.query = this.normalizeQuery( item.query );
};

/* Inheritance */

OO.initClass( mw.editcheck.TextMatchItem );

/* Static properties */

mw.editcheck.TextMatchItem.static.defaultConfig = {
	enabled: true
};

/* Methods */

/**
 * Transform any query type into a dictionary of terms and their replacements,
 * with a null replacement if none exists
 *
 * @param {Object.<string,string>|string[]|string} query
 * @return {Object.<string,string>} Dictionary of each term and its replacement
 */
mw.editcheck.TextMatchItem.prototype.normalizeQuery = function ( query ) {
	if ( typeof query === 'string' ) {
		query = [ query ];
	}
	if ( Array.isArray( query ) ) {
		const normalized = Object.create( null );
		for ( const word of query ) {
			normalized[ word ] = null;
		}
		return normalized;
	}
	return query || Object.create( null );
};

/**
 * @return {boolean} if this matchItem is configured to be case sensitive
 */
mw.editcheck.TextMatchItem.prototype.isCaseSensitive = function () {
	return this.config && this.config.caseSensitive;
};

/**
 * Return the corresponding replacement word,
 * as defined for the given word in this matchItem's query
 *
 * @param {string} term to get replacement for
 * @return {string} replacement term
 */
mw.editcheck.TextMatchItem.prototype.getReplacement = function ( term ) {
	if ( this.isCaseSensitive() ) {
		return this.query[ term ];
	}
	const key = Object.keys( this.query ).find(
		( k ) => this.collator.compare( k, term ) === 0
	);
	return key ? this.query[ key ] : null;
};

/**
 * Expand a fragment given the match item's config
 *
 * @param {ve.dm.SurfaceFragment} fragment
 * @return {ve.dm.SurfaceFragment} Expanded fragment
 */
mw.editcheck.TextMatchItem.prototype.getExpandedFragment = function ( fragment ) {
	switch ( this.expand ) {
		case 'sentence':
			// TODO: implement once unicodejs support is added
			break;
		case 'paragraph':
			fragment = fragment.expandLinearSelection( 'closest', ve.dm.ContentBranchNode )
				// …but that covered the entire CBN, we only want the contents
				.adjustLinearSelection( 1, -1 );
			break;
		case 'word':
		case 'siblings':
		case 'parent':
			fragment = fragment.expandLinearSelection( this.expand );
			break;
	}
	return fragment;
};

/**
 * Get a unique subtag for this matchitem-term pair.
 * Builds the subtag from:
 * - the index of the matchItem when created
 * - and, optionally, the index of the term in the list of keys from the matchItem's query
 *
 * @param {string} term
 * @return {string} A subtag in the format '-{matchIndex}-{termIndex}'
 */
mw.editcheck.TextMatchItem.prototype.getSubTag = function ( term ) {
	const queries = Object.keys( this.query );
	let termIndex;
	if ( this.expand ) {
		// This operates under the assumption that, if the expand property is set,
		// there can only be one action from this matchitem for any given fragment.
		return `-${ this.id }`;
	}
	if ( this.caseSensitive ) {
		termIndex = queries.indexOf( term );
	} else {
		termIndex = queries.findIndex( ( q ) => this.collator.compare( q, term ) === 0 );
	}
	if ( !this.id || termIndex === -1 ) {
		return '';
	}
	return `-${ this.id }-${ termIndex }`;
};
