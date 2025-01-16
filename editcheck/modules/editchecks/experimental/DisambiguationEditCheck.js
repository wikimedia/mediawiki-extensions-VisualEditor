mw.editcheck.DisambiguationEditCheck = function MWDisambiguationEditCheck( /* config */ ) {
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
	return surfaceModel.documentModel.documentNode.getAnnotationRanges().map( ( annRange ) => {
		const annotation = annRange.annotation;
		if ( !( annotation instanceof ve.dm.MWInternalLinkAnnotation ) ) {
			return null;
		}

		const linkData = ve.init.platform.linkCache.getCached( annotation.getAttribute( 'lookupTitle' ) );
		if ( !linkData || !linkData.disambiguation ) {
			return null;
		}

		if ( this.isDismissedRange( annRange.range ) ) {
			return null;
		}
		const fragment = surfaceModel.getLinearFragment( annRange.range );
		return new mw.editcheck.EditCheckAction( {
			fragments: [ fragment ],
			check: this
		} );
	} ).filter( ( action ) => action );
};

mw.editcheck.DisambiguationEditCheck.prototype.act = function ( choice, action, surface ) {
	switch ( choice ) {
		case 'dismiss':
			this.dismiss( action );
			break;
		case 'edit':
			setTimeout( () => {
				action.selection.select();
				surface.execute( 'window', 'open', 'link' );
			}, 500 );
			break;
	}
};

mw.editcheck.editCheckFactory.register( mw.editcheck.DisambiguationEditCheck );