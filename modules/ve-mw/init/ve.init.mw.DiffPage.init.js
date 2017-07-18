/*!
 * VisualEditor MediaWiki DiffPage init.
 *
 * @copyright 2011-2017 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

( function () {
	var $visualDiff,
		reviewModeButtonSelect,
		revCache = {},
		pageName = mw.config.get( 'wgRelevantPageName' ),
		mode = 'source',
		conf = mw.config.get( 'wgVisualEditorConfig' ),
		pluginModules = conf.pluginModules.filter( mw.loader.getState );

	function getModelFromResponse( response ) {
		var doc,
			targetClass = ve.init.mw.DesktopArticleTarget,
			data = response ? ( response.visualeditor || response.visualeditoredit ) : null;
		if ( data && typeof data.content === 'string' ) {
			doc = targetClass.static.parseDocument( data.content, 'visual' );
			return targetClass.static.createModelFromDom( doc, 'visual' );
		}
		return null;
	}

	function fetchRevision( revId ) {
		if ( !revCache[ revId ] ) {
			revCache[ revId ] = mw.libs.ve.targetLoader.requestParsoidData( pageName, revId, 'diff' );
		}
		return revCache[ revId ];
	}

	function onReviewModeButtonSelectSelect( item ) {
		var oldRevPromise, newRevPromise, modulePromise, progress,
			$revSlider = $( '.mw-revslider-container' ),
			$wikitextDiff = $( 'table.diff[data-mw="interface"]' ),
			oldId = mw.config.get( 'wgDiffOldId' ),
			newId = mw.config.get( 'wgDiffNewId' );

		mode = item.getData();

		if ( mode === 'visual' ) {
			progress = new OO.ui.ProgressBarWidget( { classes: [ 've-init-mw-diffPage-loading' ] } );
			$wikitextDiff.addClass( 'oo-ui-element-hidden' );
			$wikitextDiff.before( progress.$element );
			oldRevPromise = fetchRevision( oldId );
			newRevPromise = fetchRevision( newId );
			// TODO: Load a smaller subset of VE for computing the visual diff
			modulePromise = mw.loader.using( [ 'ext.visualEditor.desktopArticleTarget' ].concat( pluginModules ) );
			$.when( oldRevPromise, newRevPromise, modulePromise ).then( function ( oldResponse, newResponse ) {
				var visualDiff, diffElement,
					oldDoc = getModelFromResponse( oldResponse ),
					newDoc = getModelFromResponse( newResponse );

				// TODO: Differ expects newDoc to be derived from oldDoc and contain all its store data.
				// We may want to remove that assumption from the differ?
				newDoc.getStore().merge( oldDoc.getStore() );
				visualDiff = new ve.dm.VisualDiff( oldDoc, newDoc );
				diffElement = new ve.ui.DiffElement( visualDiff, { classes: [ 've-init-mw-diffPage-diff' ] } );

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
