/*!
 * Grunt file
 *
 * @package VisualEditor
 */

'use strict';

module.exports = function ( grunt ) {
	const modules = grunt.file.readJSON( 'lib/ve/build/modules.json' ),
		screenshotOptions = {
			reporter: 'spec',
			// TODO: Work out how to catch this timeout and continue.
			// For now just make it very long.
			timeout: 5 * 60 * 1000,
			require: [
				function () {
					// eslint-disable-next-line no-undef
					langs = [ grunt.option( 'lang' ) || 'en' ];
				}
			]
		},
		screenshotOptionsAll = {
			reporter: 'spec',
			// TODO: Work out how to catch this timeout and continue.
			// For now just make it very long.
			timeout: 5 * 60 * 1000,
			require: [
				function () {
					// eslint-disable-next-line no-undef
					langs = require( './build/tasks/screenshotLangs.json' ).langs;
				}
			]
		};

	grunt.loadNpmTasks( 'grunt-banana-checker' );
	grunt.loadNpmTasks( 'grunt-contrib-copy' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );
	grunt.loadNpmTasks( 'grunt-eslint' );
	grunt.loadNpmTasks( 'grunt-image' );
	grunt.loadNpmTasks( 'grunt-mocha-test' );
	grunt.loadNpmTasks( 'grunt-stylelint' );
	grunt.loadNpmTasks( 'grunt-tyops' );
	grunt.loadTasks( 'lib/ve/build/tasks' );
	grunt.loadTasks( 'build/tasks' );

	grunt.initConfig( {
		jsduckcatconfig: {
			main: {
				target: '.jsduck/categories.json',
				from: [
					'.jsduck/mw-categories.json',
					{
						file: 'lib/ve/.jsduck/categories.json',
						aggregate: {
							'VisualEditor (core)': [
								'General',
								'Initialization',
								'DataModel',
								'ContentEditable',
								'User Interface',
								'Tests'
							]
						},
						include: [ 'UnicodeJS', 'OOjs UI', 'Upstream' ]
					}
				]
			}
		},
		buildloader: {
			egiframe: {
				targetFile: '.jsduck/eg-iframe.html',
				template: '.jsduck/eg-iframe.html.template',
				modules: modules,
				load: [ 'visualEditor.desktop.standalone' ],
				pathPrefix: 'lib/ve/',
				indent: '\t\t'
			}
		},
		mochaTest: {
			'screenshots-en': {
				options: screenshotOptions,
				src: [ 'build/screenshots.userGuide.js' ]
			},
			'screenshots-all': {
				options: screenshotOptionsAll,
				src: [ 'build/screenshots.userGuide.js' ]
			},
			'diff-screenshots-en': {
				options: screenshotOptions,
				src: [ 'build/screenshots.diffs.js' ]
			},
			'diff-screenshots-all': {
				options: screenshotOptionsAll,
				src: [ 'build/screenshots.diffs.js' ]
			}
		},
		image: {
			pngs: {
				options: {
					zopflipng: true,
					pngout: true,
					optipng: true,
					advpng: true,
					pngcrush: true
				},
				'screenshots-en': {
					expand: true,
					src: 'screenshots/*-en.png'
				},
				'screenshots-all': {
					expand: true,
					src: 'screenshots/*.png'
				}
			},
			svgs: {
				options: {
					svgo: [
						'--pretty',
						'--enable=removeRasterImages',
						'--enable=sortAttrs',
						'--disable=cleanupIDs',
						'--disable=removeDesc',
						'--disable=removeTitle',
						'--disable=removeViewBox',
						'--disable=removeXMLProcInst'
					]
				},
				expand: true,
				src: 'images/*.svg'
			}
		},
		tyops: {
			options: {
				typos: 'build/typos.json'
			},
			src: [
				'**/*.{js,json,less,css,txt,php}',
				'!package-lock.json',
				'!build/typos.json',
				'!i18n/**',
				'!lib/**',
				'!{docs,node_modules,vendor}/**',
				'!.git/**'
			]
		},
		eslint: {
			options: {
				cache: true,
				fix: grunt.option( 'fix' )
			},
			all: [ '.' ]
		},
		stylelint: {
			options: {
				reportNeedlessDisables: true,
				cache: true
			},
			all: [
				'**/*.{css,less}',
				'!coverage/**',
				'!dist/**',
				'!docs/**',
				'!lib/**',
				'!node_modules/**',
				'!vendor/**'
			]
		},
		banana: {
			all: [
				'i18n/{ve-mw,ve-mw/api,ve-wmf}'
			]
		},
		copy: {
			jsduck: {
				src: 'lib/ve/**/*',
				dest: 'docs/',
				expand: true
			}
		},
		watch: {
			files: [
				'.{stylelintrc,eslintrc}.json',
				'<%= eslint.all %>',
				'<%= stylelint.all %>'
			],
			tasks: 'test'
		}
	} );

	grunt.registerTask( 'git-status', function () {
		const done = this.async();
		// Are there unstaged changes?
		require( 'child_process' ).exec( 'git ls-files --modified', function ( err, stdout, stderr ) {
			const ret = err || stderr || stdout;
			if ( ret ) {
				grunt.log.error( 'Unstaged changes in these files:' );
				grunt.log.error( ret );
				// Show a condensed diff
				require( 'child_process' ).exec( 'git diff -U1 | tail -n +3', function ( err2, stdout2, stderr2 ) {
					grunt.log.write( err2 || stderr2 || stdout2 );
					done( false );
				} );
			} else {
				grunt.log.ok( 'No unstaged changes.' );
				done();
			}
		} );
	} );

	grunt.registerTask( 'build', [ 'jsduckcatconfig', 'buildloader' ] );
	grunt.registerTask( 'lint', [ 'tyops', 'eslint', 'stylelint', 'banana' ] );
	grunt.registerTask( 'test', [ 'build', 'lint' ] );
	grunt.registerTask( 'test-ci', [ 'git-status' ] );
	grunt.registerTask( 'screenshots', [ 'mochaTest:screenshots-en', 'image:pngs' ] );
	grunt.registerTask( 'screenshots-all', [ 'mochaTest:screenshots-all', 'image:pngs' ] );
	grunt.registerTask( 'default', 'test' );

	if ( process.env.JENKINS_HOME ) {
		grunt.renameTask( 'test', 'test-internal' );
		grunt.registerTask( 'test', [ 'test-internal', 'test-ci' ] );
	} else {
		grunt.registerTask( 'ci', [ 'test', 'image:svgs', 'test-ci' ] );
	}
};
