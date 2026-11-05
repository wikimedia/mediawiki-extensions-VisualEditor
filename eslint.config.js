'use strict';

const { defineConfig, globalIgnores } = require( 'eslint/config' );
const globals = require( 'globals' );
const wikimedia = require( 'eslint-config-wikimedia/flat' );
const local = {
	rules: {
		'no-unsanitized-href': require( './lib/ve/build/eslint/no-unsanitized-href' )
	}
};

/**
 * Turn off a set of globals, e.g. those added by an earlier config
 *
 * @param {Object} globalsToRemove
 * @return {Object}
 */
function globalsOff( globalsToRemove ) {
	return Object.fromEntries( Object.keys( globalsToRemove ).map( ( name ) => [ name, 'off' ] ) );
}

// Rules shared across the whole project
const sharedRules = {
	'object-shorthand': [ 'error', 'properties' ]
};

// Shared by modules and tests (was modules/eslint-shared.json)
const sharedConfig = {
	plugins: { local },
	languageOptions: {
		globals: {
			ve: 'readonly',
			VisualEditorSupportCheck: 'readonly',
			unicodeJS: 'readonly',
			RangeFix: 'readonly',
			Papa: 'readonly'
		}
	},
	rules: {
		...sharedRules,
		'local/no-unsanitized-href': 'error',
		'no-jquery/no-append-html': 'error',
		'no-jquery/no-deferred': 'error',
		'no-jquery/no-extend': 'error',
		'no-jquery/no-html': [ 'error', { allowGetOrSet: 'get' } ],
		'no-jquery/no-when': 'error',
		'no-jquery/no-visibility': 'error',
		'security/detect-unsafe-regex': 'off',
		'security/detect-non-literal-regexp': 'off',
		'max-len': 'off',
		'mediawiki/valid-package-file-require': 'warn'
	}
};

// Code which runs in MediaWiki (was modules/.eslintrc.json)
const modulesConfig = [
	...wikimedia( 'client', 'jquery', 'mediawiki' ),
	sharedConfig,
	{
		rules: {
			'no-jquery/no-append-html': 'warn',
			'no-jquery/no-done-fail': 'warn'
		}
	}
];

// QUnit tests (was modules/ve-mw/tests/.eslintrc.json)
const testsConfig = [
	...wikimedia( 'client/common', 'language/es2018', 'mediawiki', 'jquery', 'qunit' ),
	sharedConfig,
	{
		languageOptions: {
			ecmaVersion: 2018,
			globals: {
				sinon: 'readonly'
			}
		},
		rules: {
			'local/no-unsanitized-href': 'off',
			'compat/compat': [
				'error',
				'last 2 chrome versions, last 2 firefox versions'
			],
			indent: 'off',
			'no-jquery/no-html': 'off',
			'no-jquery/no-parse-html-literal': 'off',
			'no-jquery/no-done-fail': 'warn'
		}
	}
];

// Directories with their own config, which other configs don't apply to.
// These were directories with `"root": true` in .eslintrc.json.
const rootDirs = {
	build: [ 'build/**' ],
	screenshotsClient: [ 'build/screenshots-client/**' ],
	editcheckWatcher: [ 'editcheck/build/editcheck-watcher/**' ],
	modules: [ 'modules/**', 'editcheck/modules/**' ],
	tests: [ 'modules/ve-mw/tests/**', 'editcheck/modules/tests/**' ],
	selenium: [ 'tests/selenium/**' ]
};

module.exports = defineConfig( [
	globalIgnores( [
		// Upstream code
		'lib/',

		// Build
		'coverage/',
		'dist/',
		'vendor/',
		'docs/',

		// Language files written automatically by TranslateWiki
		'**/i18n/**/*.json',
		'!**/i18n/**/en.json',
		'!**/i18n/**/qqq.json'
	] ),

	// Gruntfile.js, build scripts, etc.
	{
		ignores: Object.values( rootDirs ).flat(),
		extends: [ wikimedia( 'server' ) ],
		languageOptions: {
			globals: {
				...globals.commonjs,
				...globals.node,
				...globals.mocha
			}
		},
		rules: {
			...sharedRules
		}
	},
	{
		files: rootDirs.build,
		ignores: rootDirs.screenshotsClient,
		extends: [ wikimedia( 'server' ) ],
		languageOptions: {
			globals: {
				langs: 'readonly'
			}
		},
		rules: {
			'max-len': 'off',
			...sharedRules
		}
	},
	{
		files: rootDirs.screenshotsClient,
		extends: modulesConfig,
		languageOptions: {
			globals: {
				seleniumUtils: 'readonly'
			}
		}
	},
	{
		files: rootDirs.editcheckWatcher,
		extends: [ wikimedia( 'server' ) ],
		languageOptions: {
			sourceType: 'module'
		},
		rules: {
			'n/no-missing-import': 'off'
		}
	},

	// Code which runs in MediaWiki
	{
		files: rootDirs.modules,
		ignores: rootDirs.tests,
		extends: modulesConfig
	},
	{
		files: [ 'editcheck/modules/**' ],
		ignores: rootDirs.tests
	},
	{
		files: [ 'modules/ve-mw/preinit/**', 'editcheck/modules/preinit/**' ],
		languageOptions: {
			globals: {
				ve: 'off'
			}
		},
		rules: {
			'no-jquery/no-extend': 'off',
			'no-jquery/no-deferred': 'off',
			'no-jquery/no-when': 'off'
		}
	},
	{
		// Code which also runs in Node
		files: [ 'modules/ve-mw/dm/**' ],
		languageOptions: {
			globals: {
				...globalsOff( globals.browser ),
				...globals[ 'shared-node-browser' ],
				HTMLElement: 'readonly',
				Node: 'readonly',
				document: 'readonly',
				$: 'off'
			}
		},
		rules: {
			// We only need to sanitize rendered DOM nodes, e.g. CE/UI code
			'local/no-unsanitized-href': 'off',
			'no-jquery/no-append-html': 'warn'
		}
	},

	// Tests
	{
		files: rootDirs.tests,
		extends: testsConfig
	},
	{
		files: rootDirs.selenium,
		extends: [ wikimedia( 'selenium' ) ],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				mw: 'readonly',
				ve: 'readonly'
			}
		}
	}
] );
