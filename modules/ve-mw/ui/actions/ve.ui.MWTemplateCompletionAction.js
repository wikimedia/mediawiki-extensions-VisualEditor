/*!
 * VisualEditor UserInterface MWTemplateCompletionAction class.
 *
 * @copyright See AUTHORS.txt
 */

/**
 * Autocompletion of template transclusions in source mode, triggered by typing "{{".
 *
 * @class
 * @extends ve.ui.MWTitleCompletionAction
 *
 * @constructor
 * @param {ve.ui.Surface} surface Surface to act on
 * @param {string} [source]
 */
ve.ui.MWTemplateCompletionAction = function VeUiMWTemplateCompletionAction() {
	// Parent constructor
	ve.ui.MWTemplateCompletionAction.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTemplateCompletionAction, ve.ui.MWTitleCompletionAction );

/* Static Properties */

ve.ui.MWTemplateCompletionAction.static.name = 'mwTemplateCompletion';

ve.ui.MWTemplateCompletionAction.static.namespace = mw.config.get( 'wgNamespaceIds' ).template;

ve.ui.MWTemplateCompletionAction.static.headerMessage = 'visualeditor-templatecompletion-header';

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWTemplateCompletionAction.prototype.createTitleWidget = function ( config ) {
	// MWTemplateTitleInputWidget knows about template-specific behavior
	return new ve.ui.MWTemplateTitleInputWidget( ve.extendObject( {}, config, {
		// A transclusion has no section to link to
		searchFragments: false,
		// Transclusion from another wiki does not work
		showInterwikis: false
	} ) );
};

/**
 * @inheritdoc
 */
ve.ui.MWTemplateCompletionAction.prototype.prepareSearch = function ( input ) {
	// The search does not know the {{subst:...}} magic word. A query that starts with it
	// gets no results, or the wrong ones. The magic word comes before a colon for the main
	// namespace, as in "{{subst::Article}}".
	const magicWord = input.match( ve.dm.MWTemplateModel.static.substMagicWordPattern ),
		query = magicWord ? input.slice( magicWord[ 0 ].length ) : input;

	this.setSearchNamespace( query );

	return ( magicWord ? magicWord[ 0 ] : '' ) +
		ve.ui.MWTemplateCompletionAction.super.prototype.prepareSearch.call( this, query );
};

/**
 * Point the search at the namespace the query names
 *
 * A transclusion is from the template namespace unless the wikitext names another one, as in
 * "{{Help:Foo}}" or "{{:Article}}". A search of the template namespace finds nothing for
 * those.
 *
 * @private
 * @param {string} query Query, without a {{subst:...}} magic word
 */
ve.ui.MWTemplateCompletionAction.prototype.setSearchNamespace = function ( query ) {
	const defaultNamespace = this.constructor.static.namespace,
		title = mw.Title.newFromText( query, defaultNamespace ),
		namespace = title ? title.getNamespaceId() : defaultNamespace;

	if ( namespace !== this.titleWidget.getNamespace() ) {
		this.titleWidget.setNamespace( namespace );
		// Only the default namespace is left out of the inserted wikitext
		this.titleWidget.relative = namespace === defaultNamespace;
	}
};

/**
 * @inheritdoc
 */
ve.ui.MWTemplateCompletionAction.prototype.getInsertionText = function ( suggestion ) {
	return '{{' + suggestion + '}}';
};

/* Registration */

ve.ui.actionFactory.register( ve.ui.MWTemplateCompletionAction );

const templateCommand = new ve.ui.Command(
	'openMWTemplateCompletions', ve.ui.MWTemplateCompletionAction.static.name, 'open',
	{ supportedSelections: [ 'linear' ] }
);
ve.ui.wikitextCommandRegistry.register( templateCommand );
ve.ui.wikitextSequenceRegistry.register(
	new ve.ui.Sequence( 'autocompleteMWTemplates', 'openMWTemplateCompletions', '{{', 0 )
);
