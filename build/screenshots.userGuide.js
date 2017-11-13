/* global seleniumUtils, langs */

( function () {
	'use strict';
	var createScreenshotEnvironment = require( './screenshots.js' ).createScreenshotEnvironment,
		test = require( 'selenium-webdriver/testing' ),
		runScreenshotTest = createScreenshotEnvironment( test );

	function runTests( lang ) {

		test.describe( 'Screenshots: ' + lang, function () {
			this.lang = lang;
			test.it( 'Toolbar & action tools', function () {
				runScreenshotTest( 'VisualEditor_toolbar', lang,
					// This function is converted to a string and executed in the browser
					function () {
						var done = arguments[ arguments.length - 1 ];
						// HACK: The test page is on the help namespace, so overwrite the
						// read tab with the nstab-main message.
						new mw.Api().loadMessagesIfMissing( [ 'nstab-main' ], { amenableparser: true } ).then( function () {
							$( '#ca-nstab-help a' ).text( mw.msg( 'nstab-main' ) );
							done(
								seleniumUtils.getBoundingRect( [
									ve.init.target.toolbar.$element[ 0 ],
									$( '#p-namespaces' )[ 0 ]
								] )
							);
						} );
					},
					0
				);
				runScreenshotTest( 'VisualEditor_toolbar_actions', lang,
					// This function is converted to a string and executed in the browser
					function () {
						var done = arguments[ arguments.length - 1 ];
						done(
							seleniumUtils.getBoundingRect( [
								ve.init.target.toolbar.$actions[ 0 ]
							] )
						);
					},
					0
				);
			} );
			test.it( 'Citoid inspector', function () {
				runScreenshotTest( 'VisualEditor_Citoid_Inspector', lang,
					// This function is converted to a string and executed in the browser
					function () {
						var done = arguments[ arguments.length - 1 ],
							surface = ve.init.target.surface;
						ve.init.target.toolbar.tools.citefromid.onSelect();
						setTimeout( function () {
							done(
								seleniumUtils.getBoundingRect( [
									surface.$element.find( '.ve-ce-mwReferenceNode' )[ 0 ],
									surface.context.inspectors.currentWindow.$element[ 0 ]
								] )
							);
						}, 500 );
					}
				);
				runScreenshotTest( 'VisualEditor_Citoid_Inspector_Manual', lang,
					// This function is converted to a string and executed in the browser
					function () {
						var done = arguments[ arguments.length - 1 ],
							surface = ve.init.target.surface;
						ve.init.target.surface.context.inspectors.currentWindow.setModePanel( 'manual' );
						setTimeout( function () {
							done(
								seleniumUtils.getBoundingRect( [
									surface.$element.find( '.ve-ce-mwReferenceNode' )[ 0 ],
									surface.context.inspectors.currentWindow.$element[ 0 ]
								] )
							);
						} );
					}
				);
				runScreenshotTest( 'VisualEditor_Citoid_Inspector_Reuse', lang,
					// This function is converted to a string and executed in the browser
					function () {
						var done = arguments[ arguments.length - 1 ],
							surface = ve.init.target.surface;
						ve.init.target.surface.context.inspectors.currentWindow.setModePanel( 'reuse' );
						setTimeout( function () {
							done(
								seleniumUtils.getBoundingRect( [
									surface.$element.find( '.ve-ce-mwReferenceNode' )[ 0 ],
									surface.context.inspectors.currentWindow.$element[ 0 ]
								] )
							);
						} );
					}
				);
			} );
			test.it( 'Tool groups (headings/text style/indentation/insert/page settings)', function () {
				runScreenshotTest( 'VisualEditor_Toolbar_Headings', lang,
					// This function is converted to a string and executed in the browser
					function () {
						seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.toolbar.tools.paragraph );
					}
				);
				runScreenshotTest( 'VisualEditor_Toolbar_Formatting', lang,
					// This function is converted to a string and executed in the browser
					function () {
						seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.toolbar.tools.bold, true );
					}
				);
				runScreenshotTest( 'VisualEditor_Toolbar_Lists_and_indentation', lang,
					// This function is converted to a string and executed in the browser
					function () {
						seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.toolbar.tools.bullet );
					}
				);
				runScreenshotTest( 'VisualEditor_Insert_Menu', lang,
					// This function is converted to a string and executed in the browser
					function () {
						seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.toolbar.tools.media, true );
					}
				);
				runScreenshotTest( 'VisualEditor_Media_Insert_Menu', lang,
					// This function is converted to a string and executed in the browser
					function () {
						seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.toolbar.tools.media, false, true );
					}
				);
				runScreenshotTest( 'VisualEditor_Template_Insert_Menu', lang,
					// This function is converted to a string and executed in the browser
					function () {
						seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.toolbar.tools.transclusion, false, true );
					}
				);
				runScreenshotTest( 'VisualEditor_insert_table', lang,
					// This function is converted to a string and executed in the browser
					function () {
						seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.toolbar.tools.insertTable, false, true );
					}
				);
				runScreenshotTest( 'VisualEditor_Formula_Insert_Menu', lang,
					// This function is converted to a string and executed in the browser
					function () {
						seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.toolbar.tools.math, true, true );
					}
				);
				runScreenshotTest( 'VisualEditor_References_List_Insert_Menu', lang,
					// This function is converted to a string and executed in the browser
					function () {
						seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.toolbar.tools.referencesList, true, true );
					}
				);
				runScreenshotTest( 'VisualEditor_More_Settings', lang,
					// This function is converted to a string and executed in the browser
					function () {
						seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.actionsToolbar.tools.advancedSettings, false, false,
							[ ve.init.target.toolbarSaveButton.$element[ 0 ] ]
						);
					}
				);
				runScreenshotTest( 'VisualEditor_page_settings_item', lang,
					// This function is converted to a string and executed in the browser
					function () {
						seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.actionsToolbar.tools.settings, false, true );
					}
				);
				runScreenshotTest( 'VisualEditor_category_item', lang,
					// This function is converted to a string and executed in the browser
					function () {
						seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.actionsToolbar.tools.categories, false, true );
					}
				);
			} );
			test.it( 'Save dialog', function () {
				runScreenshotTest( 'VisualEditor_save_dialog', lang,
					// This function is converted to a string and executed in the browser
					function () {
						var done = arguments[ arguments.length - 1 ];
						ve.init.target.toolbarSaveButton.emit( 'click' );
						setTimeout( function () {
							done(
								seleniumUtils.getBoundingRect( [
									ve.init.target.surface.dialogs.currentWindow.$frame[ 0 ]
								] )
							);
						}, 500 );
					}
				);
			} );
			test.it( 'Special character inserter', function () {
				runScreenshotTest( 'VisualEditor_Toolbar_SpecialCharacters', lang,
					// This function is converted to a string and executed in the browser
					function () {
						var done = arguments[ arguments.length - 1 ];
						ve.init.target.toolbar.tools.specialCharacter.onSelect();
						setTimeout( function () {
							done(
								seleniumUtils.getBoundingRect( [
									ve.init.target.toolbar.tools.specialCharacter.$element[ 0 ],
									ve.init.target.surface.toolbarDialogs.$element[ 0 ]
								] )
							);
						}, 1000 );
					}
				);
			} );
			test.it( 'Math dialog', function () {
				runScreenshotTest( 'VisualEditor_formula', lang,
					// This function is converted to a string and executed in the browser
					function () {
						var done = arguments[ arguments.length - 1 ],
							surface = ve.init.target.surface;

						surface.dialogs.once( 'opening', function ( win, opening ) {
							opening.then( function () {
								win.previewElement.once( 'render', function () {
									win.previewElement.$element.find( 'img' ).on( 'load', function () {
										done(
											seleniumUtils.getBoundingRect( [
												win.$frame[ 0 ]
											] )
										);
									} );
								} );
								win.input.setValue( 'E = mc^2' ).moveCursorToEnd();
							} );
						} );
						surface.executeCommand( 'mathDialog' );
					}
				);
			} );
			test.it( 'Reference list dialog', function () {
				runScreenshotTest( 'VisualEditor_references_list', lang,
					// This function is converted to a string and executed in the browser
					function () {
						var done = arguments[ arguments.length - 1 ],
							surface = ve.init.target.surface;

						surface.dialogs.once( 'opening', function ( win, opening ) {
							opening.then( function () {
								setTimeout( function () {
									done(
										seleniumUtils.getBoundingRect( [
											win.$frame[ 0 ]
										] )
									);
								}, 500 );
							} );
						} );
						surface.executeCommand( 'referencesList' );
						// The first command inserts a reference list instantly, so run again to open the window
						surface.executeCommand( 'referencesList' );
					}
				);
			} );
			test.it( 'Cite button', function () {
				runScreenshotTest( 'VisualEditor_citoid_Cite_button', lang,
					// This function is converted to a string and executed in the browser
					function () {
						var done = arguments[ arguments.length - 1 ];

						ve.init.target.$element.css( 'font-size', '250%' );
						setTimeout( function () {
							done(
								seleniumUtils.getBoundingRect( [
									ve.init.target.toolbar.tools.citefromid.$element[ 0 ]
								] )
							);
						} );
					},
					0
				);
			} );
			test.it( 'Link inspector', function () {
				runScreenshotTest( 'VisualEditor-link_tool-search_results', lang,
					// This function is converted to a string and executed in the browser
					function () {
						var done = arguments[ arguments.length - 1 ],
							surface = ve.init.target.surface;

						surface.getModel().getFragment()
							// TODO: i18n this message, the linked word, and the API endpoint of the link inspector
							.insertContent( 'World literature is literature that is read by many people all over' )
							.collapseToStart().select();

						surface.context.inspectors.once( 'opening', function ( win, opening ) {
							opening.then( function () {
								surface.context.inspectors.windows.link.annotationInput.input.requestRequest.then( function () {
									// Wait a while for the images to load using a time guesstimate - as they're background
									// images it's quite tricky to get load events.
									setTimeout( function () {
										done(
											seleniumUtils.getBoundingRect( [
												surface.$element.find( '.ve-ce-linkAnnotation' )[ 0 ],
												surface.context.inspectors.currentWindow.$element[ 0 ]
											] )
										);
									}, 2500 );
								} );
							} );
						} );
						ve.init.target.surface.executeCommand( 'link' );
					}
				);
			} );
		} );
	}

	for ( let i = 0, l = langs.length; i < l; i++ ) {
		runTests( langs[ i ] );
	}
}() );
