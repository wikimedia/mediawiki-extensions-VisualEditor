/**
 * Edit check to detect generic text matches/replacements
 *
 * @class
 * @extends mw.editcheck.BaseEditCheck
 *
 * @constructor
 * @param {mw.editcheck.Controller} controller
 * @param {Object} [config]
 * @param {boolean} [includeSuggestions=false]
 */
mw.editcheck.TextMatchEditCheck = function MWTextMatchEditCheck() {
	// Parent constructor
	mw.editcheck.TextMatchEditCheck.super.apply( this, arguments );

	this.lang = mw.config.get( 'wgContentLanguage' );
	this.sensitivity = 'accent'; // TODO figure out how to determine this on an editcheck level
	this.collator = new Intl.Collator( this.lang, { sensitivity: this.sensitivity } );

	// Initialize lookup maps
	this.matchRules = [];

};

/* Inheritance */

OO.inheritClass( mw.editcheck.TextMatchEditCheck, mw.editcheck.BaseEditCheck );

/* Static properties */

mw.editcheck.TextMatchEditCheck.static.name = 'textMatch';

// Only show replacement preview if found text and replacement
// are below a certain length, to avoid UI issues with long text.
const replaceTextLengthLimit = 25;

/**
 * The configs of TextMatchEditCheck take priority over individual matchRule configs.
 * So we make TextMatch’s defaults nonrestrictive,
 * and let the finer limitations be handled by individual matchRules.
 */
mw.editcheck.TextMatchEditCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.TextMatchEditCheck.super.static.defaultConfig, {
	showAsCheck: false,
	maximumEditcount: null,
	minimumEditcount: null
} );

mw.editcheck.TextMatchEditCheck.static.choices = [
	{
		action: 'accept',
		label: OO.ui.deferMsg( 'editcheck-dialog-action-replace' ),
		modes: [ 'replace' ]
	},
	{
		action: 'delete',
		label: OO.ui.deferMsg( 'visualeditor-contextitemwidget-label-remove' ),
		modes: [ 'delete' ]
	},
	{
		action: 'dismiss',
		label: OO.ui.deferMsg( 'editcheck-action-dismiss' ),
		modes: [ '', 'info', 'replace', 'delete' ]
	}
];

/**
 * Object into which default matchRule configs can be placed
 *
 * This is largely a place for scripts to interact with the check
 *
 * @type {Object}
 */
mw.editcheck.TextMatchEditCheck.static.matchRules = {};

/**
 * Promise which holds the loading and processing of matchRules
 *
 * @type {Promise<Object>}
 */
mw.editcheck.TextMatchEditCheck.static.matchRulesPromise = null;

/**
 * Cache containing fully processed matchRules will all imports,
 * as well as any TextFinders created for them
 *
 * @type {Object}
 */
mw.editcheck.TextMatchEditCheck.static.matchCache = {
	rawMatchRules: null,
	memoizedFinders: {}
};

/**
 * Fetch corresponding MW file for any matchRules with the "import" property
 * and leave all other matchRules unchanged
 *
 * @param {Object} rawMatchRules map of matchRule IDs to raw config objects
 * @return {Promise<Object>} Promise which resolves to map of processed matchRules
 */
mw.editcheck.TextMatchEditCheck.static.processMatchRules = function ( rawMatchRules ) {
	const processed = {};
	const pageMap = {};
	const filenames = [];

	Object.entries( rawMatchRules ).forEach( ( [ id, rule ] ) => {
		if ( rule.import ) {
			const filename = rule.import;
			if ( !filename.startsWith( 'MediaWiki:' ) ) {
				mw.log.warn( `Skipped import for matchRule id:${ id } (${ filename } must be in mediawiki namespace.)` );
				return;
			}
			if ( !filename.endsWith( '.json' ) ) {
				mw.log.warn( `Skipped import for matchRule id:${ id } (${ filename } must be a json file.)` );
				return;
			}
			filenames.push( rule.import );
			pageMap[ id ] = rule.import;
		} else {
			processed[ id ] = rule;
		}
	} );
	if ( filenames.length === 0 ) {
		return Promise.resolve( processed );
	}
	return mw.editcheck.getMediaWikiJSON( filenames )
		.then( ( imported ) => {
			if ( imported ) {
				Object.entries( pageMap ).forEach( ( [ id, filename ] ) => {
					if ( imported.has( filename ) ) {
						processed[ id ] = imported.get( filename );
					}
				} );
			}
			return processed;
		} )
		.catch( ( err ) => {
			// If the api request fails entirely,
			// we'll log it but continue with the non-imported configs
			mw.log.error( ' Failed to import configs', err );
			return processed;
		} );
};

