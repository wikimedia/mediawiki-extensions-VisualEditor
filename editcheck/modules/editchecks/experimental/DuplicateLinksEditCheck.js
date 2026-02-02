mw.editcheck.DuplicateLinksEditCheck = function MWDuplicateLinksEditCheck() {
	// Parent constructor
	mw.editcheck.DuplicateLinksEditCheck.super.apply( this, arguments );
};

OO.inheritClass( mw.editcheck.DuplicateLinksEditCheck, mw.editcheck.LinkEditCheck );

mw.editcheck.DuplicateLinksEditCheck.static.title = 'Remove duplicated link';

mw.editcheck.DuplicateLinksEditCheck.static.name = 'duplicateLink';

mw.editcheck.DuplicateLinksEditCheck.static.description = 'This link appears more than once in this section. Help readers navigate the article more easily by removing <a href="https://en.wikipedia.org/wiki/MOS:REPEATLINK">repeated links</a>.';

// HACK: Use plain string above so Special:EditChecks can parse.
const description = mw.editcheck.DuplicateLinksEditCheck.static.description;
mw.editcheck.DuplicateLinksEditCheck.static.description = () => $( $.parseHTML( description ) );

mw.editcheck.DuplicateLinksEditCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.BaseEditCheck.static.defaultConfig, {
	scope: 'paragraph' // 'section'
} );

mw.editcheck.DuplicateLinksEditCheck.static.choices = [
	{
		action: 'remove',
		label: 'Remove link'
	},
	{
		action: 'dismiss',
		label: OO.ui.deferMsg( 'ooui-dialog-process-dismiss' )
	}
];

mw.editcheck.DuplicateLinksEditCheck.static.linkClasses = [ ve.dm.MWInternalLinkAnnotation ];

/*
 * Break down the document into sections
 */
function getSectionRanges( documentModel ) {
	const headingRanges = documentModel.getNodesByType( 'mwHeading', true )
		.filter( ( node ) => node.getAttribute( 'level' ) === 2 )
		.map( ( node ) => node.getOuterRange() );

	const sections = [];
	let start = 0;
	for ( const headingRange of headingRanges ) {
		sections.push( new ve.Range( start, headingRange.start ) );
		start = headingRange.end;
	}
	sections.push( new ve.Range( start, documentModel.getDocumentRange().end ) );
	return sections;
}

function orderedCollectBy( iterable, keyFunction ) {
	const result = new Map();
	for ( const entry of iterable ) {
		const key = keyFunction( entry );
		if ( key === undefined || key === null ) {
			continue;
		}
		if ( result.has( key ) ) {
			result.get( key ).push( entry );
		} else {
			result.set( key, [ entry ] );
		}
	}
	return result;
}

mw.editcheck.DuplicateLinksEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	const field = 'normalizedTitle';

	const documentModel = surfaceModel.getDocument();

	// Each section of the document that we want to detect duplicates within
	let sections;
	if ( this.config.scope === 'section' ) {
		sections = getSectionRanges( documentModel );
	} else if ( this.config.scope === 'paragraph' ) {
		sections = documentModel.getNodesByType( 'paragraph' ).map( ( node ) => node.getOuterRange() );
	}

	// Traverse the tree once to find internal links, and build a map
	const allInternalLinks = documentModel.getDocumentNode().getAnnotationRanges().filter( ( annRange ) => annRange.annotation.name === ve.dm.MWInternalLinkAnnotation.static.name );
	const internalLinkMap = orderedCollectBy( allInternalLinks, ( annRef ) => annRef.annotation.getAttribute( field ) );

	// Traverse again for links we want to show a Check on. This could be a small set, or all links.
	// Filter out any links that appear only once in the document.
	// getModifiedLinkRanges handles filtering sections and dismissed actions.
	const candidateModifiedLinks = this.getModifiedLinkRanges( surfaceModel ).filter( ( annRange ) => internalLinkMap.get( annRange.annotation.getAttribute( field ) ).length > 1 );

	// Now we have a list of modified links which, if they're root links and duplicated in the same section by another root link, are duplicates.
	let i = 0; // Index into candidate links
	const actions = [];
	for ( const section of sections ) {
		const rootCache = new Map();
		for ( ; i < candidateModifiedLinks.length && candidateModifiedLinks[ i ].range.end <= section.end; i++ ) {
			const annRange = candidateModifiedLinks[ i ];
			const title = annRange.annotation.getAttribute( field );
			if ( !rootCache.has( title ) ) {
				const sectionLinks = internalLinkMap.get( title ).filter( ( ar ) => section.containsRange( ar.range ) );
				if ( sectionLinks.length > 1 ) {
					// Only validate we're in a root paragraph when we're forced to
					rootCache.set( title, sectionLinks.filter( ( ar ) => ( documentModel.getBranchNodeFromOffset( ar.range.start ).getParent() === documentModel.attachedRoot ) ) );
				} else {
					rootCache.set( title, [] );
				}
			}
			const duplicateRanges = rootCache.get( title );
			if ( duplicateRanges.length < 2 ) {
				continue;
			}

			const index = duplicateRanges.findIndex( ( ar ) => annRange.range.equalsSelection( ar.range ) );
			if ( index < 0 ) {
				// Not in a root node
				continue;
			} else if ( index === 0 ) {
				// Resolve the fight over who is the clone and who is the original in favour of the first link.
				continue;
			}

			// Highlight all duplicates with the one being acted on first
			const highlights = Array.from( duplicateRanges );
			highlights.splice( index, 1 );
			highlights.unshift( annRange );

			actions.push( this.buildActionFromLinkRange( annRange.range, surfaceModel, {
				fragments: highlights.map( ( ar ) => surfaceModel.getLinearFragment( ar.range ) )
			} ) );
		}
	}

	return actions;
};

mw.editcheck.DuplicateLinksEditCheck.prototype.act = function ( choice, action ) {
	switch ( choice ) {
		case 'dismiss':
			this.dismiss( action );
			break;
		case 'remove':
			action.fragments[ 0 ].annotateContent( 'clear', ve.ce.MWInternalLinkAnnotation.static.name );
			break;
	}
};

mw.editcheck.editCheckFactory.register( mw.editcheck.DuplicateLinksEditCheck );
