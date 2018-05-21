/*!
 * VisualEditor MediaWiki CollabTarget init.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

( function () {
	var target,
		conf = mw.config.get( 'wgVisualEditorConfig' ),
		pageName = mw.config.get( 'collabPadPageName' ) || '',
		pageTitle = mw.Title.newFromText( pageName ),
		modules = [ OO.ui.isMobile() ? 'ext.visualEditor.collabTarget.mobile' : 'ext.visualEditor.collabTarget.desktop' ]
			// Add modules from $wgVisualEditorPluginModules
			.concat( conf.pluginModules.filter( mw.loader.getState ) ),
		loadingPromise = mw.loader.using( modules ),
		progressBar = OO.ui.infuse( $( '.ve-init-mw-collabTarget-loading' ) ),
		form = OO.ui.infuse( $( '.ve-init-mw-collabTarget-form' ) ),
		documentNameInput = OO.ui.infuse( $( '.ve-init-mw-collabTarget-nameInput' ) ),
		documentNameButton = OO.ui.infuse( $( '.ve-init-mw-collabTarget-nameButton' ) ),
		importInput = OO.ui.infuse( $( '.ve-init-mw-collabTarget-importInput' ) ),
		importButton = OO.ui.infuse( $( '.ve-init-mw-collabTarget-importButton' ) );

	if ( !VisualEditorSupportCheck() ) {
		// VE not supported - say something?
		return;
	}

	function setTitle( title ) {
		$( '#firstHeading' ).text( title );
		document.title = title;
	}

	function showPage( title, importTitle ) {
		setTitle( mw.msg( 'collabpad-doctitle', title.getPrefixedText() ) );

		progressBar.toggle( true );
		form.toggle( false );

		loadingPromise.done( function () {
			target = ve.init.mw.targetFactory.create( 'collab', title, conf.rebaserUrl, { importTitle: importTitle } );

			$( 'body' ).addClass( 've-activated ve-active' );

			$( '#content' ).append( target.$element );

			target.transformPage();
			$( '#firstHeading' ).addClass( 've-init-mw-desktopArticleTarget-uneditableContent' );

			target.documentReady( ve.createDocumentFromHtml( '' ) );
		} ).always( function () {
			form.toggle( false );
			progressBar.toggle( false );
		} ).fail( function ( err ) {
			mw.log.error( err );
			// eslint-disable-next-line no-use-before-define
			showForm();
		} );
	}

	function showForm() {
		setTitle( mw.msg( 'collabpad' ) );

		if ( target ) {
			$( '#firstHeading' ).removeClass( 've-init-mw-desktopArticleTarget-uneditableContent' );
			target.restorePage();
			target.destroy();

			$( 'body' ).removeClass( 've-activated ve-active' );
		}

		progressBar.toggle( false );
		form.toggle( true );
	}

	function loadTitle( title, importTitle ) {
		var specialTitle = mw.Title.newFromText( 'Special:CollabPad/' + title.toString() );
		if ( history.pushState ) {
			// TODO: Handle popstate
			history.pushState( { tag: 'collabTarget', title: title.toString() }, title.getMain(), specialTitle.getUrl() );
			showPage( title, importTitle );
		} else {
			location.href = specialTitle.getUrl();
		}
	}

	function getRandomTitle() {
		return Math.random().toString( 36 ).slice( 2 );
	}

	function onNameChange() {
		documentNameInput.getValidity().then( function () {
			documentNameButton.setDisabled( false );
		}, function () {
			documentNameButton.setDisabled( true );
		} );
	}

	function loadFromName() {
		documentNameInput.getValidity().then( function () {
			var title = mw.Title.newFromText(
				documentNameInput.getValue().trim() || getRandomTitle()
			);

			if ( title ) {
				loadTitle( title );
			} else {
				documentNameInput.focus();
			}
		} );
	}

	documentNameInput.setValidation( function ( value ) {
		// Empty input will create a random document name, otherwise must be valid
		return value === '' || !!mw.Title.newFromText( value );
	} );
	documentNameButton.setDisabled( false );

	documentNameInput.on( 'change', onNameChange );
	documentNameInput.on( 'enter', loadFromName );
	documentNameButton.on( 'click', loadFromName );
	onNameChange();

	function onImportChange() {
		documentNameInput.getValidity().then( function () {
			importButton.setDisabled( false );
		}, function () {
			importButton.setDisabled( true );
		} );
	}

	function importTitle() {
		importInput.getValidity().then( function () {
			var title = mw.Title.newFromText( importInput.getValue().trim() );

			if ( title ) {
				loadTitle( mw.Title.newFromText( getRandomTitle() ), title );
			} else {
				documentNameInput.focus();
			}
		} );
	}

	importInput.setValidation( function ( value ) {
		// TODO: Check page exists?
		return !!mw.Title.newFromText( value );
	} );
	importInput.on( 'enter', importTitle );
	importButton.on( 'click', importTitle );
	importButton.setDisabled( false );
	onImportChange();

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