/**
 * Ensure matchRules and any imported configs are loaded exactly once per edit session
 *
 * @return {Promise<Object>} Promise which resolves to processed matchRules
 */
mw.editcheck.TextMatchEditCheck.static.ensureMatchRulesLoaded = function () {
	// If we've already started loading config, then every caller waits on same promise.
	if ( this.matchRulesPromise ) {
		return this.matchRulesPromise;
	}
	const rawMatchRules = Object.assign(
		{},
		mw.editcheck.TextMatchEditCheck.static.matchRules || {},
		// In T424678 we renamed matchItems to matchRules, but allow 'matchItems' for backwards compatibility temporarily
		ve.getProp( mw.editcheck.config, 'textMatch', 'matchRules' ) || ve.getProp( mw.editcheck.config, 'textMatch', 'matchItems' ) || {}
	);

	// Begin async processing and cache promise
	this.matchRulesPromise = this.processMatchRules( rawMatchRules )
		.then( ( processed ) => {
			const cache = {
				rawMatchRules: processed,
				memoizedFinders: {}
			};
			// Reset the cache when we get new matchRules
			this.matchCache = cache;
			return cache;
		} )
		.catch( ( err ) => {
			mw.log.error( 'Failed to process matchRules', err );
			this.matchRulesPromise = null;
		} );
	return this.matchRulesPromise;
};

/* Methods */

/**
 * Create a matchRule instance for each matchRule
 * NOTE: rawMatchRules should never be anything but this.constructor.static.matchCache.rawMatchRules
 *
 * @param {Object} rawMatchRules all matchRule objects from config
 */
mw.editcheck.TextMatchEditCheck.prototype.instantiateMatchRules = function ( rawMatchRules ) {
	// Create matchRule instances
	Object.entries( rawMatchRules ).forEach( ( [ id, rule ] ) => {
		const isValidMode = this.constructor.static.choices.some(
			( choice ) => choice.modes.includes( rule.mode )
		);
		rule.mode = isValidMode ? rule.mode : '';
		if ( !rule.expand && ve.getProp( rule, 'config', 'minOccurrences' ) ) {
			mw.log.warn( 'MatchRule \'' + rule.title + '\' sets minOccurrences but is missing expand value.' );
		}
		const textMatchRule = new mw.editcheck.TextMatchRule( rule, id, this.collator );
		this.matchRules.push( textMatchRule );
	} );
};

/**
 * @param {ve.dm.SurfaceModel} surfaceModel
 * @param {string} listener
 * @return {Promise<mw.editcheck.TextMatchEditCheckAction[]>}
 */
