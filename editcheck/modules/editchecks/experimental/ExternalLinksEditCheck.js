mw.editcheck.ExternalLinksEditCheck = function MWExternalLinksEditCheck() {
	// Parent constructor
	mw.editcheck.ExternalLinksEditCheck.super.apply( this, arguments );
};

OO.inheritClass( mw.editcheck.ExternalLinksEditCheck, mw.editcheck.LinkEditCheck );

mw.editcheck.ExternalLinksEditCheck.static.title = 'Remove external link';

mw.editcheck.ExternalLinksEditCheck.static.name = 'externalLink';

mw.editcheck.ExternalLinksEditCheck.static.description = '<a href="//en.wikipedia.org/wiki/WP:EL">External links</a> should generally not appear in the body of an article. Help readers stay focused on the content by either removing this link, moving it to an "External links" section, or by <a href="//en.wikipedia.org/wiki/WP:INTREFVE">converting it into a citation</a> if appropriate.';

// HACK: Use plain string above so Special:EditChecks can parse.
const description = mw.editcheck.ExternalLinksEditCheck.static.description;
mw.editcheck.ExternalLinksEditCheck.static.description = () => $( $.parseHTML( description ) );

mw.editcheck.ExternalLinksEditCheck.static.choices = [
	{
		action: 'remove',
		label: 'Remove link'
	},
	{
		action: 'dismiss',
		label: OO.ui.deferMsg( 'ooui-dialog-process-dismiss' )
	}
];

mw.editcheck.ExternalLinksEditCheck.static.linkClasses = [ ve.dm.MWExternalLinkAnnotation ];

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

mw.editcheck.editCheckFactory.register( mw.editcheck.ExternalLinksEditCheck );
