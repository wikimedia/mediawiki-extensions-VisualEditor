module.exports = function () {
	const veDone = arguments[ arguments.length - 1 ];

	window.seleniumUtils = {
		getBoundingRect: function ( elements ) {
			return ve.getBoundingRect(
				elements.map( ( element ) => element.getBoundingClientRect() )
			);
		},
		collapseToolbar: function () {
			ve.init.target.toolbar.items.forEach( ( group ) => {
				if ( group.setActive ) {
					group.setActive( false );
				}
			} );
		},
		runMenuTask: function ( done, tool, expanded, highlight, extraElements ) {
			const toolGroup = tool.toolGroup;

			seleniumUtils.collapseToolbar();
			toolGroup.setActive( true );
			if ( toolGroup.updateCollapsibleState ) {
				toolGroup.expanded = !!expanded;
				toolGroup.updateCollapsibleState();
			}

			if ( highlight ) {
				tool.$link[ 0 ].focus();
			}

			setTimeout( () => {
				done(
					seleniumUtils.getBoundingRect( [
						toolGroup.$element[ 0 ],
						toolGroup.$group[ 0 ]
					].concat( extraElements || [] ) )
				);
			} );
		},
		runDiffTest: function ( oldHtml, newHtml, done ) {
			const target = ve.init.target,
				surface = target.surface;

			if ( target.saveDialog ) {
				target.saveDialog.clearDiff();
				target.saveDialog.close();
				while ( surface.getModel().canUndo() ) {
					surface.getModel().undo();
				}
			}

			target.originalDmDoc = target.constructor.static.createModelFromDom( target.constructor.static.parseDocument( oldHtml ), 'visual' );

			surface.getModel().getDocument().getStore().merge( target.originalDmDoc.getStore() );

			surface.getModel().getLinearFragment( new ve.Range( 0 ) ).insertDocument(
				target.constructor.static.createModelFromDom( target.constructor.static.parseDocument( newHtml ), 'visual' )
			).collapseToEnd().adjustLinearSelection( 0, 3 ).removeContent();

			target.once( 'saveReview', () => {
				setTimeout( () => {
					const dialog = surface.dialogs.currentWindow;
					dialog.reviewModeButtonSelect.selectItemByData( 'visual' );

					// Fake parsed edit summary
					dialog.$previewEditSummary.text( '(Lorem ipsum)' );

					done(
						seleniumUtils.getBoundingRect( [
							dialog.$frame[ 0 ]
						] )
					);
				}, 500 );
			} );
			surface.execute( 'mwSaveDialog', 'review' );
		}
	};

	// Welcome dialog suppressed by query string (vehidebetadialog)
	// Suppress user education indicators
	mw.storage.set( 've-hideusered', 1 );
	mw.hook( 've.activationComplete' ).add( () => {
		const target = ve.init.target,
			surfaceView = target.getSurface().getView();

		// eslint-disable-next-line no-jquery/no-deferred
		const welcomeDialogPromise = target.welcomeDialogPromise || $.Deferred().resolve().promise();

		welcomeDialogPromise.then( () => {
			// Hide edit notices
			target.toolbar.tools.notices.getPopup().toggle( false );
			surfaceView.focus();
			// Modify the document to make the save button blue
			target.surface.getModel().getFragment().insertContent( ' ' ).collapseToStart().select();
			// Wait for save button fade
			setTimeout( () => {
				veDone( { width: window.innerWidth, height: window.innerHeight } );
			}, 100 );
		} );
	} );
};
