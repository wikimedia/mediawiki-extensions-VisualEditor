/**
 * Edit check to detect external links in the article body
 *
 * @class
 * @extends mw.editcheck.LinkEditCheck
 *
 * @constructor
 * @param {mw.editcheck.Controller} controller
 * @param {Object} [config]
 * @param {boolean} [includeSuggestions=false]
 */
mw.editcheck.ExternalLinksEditCheck = function MWExternalLinksEditCheck() {
	// Parent constructor
	mw.editcheck.ExternalLinksEditCheck.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( mw.editcheck.ExternalLinksEditCheck, mw.editcheck.LinkEditCheck );

/* Static properties */

mw.editcheck.ExternalLinksEditCheck.static.name = 'externalLink';

mw.editcheck.ExternalLinksEditCheck.static.title = OO.ui.deferMsg( 'editcheck-external-link-title' );

mw.editcheck.ExternalLinksEditCheck.static.description = ve.deferJQueryMsg( 'editcheck-external-link-description' );

mw.editcheck.ExternalLinksEditCheck.static.choices = [
	{
		action: 'remove',
		label: OO.ui.deferMsg( 'editcheck-action-remove-link' )
	},
	{
		action: 'dismiss',
		label: OO.ui.deferMsg( 'ooui-dialog-process-dismiss' )
	}
];

mw.editcheck.ExternalLinksEditCheck.static.linkClasses = [ ve.dm.MWExternalLinkAnnotation ];

/* Methods */

mw.editcheck.ExternalLinksEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	return this.getModifiedLinkRanges( surfaceModel ).map( ( annRange ) => {
		const href = annRange.annotation.getAttribute( 'href' );
		return this.controller.target.isInterwikiUrl( href ).then( ( isInterwiki ) => {
			if ( isInterwiki ) {
				// Ignore interwiki links
				return null;
			}
			return this.buildActionFromLinkRange( annRange.range, surfaceModel );
		} );
	} );
};

mw.editcheck.ExternalLinksEditCheck.prototype.act = function ( choice, action, surface ) {
	if ( choice === 'remove' ) {
		action.fragments.forEach( ( fragment ) => {
			fragment.annotateContent( 'clear', ve.ce.MWExternalLinkAnnotation.static.name );
		} );
		action.select( surface, true );
		return;
	}
	// Parent method
	return mw.editcheck.ExternalLinksEditCheck.super.prototype.act.apply( this, arguments );
};

/* Registration */

mw.editcheck.editCheckFactory.register( mw.editcheck.ExternalLinksEditCheck );
