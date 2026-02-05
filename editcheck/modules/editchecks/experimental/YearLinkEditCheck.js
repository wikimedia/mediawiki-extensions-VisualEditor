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

OO.inheritClass( mw.editcheck.YearLinkEditCheck, mw.editcheck.LinkEditCheck );

mw.editcheck.YearLinkEditCheck.static.title = 'Fix year link';

mw.editcheck.YearLinkEditCheck.static.name = 'yearLink';

mw.editcheck.YearLinkEditCheck.static.description = 'This link points to a different year than the one shown in the text. Help make the article more accurate by updating the displayed year and linked year to match.';

mw.editcheck.YearLinkEditCheck.static.choices = [
	{
		action: 'useTarget',
		// Example value for Special:EditChecks, actual value is set later
		label: 'Use 2001'
	},
	{
		action: 'useLabel',
		// Example value for Special:EditChecks, actual value is set later
		label: 'Use 2003'
	},
	{
		action: 'dismiss',
		label: OO.ui.deferMsg( 'ooui-dialog-process-dismiss' )
	}
];

mw.editcheck.YearLinkEditCheck.static.linkClasses = [ ve.dm.MWInternalLinkAnnotation ];

mw.editcheck.YearLinkEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	return this.getModifiedLinkRanges( surfaceModel ).map( ( annRange ) => {
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
		// If label and target are the same, there's no issue
		if ( label === target ) {
			return null;
		}

		// Check label is a 3 or 4-digit number (a year)
		if ( !label.match( /^\d{3,4}$/ ) ) {
			return null;
		}

		const choices = ve.copy( mw.editcheck.YearLinkEditCheck.static.choices );
		choices[ 0 ].label = 'Use ' + target;
		choices[ 1 ].label = 'Use ' + label;

		return this.buildActionFromLinkRange( annRange.range, surfaceModel, { choices } );
	} );
};

mw.editcheck.YearLinkEditCheck.prototype.act = function ( choice, action, surface ) {
	const fragment = action.fragments[ 0 ];
	const linkAnnotation = this.getLinkFromFragment( fragment );
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
			for ( const linkClass of this.constructor.static.linkClasses ) {
				fragment.annotateContent( 'clear', linkClass.static.name );
			}
			fragment.annotateContent( 'set', link );
			break;
		}
	}

	this.selectAnnotation( fragment, surface );
};

mw.editcheck.editCheckFactory.register( mw.editcheck.YearLinkEditCheck );
