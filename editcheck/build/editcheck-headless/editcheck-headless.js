'use strict';

const { Builder } = require( 'selenium-webdriver' );
const chrome = require( 'selenium-webdriver/chrome' );

/**
 * Read the headless result object from the browser.
 *
 * @param {WebDriver} driver Selenium WebDriver instance
 * @return {Promise<Object|null>} The veEditCheckHeadlessResult object, or null if not yet available
 */
async function readHeadlessResult( driver ) {
	return driver.executeScript(
		'return window.veEditCheckHeadlessResult || null;'
	);
}

/**
 * Read the resolved per-check edit check configs from the browser.
 *
 * @param {WebDriver} driver Selenium WebDriver instance
 * @return {Promise<Object>} Object with either { configs } or { error }
 */
async function readCheckConfigs( driver ) {
	return driver.executeAsyncScript(
		`const callback = arguments[ arguments.length - 1 ];
		if ( typeof window.veEditCheckHeadlessGetConfigs !== 'function' ) {
			callback( { error: 'veEditCheckHeadlessGetConfigs is not available' } );
			return;
		}
		window.veEditCheckHeadlessGetConfigs().then(
			( configs ) => callback( { configs } ),
			( e ) => callback( { error: String( e ) } )
		);`
	);
}

/**
 * Inject progress hooks into the browser.
 *
 * @param {WebDriver} driver Selenium WebDriver instance
 * @return {Promise<void>}
 */
async function injectProgressHooks( driver ) {
	return driver.executeScript( `
		if ( window._veProgressInstalled ) { return; }
		window._veProgressInstalled = true;
		window.veHeadlessProgress = window.veHeadlessProgress || [];
		const progress = ( msg ) => {
			window.veHeadlessProgress.push( { t: Date.now(), msg: msg } );
		};
		if ( typeof mw === 'undefined' ) { progress( 'mw not available' ); return; }
		progress( 'mw available' );
		// Track when the headless loader module begins loading VE modules
		mw.loader.using( 'ext.visualEditor.targetLoader' )
			.then( () => { progress( 'ext.visualEditor.targetLoader loaded' ); } )
			.catch( () => { progress( 'ext.visualEditor.targetLoader failed' ); } );
		mw.loader.using( 'ext.visualEditor.editCheck' )
			.then( () => { progress( 'ext.visualEditor.editCheck loaded' ); } )
			.catch( () => { progress( 'ext.visualEditor.editCheck failed' ); } );
		mw.loader.using( 'ext.visualEditor.editCheck.headless' )
			.then( () => { progress( 'ext.visualEditor.editCheck.headless loaded' ); } )
			.catch( () => { progress( 'ext.visualEditor.editCheck.headless failed' ); } );
	` );
}

/**
 * Drain the client-side progress events.
 *
 * @param {WebDriver} driver Selenium WebDriver instance
 * @return {Promise<Array>} Array of progress events
 */
async function drainClientProgress( driver ) {
	return driver.executeScript(
		'return window.veHeadlessProgress ? window.veHeadlessProgress.splice( 0 ) : [];'
	);
}

/**
 * Start a headless run in the browser.
 *
 * @param {WebDriver} driver Selenium WebDriver instance
 * @param {string} title Page title to check
 * @param {string|null} parsoidHtml Optional Parsoid HTML to use instead of fetching from the server
 * @return {Promise<string>} Request ID for the headless run
 */
async function startBrowserRun( driver, title, parsoidHtml ) {
	return driver.executeScript(
		`if ( typeof window.veEditCheckHeadlessStart !== 'function' ) {
			throw new Error( 'veEditCheckHeadlessStart is not available' );
		}
		return window.veEditCheckHeadlessStart( arguments[0], arguments[1] || null );`,
		title,
		parsoidHtml || null
	);
}

