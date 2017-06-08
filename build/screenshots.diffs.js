/* global seleniumUtils, langs */

( function () {
	'use strict';
	var runScreenshotTest,
		createScreenshotEnvironment = require( './screenshots.js' ).createScreenshotEnvironment,
		test = require( 'selenium-webdriver/testing' );

	runScreenshotTest = createScreenshotEnvironment( test, function () {
		var done = arguments[ arguments.length - 1 ];

		window.seleniumUtils.runDiffTest = function ( oldHtml, newHtml, done ) {
			var target = ve.init.target,
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

			target.once( 'saveReview', function () {
				setTimeout( function () {
					var dialog = surface.dialogs.currentWindow;
					dialog.reviewModeButtonSelect.selectItemByData( 'visual' );

					// Fake parsed edit summary
					dialog.$reviewEditSummary.text( '(Lorem ipsum)' );

					done(
						seleniumUtils.getBoundingRect( [
							dialog.$frame[ 0 ]
						] )
					);
				}, 500 );
			} );
			surface.execute( 'mwSaveDialog', 'review' );
		};

		done();
	} );

	function runTests( lang ) {

		test.describe( 'Screenshots: ' + lang, function () {
			this.lang = lang;
			test.it( 'Simple diff', function () {
				runScreenshotTest( 'VisualEditor_diff_simple', lang,
					// This function is converted to a string and executed in the browser
					function () {
						var done = arguments[ arguments.length - 1 ];

						seleniumUtils.runDiffTest(
							'<h2>Lorem ipsum</h2>' +
							'<p>Lorem ipsum dolor sit <b>amet</b>, consectetur adipiscing elit.</p>',
							'<h2>Lorem ipsum</h2>' +
							'<p>Lorem ipsum dolor sit <i>amet</i>, consectetur adipiscing elit.</p>',
							done
						);
					}
				);
				runScreenshotTest( 'VisualEditor_diff_move_and_change', lang,
					// This function is converted to a string and executed in the browser
					function () {
						var done = arguments[ arguments.length - 1 ];

						seleniumUtils.runDiffTest(
							'<h2>Lorem ipsum</h2>' +
							'<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>' +
							'<p>Maecenas fringilla turpis et nunc bibendum mattis.</p>',
							'<h2>Lorem ipsum</h2>' +
							'<p>Maecenas fringilla turpis et nunc bibendum mattis.</p>' +
							'<p>Lorem ipsum dolor sit amat, consectetur adipiscing elit.</p>',
							done
						);
					}
				);
				runScreenshotTest( 'VisualEditor_diff_link_change', lang,
					// This function is converted to a string and executed in the browser
					function () {
						var done = arguments[ arguments.length - 1 ];

						seleniumUtils.runDiffTest(
							'<h2>Lorem ipsum</h2>' +
							'<p><a rel="mw:WikiLink" href="./Lipsum">Lorem ipsum</a> dolor sit amet, consectetur adipiscing elit.</p>',
							'<h2>Lorem ipsum</h2>' +
							'<p><a rel="mw:WikiLink" href="./Lorem ipsum">Lorem ipsum</a> dolor sit amet, consectetur adipiscing elit.</p>',
							done
						);
					}
				);
				runScreenshotTest( 'VisualEditor_diff_list_change', lang,
					// This function is converted to a string and executed in the browser
					function () {
						var done = arguments[ arguments.length - 1 ];

						seleniumUtils.runDiffTest(
							'<ul><li>Lorem</li><li>ipsum</li><li>dolor</li><li>sit</li><li>amet</li></ul>',
							'<ul><li>Lorem</li><li>ipsum</li><li>sit</li><li>amat</li></ul>',
							done
						);
					}
				);
			} );
		} );
	}

	for ( let i = 0, l = langs.length; i < l; i++ ) {
		runTests( langs[ i ] );
	}
}() );
