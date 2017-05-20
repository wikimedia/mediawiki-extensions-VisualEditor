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
	var target,
		conf = mw.config.get( 'wgVisualEditorConfig' ),
		pageName = mw.config.get( 'collabPadPageName' ) || '',
		pageTitle = mw.Title.newFromText( pageName ),
		modules = [ 'ext.visualEditor.collabTarget' ]
			// Add modules from $wgVisualEditorPluginModules
			.concat( conf.pluginModules.filter( mw.loader.getState ) ),
		loadingPromise = mw.loader.using( modules ),
		progressBar = OO.ui.infuse( $( '.ve-init-mw-collabTarget-loading' ) ),
		documentNameField = OO.ui.infuse( $( '.ve-init-mw-collabTarget-nameField' ) ),
		documentNameInput = OO.ui.infuse( $( '.ve-init-mw-collabTarget-nameInput' ) ),
		submitButton = OO.ui.infuse( $( '.ve-init-mw-collabTarget-nameButton' ) );

	if ( !VisualEditorSupportCheck() ) {
		// VE not supported - say something?
		return;
	}

	function showPage( title ) {
		$( '#firstHeading' ).text( 'CollabPad: ' + title.getPrefixedText() ); // TODO: i18n

		progressBar.toggle( true );
		documentNameField.toggle( false );

		loadingPromise.done( function () {
			target = ve.init.mw.targetFactory.create( 'collab', title, conf.rebaserUrl );

			$( 'body' ).addClass( 've-activated ve-active' );

			$( '#content' ).append( target.$element );

			target.transformPage();
			$( '#firstHeading' ).addClass( 've-init-mw-desktopArticleTarget-uneditableContent' );

			target.documentReady( ve.createDocumentFromHtml( '' ) );
		} ).always( function () {
			documentNameField.toggle( false );
			progressBar.toggle( false );
		} ).fail( function () {
			// eslint-disable-next-line no-use-before-define
			showForm();
		} );
	}

	function showForm() {
		$( '#firstHeading' ).text( 'CollabPad' ); // TODO: i18n

		if ( target ) {
			$( '#firstHeading' ).removeClass( 've-init-mw-desktopArticleTarget-uneditableContent' );
			target.restorePage();
			target.destroy();

			$( 'body' ).removeClass( 've-activated ve-active' );
		}

		progressBar.toggle( false );
		documentNameField.toggle( true );
	}

	function onSubmit() {
		documentNameInput.getValidity().then( function () {
			var title = mw.Title.newFromText( documentNameInput.getValue() ),
				specialTitle = mw.Title.newFromText( 'Special:CollabPad/' + title.toString() );

			if ( title ) {
				if ( history.pushState ) {
					// TODO: Handle popstate
					history.pushState( { tag: 'collabTarget', title: title.toString() }, title.getMain(), specialTitle.getUrl() );
					showPage( title );
				} else {
					location.href = specialTitle.getUrl();
				}
			} else {
				documentNameInput.focus();
			}
		} );
	}

	documentNameInput.setValidation( function ( value ) {
		var title = mw.Title.newFromText( value );
		return !!title;
	} );
	submitButton.setDisabled( false );

	documentNameInput.on( 'enter', onSubmit );
	submitButton.on( 'click', onSubmit );

	if ( pageTitle ) {
		showPage( pageTitle );
	} else {
		showForm();
	}

	// Tag current state
	if ( history.replaceState ) {
		history.replaceState( { tag: 'collabTarget', title: pageName }, document.title, location.href );
	}
	window.addEventListener( 'popstate', function ( e ) {
		if ( e.state && e.state.tag === 'collabTarget' ) {
			if ( e.state.title ) {
				showPage( mw.Title.newFromText( e.state.title ) );
			} else {
				showForm();
			}
		}
	} );
}() );
