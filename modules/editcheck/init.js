mw.editcheck = {};

mw.editcheck.doesAddedContentNeedReference = function ( documentModel ) {
	if ( mw.config.get( 'wgNamespaceNumber' ) !== mw.config.get( 'wgNamespaceIds' )[ '' ] ) {
		return false;
	}
	var ranges = [];
	var offset = 0;
	var endOffset = documentModel.getDocumentRange().end;
	try {
		documentModel.completeHistory.squash().transactions[ 0 ].operations.every( function ( op ) {
			if ( op.type === 'retain' ) {
				offset += op.length;
			} else if ( op.type === 'replace' ) {
				var insertedRange = new ve.Range( offset, offset + op.insert.length );
				offset += op.insert.length;
				ve.batchPush(
					ranges,
					mw.editcheck.getContentRanges( documentModel, insertedRange )
				);
			}
			// Reached the end of the doc / start of internal list, stop searching
			return offset < endOffset;
		} );
	} catch ( err ) {
		// TransactionSquasher can sometimes throw errors; until T333710 is
		// fixed just count this as not needing a reference.
		mw.errorLogger.logError( err, 'error.visualeditor' );
		return false;
	}
	return ranges.some( function ( range ) {
		var minimumCharacters = 50;
		// 1. Check that at least minimumCharacters characters have been inserted sequentially
		if ( range.getLength() >= minimumCharacters ) {
			// 2. Exclude any ranges that already contain references
			for ( var i = range.start; i < range.end; i++ ) {
				if ( documentModel.data.isElementData( i ) && documentModel.data.getType( i ) === 'mwReference' ) {
					return false;
				}
			}
			return true;
		}
		return false;
	} );
};

/**
 * Return the content ranges (content branch node interiors) contained within a range
 *
 * For a content branch node entirely contained within the range, its entire interior
 * range will be included. For a content branch node overlapping with the range boundary,
 * only the covered part of its interior range will be included.
 *
 * @param {ve.dm.Document} documentModel The documentModel to search
 * @param {ve.Range} range The range to include
 * @return {ve.Range[]} The contained content ranges (content branch node interiors)
 */
mw.editcheck.getContentRanges = function ( documentModel, range ) {
	var ranges = [];
	documentModel.selectNodes( range, 'branches' ).forEach( function ( spec ) {
		if ( spec.node.canContainContent() ) {
			ranges.push( spec.range || spec.nodeRange );
		}
	} );
	return ranges;
};