/**
 * Wait for a headless run to complete.
 *
 * @param {WebDriver} driver Selenium WebDriver instance
 * @param {string} requestId Request ID for the headless run
 * @param {number} timeoutMs Timeout in milliseconds
 * @param {Function} progress Progress callback
 * @return {Promise<Object>} Headless result object
 */
async function waitForResult( driver, requestId, timeoutMs, progress ) {
	let lastStatus = null;
	let sawAnyResult = false;

	return driver.wait( async () => {
		const events = await drainClientProgress( driver );
		for ( const event of events ) {
			progress( `[browser] ${ event.msg }`, event.t );
		}

		const result = await readHeadlessResult( driver );
		if ( !result || result.requestId !== requestId ) {
			return false;
		}

		if ( !sawAnyResult ) {
			sawAnyResult = true;
			progress( `Headless result object published for request ${ requestId }` );
		}

		if ( result.status !== lastStatus ) {
			lastStatus = result.status;
			progress( `Headless status [${ requestId }]: ${ result.status }` );
		}

		if ( result.status === 'error' ) {
			throw new Error( result.error || `Headless run failed for request ${ requestId }` );
		}

		return result.status === 'ready' ? result : false;
	}, timeoutMs );
}

/**
 * Headless browser session for running edit checks.
 */
class HeadlessBrowserSession {
	/**
	 * @param {Object} opts Options: scriptPath, timeoutMs, headless,
	 * chromeBinary, restartEveryRequests.
	 */
	constructor( opts ) {
		this.opts = opts;
		this.driver = null;
		// Base URL the persistent page is currently loaded for, or null if no
		// page is loaded yet. Requests re-navigate only when this differs.
		this.currentBaseUrl = null;
		this.runQueue = Promise.resolve();
		this.completedRequests = 0;
	}

	/**
	 * Build Chrome options for the WebDriver.
	 *
	 * @return {chrome.Options} Chrome options
	 */
	buildChromeOptions() {
		const chromeOptions = new chrome.Options();
		chromeOptions.addArguments( '--no-sandbox', '--disable-dev-shm-usage' );
		if ( this.opts.headless ) {
			chromeOptions.addArguments( '--headless=new' );
		}
		if ( this.opts.chromeBinary ) {
			chromeOptions.setChromeBinaryPath( this.opts.chromeBinary );
		}
		return chromeOptions;
	}

	/**
	 * Launch the browser. Does not navigate to any wiki; use navigateTo() or
	 * ensureReady() to load a wiki's headless page.
	 *
	 * @param {Function} [onProgress] Progress callback
	 * @return {Promise<void>}
	 */
	async init( onProgress ) {
		const progress = onProgress || ( () => {} );
		if ( this.driver ) {
			return;
		}

		progress( 'Launching browser' );
		this.driver = await new Builder()
			.forBrowser( 'chrome' )
			.setChromeOptions( this.buildChromeOptions() )
			.build();
		progress( 'Browser launched' );
	}

	/**
	 * Build the persistent headless page URL for a base URL.
	 *
	 * @param {string} baseUrl Wiki base URL (no trailing slash)
	 * @return {string} Full URL of Special:EditCheckHeadless
	 */
	buildPageUrl( baseUrl ) {
		const scriptPath = this.opts.scriptPath.replace( /^\/+|\/+$/g, '' );
		const prefix = scriptPath ? `${ baseUrl }/${ scriptPath }` : baseUrl;
		return `${ prefix }/index.php?title=Special:EditCheckHeadless`;
	}

	/**
	 * Navigate the persistent page to the given wiki, if not already there.
	 *
	 * @param {string} baseUrl Wiki base URL (no trailing slash)
	 * @param {Function} [onProgress] Progress callback
	 * @return {Promise<void>}
	 */
	async navigateTo( baseUrl, onProgress ) {
		const progress = onProgress || ( () => {} );
		if ( !this.driver ) {
			throw new Error( 'Browser session is not initialized' );
		}
		if ( this.currentBaseUrl === baseUrl ) {
			return;
		}

		const url = this.buildPageUrl( baseUrl );
		progress( `Opening persistent headless page: ${ url }` );
		// Clear first so a failed navigation doesn't leave a stale base URL.
		this.currentBaseUrl = null;
		await this.driver.get( url );
		await injectProgressHooks( this.driver );

		await this.driver.wait( async () => this.driver.executeScript(
			'return typeof window.veEditCheckHeadlessStart === "function";'
		), this.opts.timeoutMs );

		this.currentBaseUrl = baseUrl;
		progress( `Persistent browser session is ready for ${ baseUrl }` );
	}

