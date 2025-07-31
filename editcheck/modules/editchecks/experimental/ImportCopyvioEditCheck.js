mw.editcheck.ImportCopyvioEditCheck = function MWImportCopyvioEditCheck() {
	// Parent constructor
	mw.editcheck.ImportCopyvioEditCheck.super.apply( this, arguments );
};

OO.inheritClass( mw.editcheck.ImportCopyvioEditCheck, mw.editcheck.BaseEditCheck );

mw.editcheck.ImportCopyvioEditCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.BaseEditCheck.static.defaultConfig, {
	minimumCharacters: 50
} );

mw.editcheck.ImportCopyvioEditCheck.static.title = ve.msg( 'editcheck-copyvio-title' );

mw.editcheck.ImportCopyvioEditCheck.static.description = ve.msg( 'editcheck-copyvio-description' );

mw.editcheck.ImportCopyvioEditCheck.static.prompt = ve.msg( 'editcheck-copyvio-prompt' );

mw.editcheck.ImportCopyvioEditCheck.static.name = 'paste';

mw.editcheck.ImportCopyvioEditCheck.static.choices = [
	{
		action: 'keep',
		label: ve.msg( 'editcheck-copyvio-action-keep' )
	},
	{
		action: 'remove',
		label: ve.msg( 'editcheck-copyvio-action-remove' )
	}
];

mw.editcheck.ImportCopyvioEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	const pastesById = {};
	surfaceModel.documentModel.documentNode.getAnnotationRanges().forEach( ( annRange ) => {
		const annotation = annRange.annotation;
		if ( annotation instanceof ve.dm.ImportedDataAnnotation && !annotation.getAttribute( 'source' ) ) {
			const id = annotation.getAttribute( 'eventId' );
			if ( this.isDismissedId( id ) ) {
				return;
			}
			if ( annRange.range.getLength() < this.config.minimumCharacters ) {
				return;
			}
			pastesById[ id ] = pastesById[ id ] || [];
			pastesById[ id ].push( annRange.range );
		}
	} );
	return Object.keys( pastesById ).map( ( id ) => {
		const fragments = pastesById[ id ].map( ( range ) => surfaceModel.getLinearFragment( range ) );
		return new mw.editcheck.EditCheckAction( {
			fragments: fragments,
			id: id,
			check: this
		} );
	} );
};

mw.editcheck.ImportCopyvioEditCheck.prototype.act = function ( choice, action, surface ) {
	switch ( choice ) {
		case 'keep':
			return action.widget.showFeedback( {
				description: ve.msg( 'editcheck-copyvio-keep-description' ),
				choices: [ 'wrote', 'permission', 'free', 'other' ].map(
					( key ) => ( {
						data: key,
						// Messages that can be used here:
						// * editcheck-copyvio-keep-wrote
						// * editcheck-copyvio-keep-permission
						// * editcheck-copyvio-keep-free
						// * editcheck-copyvio-keep-other
						label: ve.msg( 'editcheck-copyvio-keep-' + key )
					} ) )
			} ).then( ( reason ) => {
				this.dismiss( action );
				mw.notify( ve.msg( 'editcheck-copyvio-keep-notify' ), { type: 'success' } );
				return ve.createDeferred().resolve( { action: choice, reason: reason } ).promise();
			} );
		case 'remove':
			action.fragments.forEach( ( fragment ) => {
				fragment.removeContent();
			} );
			// Auto-scrolling causes selection and focus changes...
			setTimeout( () => {
				action.fragments[ action.fragments.length - 1 ].select();
				surface.getView().focus();
			}, 500 );

			mw.notify( ve.msg( 'editcheck-copyvio-remove-notify' ), { type: 'success' } );
			break;
	}
};

mw.editcheck.editCheckFactory.register( mw.editcheck.ImportCopyvioEditCheck );