mw.editcheck.TextMatchEditCheck.prototype.handleListener = function ( surfaceModel, listener ) {
	// wait here until matchRules are guaraunteed to exist!
	return this.constructor.static.ensureMatchRulesLoaded()
		.then( () => {
			if ( !this.matchRules.length ) {
				this.instantiateMatchRules( this.constructor.static.matchCache.rawMatchRules );
			}
			const finders = this.constructor.static.matchCache.memoizedFinders;
			const actions = [];
			const document = surfaceModel.getDocument();
			const modified = this.getModifiedContentRanges( document );

			for ( const matchRule of this.matchRules ) {

				const terms = Object.keys( matchRule.query );

				// Check if action can be created for this range
				const isUsableRange = ( range, tagName ) => {
					if ( !modified.some( ( modRange ) => range.touchesRange( modRange ) ) ) {
						return false;
					}
					if ( !this.isRangeValid( range, surfaceModel.documentModel ) ) {
						return false;
					}
					if ( this.isDismissedRange( range, tagName ) ) {
						return false;
					}
					if ( matchRule.listener && matchRule.listener !== listener ) {
						return false;
					}
					if ( matchRule.inNode && !matchRule.isRangeInNode( range, surfaceModel ) ) {
						return false;
					}
					// Above we checked for the overall textmatch config, but now
					// we need to know if this rule is more-specific:
					if ( !(
						this.constructor.static.doesConfigMatch( matchRule.config, surfaceModel.documentModel, this.includeSuggestions ) &&
						this.isRangeValid( range, surfaceModel.documentModel, matchRule.config )
					) ) {
						return false;
					}
					return true;
				};

				// Create or retrieve the TextFinder for this match rule
				if ( !finders[ matchRule.id ] ) {
					const finder = new ve.dm.SetTextFinder( new Set( terms ),
						{
							caseSensitiveString: matchRule.isCaseSensitive(),
							wholeWord: true
						} );
					finders[ matchRule.id ] = new ve.dm.MemoizedTextFinder( finder );
				}

				// Find all ranges that match this rule's search terms
				const ranges = document.findText( finders[ matchRule.id ] );
				const fragMap = new Map();

				for ( const range of ranges ) {
					const term = surfaceModel.getLinearFragment( range ).getText();
					const tagName = this.constructor.static.name + matchRule.getSubTag( term );
					if ( !isUsableRange( range, tagName ) ) {
						continue;
					}

					const fragment = matchRule.getExpandedFragment( surfaceModel.getLinearFragment( range ) );
					const min = matchRule.config.minOccurrences;
					// If this match rule requires a certain number of occurrences, start keeping track of those
					if ( min ) {
						const fragRange = fragment.getSelection().getRange();
						const key = `${ fragRange.start }-${ fragRange.end }`;
						const count = ( fragMap.get( key ) || 0 ) + 1;
						fragMap.set( key, count );
						// Use strict equality so that we can keep adding to the occurrences
						// in this fragment while only creating an action once
						if ( count !== min ) {
							continue;
						}
					}
					let replacement = matchRule.getReplacement( term );
					if ( matchRule.preserveCase ) {
						replacement = mw.editcheck.applyCase( replacement, term, this.lang );
					}
					actions.push( this.buildAction( matchRule, fragment, term, replacement, tagName ) );
				}
			}
			return actions;
		} );
};

/**
 * Build a TextMatchEditCheckAction
 *
 * @param {mw.editcheck.TextMatchEditCheck} matchRule
 * @param {ve.dm.LinearFragment} fragment fragment that the match covers, after optional expansion
 * @param {string} term individual term that triggered the match, before optional expansion
 * @param {string} replacement word or phrase to use as the replacement, if action allows
 * @param {string} tagName unique tag name for this matchRule+term pair
 * @return {mw.editcheck.TextMatchEditCheckAction}
 */
mw.editcheck.TextMatchEditCheck.prototype.buildAction = function ( matchRule, fragment, term, replacement, tagName ) {
	let prompt;
	const foundText = fragment.getText();
	if ( matchRule.mode === 'replace' ) {
		if (
			replacement &&
			foundText.length <= replaceTextLengthLimit &&
			replacement.length <= replaceTextLengthLimit
		) {
			prompt = ve.msg( 'editcheck-textmatch-replace', foundText, replacement );
		}
	}
	return new mw.editcheck.TextMatchEditCheckAction( {
		fragments: [ fragment ],
		prompt,
		term,
		replacement,
		title: matchRule.title,
		message: matchRule.message,
		check: this,
		mode: matchRule.mode,
		matchRuleId: matchRule.id,
		tagName
	} );
};

