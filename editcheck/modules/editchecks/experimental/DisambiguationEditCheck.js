mw.editcheck.DisambiguationEditCheck = function MWDisambiguationEditCheck() {
	// Parent constructor
	mw.editcheck.DisambiguationEditCheck.super.apply( this, arguments );
};

OO.inheritClass( mw.editcheck.DisambiguationEditCheck, mw.editcheck.LinkEditCheck );

mw.editcheck.DisambiguationEditCheck.static.title = 'Link to a more specific page';

mw.editcheck.DisambiguationEditCheck.static.name = 'disambiguation';

mw.editcheck.DisambiguationEditCheck.static.description = 'This link points to a <a href="//en.wikipedia.org/wiki/Wikipedia:Disambiguation">disambiguation page</a>. Help readers find the right topic by linking to a more specific page.';

// HACK: Use plain string above so Special:EditChecks can parse.
const description = mw.editcheck.DisambiguationEditCheck.static.description;
mw.editcheck.DisambiguationEditCheck.static.description = () => $( $.parseHTML( description ) );

mw.editcheck.DisambiguationEditCheck.static.choices = [
	{
		action: 'edit',
		label: 'Edit link' // TODO: i18n
	},
	{
		action: 'dismiss',
		label: OO.ui.deferMsg( 'ooui-dialog-process-dismiss' )
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
