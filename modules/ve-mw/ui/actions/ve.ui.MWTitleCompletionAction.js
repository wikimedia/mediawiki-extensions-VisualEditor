/*!
 * VisualEditor UserInterface MWTitleCompletionAction class.
 *
 * @copyright See AUTHORS.txt
 */

/**
 * Base class for source-mode completion actions that suggest page titles from
 * a search query, e.g. wikilinks and template transclusions.
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

	// Create a dummy input widget
	// TODO: Abstract methods in TitleInputWidget enough that this isn't necessary.
	this.titleWidget = new mw.widgets.TitleInputWidget( {
		showDisambigsLast: true,
		showInterwikis: true,
		searchFragments: true,
		showMissing: true,
		namespace: this.constructor.static.namespace,
		limit: this.constructor.static.defaultLimit,
		api: this.surface.getTarget().getContentApi()
	} );
	this.suggestionsPromise = null;
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTitleCompletionAction, ve.ui.CompletionAction );

/* Static Properties */

// Strip the two-character trigger ('[[' or '{{') from the searched input.
ve.ui.MWTitleCompletionAction.static.sequenceLength = 2;

// This action does not call filterSuggestionsForInput, so nothing adds the input to
// the list. Leaving this true would make CompletionWidget subtract a suggestion that
// is not there when it counts the matches for shouldAbandon.
ve.ui.MWTitleCompletionAction.static.alwaysIncludeInput = false;

/**
 * @property {number|undefined} Namespace to prepend to queries - undefined if none
 * @static
 * @inheritable
 */
ve.ui.MWTitleCompletionAction.static.namespace = undefined;

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
	if ( this.suggestionsPromise ) {
		this.suggestionsPromise.abort();
	}

	this.titleWidget.setValue( input );
	const hasColonPrefix = input.startsWith( ':' );

	this.suggestionsPromise = this.titleWidget.getSuggestionsPromise();
	return this.suggestionsPromise.then( ( response ) => {
		if ( !response || !response.query ) {
			return [];
		}
		return this.titleWidget.getOptionsFromData( response.query )
			// The API limit only limits the prefix search. TitleWidget adds the sources
			// of resolved redirects and the missing-page result on top of that, so cap
			// the list here as filterSuggestionsForInput used to.
			.slice( 0, this.constructor.static.defaultLimit )
			.map(
				// Hack: Colon prefix gets normalised away.
				// TODO: Find a way to extract the "isInterwiki" flag from the response.
				( option ) => ( hasColonPrefix ? ':' : '' ) + option.data
			);
	} );
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
