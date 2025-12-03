mw.editcheck.DisambiguationEditCheck = function MWDisambiguationEditCheck() {
	// Parent constructor
	mw.editcheck.DisambiguationEditCheck.super.apply( this, arguments );
};

OO.inheritClass( mw.editcheck.DisambiguationEditCheck, mw.editcheck.BaseEditCheck );

mw.editcheck.DisambiguationEditCheck.static.title = 'Disambiguation link';

mw.editcheck.DisambiguationEditCheck.static.name = 'disambiguation';

mw.editcheck.DisambiguationEditCheck.static.description = 'Link to a specific page instead.';

mw.editcheck.DisambiguationEditCheck.static.choices = [
	{
		action: 'edit',
		label: 'Edit link', // TODO: i18n
		icon: 'edit'
	},
	{
		action: 'dismiss',
		label: 'Ignore' // TODO: i18n
	}
];

mw.editcheck.DisambiguationEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	const checkDisambig = ( annotation ) => ve.init.platform.linkCache.get(
		annotation.getAttribute( 'lookupTitle' )
	).then( ( linkData ) => !!( linkData && linkData.disambiguation ) );

	return this.getModifiedAnnotationRanges(
		surfaceModel.getDocument(),
		ve.dm.MWInternalLinkAnnotation.static.name
	).map(
		( annRange ) => checkDisambig( annRange.annotation ).then( ( isDisambig ) => isDisambig ?
			new mw.editcheck.EditCheckAction( {
				fragments: [ surfaceModel.getLinearFragment( annRange.range ) ],
				focusAnnotation: ( annView ) => annView instanceof ve.ce.MWInternalLinkAnnotation,
				check: this
			} ) : null
		) );
};

mw.editcheck.DisambiguationEditCheck.prototype.act = function ( choice, action, surface ) {
	switch ( choice ) {
		case 'dismiss':
			this.dismiss( action );
			break;
		case 'edit':
			setTimeout( () => {
				action.fragments[ 0 ].select();
				surface.execute( 'window', 'open', 'link' );
			} );
			break;
	}
};

mw.editcheck.editCheckFactory.register( mw.editcheck.DisambiguationEditCheck );
