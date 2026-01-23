mw.editcheck.DisambiguationEditCheck = function MWDisambiguationEditCheck() {
	// Parent constructor
	mw.editcheck.DisambiguationEditCheck.super.apply( this, arguments );
};

OO.inheritClass( mw.editcheck.DisambiguationEditCheck, mw.editcheck.LinkEditCheck );

mw.editcheck.DisambiguationEditCheck.static.name = 'disambiguation';

mw.editcheck.DisambiguationEditCheck.static.title = OO.ui.deferMsg( 'editcheck-disambiguation-title' );

mw.editcheck.DisambiguationEditCheck.static.description = ve.deferJQueryMsg( 'editcheck-disambiguation-description' );

mw.editcheck.DisambiguationEditCheck.static.choices = [
	{
		action: 'edit',
		label: OO.ui.deferMsg( 'editcheck-action-update-link' )
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

	return this.getModifiedLinkRanges( surfaceModel )
		// Links to sections of disambiguation pages are deliberately specific, so ignore them
		.filter( ( annRange ) => !annRange.annotation.getFragment() )
		.map( ( annRange ) => checkDisambig( annRange.annotation ).then( ( isDisambig ) => isDisambig ?
			this.buildActionFromLinkRange( annRange.range, surfaceModel ) : null
		) );
};

mw.editcheck.DisambiguationEditCheck.prototype.act = function ( choice, action, surface ) {
	if ( choice === 'edit' ) {
		action.select( surface );
		surface.executeCommand( 'link' );
		return;
	}
	// Parent method
	return mw.editcheck.DisambiguationEditCheck.super.prototype.act.apply( this, arguments );
};

mw.editcheck.editCheckFactory.register( mw.editcheck.DisambiguationEditCheck );
