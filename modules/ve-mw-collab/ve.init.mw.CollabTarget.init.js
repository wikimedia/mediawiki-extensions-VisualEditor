/*!
 * VisualEditor MediaWiki DesktopArticleTarget init.
 *
 * This file must remain as widely compatible as the base compatibility
 * for MediaWiki itself (see mediawiki/core:/resources/startup.js).
 * Avoid use of: ES5, SVG, HTML5 DOM, ContentEditable etc.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

( function () {
	var $content = $( '#mw-content-text' ),
		conf = mw.config.get( 'wgVisualEditorConfig' ),
		pageTitle = mw.Title.newFromText( mw.config.get( 'collabPadPageName' ) || '' ),
		modules = [ 'ext.visualEditor.collabTarget' ]
			// Add modules from $wgVisualEditorPluginModules
			.concat( conf.pluginModules.filter( mw.loader.getState ) ),
		loadingPromise = mw.loader.using( modules );

	if ( !VisualEditorSupportCheck() ) {
		// VE not supported - say something?
		return;
	}

	function showPage( title ) {
		$( '#firstHeading' ).text( 'CollabPad: ' + title.getPrefixedText() ); // TODO: i18n
		$content.empty().append(
			new OO.ui.ProgressBarWidget( {
				classes: [ 've-init-mw-collabTarget-loading' ]
			} ).$element
		);
		loadingPromise.then( function () {
			var target = ve.init.mw.targetFactory.create( 'collab' );

			$( 'body' ).addClass( 've-activated ve-active' );

			$content.empty();
			$( '#content' ).append( target.$element );

			target.transformPage();
			$( '#firstHeading' ).addClass( 've-init-mw-desktopArticleTarget-uneditableContent' );

			target.documentReady( ve.createDocumentFromHtml( '' ) );
			target.on( 'surfaceReady', function () {
				var synchronizer = new ve.dm.SurfaceSynchronizer(
						target.getSurface().getModel(),
						title.toString(),
						{ server: conf.rebaserUrl }
					),
					authorList = new ve.ui.AuthorListWidget( synchronizer );

				target.getToolbar().$actions.append( authorList.$element );
				target.getSurface().getView().setSynchronizer( synchronizer );
				target.getSurface().getView().focus();
			} );
		} );
	}

	function showForm() {
		var documentNameInput = OO.ui.infuse( $( '.ve-init-mw-collabTarget-nameInput' ) ),
			submitButton = OO.ui.infuse( $( '.ve-init-mw-collabTarget-nameButton' ) );

		documentNameInput.setValidation( function ( value ) {
			var title = mw.Title.newFromText( value );
			return !!title;
		} );

		function onSubmit() {
			var href,
				title = mw.Title.newFromText( documentNameInput.getValue() );

			if ( title ) {
				href = window.location.href + '/' + encodeURIComponent( title.toString() );
				if ( history.pushState ) {
					// TODO: Handle popstate
					history.pushState( null, title.getMain(), href );
					showPage( title );
				} else {
					window.location.href = href;
				}
			} else {
				documentNameInput.focus();
			}
		}

		submitButton.on( 'click', onSubmit );
		documentNameInput.on( 'enter', onSubmit );

		submitButton.setDisabled( false );
	}

	if ( pageTitle ) {
		showPage( pageTitle );
	} else {
		showForm();
	}
}() );
