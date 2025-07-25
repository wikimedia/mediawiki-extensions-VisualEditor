mw.editcheck.AddReferenceEditCheck = function MWAddReferenceEditCheck() {
	// Parent constructor
	mw.editcheck.AddReferenceEditCheck.super.apply( this, arguments );
};

OO.inheritClass( mw.editcheck.AddReferenceEditCheck, mw.editcheck.BaseEditCheck );

mw.editcheck.AddReferenceEditCheck.static.name = 'addReference';

mw.editcheck.AddReferenceEditCheck.static.title = ve.msg( 'editcheck-dialog-addref-title' );

mw.editcheck.AddReferenceEditCheck.static.description = ve.msg( 'editcheck-dialog-addref-description' );

mw.editcheck.AddReferenceEditCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.BaseEditCheck.static.defaultConfig, {
	minimumCharacters: 50,
	beforePunctuation: false
} );

mw.editcheck.AddReferenceEditCheck.static.onlyCoveredNodes = true;

mw.editcheck.AddReferenceEditCheck.prototype.onBeforeSave = function ( surfaceModel ) {
	return this.findAddedContent( surfaceModel.getDocument() ).filter( ( range ) => !this.isDismissedRange( range ) )
		.map(
			( range ) => new mw.editcheck.EditCheckAction( {
				fragments: [ surfaceModel.getLinearFragment( range ) ],
				check: this
			} )
		);
};
// Only show these before save (for now)
// mw.editcheck.AddReferenceEditCheck.prototype.onDocumentChange = mw.editcheck.AddReferenceEditCheck.prototype.onBeforeSave;

/**
 * Find content ranges which have been inserted
 *
 * @param {ve.dm.Document} documentModel
 * @param {boolean} includeReferencedContent Include contents that already contains a reference
 * @return {ve.Range[]}
 */
mw.editcheck.AddReferenceEditCheck.prototype.findAddedContent = function ( documentModel, includeReferencedContent ) {
	// Broken out so a helper for tagging can call it
	const ranges = this.getModifiedContentRanges( documentModel ).filter( ( range ) => {
		if ( !includeReferencedContent ) {
			// 4. Exclude any ranges that already contain references
			for ( let i = range.start; i < range.end; i++ ) {
				if ( documentModel.data.isElementData( i ) && documentModel.data.getType( i ) === 'mwReference' ) {
					return false;
				}
			}
		}
		// 5. Exclude any ranges that aren't at the document root (i.e. image captions, table cells)
		const branchNode = documentModel.getBranchNodeFromOffset( range.start );
		if ( branchNode.getParent() !== documentModel.attachedRoot ) {
			return false;
		}
		return true;
	} );

	return ranges;
};

mw.editcheck.AddReferenceEditCheck.prototype.act = function ( choice, action, surface ) {
	// The complex citoid workflow means that we can't just count on a single "windowAction" here...
	const windowAction = ve.ui.actionFactory.create( 'window', surface, 'check' );
	switch ( choice ) {
		case 'accept':
			ve.track( 'activity.editCheckReferences', { action: 'edit-check-confirm' } );

			this.adjustForPunctuation( action.fragments[ 0 ].collapseToEnd() ).select();

			return windowAction.open( 'citoid' ).then( ( instance ) => instance.closing ).then( ( citoidData ) => {
				const citoidOrCiteDataDeferred = ve.createDeferred();
				if ( citoidData && citoidData.action === 'manual-choose' ) {
					// The plain reference dialog has been launched. Wait for the data from
					// the basic Cite closing promise instead.
					surface.getDialogs().once( 'closing', ( win, closed, citeData ) => {
						citoidOrCiteDataDeferred.resolve( citeData );
					} );
				} else {
					// "Auto"/"re-use"/"close" means Citoid is finished and we can
					// use the data form the Citoid closing promise.
					citoidOrCiteDataDeferred.resolve( citoidData );
				}
				const citoidOrCiteDataPromise = citoidOrCiteDataDeferred.promise();
				citoidOrCiteDataPromise.then( ( data ) => {
					if ( data ) {
						// Edit check inspector is already closed by this point, but
						// we need to end the workflow.
						mw.notify( ve.msg( 'editcheck-dialog-addref-success-notify' ), { type: 'success' } );
					}
				} );
				return citoidOrCiteDataPromise;
			} );
		case 'reject':
			ve.track( 'activity.editCheckReferences', { action: 'edit-check-reject' } );
			return action.widget.showFeedback( {
				title: ve.msg( 'editcheck-dialog-addref-reject-question' ),
				description: ve.msg( 'editcheck-dialog-addref-reject-description' ),
				choices: [
					{
						data: 'uncertain',
						label: ve.msg( 'editcheck-dialog-addref-reject-uncertain' )
					},
					{
						data: 'common-knowledge',
						label: ve.msg( 'editcheck-dialog-addref-reject-common-knowledge' )
					},
					{
						data: 'irrelevant',
						label: ve.msg( 'editcheck-dialog-addref-reject-irrelevant' )
					},
					{
						data: 'other',
						label: ve.msg( 'editcheck-dialog-addref-reject-other' )
					}
				]
			} ).then( ( reason ) => {
				ve.track( 'activity.editCheckReferences', { action: 'dialog-choose-' + reason } );
				this.dismiss( action );
				return ve.createDeferred().resolve( { action: choice, reason: reason } ).promise();
			} );
	}
};

/**
 * @inheritdoc
 */
mw.editcheck.AddReferenceEditCheck.prototype.isRangeValid = function ( range, documentModel ) {
	return range.getLength() >= ( this.config.minimumCharacters || 0 ) &&
		mw.editcheck.AddReferenceEditCheck.super.prototype.isRangeValid.call( this, range, documentModel );
};

