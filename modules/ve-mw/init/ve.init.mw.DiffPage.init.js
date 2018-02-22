/*!
 * VisualEditor MediaWiki DiffPage init.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

( function () {
	var $visualDiff,
		reviewModeButtonSelect,
		uri = new mw.Uri(),
		mode = uri.query.diffmode || 'source',
		conf = mw.config.get( 'wgVisualEditorConfig' ),
		pluginModules = conf.pluginModules.filter( mw.loader.getState );

	if ( mode !== 'visual' ) {
		// Enforce a valid mode, to avoid visual glitches in button-selection.
		mode = 'source';
	}

	function onReviewModeButtonSelectSelect( item ) {
		var modulePromise, progress, oldPageName, newPageName,
			$revSlider = $( '.mw-revslider-container' ),
			$wikitextDiff = $( 'table.diff[data-mw="interface"]' ),
			oldId = mw.config.get( 'wgDiffOldId' ),
			newId = mw.config.get( 'wgDiffNewId' );

		if ( mw.config.get( 'wgCanonicalSpecialPageName' ) !== 'ComparePages' ) {
			oldPageName = newPageName = mw.config.get( 'wgRelevantPageName' );
		} else {
			oldPageName = uri.query.page1;
			newPageName = uri.query.page2;
		}

		mode = item.getData();

		if ( mode === 'visual' ) {
			progress = new OO.ui.ProgressBarWidget( { classes: [ 've-init-mw-diffPage-loading' ] } );
			$wikitextDiff.addClass( 'oo-ui-element-hidden' ).before( progress.$element );
			// TODO: Load a smaller subset of VE for computing the visual diff
			modulePromise = mw.loader.using( [ 'ext.visualEditor.desktopArticleTarget' ].concat( pluginModules ) );
			mw.libs.ve.diffLoader.getVisualDiffGeneratorPromise( oldId, newId, modulePromise, oldPageName, newPageName ).then( function ( visualDiffGenerator ) {
				var diffElement = new ve.ui.DiffElement( visualDiffGenerator(), { classes: [ 've-init-mw-diffPage-diff' ] } );

				progress.$element.remove();
				$wikitextDiff.before( diffElement.$element );
				$visualDiff = diffElement.$element;
				$revSlider.addClass( 've-init-mw-diffPage-revSlider-visual' );

				diffElement.positionDescriptions();
			} );
		} else {
			if ( $visualDiff ) {
				$visualDiff.addClass( 'oo-ui-element-hidden' );
			}
			$wikitextDiff.removeClass( 'oo-ui-element-hidden' );
			$revSlider.removeClass( 've-init-mw-diffPage-revSlider-visual' );
		}

		if ( history.replaceState ) {
			uri.query.diffmode = mode;
			history.replaceState( '', document.title, uri );
		}

	}

	mw.hook( 'wikipage.diff' ).add( function () {
		// The PHP widget was a ButtonGroupWidget, so replace with a
		// ButtonSelectWidget instead of infusing.
		reviewModeButtonSelect = new OO.ui.ButtonSelectWidget( {
			items: [
				new OO.ui.ButtonOptionWidget( { data: 'visual', icon: 'eye', label: mw.msg( 'visualeditor-savedialog-review-visual' ) } ),
				new OO.ui.ButtonOptionWidget( { data: 'source', icon: 'wikiText', label: mw.msg( 'visualeditor-savedialog-review-wikitext' ) } )
			]
		} );
		reviewModeButtonSelect.on( 'select', onReviewModeButtonSelectSelect );
		$( '.ve-init-mw-diffPage-diffMode' ).empty().append( reviewModeButtonSelect.$element );
		reviewModeButtonSelect.selectItemByData( mode );
	} );
}() );
