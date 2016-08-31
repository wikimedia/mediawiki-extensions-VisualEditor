/*!
 * Grunt file
 *
 * @package VisualEditor
 */

require( 'babel-polyfill' );

/*jshint node:true */
module.exports = function ( grunt ) {
	var modules = grunt.file.readJSON( 'lib/ve/build/modules.json' );

	grunt.loadNpmTasks( 'grunt-contrib-copy' );
	grunt.loadNpmTasks( 'grunt-contrib-jshint' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );
	grunt.loadNpmTasks( 'grunt-jsonlint' );
	grunt.loadNpmTasks( 'grunt-banana-checker' );
	grunt.loadNpmTasks( 'grunt-mocha-test' );
	grunt.loadNpmTasks( 'grunt-jscs' );
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
				options: {
					reporter: 'spec',
					timeout: 40000,
					require: [
						function () {
							/* jshint undef:false */
							langs = [ 'en' ];
						}
					]
				},
				src: [ 'build/screenshots.js' ]
			},
			'screenshots-all': {
				options: {
					reporter: 'spec',
					timeout: 40000,
					require: [
						function () {
							/* jshint undef:false */
							langs = require( './build/tasks/screenshotLangs.json' ).langs;
						}
					]
				},
				src: [ 'build/screenshots.js' ]
			}
		},
		tyops: {
			options: {
				typos: 'build/typos.json'
			},
			src: [
				'**/*.{js,json,less,css,txt}',
				'!build/typos.json',
				'!lib/**',
				'!{docs,node_modules,vendor}/**',
				'!.git/**'
			]
		},
		jshint: {
			options: {
				jshintrc: true
			},
			all: [
				'*.js',
				'{.jsduck,build}/**/*.js',
				'modules/**/*.js'
			]
		},
		jscs: {
			fix: {
				options: {
					fix: true
				},
				src: '<%= jshint.all %>'
			},
			main: {
				src: '<%= jshint.all %>'
			}
		},
		stylelint: {
			all: [
				'**/*.css',
				'!coverage/**',
				'!dist/**',
				'!docs/**',
				'!lib/**',
				'!node_modules/**'
			]
		},
		banana: {
			all: [
				'modules/ve-{mw,wmf}/i18n/'
			]
		},
		jsonlint: {
			all: [
				'*.json',
				'**/*.json',
				'!**/node_modules/**',
				'!lib/**'
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
				'.{stylelintrc,jscsrc,jshintignore,jshintrc}',
				'<%= jshint.all %>',
				'<%= stylelint.all %>'
			],
			tasks: 'test'
		}
	} );

	grunt.registerTask( 'git-status', function () {
		var done = this.async();
		// Are there unstaged changes?
		require( 'child_process' ).exec( 'git ls-files --modified', function ( err, stdout, stderr ) {
			var ret = err || stderr || stdout;
			if ( ret ) {
				grunt.log.error( 'Unstaged changes in these files:' );
				grunt.log.error( ret );
				// Show a condensed diff
				require( 'child_process' ).exec( 'git diff -U1 | tail -n +3', function ( err, stdout, stderr ) {
					grunt.log.write( err || stderr || stdout );
					done( false );
				} );
			} else {
				grunt.log.ok( 'No unstaged changes.' );
				done();
			}
		} );
	} );

	grunt.registerTask( 'build', [ 'jsduckcatconfig', 'buildloader' ] );
	grunt.registerTask( 'lint', [ 'tyops', 'jshint', 'jscs:main', 'stylelint', 'jsonlint', 'banana' ] );
	grunt.registerTask( 'fix', [ 'jscs:fix' ] );
	grunt.registerTask( 'test', [ 'build', 'lint' ] );
	grunt.registerTask( 'test-ci', [ 'git-status' ] );
	grunt.registerTask( 'screenshots', [ 'mochaTest:screenshots-en' ] );
	grunt.registerTask( 'screenshots-all', [ 'mochaTest:screenshots-all' ] );
	grunt.registerTask( 'default', 'test' );

	if ( process.env.JENKINS_HOME ) {
		grunt.renameTask( 'test', 'test-internal' );
		grunt.registerTask( 'test', [ 'test-internal', 'test-ci' ] );
	} else {
		grunt.registerTask( 'ci', [ 'test', 'test-ci' ] );
	}
};
