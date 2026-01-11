/*
 * YearLinkEditCheck
 *
 * Warns when an internal link points to a year page but the
 * link label text is a different year. This often happens when
 * users update years in the article text but forget to update
 * the link target.
 */
mw.editcheck.YearLinkEditCheck = function MWYearLinkEditCheck() {
	mw.editcheck.YearLinkEditCheck.super.apply( this, arguments );
};

OO.inheritClass( mw.editcheck.YearLinkEditCheck, mw.editcheck.BaseEditCheck );

mw.editcheck.YearLinkEditCheck.static.title = 'Year link doesn\'t match label';
mw.editcheck.YearLinkEditCheck.static.name = 'yearLink';
mw.editcheck.YearLinkEditCheck.static.description = 'This link points to a year that is different from the label.';

mw.editcheck.YearLinkEditCheck.static.choices = [
	{
		action: 'useTarget',
		label: 'Use target year',
		icon: 'check'
	},
	{
		action: 'useLabel',
		label: 'Use label year',
		icon: 'check'
	},
	{
		action: 'dismiss',
		label: 'Dismiss'
	}
];

mw.editcheck.YearLinkEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	const documentModel = surfaceModel.documentModel;

	return this.getModifiedAnnotationRanges(
		documentModel,
		ve.dm.MWInternalLinkAnnotation.static.name
	).map( ( annRange ) => {
		const title = mw.Title.newFromText( annRange.annotation.getDisplayTitle() );
		if ( !title ) {
			return null;
		}

		const target = title.getMainText();
		// Check target is a 3 or 4-digit number (a year)
		if ( !target.match( /^\d{3,4}$/ ) ) {
			return null;
		}

		const fragment = surfaceModel.getLinearFragment( annRange.range );
		const label = fragment.getText();
		if ( label === target ) {
			return null;
		}

		const choices = [
			{ action: 'useTarget', label: 'Use ' + target },
			{ action: 'useLabel', label: 'Use ' + label },
			{ action: 'dismiss', label: 'Dismiss' }
		];

		return new mw.editcheck.EditCheckAction( {
			fragments: [ fragment ],
			focusAnnotation: ( annView ) => annView instanceof ve.ce.MWInternalLinkAnnotation,
			check: this,
			choices
		} );
	} );
};

mw.editcheck.YearLinkEditCheck.prototype.act = function ( choice, action, surface ) {
	const fragment = action.fragments[ 0 ];
	const linkAnnotation = fragment.getAnnotations().getAnnotationsWithName( ve.dm.MWInternalLinkAnnotation.static.name ).get( 0 );
	const title = mw.Title.newFromText( linkAnnotation.getDisplayTitle() );

	switch ( choice ) {
		case 'dismiss':
			this.dismiss( action );
			break;

		case 'useTarget': {
			fragment.insertContent( title.getMainText(), true );
			break;
		}

		case 'useLabel': {
			const link = ve.dm.MWInternalLinkAnnotation.static.newFromTitle(
				mw.Title.newFromText( fragment.getText(), title.getNamespaceId() )
			);
			fragment.annotateContent( 'clear', 'link/mwInternal' );
			fragment.annotateContent( 'set', link );
			break;
		}
	}

	setTimeout( () => {
		fragment.select();
		surface.getView().selectAnnotation( ( annView ) => annView instanceof ve.ce.MWInternalLinkAnnotation );
	}, 100 );
};

mw.editcheck.editCheckFactory.register( mw.editcheck.YearLinkEditCheck );
