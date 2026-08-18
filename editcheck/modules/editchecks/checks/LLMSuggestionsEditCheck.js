/*
 * LLMSuggestionEditCheck
 *
 * Displays any suggestions provided by the editing-suggestions service.
 *
 * @class
 *
 * @constructor
 * @param {mw.editcheck.Controller} controller
 * @param {Object} [config]
 * @param {boolean} [includeSuggestions=false]
 */
mw.editcheck.LLMSuggestionEditCheck = function () {
	mw.editcheck.LLMSuggestionEditCheck.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( mw.editcheck.LLMSuggestionEditCheck, mw.editcheck.BaseEditCheck );

/* Static properties */

mw.editcheck.LLMSuggestionEditCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.BaseEditCheck.static.defaultConfig, {
	showAsCheck: false, // This would never make sense to enable
	showAsSuggestion: false
} );

// TODO: remove this if translations happen:
const msg = ( key, wikitext ) => {
	const msgkey = `editcheck-llmsuggestion-${ key }`;
	ve.init.platform.addMessages( { [ msgkey ]: wikitext } );
	return ve.deferJQueryMsg( msgkey );
};

mw.editcheck.LLMSuggestionEditCheck.static.name = 'llmSuggestion';
mw.editcheck.LLMSuggestionEditCheck.static.title = 'Model sourced suggestion';
mw.editcheck.LLMSuggestionEditCheck.static.description = 'This suggestion comes from a model and should be verified before being followed';
mw.editcheck.LLMSuggestionEditCheck.static.prompt = 'Do you think this suggestion is valid?';
mw.editcheck.LLMSuggestionEditCheck.static.footer = msg( 'footer', 'Identified using an [https://www.mediawiki.org/wiki/VisualEditor/Suggestion_Mode/Model-generated_editing_suggestions#Research_findings open-weight language model]' );
mw.editcheck.LLMSuggestionEditCheck.static.footerIcon = 'robot';
mw.editcheck.LLMSuggestionEditCheck.static.success = 'Thank you for helping to ensure edit suggestions are reliable and useful';

mw.editcheck.LLMSuggestionEditCheck.static.choices = [
	{
		action: 'valid',
		label: 'Yes, it\'s valid'
	},
	{
		action: 'invalid',
		label: 'No, it\'s not valid'
	}
];

mw.editcheck.LLMSuggestionEditCheck.static.cachedPromises = new Map();

/* Static methods */

mw.editcheck.LLMSuggestionEditCheck.static.fetchSuggestions = function ( surfaceModel ) {
	if ( !this.cachedPromises.has( surfaceModel ) ) {
		const deferred = ve.createDeferred();
		mw.editcheck.fetchTimeout( 'https://api.wikimedia.org/service/lw/inference/v1/models/editing-suggestions:predict', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(
				/* eslint-disable camelcase */
				{
					wiki_id: mw.config.get( 'wgDBname' ),
					page_id: mw.config.get( 'wgRelevantArticleId' )
				}
				/* eslint-enable camelcase */
			)
		} )
			.then( ( response ) => response.json() )
			.then( ( results ) => {
				if ( !ve.getProp( results, 'suggestions' ) ) {
					deferred.reject( results );
					return;
				}
				const suggestions = [];
				const documentModel = surfaceModel.getDocument();
				// This could be optimized by squashing it into a single finder
				results.suggestions.forEach( ( result ) => {
					// Already present on result:
					// .wiki_id, .revision_id, .page_id, .page_title, .title, .static_description, .description, .target, .suggestion_type, .suggestion_id
					const ranges = documentModel.findText( result.target, { caseSensitiveString: true } );
					const range = ranges[ 0 ];
					if ( !range ) {
						return;
					}
					result.fragment = surfaceModel.getLinearFragment( range );
					suggestions.push( result );
				} );
				deferred.resolve( suggestions );
				return suggestions;
			}, ( reason ) => {
				deferred.reject( reason );
			} );
		this.cachedPromises.set( surfaceModel, deferred.promise() );
	}
	return this.cachedPromises.get( surfaceModel );
};

/* Methods */

