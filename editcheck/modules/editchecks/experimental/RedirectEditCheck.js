mw.editcheck.RedirectEditCheck = function MWRedirectEditCheck() {
	// Parent constructor
	mw.editcheck.RedirectEditCheck.super.apply( this, arguments );
};

OO.inheritClass( mw.editcheck.RedirectEditCheck, mw.editcheck.LinkEditCheck );

mw.editcheck.RedirectEditCheck.static.title = 'Link to the final page';

mw.editcheck.RedirectEditCheck.static.name = 'redirect';

mw.editcheck.RedirectEditCheck.static.description = 'This link points to a redirect page. Link to the final page instead.';

// HACK: Use plain string above so Special:EditChecks can parse.
const description = mw.editcheck.RedirectEditCheck.static.description;
mw.editcheck.RedirectEditCheck.static.description = () => $( $.parseHTML( description ) );

mw.editcheck.RedirectEditCheck.static.choices = [
	{
		action: 'fix',
		label: 'Update link'
	},
	{
		action: 'dismiss',
		label: OO.ui.deferMsg( 'ooui-dialog-process-dismiss' )
	}
];

mw.editcheck.RedirectEditCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.BaseEditCheck.static.defaultConfig, {
	enabled: false
} );

mw.editcheck.RedirectEditCheck.static.linkClasses = [ ve.dm.MWInternalLinkAnnotation ];

mw.editcheck.RedirectEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	const checkRedirect = ( annotation ) => ve.init.platform.linkCache.get(
		annotation.getAttribute( 'lookupTitle' )
	).then( ( linkData ) => !!( linkData && linkData.redirect ) );

	return this.getModifiedLinkRanges( surfaceModel )
		.map( ( annRange ) => checkRedirect( annRange.annotation )
			.then( ( isRedirect ) => isRedirect ?
				this.buildActionFromLinkRange( annRange.range, surfaceModel ) : null
			)
		);
};

mw.editcheck.RedirectEditCheck.prototype.act = function ( choice, action, surface ) {
	if ( choice === 'fix' ) {
		const fragment = action.fragments[ 0 ];
		const linkAnnotation = this.getLinkFromFragment( fragment );

		if ( !linkAnnotation ) {
			return;
		}

		return surface.getTarget().getContentApi().get( {
			action: 'query',
			titles: linkAnnotation.getAttribute( 'lookupTitle' ),
			redirects: true
		} ).then( ( data ) => {
			const targetTitle = ve.getProp( data, 'query', 'redirects', 0, 'to' );
			if ( targetTitle ) {
				const newLinkAnnotation = ve.dm.MWInternalLinkAnnotation.static.newFromTitle(
					new mw.Title( targetTitle )
				);
				fragment
					.annotateContent( 'clear', linkAnnotation )
					.annotateContent( 'add', newLinkAnnotation );

				this.selectAnnotation( fragment, surface );
			}
		} );
	}
	// Parent method
	return mw.editcheck.RedirectEditCheck.super.prototype.act.apply( this, arguments );
};

mw.editcheck.editCheckFactory.register( mw.editcheck.RedirectEditCheck );
