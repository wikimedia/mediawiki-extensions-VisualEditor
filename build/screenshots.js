/* global seleniumUtils */

/* eslint-disable no-console */

( function () {
	'use strict';
	var accessKey = process.env.SAUCE_ONDEMAND_ACCESS_KEY,
		chrome = require( 'selenium-webdriver/chrome' ),
		fs = require( 'fs' ),
		Jimp = require( 'jimp' ),
		username = process.env.SAUCE_ONDEMAND_USERNAME,
		webdriver = require( 'selenium-webdriver' ),
		TIMEOUT = 40 * 1000;

	function createScreenshotEnvironment( test, beforeEach ) {
		var clientSize, driver;

		test.beforeEach( function () {
			var lang = this.currentTest.parent.lang || 'en';

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

			driver.manage().timeouts().setScriptTimeout( TIMEOUT );
			driver.manage().window().setSize( 1200, 1000 );

			driver.get( 'https://en.wikipedia.org/wiki/Help:Sample_page?veaction=edit&uselang=' + lang );
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
								$element.css( 'outline', '2px solid #36c' );
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
						mw.storage.set( 've-beta-welcome-dialog', 1 );
						// Suppress user education indicators
						mw.storage.set( 've-hideusered', 1 );
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
				}, function ( e ) {
					// Log error (timeout)
					console.error( e.message );
				} )
			);
			if ( beforeEach ) {
				driver.manage().timeouts().setScriptTimeout( TIMEOUT );
				driver.wait(
					driver.executeAsyncScript( beforeEach ).then(
						function () {},
						function ( e ) {
							// Log error (timeout)
							console.error( e.message );
						}
					)
				);
			}
		} );

		test.afterEach( function () {
			driver.quit();
		} );

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

		function runScreenshotTest( name, lang, clientScript, padding ) {
			var filename = './screenshots/' + name + '-' + lang + '.png';

			driver.manage().timeouts().setScriptTimeout( TIMEOUT );
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
				}, function ( e ) {
					// Log error (timeout)
					console.error( e );
				} )
			);
		}

		return runScreenshotTest;
	}

	module.exports.createScreenshotEnvironment = createScreenshotEnvironment;
}() );