mw.editcheck.TextMatchEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	return this.handleListener( surfaceModel, 'onDocumentChange' );
};

// For now it doesn't make sense to run a TextMatchEditCheck in review mode
// as there isn't a way to edit the text.
mw.editcheck.TextMatchEditCheck.prototype.onBeforeSave = null;

mw.editcheck.TextMatchEditCheck.prototype.act = function ( choice, action, surface ) {
	switch ( choice ) {
		case 'delete':
			action.fragments[ 0 ].removeContent();
			action.select( surface, true );
			return;
		case 'accept': {
			const fragment = action.fragments[ 0 ];
			fragment.insertContent( action.replacement, true );
			action.select( surface, true );
			return;
		}
	}
	// Parent method
	return mw.editcheck.TextMatchEditCheck.super.prototype.act.apply( this, arguments );
};

/* Registration */

mw.editcheck.editCheckFactory.register( mw.editcheck.TextMatchEditCheck );

/**
 * TextMatchEditCheckAction
 *
 * Subclass of EditCheckAction to include information about the matchRule associated with this action
 *
 * @class
 * @extends mw.editcheck.EditCheckAction
 *
 * @constructor
 * @param {Object} config Configuration options
 * @param {string} config.matchRuleId ID of the matchRule that triggered the match
 * @param {string} config.term Term that prompted the action
 * @param {string} config.message Message for the action dialog
 * @param {string} config.replacement Word or phrase to use as the replacement, if action allows
 * @param {string} config.tagName Unique tag name for this matchRule+term pair
 */
