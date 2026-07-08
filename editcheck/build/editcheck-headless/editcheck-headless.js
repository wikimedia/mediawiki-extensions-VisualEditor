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
	 * @param {Object} opts Options: baseUrl, scriptPath, timeoutMs, headless,
	 * chromeBinary, restartEveryRequests.
	 */
	constructor( opts ) {
		this.opts = opts;
		this.driver = null;
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
	 * Initialize the browser session.
	 *
	 * @param {Function} [onProgress] Progress callback
	 * @return {Promise<void>}
	 */
	async init( onProgress ) {
		const progress = onProgress || ( () => {} );
		if ( this.driver ) {
			return;
		}

		this.driver = await new Builder()
			.forBrowser( 'chrome' )
			.setChromeOptions( this.buildChromeOptions() )
			.build();

		const initialUrl = `${ this.opts.baseUrl }/${ this.opts.scriptPath }/index.php?title=Special:EditCheckHeadless`;
		progress( `Opening persistent headless page: ${ initialUrl }` );
		await this.driver.get( initialUrl );
		await injectProgressHooks( this.driver );

		await this.driver.wait( async () => this.driver.executeScript(
			'return typeof window.veEditCheckHeadlessStart === "function";'
		), this.opts.timeoutMs );

		progress( 'Persistent browser session is ready' );
	}

	/**
	 * Run a single editcheck headless check for the given title.
	 *
	 * @param {string} title The title to check
	 * @param {Function} [onProgress] Progress callback
	 * @param {string} [parsoidHtml] Optional Parsoid HTML
	 * @return {Promise<Object>} The result data
	 */
	async runCheck( title, onProgress, parsoidHtml ) {
		const progress = onProgress || ( () => {} );
		const task = async () => {
			let resultData;
			let originalError = null;

			if ( !this.driver ) {
				throw new Error( 'Browser session is not initialized' );
			}

			try {
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
					await this.init( progress );
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
	}
}

/**
 * Create a new headless browser session.
 *
 * @param {Object} opts Options for the session.
 * @param {Function} [onProgress] Progress callback
 * @return {Promise<HeadlessBrowserSession>} The created session.
 */
async function createSession( opts, onProgress ) {
	const session = new HeadlessBrowserSession( opts );
	await session.init( onProgress );
	return session;
}

module.exports = {
	createSession
};
