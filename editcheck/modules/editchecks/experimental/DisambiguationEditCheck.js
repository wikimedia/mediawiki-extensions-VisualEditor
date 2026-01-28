mw.editcheck.DisambiguationEditCheck = function MWDisambiguationEditCheck() {
	// Parent constructor
	mw.editcheck.DisambiguationEditCheck.super.apply( this, arguments );
};

OO.inheritClass( mw.editcheck.DisambiguationEditCheck, mw.editcheck.LinkEditCheck );

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

mw.editcheck.DisambiguationEditCheck.static.linkClasses = [ ve.dm.MWInternalLinkAnnotation ];

mw.editcheck.DisambiguationEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	const checkDisambig = ( annotation ) => ve.init.platform.linkCache.get(
		annotation.getAttribute( 'lookupTitle' )
	).then( ( linkData ) => !!( linkData && linkData.disambiguation ) );

	return this.getModifiedLinkRanges( surfaceModel ).map(
		( annRange ) => checkDisambig( annRange.annotation ).then( ( isDisambig ) => isDisambig ?
			this.buildActionFromLinkRange( annRange.range, surfaceModel ) : null
		) );
};

mw.editcheck.DisambiguationEditCheck.prototype.act = function ( choice, action, surface ) {
	switch ( choice ) {
		case 'dismiss':
			this.dismiss( action );
			break;
		case 'edit':
			this.selectAnnotation( action.fragments[ 0 ], surface );
			break;
	}
};

mw.editcheck.editCheckFactory.register( mw.editcheck.DisambiguationEditCheck );
