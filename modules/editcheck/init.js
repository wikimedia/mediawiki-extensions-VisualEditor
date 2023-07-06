mw.editcheck = {};

/**
 * Check if added content in the document model might need a reference
 *
 * @param {ve.dm.DocumentModel} documentModel Document model
 * @param {boolean} [includeReferencedContent] Include content ranges that already
 *  have a reference.
 * @return {boolean}
 */
mw.editcheck.doesAddedContentNeedReference = function ( documentModel, includeReferencedContent ) {
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
			if ( !includeReferencedContent ) {
				for ( var i = range.start; i < range.end; i++ ) {
					if ( documentModel.data.isElementData( i ) && documentModel.data.getType( i ) === 'mwReference' ) {
						return false;
					}
				}
			}
			// 3. Exclude any ranges that aren't at the document root (i.e. image captions, table cells)
			var branchNode = documentModel.getBranchNodeFromOffset( range.start );
			if ( branchNode.getParent() !== documentModel.attachedRoot ) {
				return false;
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

if ( mw.config.get( 'wgVisualEditorConfig' ).editCheckTagging ) {
	mw.hook( 've.activationComplete' ).add( function () {
		var target = ve.init.target;

		function getRefNodes() {
			// The firstNodes list is a numerically indexed array of reference nodes in the document.
			// The list is append only, and removed references are set to undefined in place.
			// To check if a new reference is being published, we just need to know if a reference
			// with an index beyond the initial list (initLength) is still set.
			var internalList = target.getSurface().getModel().getDocument().getInternalList();
			var group = internalList.getNodeGroup( 'mwReference/' );
			return group ? group.firstNodes || [] : [];
		}

		var initLength = getRefNodes().length;
		target.saveFields.vetags = function () {
			var refNodes = getRefNodes();
			var newLength = refNodes.length;
			var newNodesInDoc = false;
			for ( var i = initLength; i < newLength; i++ ) {
				if ( refNodes[ i ] ) {
					newNodesInDoc = true;
					break;
				}
			}
			return newNodesInDoc ? 'editcheck-newreference' : '';
		};
	} );
}
