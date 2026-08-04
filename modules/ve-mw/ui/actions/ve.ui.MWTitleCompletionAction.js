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
	this.titleWidget = this.createTitleWidget( {
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
 * Create the widget whose search logic this action reuses
 *
 * @protected
 * @param {Object} config Configuration options for the widget
 * @return {mw.widgets.TitleInputWidget}
 */
ve.ui.MWTitleCompletionAction.prototype.createTitleWidget = function ( config ) {
	return new mw.widgets.TitleInputWidget( config );
};

/**
 * Prepare the search for an input, and get the leading syntax the search leaves out
 *
 * A leading colon says "not the default namespace". It is not part of the title, and the
 * search finds nothing for a query that starts with one, e.g. ":Category:Foo". A subclass
 * adds the syntax it knows in front of this, in the order the wikitext uses.
 *
 * @protected
 * @param {string} input
 * @return {string} Start of the input to put back in front of each suggestion
 */
ve.ui.MWTitleCompletionAction.prototype.prepareSearch = function ( input ) {
	return input.startsWith( ':' ) ? ':' : '';
};

/**
 * @inheritdoc
 */
ve.ui.MWTitleCompletionAction.prototype.getSuggestions = function ( input ) {
	if ( this.suggestionsPromise ) {
		this.suggestionsPromise.abort();
	}

	const prefix = this.prepareSearch( input ),
		query = input.slice( prefix.length );
	this.titleWidget.setValue( query );

	// getLookupRequest, not getSuggestionsPromise: subclasses of the widget adjust the
	// results there, and the menu must show the same results as the widget would.
	this.suggestionsPromise = this.titleWidget.getLookupRequest();
	return this.suggestionsPromise.then( ( response ) => {
		if ( !response || !response.query ) {
			return [];
		}
		const suggestions = this.titleWidget.getOptionsFromData( response.query )
			// The API limit only limits the prefix search. TitleWidget adds the sources
			// of resolved redirects and the missing-page result on top of that, so cap
			// the list here as filterSuggestionsForInput used to.
			.slice( 0, this.constructor.static.defaultLimit )
			.map(
				// Put back what the search did not get
				// TODO: Find a way to extract the "isInterwiki" flag from the response.
				( option ) => prefix + this.restoreTypedNamespace( option.data, query )
			);
		// The input as typed and the normalized title become the same wikitext here
		return OO.unique( suggestions );
	} );
};

/**
 * Put a namespace prefix back the way it was typed
 *
 * The search answers with canonical titles, so a query for "Image:Foo" comes back as
 * "File:Foo". Keep the prefix the user chose. This also keeps the correct name for a
 * namespace that has a gendered form.
 *
 * @protected
 * @param {string} suggestion Suggestion from the title widget
 * @param {string} query Query the suggestion was found for, without a leading colon
 * @return {string}
 */
ve.ui.MWTitleCompletionAction.prototype.restoreTypedNamespace = function ( suggestion, query ) {
	const colon = query.indexOf( ':' ),
		title = colon > 0 ? mw.Title.newFromText( query ) : null,
		// The main namespace has no prefix. An interwiki prefix also resolves to it, and
		// must stay part of the title
		namespace = title ? title.getNamespaceId() : 0;
	if ( !namespace ) {
		return suggestion;
	}

	const typedPrefix = query.slice( 0, colon ),
		canonicalPrefix = mw.config.get( 'wgFormattedNamespaces' )[ namespace ];
	// Replace the prefix only, so that a section or a subpage of the title survives
	return canonicalPrefix !== typedPrefix && suggestion.startsWith( canonicalPrefix + ':' ) ?
		typedPrefix + suggestion.slice( canonicalPrefix.length ) :
		suggestion;
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
