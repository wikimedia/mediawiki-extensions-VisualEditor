mw.editcheck.DuplicateLinksEditCheck = function MWDuplicateLinksEditCheck() {
	// Parent constructor
	mw.editcheck.DuplicateLinksEditCheck.super.apply( this, arguments );
};

OO.inheritClass( mw.editcheck.DuplicateLinksEditCheck, mw.editcheck.BaseEditCheck );

mw.editcheck.DuplicateLinksEditCheck.static.title = 'Duplicate links';

mw.editcheck.DuplicateLinksEditCheck.static.name = 'duplicateLink';

// TODO: Add "Learn more", localise. Eg in english to https://en.wikipedia.org/wiki/MOS:REPEATLINK
mw.editcheck.DuplicateLinksEditCheck.static.description = 'This link appears more than once in this section. Help make Wikipedia easier for people to read by removing this link.';

mw.editcheck.DuplicateLinksEditCheck.static.learnMoreHref = 'https://en.wikipedia.org/wiki/MOS:REPEATLINK';
mw.editcheck.DuplicateLinksEditCheck.static.learnMore = 'Learn more';

mw.editcheck.DuplicateLinksEditCheck.static.successToast = 'Thank you for helping to make this section easier for people to read.';

mw.editcheck.DuplicateLinksEditCheck.static.choices = [
	{
		action: 'remove',
		label: 'Remove link',
		icon: 'edit'
	},
	{
		action: 'dismiss',
		label: 'Dismiss' // TODO: i18n
	}
];

/*
 * Break down the document into sections
 */
function getSectionRanges( document ) {
	const headingRanges = document.getNodesByType( 'mwHeading', true )
		.filter( ( node ) => node.getAttribute( 'level' ) === 2 )
		.map(
			( node ) => node.getOuterRange()
		);

	const sections = [];
	let start = 0;
	for ( const headingRange of headingRanges ) {
		sections.push( new ve.Range( start, headingRange.start ) );
		start = headingRange.end;
	}
	sections.push( new ve.Range( start, document.getDocumentRange().end ) );
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

	// Each section in the document, as divided by H2 headers
	const sections = getSectionRanges( documentModel );

	// Traverse the tree once to find internal links, and build a map
	const allInternalLinks = documentModel.getDocumentNode().getAnnotationRanges().filter( ( annRange ) => annRange.annotation.name === ve.dm.MWInternalLinkAnnotation.static.name );
	const internalLinkMap = orderedCollectBy( allInternalLinks, ( annRef ) => annRef.annotation.getAttribute( field ) );

	// Traverse again for links we want to show a Check on. This could be a small set, or all links.
	// Filter out any links that appear only once in the document.
	// getModifiedAnnotationRanges magically handles filtering sections and dismissed actions.
	const candidateModifiedLinks = this.getModifiedAnnotationRanges(
		documentModel,
		ve.dm.MWInternalLinkAnnotation.static.name
	).filter( ( annRange ) => internalLinkMap.get( annRange.annotation.getAttribute( field ) ).length > 1 );

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

			// Build a list where we're at the start.
			// Set this to [ annRange ] if we don't want to highlight after all.
			const highlights = Array.from( duplicateRanges );
			highlights.splice( index, 1 );
			highlights.unshift( annRange );

			// Set up the message
			const $learnMore = $( '<a>' ).text( this.constructor.static.learnMore );
			ve.setAttributeSafe( $learnMore[ 0 ], 'href', this.constructor.static.learnMoreHref );
			const $checkMessage = $( '<span>' )
				.append( $( '<span>' ).text( this.constructor.static.description ) )
				.append( $( '<span>' ).text( ' ' ) )
				.append( $learnMore );

			actions.push( new mw.editcheck.EditCheckAction( {
				fragments: highlights.map( ( ar ) => surfaceModel.getLinearFragment( ar.range ) ),
				focusAnnotation: ( annView ) => annView instanceof ve.ce.MWInternalLinkAnnotation,
				message: $checkMessage,
				check: this
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
			mw.notify( action.check.constructor.static.successToast, { type: 'success' } );
			break;
	}
};

mw.editcheck.editCheckFactory.register( mw.editcheck.DuplicateLinksEditCheck );