	/**
	 * Ensure the browser is launched and the page is loaded for the given wiki.
	 *
	 * @param {string} baseUrl Wiki base URL (no trailing slash)
	 * @param {Function} [onProgress] Progress callback
	 * @return {Promise<void>}
	 */
	async ensureReady( baseUrl, onProgress ) {
		await this.init( onProgress );
		await this.navigateTo( baseUrl, onProgress );
	}

	/**
	 * Run a single editcheck headless check for the given title.
	 *
	 * @param {string} title The title to check
	 * @param {string} baseUrl Wiki base URL (no trailing slash)
	 * @param {Function} [onProgress] Progress callback
	 * @param {string} [parsoidHtml] Optional Parsoid HTML
	 * @return {Promise<Object>} The result data
	 */
	async runCheck( title, baseUrl, onProgress, parsoidHtml ) {
		const progress = onProgress || ( () => {} );
		const task = async () => {
			let resultData;
			let originalError = null;

			try {
				await this.ensureReady( baseUrl, progress );
				progress( `Submitting headless request for title "${ title }"` );
				const requestId = await startBrowserRun( this.driver, title, parsoidHtml );
				progress( `Waiting for request ${ requestId }` );
				const finalResult = await waitForResult(
					this.driver, requestId, this.opts.timeoutMs, progress
				);
				progress( `Done [${ requestId }]: ${ finalResult.data.suggestionCounts[ '*' ] } suggestions` );
				resultData = finalResult.data;
			} catch ( e ) {
				originalError = e;
			}

			this.completedRequests++;
			if (
				this.opts.restartEveryRequests > 0 &&
				this.completedRequests % this.opts.restartEveryRequests === 0
			) {
				progress( `Restarting browser after ${ this.completedRequests } processed requests` );
				try {
					await this.close( progress );
					// Re-launch and re-warm the page for the wiki we just used, so
					// the next request against the same wiki stays fast.
					await this.ensureReady( baseUrl, progress );
				} catch ( restartError ) {
					if ( !originalError ) {
						throw restartError;
					}
					progress( `Restart failed after request failure: ${ restartError.message }` );
				}
			}

			if ( originalError ) {
				throw originalError;
			}

			return resultData;
		};

		const runPromise = this.runQueue.then( task );
		this.runQueue = runPromise.catch( () => {} );
		return runPromise;
	}

	/**
	 * Read the resolved per-check edit check configs.
	 *
	 * These are independent of any particular page, but do depend on the wiki,
	 * so a base URL is required to load the relevant configuration.
	 *
	 * @param {string} baseUrl Wiki base URL (no trailing slash)
	 * @param {Function} [onProgress] Progress callback
	 * @return {Promise<Object>} Map of check name to config
	 */
	async getConfigs( baseUrl, onProgress ) {
		const progress = onProgress || ( () => {} );
		const task = async () => {
			await this.ensureReady( baseUrl, progress );
			progress( 'Reading edit check configs' );
			const result = await readCheckConfigs( this.driver );
			if ( result && result.error ) {
				throw new Error( result.error );
			}
			return result && result.configs;
		};

		const runPromise = this.runQueue.then( task );
		this.runQueue = runPromise.catch( () => {} );
		return runPromise;
	}

	/**
	 * Close the browser session.
	 *
	 * @param {Function} [onProgress] Progress callback
	 * @return {Promise<void>}
	 */
	async close( onProgress ) {
		const progress = onProgress || ( () => {} );
		if ( !this.driver ) {
			return;
		}
		progress( 'Closing browser session' );
		await this.driver.quit();
		this.driver = null;
		this.currentBaseUrl = null;
	}
}

