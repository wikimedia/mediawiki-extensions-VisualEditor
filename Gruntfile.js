/*!
 * Grunt file
 *
 * @package VisualEditor
 */

'use strict';

module.exports = function ( grunt ) {
	const conf = grunt.file.readJSON( 'extension.json' ),
		screenshotOptions = {
			reporter: 'spec',
			// TODO: Work out how to catch this timeout and continue.
			// For now just make it very long.
			timeout: 5 * 60 * 1000,
			require: [
				function () {
					global.langs = [ grunt.option( 'lang' ) || 'en' ];
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
					global.langs = require( './build/tasks/screenshotLangs.json' ).langs;
				}
			]
		};

	grunt.loadNpmTasks( 'grunt-banana-checker' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );
	grunt.loadNpmTasks( 'grunt-eslint' );
	grunt.loadNpmTasks( 'grunt-mocha-test' );
	grunt.loadNpmTasks( 'grunt-stylelint' );
	grunt.loadNpmTasks( 'grunt-tyops' );
	grunt.loadTasks( 'lib/ve/build/tasks' );
	grunt.loadTasks( 'build/tasks' );

	const ignores = [
		'.git/**',
		'coverage/**',
		'dist/**',
		'docs/**',
		'node_modules/**',
		'vendor/**'
	];
	grunt.initConfig( {
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
		tyops: {
			options: {
				typos: 'build/typos.json'
			},
			all: {
				ignore: ignores.concat( [
					'build/typos.json',
					'**/package-lock.json',
					'lib/**'
				] ),
				src: [
					'**/*.{js,json,less,css,txt,php,md,sh}',
					// Filter out most i18n files, keep en and qqq
					'!**/i18n/**/*.json',
					'**/i18n/**/en.json',
					'**/i18n/**/qqq.json'
				]
			}
		},
		eslint: {
			options: {
				cache: true,
				fix: grunt.option( 'fix' )
			},
			all: {
				ignore: ignores,
				src: '.'
			}
		},
		stylelint: {
			options: {
				reportNeedlessDisables: true,
				cache: true
			},
			all: {
				ignore: ignores.concat( [
					'lib/**'
				] ),
				src: [
					'**/*.{css,less}'
				]
			}
		},
		banana: conf.MessagesDirs,
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
		require( 'child_process' ).exec( 'git ls-files --modified', ( err, stdout, stderr ) => {
			const ret = err || stderr || stdout;
			if ( ret ) {
				grunt.log.error( 'Unstaged changes in these files:' );
				grunt.log.error( ret );
				// Show a condensed diff
				require( 'child_process' ).exec( 'git diff -U1 | tail -n +3', ( err2, stdout2, stderr2 ) => {
					grunt.log.write( err2 || stderr2 || stdout2 );
					done( false );
				} );
			} else {
				grunt.log.ok( 'No unstaged changes.' );
				done();
			}
		} );
	} );

	grunt.registerTask( 'test', [ 'tyops', 'eslint', 'stylelint', 'banana' ] );
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