mw.editcheck.TextMatchEditCheckAction = function MWTextMatchEditCheckAction( config ) {
	mw.editcheck.TextMatchEditCheckAction.super.call( this, config );
	this.matchRuleId = config.matchRuleId;
	this.term = config.term;
	const msgkey = `editcheck-textmatch-${ config.matchRuleId }-description`;
	ve.init.platform.addMessages( { [ msgkey ]: config.message } );
	this.message = ve.deferJQueryMsg( msgkey );
	this.replacement = config.replacement;
	this.tagName = config.tagName;
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
 * @param {...any} args
 * @return {boolean}
 */
mw.editcheck.TextMatchEditCheckAction.prototype.equals = function ( other, ...args ) {
	if ( !this.constructor.super.prototype.equals.call( this, other, ...args ) ) {
		return false;
	}
	return this.matchRuleId === other.matchRuleId;
};

/**
 * Get unique tag name for this action
 *
 * @return {string} unique tag
 */
mw.editcheck.TextMatchEditCheckAction.prototype.getTagName = function () {
	return this.tagName ? this.tagName : this.check.getName();
};

/**
 * Get the name of the check type
 *
 * @return {string} Check type name
 */
mw.editcheck.TextMatchEditCheckAction.prototype.getName = function () {
	return this.check.getName() + '-' + this.matchRuleId;
};

/**
 * TextMatchRule
 *
 * Class to represent a single matchRule for TextMatchEditCheck
 *
 * @class
 *
 * @constructor
 * @param {Object} rule Match rule
 * @param {string} rule.title Title of the match rule, used in the action prompt
 * @param {string} rule.message Message to show in the action description
 * @param {Object.<string,string>|string[]|string} rule.query Terms to match, string, array or object mapping terms to their replacements.
 * @param {string} [rule.mode] 'info', 'replace', or 'delete', to determine the type of action to show for this matchRule.
 * @param {Object} [rule.config] Configuration options.
 * @param {string} [rule.expand] Expansions mode 'sentence', 'paragraph', 'word', 'siblings', or 'parent'
 * @param {string} [rule.inNode] Node type that a match must be inside of
 * @param {string} [rule.listener] Listener that this matchRule applies to, if not all
 * @param {boolean} [rule.preserveCase] If the replacement should match the case of the found term
 * @param {string} id ID of matchRule in config
 * @param {Intl.Collator} collator Collator to use for comparisons
 */
mw.editcheck.TextMatchRule = function MWTextMatchRule( rule, id, collator ) {
	this.title = rule.title;
	this.mode = rule.mode || '';
	this.message = rule.message;
	this.config = ve.extendObject( {}, this.constructor.static.defaultConfig, rule.config );
	this.expand = rule.expand;
	this.inNode = rule.inNode || null;
	this.listener = rule.listener || null;
	this.preserveCase = rule.preserveCase;

	// If the selection is meant to be expanded, then only one action should be created per expanded fragment range
	if ( this.expand && !this.config.minOccurrences ) {
		this.config.minOccurrences = 1;
	}

	this.id = id;
	this.collator = collator;

	// Normalize queries to allow support for both objects and arrays
	this.query = this.normalizeQuery( rule.query );
};

/* Inheritance */

OO.initClass( mw.editcheck.TextMatchRule );

/* Static properties */

mw.editcheck.TextMatchRule.static.defaultConfig = {
	showAsCheck: true,
	showAsSuggestion: true
};

/* Methods */

/**
 * Transform any query type into a dictionary of terms and their replacements,
 * with a null replacement if none exists
 *
 * @param {Object.<string,string>|string[]|string} query
 * @return {Object.<string,string>} Dictionary of each term and its replacement
 */
mw.editcheck.TextMatchRule.prototype.normalizeQuery = function ( query ) {
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
 * @return {boolean} if this matchRule is configured to be case sensitive
 */
mw.editcheck.TextMatchRule.prototype.isCaseSensitive = function () {
	return this.config && this.config.caseSensitive;
};

/**
 * Check if a range is inside the required inNode type.
 *
 * @param {ve.Range} range
 * @param {ve.dm.Surface} surfaceModel
 * @return {boolean}
 */
mw.editcheck.TextMatchRule.prototype.isRangeInNode = function ( range, surfaceModel ) {
	if ( !this.inNode ) {
		return true;
	}

	const fragment = surfaceModel.getLinearFragment( range );
	return fragment.hasMatchingAncestor( this.inNode );
};

/**
 * Return the corresponding replacement word,
 * as defined for the given word in this matchRule's query
 *
 * @param {string} term to get replacement for
 * @return {string} replacement term
 */
mw.editcheck.TextMatchRule.prototype.getReplacement = function ( term ) {
	if ( this.isCaseSensitive() ) {
		return this.query[ term ];
	}
	const key = Object.keys( this.query ).find(
		( k ) => this.collator.compare( k, term ) === 0
	);
	return key ? this.query[ key ] : null;
};

/**
 * Expand a fragment given the match rule's config
 *
 * @param {ve.dm.SurfaceFragment} fragment
 * @return {ve.dm.SurfaceFragment} Expanded fragment
 */
mw.editcheck.TextMatchRule.prototype.getExpandedFragment = function ( fragment ) {
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
 * Get a unique subtag for this matchRule-term pair.
 * Builds the subtag from:
 * - the index of the matchRule when created
 * - and, optionally, the index of the term in the list of keys from the matchRule's query
 *
 * @param {string} term
 * @return {string} A subtag in the format '-{matchIndex}-{termIndex}'
 */
mw.editcheck.TextMatchRule.prototype.getSubTag = function ( term ) {
	const queries = Object.keys( this.query );
	let termIndex;
	if ( this.expand ) {
		// This operates under the assumption that, if the expand property is set,
		// there can only be one action from this matchRule for any given fragment.
		return `-${ this.id }`;
	}
	if ( this.config.caseSensitive ) {
		termIndex = queries.indexOf( term );
	} else {
		termIndex = queries.findIndex( ( q ) => this.collator.compare( q, term ) === 0 );
	}
	if ( !this.id || termIndex === -1 ) {
		return '';
	}
	return `-${ this.id }-${ termIndex }`;
};
