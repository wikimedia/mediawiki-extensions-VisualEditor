/*
 * SuggestedLinkEditCheck
 *
 * Offers to add links suggested by the suggested link service.
 *
 * @class
 * @extends mw.editcheck.LinkEditCheck
 *
 * @constructor
 * @param {mw.editcheck.Controller} controller
 * @param {Object} [config]
 * @param {boolean} [includeSuggestions=false]
 */
mw.editcheck.SuggestedLinkEditCheck = function () {
	mw.editcheck.SuggestedLinkEditCheck.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( mw.editcheck.SuggestedLinkEditCheck, mw.editcheck.LinkEditCheck );

/* Static properties */

mw.editcheck.SuggestedLinkEditCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.BaseEditCheck.static.defaultConfig, {
	showAsCheck: false, // This would never make sense to enable
	showAsSuggestion: true,
	minimumEditCount: {
		suggestionMode: 1000,
		checkMode: 1000 // this shouldn't ever be checked but is here for completeness
	},
	maximumEditCount: false,
	predictionThreshold: 0.8,
	importGrowthExperimentConfig: true
} );

mw.editcheck.SuggestedLinkEditCheck.static.name = 'suggestedLink';
mw.editcheck.SuggestedLinkEditCheck.static.title = OO.ui.deferMsg( 'editcheck-suggestedlink-title' );
mw.editcheck.SuggestedLinkEditCheck.static.description = ve.deferJQueryMsg( 'editcheck-suggestedlink-description' );
mw.editcheck.SuggestedLinkEditCheck.static.footer = ve.deferJQueryMsg( 'editcheck-suggestedlink-footer' );
mw.editcheck.SuggestedLinkEditCheck.static.footerIcon = 'robot';

mw.editcheck.SuggestedLinkEditCheck.static.choices = [
	{
		action: 'accept',
		label: OO.ui.deferMsg( 'editcheck-suggestedlink-action-add-link' )
	},
	{
		action: 'dismiss',
		label: OO.ui.deferMsg( 'editcheck-action-dismiss' )
	}
];

mw.editcheck.SuggestedLinkEditCheck.static.linkClasses = [ ve.dm.MWInternalLinkAnnotation ];

mw.editcheck.SuggestedLinkEditCheck.static.cachedPromises = new Map();

/* Static methods */

mw.editcheck.SuggestedLinkEditCheck.static.fetchSuggestions = function ( surfaceModel ) {
	if ( !this.cachedPromises.has( surfaceModel ) ) {
		const deferred = ve.createDeferred();
		// TODO: build this URL in some more robust manner, maybe by
		// persuading the model-owner to use a present-in-mw.config identifier
		const parts = window.location.hostname.split( '.' );
		if ( ve.getProp( parts, 1 ) !== 'wikipedia' ) {
			return deferred.resolve( [] ).promise();
		}
		mw.editcheck.fetchTimeout( `https://api.wikimedia.org/service/linkrecommendation/v1/linkrecommendations/${ parts[ 1 ] }/${ parts[ 0 ] }/${ mw.config.get( 'wgRelevantPageName' ) }` )
			.then( ( response ) => response.json() )
			.then( ( results ) => {
				if ( !ve.getProp( results, 'links' ) ) {
					deferred.reject( results );
					return;
				}
				const linkData = [];
				const documentModel = surfaceModel.getDocument();
				// This could be optimized by squashing it into a single finder
				results.links.forEach( ( result ) => {
					const ranges = documentModel.findText( result.context_before + result.link_text + result.context_after, { caseSensitiveString: true } );
					const range = ranges[ result.match_index ];
					if ( !range ) {
						return;
					}
					result.title = mw.Title.newFromText( result.link_target );
					result.fragment = surfaceModel.getLinearFragment( new ve.Range( range.start + result.context_before.length, range.end - result.context_after.length ) );
					linkData.push( result );
				} );
				deferred.resolve( linkData );
				return linkData;
			}, ( reason ) => {
				deferred.reject( reason );
			} );
		this.cachedPromises.set( surfaceModel, deferred.promise() );
	}
	return this.cachedPromises.get( surfaceModel );
};

