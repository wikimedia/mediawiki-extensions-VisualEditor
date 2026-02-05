mw.editcheck.HeadingLevelsEditCheck = function MWHeadingLevelsEditCheck() {
	// Parent constructor
	mw.editcheck.HeadingLevelsEditCheck.super.apply( this, arguments );
};

OO.inheritClass( mw.editcheck.HeadingLevelsEditCheck, mw.editcheck.BaseEditCheck );

mw.editcheck.HeadingLevelsEditCheck.static.title = 'Adjust heading level';

mw.editcheck.HeadingLevelsEditCheck.static.name = 'headingLevels';

mw.editcheck.HeadingLevelsEditCheck.static.description = 'This heading level may not follow the article structure. Help readers navigate and read the content more easily by using the correct <a href="//www.mediawiki.org/wiki/Documentation/Style_guide#Titles_and_headings">heading level</a>.';

// HACK: Use plain string above so Special:EditChecks can parse.
const description = mw.editcheck.HeadingLevelsEditCheck.static.description;
mw.editcheck.HeadingLevelsEditCheck.static.description = () => $( $.parseHTML( description ) );

mw.editcheck.HeadingLevelsEditCheck.static.choices = [
	{
		action: 'fix',
		label: 'Adjust heading'
	},
	{
		action: 'dismiss',
		label: OO.ui.deferMsg( 'ooui-dialog-process-dismiss' )
	}
];

mw.editcheck.HeadingLevelsEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	const modified = this.getModifiedContentRanges( surfaceModel.getDocument() );
	let previousLevel = null;
	const actions = [];
	// Rather than looking at every modified range and deciding whether it
	// includes a heading, it's a lot more efficient to just check every
	// heading:
	surfaceModel.documentModel.getNodesByType( ve.dm.MWHeadingNode, true ).forEach( ( heading ) => {
		const level = heading.getAttribute( 'level' );
		if ( previousLevel !== null && level ) {
			if ( ( level - previousLevel ) > 1 ) {
				// Note: Turning existing content into a heading just replaces
				// the paragraph with a mwHeading, so it's outside the node's
				// range, and the modification will be two ranges replacing
				// the opening/closing tags.
				const range = heading.getOuterRange();
				if ( !this.isDismissedRange( range ) && modified.some( ( modifiedRange ) => modifiedRange.touchesRange( range ) ) ) {
					actions.push( new mw.editcheck.EditCheckAction( {
						// But the better range for display is the content range:
						fragments: [ surfaceModel.getLinearFragment( heading.getRange() ) ],
						check: this
					} ) );
				}
			}
		}
		previousLevel = level;
	} );
	return actions;
};

mw.editcheck.HeadingLevelsEditCheck.prototype.act = function ( choice, action, surface ) {
	switch ( choice ) {
		case 'dismiss':
			this.dismiss( action );
			break;
		case 'fix': {
			const heading = surface.getModel().documentModel.getNearestNodeMatching(
				( nodeType ) => nodeType === 'mwHeading',
				// Note: we set a limit of 1 here because otherwise this will turn around
				// to keep looking when it hits the document boundary:
				action.fragments[ 0 ].getSelection().getCoveringRange().start - 1, -1, 1
			);
			if ( heading ) {
				action.fragments[ 0 ].convertNodes( 'mwHeading',
					{ level: heading.getAttribute( 'level' ) + 1 }
				);
				surface.getView().activate();
				action.fragments[ 0 ].collapseToEnd().select();
			}
			break;
		}
	}
};

mw.editcheck.editCheckFactory.register( mw.editcheck.HeadingLevelsEditCheck );
