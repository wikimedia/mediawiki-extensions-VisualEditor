/*!
 * VisualEditor UserInterface MWTitleCompletionAction class.
 *
 * @copyright See AUTHORS.txt
 */

/**
 * Base class for source-mode completion actions that suggest page titles from
 * an opensearch query, e.g. wikilinks and template transclusions.
 *
 * @class
 * @abstract
 * @extends ve.ui.CompletionAction
 *
 * @constructor
 * @param {ve.ui.Surface} surface Surface to act on
 * @param {string} [source]
 */
ve.ui.MWTitleCompletionAction = function VeUiMWTitleCompletionAction() {
	// Parent constructor
	ve.ui.MWTitleCompletionAction.super.apply( this, arguments );

	// Shared API object so previous requests can be aborted
	this.api = this.surface.getTarget().getContentApi();
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTitleCompletionAction, ve.ui.CompletionAction );

/* Static Properties */

// Strip the two-character trigger ('[[' or '{{') from the searched input.
ve.ui.MWTitleCompletionAction.static.sequenceLength = 2;

/**
 * @property {number} Namespace to search, as understood by the opensearch API
 * @static
 * @inheritable
 */
ve.ui.MWTitleCompletionAction.static.namespace = null;

/**
 * @property {string|null} Message key for the completion menu header
 * @static
 * @inheritable
 */
ve.ui.MWTitleCompletionAction.static.headerMessage = null;

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWTitleCompletionAction.prototype.getSuggestions = function ( input ) {
	this.api.abort(); // Abort all unfinished API requests
	const search = input.trim();
	if ( !search ) {
		// opensearch errors on an empty search term, and there are no useful
		// suggestions for an empty prefix anyway. Resolve to nothing so the menu
		// clears, rather than firing a request that rejects and leaves the
		// previous invocation's results on screen.
		return ve.createDeferred().resolve( [] ).promise();
	}
	return this.api.get( {
		action: 'opensearch',
		namespace: this.constructor.static.namespace,
		search,
		// The menu only ever shows defaultLimit suggestions, so there's no point
		// fetching the opensearch maximum (up to 500) on every keystroke.
		limit: this.constructor.static.defaultLimit * 2
	} ).then(
		// opensearch returns [ searchTerm, titles[], descriptions[], urls[] ]
		( response ) => this.filterSuggestionsForInput(
			( response[ 1 ] || [] ).map( ( title ) => this.getSuggestionFromTitle( title ) ),
			input
		)
	);
};

/**
 * Convert a title returned by the API into a suggestion string
 *
 * This string is used both for matching against the input and, once chosen, as
 * the argument to #getInsertionText.
 *
 * @protected
 * @param {string} title Title as returned by opensearch
 * @return {string} Suggestion string
 */
ve.ui.MWTitleCompletionAction.prototype.getSuggestionFromTitle = function ( title ) {
	return title;
};

/**
 * Build the wikitext to insert for a chosen suggestion
 *
 * @protected
 * @abstract
 * @param {string} suggestion Chosen suggestion string
 * @return {string} Wikitext to insert, including the opening brackets
 */
ve.ui.MWTitleCompletionAction.prototype.getInsertionText = null;

/**
 * @inheritdoc
 */
ve.ui.MWTitleCompletionAction.prototype.getHeaderLabel = function ( input, suggestions ) {
	const headerMessage = this.constructor.static.headerMessage;
	if ( !headerMessage || ( suggestions && !suggestions.length ) ) {
		// Suppress the header when there are no suggestions, otherwise the menu
		// would stay open showing just the header with an empty list.
		return null;
	}
	return mw.msg( headerMessage );
};

/**
 * @inheritdoc
 */
ve.ui.MWTitleCompletionAction.prototype.insertCompletion = function ( data, range ) {
	// The range covers the opening brackets, so getInsertionText must re-emit them.
	const text = this.getInsertionText( data );
	return ve.ui.MWTitleCompletionAction.super.prototype.insertCompletion.call( this, text, range );
};

/**
 * @inheritdoc
 */
ve.ui.MWTitleCompletionAction.prototype.shouldAbandon = function ( input ) {
	// TODO: consider whether pending loads from server are happening here?
	return ve.ui.MWTitleCompletionAction.super.prototype.shouldAbandon.apply( this, arguments ) ||
		// Abandon if a character that suggests we're moving on from the link-markup has been entered
		/[\]}|]$/.test( input );
};
