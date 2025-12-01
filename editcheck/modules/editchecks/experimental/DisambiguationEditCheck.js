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
		label: 'Edit link', // ve.msg( 'editcheck-dialog-action-yes' ),
		icon: 'edit'
	},
	{
		action: 'dismiss',
		label: 'Ignore', // ve.msg( 'editcheck-dialog-action-no' ),
		icon: 'check'
	}
];

mw.editcheck.DisambiguationEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	const checkDisambig = ( annotation ) => ve.init.platform.linkCache.get(
		annotation.getAttribute( 'lookupTitle' )
	).then( ( linkData ) => !!( linkData && linkData.disambiguation ) );

	const modified = this.getModifiedContentRanges( surfaceModel.getDocument() );

	return surfaceModel.documentModel.documentNode.getAnnotationRanges().filter(
		( annRange ) => annRange.annotation instanceof ve.dm.MWInternalLinkAnnotation &&
			this.isRangeInValidSection( annRange.range, surfaceModel.documentModel ) &&
			!this.isDismissedRange( annRange.range ) &&
			modified.some( ( modifiedRange ) => modifiedRange.containsRange( annRange.range ) )
	).map( ( annRange ) => checkDisambig( annRange.annotation ).then( ( isDisambig ) => isDisambig ?
		new mw.editcheck.EditCheckAction( {
			fragments: [ surfaceModel.getLinearFragment( annRange.range ) ],
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