mw.editcheck.LLMSuggestionEditCheck.prototype.onBranchNodeChange = function ( surfaceModel ) {
	if ( !this.includeSuggestions ) {
		return;
	}
	const documentModel = surfaceModel.getDocument();
	const modified = this.getModifiedRanges( documentModel );
	return this.constructor.static.fetchSuggestions( surfaceModel ).then( ( suggestions ) => suggestions.map( ( suggestion ) => {
		const fragment = suggestion.fragment;
		const range = fragment.getSelection().getRange();
		if ( this.isDismissedId( suggestion.suggestion_id ) ) {
			return null;
		}
		if (
			!range.isCollapsed() && // deleted fragment
			fragment.getText( '\uFFFC' ) === suggestion.target && // modified text might no longer apply
			modified.some( ( modifiedRange ) => modifiedRange.touchesRange( range ) )
		) {
			suggestion.previouslyApplied = true;
			return new mw.editcheck.LLMSuggestionEditCheckAction( {
				suggestionData: suggestion,
				fragments: [ fragment ],
				title: suggestion.title,
				message: msg( `description-${ suggestion.suggestion_id }`, suggestion.static_description ),
				check: this
			} );
		}
		if ( suggestion.previouslyApplied && !suggestion.tracked ) {
			suggestion.tracked = true;
			ve.track( `activity.editCheck-${ this.getName() }-${ suggestion.suggestion_type }`, {
				action: `invalidated-id-${ suggestion.suggestion_id }`
			} );
		}
		return null;
	} ) );
};

mw.editcheck.LLMSuggestionEditCheck.prototype.act = function ( choice, action ) {
	// parent will do the dismissal, but we need to log this for feedback
	ve.track( `activity.editCheck-${ action.getName() }`, { action: `${ choice }-id-${ action.id }` } );
	switch ( choice ) {
		case 'valid': {
			this.dismiss( action );
			this.showSuccess();
			break;
		}
		case 'invalid': {
			return action.widget.showFeedback( {
				allowInSuggestions: true,
				suppressFeedback: true,
				description: 'Please help developers understand why you think this suggestion is invalid',
				choices: [
					{
						data: 'mislabeled',
						label: 'There is an issue in the text, but the type of issue is mislabeled'
					},
					{
						data: 'unhelpful',
						label: 'There is an issue in the text, but the suggestion is not helpful'
					},
					{
						data: 'other',
						label: 'None of the above applies'
					}
				]
			} ).then( ( reason ) => {
				this.dismiss( action );
				this.showSuccess();
				ve.track( `activity.editCheck-${ action.getName() }`, { action: `${ choice }-id-${ action.id }-reason-${ reason }` } );
				return ve.createDeferred().resolve( { action: choice, reason } ).promise();
			} );
		}
	}
	// Parent method
	return mw.editcheck.LLMSuggestionEditCheck.super.prototype.act.apply( this, arguments );
};

/* Registration */

mw.editcheck.editCheckFactory.register( mw.editcheck.LLMSuggestionEditCheck );

/**
 * LLMSuggestionEditCheckAction
 *
 * Subclass of EditCheckAction to include information about the suggestion associated with this action
 *
 * @class
 * @extends mw.editcheck.EditCheckAction
 *
 * @constructor
 * @param {Object} config Configuration options
 * @param {Object} config.suggestion Suggestion data from the API
 */
mw.editcheck.LLMSuggestionEditCheckAction = function MWLLMSuggestionEditCheckAction( config ) {
	mw.editcheck.LLMSuggestionEditCheckAction.super.call( this, config );
	this.suggestionData = config.suggestionData;
	this.id = config.suggestionData.suggestion_id;
};

/* Inheritance */

OO.inheritClass( mw.editcheck.LLMSuggestionEditCheckAction, mw.editcheck.EditCheckAction );

/**
 * Get the name of the check type
 *
 * @return {string} Check type name
 */
mw.editcheck.LLMSuggestionEditCheckAction.prototype.getName = function () {
	return this.check.getName() + '-' + this.suggestionData.suggestion_type;
};

mw.editcheck.LLMSuggestionEditCheckAction.prototype.onActionSeen = function () {
	ve.track( `activity.editCheck-${ this.getName() }`, { action: `seen-id-${ this.id }` } );
	return mw.editcheck.LLMSuggestionEditCheckAction.super.prototype.onActionSeen.apply( this, arguments );
};