/**
 * Manages a pool of headless browser sessions.
 *
 * Each "pinned" base URL (from opts.pinnedBaseUrls) gets its own persistent
 * session, pre-loaded at startup and never navigated elsewhere. Any other base
 * URL is served by a single shared fallback session that navigates on demand.
 */
class HeadlessSessionManager {
	/**
	 * @param {Object} opts Session options (scriptPath, timeoutMs, headless,
	 *   chromeBinary, restartEveryRequests) plus `pinnedBaseUrls` (string[]).
	 */
	constructor( opts ) {
		this.opts = opts;
		// baseUrl -> persistent HeadlessBrowserSession
		this.pinned = new Map();
		// Shared session for non-pinned wikis; created lazily on first use.
		this.fallback = null;
	}

	/**
	 * Launch and pre-load a persistent session for each pinned base URL.
	 *
	 * @param {Function} [onProgress] Progress callback
	 * @return {Promise<void>}
	 */
	async init( onProgress ) {
		for ( const baseUrl of this.opts.pinnedBaseUrls || [] ) {
			if ( this.pinned.has( baseUrl ) ) {
				continue;
			}
			const session = new HeadlessBrowserSession( this.opts );
			await session.init( onProgress );
			await session.navigateTo( baseUrl, onProgress );
			this.pinned.set( baseUrl, session );
		}
	}

	/**
	 * Get the session responsible for a base URL: its dedicated pinned session
	 * if one exists, otherwise the shared on-demand fallback session.
	 *
	 * @param {string} baseUrl Wiki base URL (no trailing slash)
	 * @return {HeadlessBrowserSession}
	 */
	getSession( baseUrl ) {
		if ( this.pinned.has( baseUrl ) ) {
			return this.pinned.get( baseUrl );
		}
		if ( !this.fallback ) {
			this.fallback = new HeadlessBrowserSession( this.opts );
		}
		return this.fallback;
	}

	/**
	 * Run an editcheck headless check for the given title on the given wiki.
	 *
	 * @param {string} title The title to check
	 * @param {string} baseUrl Wiki base URL (no trailing slash)
	 * @param {Function} [onProgress] Progress callback
	 * @param {string} [parsoidHtml] Optional Parsoid HTML
	 * @return {Promise<Object>} The result data
	 */
	async runCheck( title, baseUrl, onProgress, parsoidHtml ) {
		return this.getSession( baseUrl ).runCheck( title, baseUrl, onProgress, parsoidHtml );
	}

	/**
	 * Read the resolved per-check edit check configs for the given wiki.
	 *
	 * @param {string} baseUrl Wiki base URL (no trailing slash)
	 * @param {Function} [onProgress] Progress callback
	 * @return {Promise<Object>} Map of check name to config
	 */
	async getConfigs( baseUrl, onProgress ) {
		return this.getSession( baseUrl ).getConfigs( baseUrl, onProgress );
	}

	/**
	 * Close all sessions.
	 *
	 * @param {Function} [onProgress] Progress callback
	 * @return {Promise<void>}
	 */
	async close( onProgress ) {
		const sessions = [ ...this.pinned.values() ];
		if ( this.fallback ) {
			sessions.push( this.fallback );
		}
		for ( const session of sessions ) {
			await session.close( onProgress );
		}
	}
}

/**
 * Create and initialize a headless session manager.
 *
 * @param {Object} opts Options for the manager (see HeadlessSessionManager).
 * @param {Function} [onProgress] Progress callback
 * @return {Promise<HeadlessSessionManager>} The initialized manager.
 */
async function createSessionManager( opts, onProgress ) {
	const manager = new HeadlessSessionManager( opts );
	await manager.init( onProgress );
	return manager;
}

module.exports = {
	createSessionManager
};