/**
 * Adjust a fragment to include/exclude trailing punctuation
 *
 * @param {ve.dm.SurfaceFragment} insertionPointFragment
 * @return {ve.dm.SurfaceFragment}
 */
mw.editcheck.AddReferenceEditCheck.prototype.adjustForPunctuation = function ( insertionPointFragment ) {
	if ( this.config.beforePunctuation ) {
		// TODO: Use UnicodeJS properties directly once is https://gerrit.wikimedia.org/r/c/unicodejs/+/893832 merged
		const sentenceProperties = {
			ATerm: [ 0x002E, 0x2024, 0xFE52, 0xFF0E ],
			STerm: [ 0x0021, 0x003F, 0x0589, 0x061E, 0x061F, 0x06D4, [ 0x0700, 0x0702 ], 0x07F9, 0x0837, 0x0839, 0x083D, 0x083E, 0x0964, 0x0965, 0x104A, 0x104B, 0x1362, 0x1367, 0x1368, 0x166E, 0x1735, 0x1736, 0x1803, 0x1809, 0x1944, 0x1945, [ 0x1AA8, 0x1AAB ], 0x1B5A, 0x1B5B, 0x1B5E, 0x1B5F, 0x1C3B, 0x1C3C, 0x1C7E, 0x1C7F, 0x203C, 0x203D, [ 0x2047, 0x2049 ], 0x2E2E, 0x2E3C, 0x3002, 0xA4FF, 0xA60E, 0xA60F, 0xA6F3, 0xA6F7, 0xA876, 0xA877, 0xA8CE, 0xA8CF, 0xA92F, 0xA9C8, 0xA9C9, [ 0xAA5D, 0xAA5F ], 0xAAF0, 0xAAF1, 0xABEB, 0xFE56, 0xFE57, 0xFF01, 0xFF1F, 0xFF61, 0x10A56, 0x10A57, [ 0x10F55, 0x10F59 ], 0x11047, 0x11048, [ 0x110BE, 0x110C1 ], [ 0x11141, 0x11143 ], 0x111C5, 0x111C6, 0x111CD, 0x111DE, 0x111DF, 0x11238, 0x11239, 0x1123B, 0x1123C, 0x112A9, 0x1144B, 0x1144C, 0x115C2, 0x115C3, [ 0x115C9, 0x115D7 ], 0x11641, 0x11642, [ 0x1173C, 0x1173E ], 0x11944, 0x11946, 0x11A42, 0x11A43, 0x11A9B, 0x11A9C, 0x11C41, 0x11C42, 0x11EF7, 0x11EF8, 0x16A6E, 0x16A6F, 0x16AF5, 0x16B37, 0x16B38, 0x16B44, 0x16E98, 0x1BC9F, 0x1DA88 ],
			Close: [ 0x0022, [ 0x0027, 0x0029 ], 0x005B, 0x005D, 0x007B, 0x007D, 0x00AB, 0x00BB, [ 0x0F3A, 0x0F3D ], 0x169B, 0x169C, [ 0x2018, 0x201F ], 0x2039, 0x203A, 0x2045, 0x2046, 0x207D, 0x207E, 0x208D, 0x208E, [ 0x2308, 0x230B ], 0x2329, 0x232A, [ 0x275B, 0x2760 ], [ 0x2768, 0x2775 ], 0x27C5, 0x27C6, [ 0x27E6, 0x27EF ], [ 0x2983, 0x2998 ], [ 0x29D8, 0x29DB ], 0x29FC, 0x29FD, [ 0x2E00, 0x2E0D ], 0x2E1C, 0x2E1D, [ 0x2E20, 0x2E29 ], 0x2E42, [ 0x3008, 0x3011 ], [ 0x3014, 0x301B ], [ 0x301D, 0x301F ], 0xFD3E, 0xFD3F, 0xFE17, 0xFE18, [ 0xFE35, 0xFE44 ], 0xFE47, 0xFE48, [ 0xFE59, 0xFE5E ], 0xFF08, 0xFF09, 0xFF3B, 0xFF3D, 0xFF5B, 0xFF5D, 0xFF5F, 0xFF60, 0xFF62, 0xFF63, [ 0x1F676, 0x1F678 ] ],
			SContinue: [ 0x002C, 0x002D, 0x003A, 0x055D, 0x060C, 0x060D, 0x07F8, 0x1802, 0x1808, 0x2013, 0x2014, 0x3001, 0xFE10, 0xFE11, 0xFE13, 0xFE31, 0xFE32, 0xFE50, 0xFE51, 0xFE55, 0xFE58, 0xFE63, 0xFF0C, 0xFF0D, 0xFF1A, 0xFF64 ]
		};
		const punctuationPattern = new RegExp(
			unicodeJS.charRangeArrayRegexp( [].concat(
				sentenceProperties.ATerm,
				sentenceProperties.STerm,
				sentenceProperties.Close,
				sentenceProperties.SContinue
			) )
		);
		let lastCharacter = insertionPointFragment.adjustLinearSelection( -1, 0 ).getText();
		while ( punctuationPattern.test( lastCharacter ) ) {
			insertionPointFragment = insertionPointFragment.adjustLinearSelection( -1, -1 );
			lastCharacter = insertionPointFragment.adjustLinearSelection( -1, 0 ).getText();
		}
	}
	return insertionPointFragment;
};

// Register

mw.editcheck.editCheckFactory.register( mw.editcheck.AddReferenceEditCheck );
