mw.editcheck.AddReferenceEditCheck = function MWAddReferenceEditCheck( config ) {
	// Parent constructor
	mw.editcheck.AddReferenceEditCheck.super.call( this, config );
};

OO.inheritClass( mw.editcheck.AddReferenceEditCheck, mw.editcheck.BaseEditCheck );

mw.editcheck.AddReferenceEditCheck.static.name = 'addReference';

mw.editcheck.AddReferenceEditCheck.static.description = ve.msg( 'editcheck-dialog-addref-description' );

mw.editcheck.AddReferenceEditCheck.prototype.onBeforeSave = function ( diff ) {
	const documentModel = diff.documentModel;
	const ranges = this.getModifiedRangesFromDiff( diff ).filter( ( range ) => {
		// 4. Exclude any ranges that already contain references
		for ( let i = range.start; i < range.end; i++ ) {
			if ( documentModel.data.isElementData( i ) && documentModel.data.getType( i ) === 'mwReference' ) {
				return false;
			}
		}
		// 5. Exclude any ranges that aren't at the document root (i.e. image captions, table cells)
		const branchNode = documentModel.getBranchNodeFromOffset( range.start );
		if ( branchNode.getParent() !== documentModel.attachedRoot ) {
			return false;
		}
		return true;
	} );
	return ranges.map( ( range ) => {
		const fragment = diff.surface.getModel().getFragment( new ve.dm.LinearSelection( range ) );
		return new mw.editcheck.EditCheckAction( {
			highlight: fragment,
			selection: this.adjustForPunctuation( fragment.collapseToEnd() ),
			check: this
		} );
	} );
};

mw.editcheck.AddReferenceEditCheck.prototype.act = function ( choice, action, contextItem ) {
	// The complex citoid workflow means that we can't just count on a single "windowAction" here...
	const windowAction = ve.ui.actionFactory.create( 'window', contextItem.context.getSurface(), 'check' );
	switch ( choice ) {
		case 'accept':
			ve.track( 'activity.editCheckReferences', { action: 'edit-check-confirm' } );
			action.selection.select();

			return windowAction.open( 'citoid' ).then( ( instance ) => instance.closing ).then( ( citoidData ) => {
				const citoidOrCiteDataDeferred = ve.createDeferred();
				if ( citoidData && citoidData.action === 'manual-choose' ) {
					// The plain reference dialog has been launched. Wait for the data from
					// the basic Cite closing promise instead.
					contextItem.context.getSurface().getDialogs().once( 'closing', ( win, closed, citeData ) => {
						citoidOrCiteDataDeferred.resolve( citeData );
					} );
				} else {
					// "Auto"/"re-use"/"close" means Citoid is finished and we can
					// use the data form the Citoid closing promise.
					citoidOrCiteDataDeferred.resolve( citoidData );
				}
				citoidOrCiteDataDeferred.promise().then( ( data ) => {
					if ( !data ) {
						// Reference was not inserted - re-open this context
						setTimeout( () => {
							// Deactivate again for mobile after teardown has modified selections
							contextItem.context.getSurface().getView().deactivate();
							contextItem.context.afterContextChange();
						}, 500 );
					} else {
						// Edit check inspector is already closed by this point, but
						// we need to end the workflow.
						contextItem.close( citoidData );
					}
				} );
			} );
		case 'reject':
			ve.track( 'activity.editCheckReferences', { action: 'edit-check-reject' } );
			return windowAction.open(
				'editCheckReferencesInspector',
				{
					fragment: action.highlight,
					callback: contextItem.data.callback,
					saveProcessDeferred: contextItem.data.saveProcessDeferred
				}
			// eslint-disable-next-line arrow-body-style
			).then( ( instance ) => {
				// contextItem.openingCitoid = false;
				return instance.closing;
			} ).then( ( data ) => {
				if ( !data ) {
					// Form was closed, re-open this context
					contextItem.context.afterContextChange();
				} else {
					contextItem.close( data );
				}
			} );
	}
};

mw.editcheck.editCheckFactory.register( mw.editcheck.AddReferenceEditCheck );
