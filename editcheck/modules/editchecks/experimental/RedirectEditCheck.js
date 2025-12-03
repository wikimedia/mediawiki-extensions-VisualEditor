mw.editcheck.RedirectEditCheck = function MWRedirectEditCheck() {
	// Parent constructor
	mw.editcheck.RedirectEditCheck.super.apply( this, arguments );
};

OO.inheritClass( mw.editcheck.RedirectEditCheck, mw.editcheck.BaseEditCheck );

mw.editcheck.RedirectEditCheck.static.title = 'Redirect link';

mw.editcheck.RedirectEditCheck.static.name = 'redirect';

mw.editcheck.RedirectEditCheck.static.description = 'Link to the redirect target instead?';

mw.editcheck.RedirectEditCheck.static.choices = [
	{
		action: 'fix',
		label: 'Fix link', // ve.msg( 'editcheck-dialog-action-yes' ),
		icon: 'check'
	},
	{
		action: 'dismiss',
		label: 'Ignore', // ve.msg( 'editcheck-dialog-action-no' ),
		icon: 'close'
	}
];

mw.editcheck.RedirectEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	const checkRedirect = ( annotation ) => ve.init.platform.linkCache.get(
		annotation.getAttribute( 'lookupTitle' )
	).then( ( linkData ) => !!( linkData && linkData.redirect ) );

	return this.getModifiedAnnotationRanges(
		surfaceModel.getDocument(),
		ve.dm.MWInternalLinkAnnotation.static.name
	).map( ( annRange ) => checkRedirect( annRange.annotation ).then( ( isRedirect ) => isRedirect ?
		new mw.editcheck.EditCheckAction( {
			fragments: [ surfaceModel.getLinearFragment( annRange.range ) ],
			focusAnnotation: ( annView ) => annView instanceof ve.ce.MWInternalLinkAnnotation,
			check: this
		} ) : null
	) );
};

mw.editcheck.RedirectEditCheck.prototype.act = function ( choice, action, surface ) {
	switch ( choice ) {
		case 'dismiss':
			this.dismiss( action );
			break;
		case 'fix': {
			const fragment = action.fragments[ 0 ];
			const linkAnnotation = fragment.getAnnotations().getAnnotationWithName( ve.dm.MWInternalLinkAnnotation.static.name ).get( 0 );

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

					setTimeout( () => {
						// fragment.collapseToStart().adjustLinearSelection( 1, 1 ).select();
						fragment.select();
						surface.getView().selectAnnotation( ( annView ) => annView instanceof ve.ce.MWInternalLinkAnnotation );
					}, 100 );
				}
			} );
		}
	}
};

mw.editcheck.editCheckFactory.register( mw.editcheck.RedirectEditCheck );
