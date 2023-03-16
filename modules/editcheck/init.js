mw.editcheck = {};

mw.editcheck.doesAddedContentNeedReference = function ( documentModel ) {
	var ranges = [];
	var offset = 0;
	var endOffset = documentModel.getDocumentRange().end;
	documentModel.completeHistory.squash().transactions[ 0 ].operations.every( function ( op ) {
		if ( op.type === 'retain' ) {
			offset += op.length;
		} else if ( op.type === 'replace' ) {
			ranges.push( new ve.Range( offset, offset + op.insert.length ) );
			offset += op.insert.length;
		}
		// Reached the end of the doc / start of internal list, stop searching
		return offset < endOffset;
	} );
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
