/* jshint node: true */
/* global seleniumUtils, langs */
var i, l, clientSize,
	accessKey = process.env.SAUCE_ONDEMAND_ACCESS_KEY,
	chrome = require( 'selenium-webdriver/chrome' ),
	fs = require( 'fs' ),
	Jimp = require( 'jimp' ),
	test = require( 'selenium-webdriver/testing' ),
	username = process.env.SAUCE_ONDEMAND_USERNAME,
	webdriver = require( 'selenium-webdriver' );

function runTests( lang ) {
	test.describe( 'Screenshots: ' + lang, function () {
		var driver;

		test.beforeEach( function () {
			// Use Sauce Labs when running on Jenins
			if ( process.env.JENKINS_URL ) {
				driver = new webdriver.Builder().withCapabilities( {
						browserName: process.env.BROWSER,
						platform: process.env.PLATFORM,
						username: username,
						accessKey: accessKey
					} ).usingServer( 'http://' + username + ':' + accessKey +
						'@ondemand.saucelabs.com:80/wd/hub' ).build();
			} else {
				// If not running on Jenkins, use local browser
				driver = new chrome.Driver();
			}

			driver.manage().timeouts().setScriptTimeout( 40000 );
			driver.manage().window().setSize( 1200, 1000 );

			driver.get( 'https://en.wikipedia.org/wiki/PageDoesNotExist?veaction=edit&uselang=' + lang );
			driver.wait(
				driver.executeAsyncScript(
					// This function is converted to a string and executed in the browser
					function () {
						var $lastHighlighted,
							done = arguments[ arguments.length - 1 ];

						window.seleniumUtils = {
							getBoundingRect: function ( elements ) {
								var i, l, rect, boundingRect;
								for ( i = 0, l = elements.length; i < l; i++ ) {
									rect = elements[ i ].getBoundingClientRect();
									if ( !boundingRect ) {
										boundingRect = {
											left: rect.left,
											top: rect.top,
											right: rect.right,
											bottom: rect.bottom
										};
									} else {
										boundingRect.left = Math.min( boundingRect.left, rect.left );
										boundingRect.top = Math.min( boundingRect.top, rect.top );
										boundingRect.right = Math.max( boundingRect.right, rect.right );
										boundingRect.bottom = Math.max( boundingRect.bottom, rect.bottom );
									}
								}
								if ( boundingRect ) {
									boundingRect.width = boundingRect.right - boundingRect.left;
									boundingRect.height = boundingRect.bottom - boundingRect.top;
								}
								return boundingRect;
							},
							collapseToolbar: function () {
								ve.init.target.toolbar.items.forEach( function ( group ) {
									if ( group.setActive ) {
										group.setActive( false );
									}
								} );
								ve.init.target.actionsToolbar.items.forEach( function ( group ) {
									if ( group.setActive ) {
										group.setActive( false );
									}
								} );
							},
							highlight: function ( element ) {
								var $element = $( element );
								if ( $lastHighlighted ) {
									$lastHighlighted.css( 'outline', '' );
								}
								$element.css( 'outline', '3px solid #347bff' );
								$lastHighlighted = $element;
							},
							runMenuTask: function ( done, tool, expanded, highlight, extraElements ) {
								var toolGroup = tool.toolGroup;

								seleniumUtils.collapseToolbar();
								toolGroup.setActive( true );
								if ( toolGroup.updateCollapsibleState ) {
									toolGroup.expanded = !!expanded;
									toolGroup.updateCollapsibleState();
								}

								if ( highlight ) {
									seleniumUtils.highlight( tool.$element[ 0 ] );
								}

								setTimeout( function () {
									done(
										seleniumUtils.getBoundingRect( [
											toolGroup.$element[ 0 ],
											toolGroup.$group[ 0 ]
										].concat( extraElements || [] ) )
									);
								} );
							}
						};

						// Suppress welcome dialog
						localStorage.setItem( 've-beta-welcome-dialog', 1 );
						// Suppress user education indicators
						localStorage.setItem( 've-hideusered', 1 );
						mw.hook( 've.activationComplete' ).add( function () {
							var target = ve.init.target,
								surfaceView = target.getSurface().getView();
							// Hide edit notices
							target.actionsToolbar.tools.notices.getPopup().toggle( false );
							// Modify the document to make the save button blue
							// Wait for focus
							surfaceView.once( 'focus', function () {
								target.surface.getModel().getFragment().insertContent( ' ' ).collapseToStart().select();
								// Wait for save button fade
								setTimeout( function () {
									done( { width: window.innerWidth, height: window.innerHeight } );
								}, 100 );
							} );
						} );
					}
				).then( function ( cs ) {
					clientSize = cs;
				} )
			);
		} );

		test.afterEach( function () {
			driver.quit();
		} );

		function runScreenshotTest( name, clientScript, padding ) {
			var filename = './screenshots/' + name + '-' + lang + '.png';

			driver.wait(
				driver.executeAsyncScript( clientScript ).then( function ( rect ) {
					return driver.takeScreenshot().then( function ( base64Image ) {
						var imageBuffer;
						if ( rect ) {
							imageBuffer = new Buffer( base64Image, 'base64' );
							return cropScreenshot( filename, imageBuffer, rect, padding );
						} else {
							fs.writeFile( filename, base64Image, 'base64' );
						}
					} );
				} ),
				40000
			);
		}

		function cropScreenshot( filename, imageBuffer, rect, padding ) {
			var left, top, right, bottom;

			if ( padding === undefined ) {
				padding = 5;
			}

			left = Math.max( 0, rect.left - padding );
			top = Math.max( 0, rect.top - padding );
			right = Math.min( clientSize.width, rect.left + rect.width + padding );
			bottom = Math.min( clientSize.height, rect.top + rect.height + padding );

			return Jimp.read( imageBuffer ).then( function ( jimpImage ) {
				jimpImage
					.crop( left, top, right - left, bottom - top )
					.write( filename );
			} );
		}
		test.it( 'Toolbar & action tools', function () {
			runScreenshotTest( 'VisualEditor_toolbar',
				// This function is converted to a string and executed in the browser
				function () {
					var done = arguments[ arguments.length - 1 ];
					done(
						seleniumUtils.getBoundingRect( [
							ve.init.target.toolbar.$element[ 0 ],
							$( '#ca-nstab-main' )[ 0 ]
						] )
					);
				},
				0
			);
			runScreenshotTest( 'VisualEditor_toolbar_actions',
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
			runScreenshotTest( 'VisualEditor_Citoid_Inspector',
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
		} );
		test.it( 'Tool groups (headings/text style/indentation/insert/page settings)', function () {
			runScreenshotTest( 'VisualEditor_Toolbar_Headings',
				// This function is converted to a string and executed in the browser
				function () {
					seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.toolbar.tools.paragraph );
				}
			);
			runScreenshotTest( 'VisualEditor_Toolbar_Formatting',
				// This function is converted to a string and executed in the browser
				function () {
					seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.toolbar.tools.bold, true );
				}
			);
			runScreenshotTest( 'VisualEditor_Toolbar_Lists_and_indentation',
				// This function is converted to a string and executed in the browser
				function () {
					seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.toolbar.tools.bullet );
				}
			);
			runScreenshotTest( 'VisualEditor_Insert_Menu',
				// This function is converted to a string and executed in the browser
				function () {
					seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.toolbar.tools.media, true );
				}
			);
			runScreenshotTest( 'VisualEditor_Media_Insert_Menu',
				// This function is converted to a string and executed in the browser
				function () {
					seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.toolbar.tools.media, false, true );
				}
			);
			runScreenshotTest( 'VisualEditor_Template_Insert_Menu',
				// This function is converted to a string and executed in the browser
				function () {
					seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.toolbar.tools.transclusion, false, true );
				}
			);
			runScreenshotTest( 'VisualEditor_insert_table',
				// This function is converted to a string and executed in the browser
				function () {
					seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.toolbar.tools.insertTable, false, true );
				}
			);
			runScreenshotTest( 'VisualEditor_Formula_Insert_Menu',
				// This function is converted to a string and executed in the browser
				function () {
					seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.toolbar.tools.math, true, true );
				}
			);
			runScreenshotTest( 'VisualEditor_References_List_Insert_Menu',
				// This function is converted to a string and executed in the browser
				function () {
					seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.toolbar.tools.referencesList, true, true );
				}
			);
			runScreenshotTest( 'VisualEditor_More_Settings',
				// This function is converted to a string and executed in the browser
				function () {
					seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.actionsToolbar.tools.advancedSettings, false, false,
						[ ve.init.target.toolbarSaveButton.$element[ 0 ] ]
					);
				}
			);
			runScreenshotTest( 'VisualEditor_page_settings_item',
				// This function is converted to a string and executed in the browser
				function () {
					seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.actionsToolbar.tools.settings, false, true );
				}
			);
			runScreenshotTest( 'VisualEditor_category_item',
				// This function is converted to a string and executed in the browser
				function () {
					seleniumUtils.runMenuTask( arguments[ arguments.length - 1 ], ve.init.target.actionsToolbar.tools.categories, false, true );
				}
			);
		} );
		test.it( 'Save dialog', function () {
			runScreenshotTest( 'VisualEditor_save_dialog',
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
			runScreenshotTest( 'VisualEditor_Toolbar_SpecialCharacters',
				// This function is converted to a string and executed in the browser
				function () {
					var done = arguments[ arguments.length - 1 ];
					ve.init.target.toolbar.tools.specialCharacter.onSelect();
					setTimeout( function () {
						done(
							seleniumUtils.getBoundingRect( [
								ve.init.target.toolbar.tools.specialCharacter.$element[ 0 ],
								ve.init.target.surface.toolbarDialogs.$element[ 0 ]
							]
						) );
					}, 1000 );
				}
			);
		} );
		test.it( 'Math dialog', function () {
			runScreenshotTest( 'VisualEditor_formula',
				// This function is converted to a string and executed in the browser
				function () {
					var win,
						done = arguments[ arguments.length - 1 ],
						surface = ve.init.target.surface;

					surface.dialogs.once( 'opening', function ( win, opening ) {
						opening.then( function () {
							win.previewElement.once( 'render', function () {
								win.previewElement.$element.find( 'img' ).on( 'load', function () {
									done(
										seleniumUtils.getBoundingRect( [
											win.$frame[ 0 ]
										]
									) );
								} );
							} );
							win.input.setValue( 'E = mc^2' ).moveCursorToEnd();
						} );
					} );
					surface.executeCommand( 'mathDialog' );
					win = surface.dialogs.currentWindow;
				}
			);
		} );
		test.it( 'Reference list dialog', function () {
			runScreenshotTest( 'VisualEditor_references_list',
				// This function is converted to a string and executed in the browser
				function () {
					var win,
						done = arguments[ arguments.length - 1 ],
						surface = ve.init.target.surface;

					surface.dialogs.once( 'opening', function ( win, opening ) {
						opening.then( function () {
							setTimeout( function () {
								done(
									seleniumUtils.getBoundingRect( [
										win.$frame[ 0 ]
									]
								) );
							}, 500 );
						} );
					} );
					surface.executeCommand( 'referencesList' );
					// The first command inserts a reference list instantly, so run again to open the window
					surface.executeCommand( 'referencesList' );
					win = surface.dialogs.currentWindow;
				}
			);
		} );
		test.it( 'Cite button', function () {
			runScreenshotTest( 'VisualEditor_citoid_Cite_button',
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
			runScreenshotTest( 'VisualEditor-link_tool-search_results',
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

for ( i = 0, l = langs.length; i < l; i++ ) {
	runTests( langs[ i ] );
}