/* Methods */

mw.editcheck.SuggestedLinkEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	return Promise.all( [
		this.constructor.static.fetchSuggestions( surfaceModel ),
		this.getGrowthConfig()
	] ).then( ( [ linkData, extraConfig ] ) => {
		const documentModel = surfaceModel.getDocument();
		if ( extraConfig ) {
			// Growth config can change the category/template checks which ran earlier
			if ( !this.constructor.static.doesConfigMatch( extraConfig, documentModel, this.includeSuggestions ) ) {
				return null;
			}
			// This will affect the output of getModifiedRanges (and is okay
			// to modify in-place because a new this.config is created on every run):
			this.config.ignoreSections = [ ...( this.config.ignoreSections || [] ), ...extraConfig.ignoreSections ];
		}
		const modified = this.getModifiedRanges( documentModel );
		return linkData.map( ( link ) => {
			const range = link.fragment.getSelection().getRange();
			if (
				link.score >= this.config.predictionThreshold &&
				!range.isCollapsed() && // deleted fragment
				link.fragment.getText() === link.link_text && // modified text might no longer apply
				!this.isDismissedRange( range ) &&
				!this.getLinkFromFragment( link.fragment ) &&
				modified.some( ( modifiedRange ) => modifiedRange.touchesRange( range ) )
			) {
				return this.buildActionFromLinkRange( range, surfaceModel, {
					prompt: ve.deferJQueryMsg( 'editcheck-suggestedlink-prompt', link.link_text, link.link_target )
				} );
			}
			return null;
		} );
	} );
};

mw.editcheck.SuggestedLinkEditCheck.prototype.act = function ( choice, action, surface ) {
	if ( choice === 'accept' ) {
		return this.constructor.static.fetchSuggestions( surface.getModel() ).then( ( linkData ) => {
			const fragment = action.fragments[ 0 ];
			const link = linkData.find( ( ln ) => ln.fragment.getSelection().equals( fragment.getSelection() ) );
			if ( !link ) {
				return;
			}
			fragment.annotateContent( 'clear', ve.dm.MWInternalLinkAnnotation.static.name );
			fragment.annotateContent( 'set', ve.dm.MWInternalLinkAnnotation.static.newFromTitle( link.title ) );
			action.select( surface, true );
		} );
	}
	// Parent method
	return mw.editcheck.SuggestedLinkEditCheck.super.prototype.act.apply( this, arguments );
};

mw.editcheck.SuggestedLinkEditCheck.prototype.getGrowthConfig = function () {
	if ( !this.config.importGrowthExperimentConfig ) {
		return ve.createDeferred().resolve( false ).promise();
	}
	if ( !this.constructor.static.configPromise ) {
		// This is stopping us from repeatedly fetching the data
		const configPageName = 'MediaWiki:GrowthExperimentsSuggestedEdits.json';
		this.constructor.static.configPromise = mw.editcheck.getMediaWikiJSON( [ configPageName ] )
			.then( ( result ) => {
				if ( !result || !result.has( configPageName ) ) {
					return false;
				}
				return result.get( configPageName ).link_recommendation;
			}, () => ( false ) )
			.then( ( config ) => {
				if ( !config ) {
					return false;
				}
				return {
					showAsCheck: false,
					showAsSuggestion: !config.disabled,
					// predictionThreshold: config.minimumLinkScore,
					// maximumLinksToShow: config.maximumLinksToShowPerTask,
					// maximumEditCount: config.maximumEditsTaskIsAvailable,
					ignoreSections: config.excludedSections.map( ( section ) => section === '0' ? '' : section ),
					notInCategory: config.excludedCategories,
					lacksTemplate: config.excludedTemplates
				};
			} );
	}
	return this.constructor.static.configPromise;
};

/* Registration */

mw.editcheck.editCheckFactory.register( mw.editcheck.SuggestedLinkEditCheck );
