'use strict';

/* global window, mw */
// window and mw are referenced only inside page.evaluate() callbacks, whose
// bodies are serialised and executed in the browser, not in this Node process.

const { spawn } = require( 'child_process' );
const net = require( 'net' );
// eslint-disable-next-line n/no-missing-require
const puppeteer = require( 'puppeteer-core' );

// Chrome launch flags for headless, rendering-free operation. The edit checks
// run against a detached ve.dm document model, so Chrome never needs to paint,
// use the GPU, decode images, or spin up extra renderer processes.
const CHROME_ARGS = [
	// Sandboxing/shm: required when running as root and to avoid the small
	// /dev/shm found in many containers.
	'--no-sandbox',
	'--disable-dev-shm-usage',
	// Nothing renders, so disable the GPU stack entirely.
	'--disable-gpu',
	'--disable-software-rasterizer',
	'--disable-accelerated-2d-canvas',
	// Suppress image loading/decoding at the Blink level.
	'--blink-settings=imagesEnabled=false',
	// Single same-origin page + its own API requests; collapse to one renderer.
	'--disable-site-isolation-trials',
	'--renderer-process-limit=1',
	// Keep the sole tab running at full speed (headless would throttle it).
	'--disable-background-timer-throttling',
	'--disable-backgrounding-occluded-windows',
	'--disable-renderer-backgrounding',
	// Turn off background chatter, telemetry, crash reporting, auto-updates.
	'--disable-background-networking',
	'--disable-component-update',
	'--disable-domain-reliability',
	'--disable-breakpad',
	'--disable-client-side-phishing-detection',
	'--metrics-recording-only',
	'--no-first-run',
	'--no-default-browser-check',
	'--mute-audio',
	'--disable-extensions',
	'--disable-default-apps',
	'--disable-sync',
	'--disable-hang-monitor',
	'--disable-ipc-flooding-protection',
	'--disable-features=IsolateOrigins,site-per-process,Translate,' +
		'BackForwardCache,MediaRouter,OptimizationHints,AcceptCHFrame'
];

// Nothing renders in the headless page, so resources that only affect
// presentation are pure overhead. Blocking them avoids fetching and decoding
// images, CSS, fonts and media that the edit checks never look at.
const BLOCKED_RESOURCE_TYPES = new Set( [ 'image', 'stylesheet', 'font', 'media' ] );

/**
 * Find a free TCP port on the loopback interface.
 *
 * @return {Promise<number>} An available port number
 */
function getFreePort() {
	return new Promise( ( resolve, reject ) => {
		const srv = net.createServer();
		srv.once( 'error', reject );
		srv.listen( 0, '127.0.0.1', () => {
			const { port } = srv.address();
			srv.close( () => resolve( port ) );
		} );
	} );
}

/**
 * Poll until a TCP port accepts connections, or reject on timeout.
 *
 * @param {string} host Host to connect to
 * @param {number} port Port to connect to
 * @param {number} timeoutMs Maximum time to wait
 * @return {Promise<void>}
 */
function waitForPort( host, port, timeoutMs ) {
	const deadline = Date.now() + timeoutMs;
	return new Promise( ( resolve, reject ) => {
		const attempt = () => {
			const sock = net.connect( port, host );
			sock.once( 'connect', () => {
				sock.destroy();
				resolve();
			} );
			sock.once( 'error', () => {
				sock.destroy();
				if ( Date.now() >= deadline ) {
					reject( new Error( `Timed out waiting for ${ host }:${ port } to accept connections` ) );
				} else {
					setTimeout( attempt, 50 );
				}
			} );
		};
		attempt();
	} );
}

/**
 * Poll an async predicate until it returns a truthy value, or reject on timeout.
 *
 * @param {Function} fn Predicate returning a promise
 * @param {number} timeoutMs Maximum time to wait
 * @param {string} description Included in the timeout error message
 * @param {number} [intervalMs] Delay between attempts (default: 100)
 * @return {Promise<*>} The first truthy value returned by fn
 */
async function pollUntil( fn, timeoutMs, description, intervalMs = 100 ) {
	const deadline = Date.now() + timeoutMs;
	while ( true ) {
		const result = await fn();
		if ( result ) {
			return result;
		}
		if ( Date.now() >= deadline ) {
			throw new Error( `Timed out waiting for ${ description }` );
		}
		await new Promise( ( resolve ) => {
			setTimeout( resolve, intervalMs );
		} );
	}
}

/**
 * Read the headless result object from the browser.
 *
 * @param {Page} page Puppeteer page
 * @return {Promise<Object|null>} The veEditCheckHeadlessResult object, or null if not yet available
 */
async function readHeadlessResult( page ) {
	return page.evaluate( () => window.veEditCheckHeadlessResult || null );
}

/**
 * Read the resolved per-check edit check configs from the browser.
 *
 * @param {Page} page Puppeteer page
 * @return {Promise<Object>} Object with either { configs } or { error }
 */
async function readCheckConfigs( page ) {
	return page.evaluate( async () => {
		if ( typeof window.veEditCheckHeadlessGetConfigs !== 'function' ) {
			return { error: 'veEditCheckHeadlessGetConfigs is not available' };
		}
		try {
			return { configs: await window.veEditCheckHeadlessGetConfigs() };
		} catch ( e ) {
			return { error: String( e ) };
		}
	} );
}

/**
 * Inject progress hooks into the browser.
 *
 * @param {Page} page Puppeteer page
 * @return {Promise<void>}
 */
async function injectProgressHooks( page ) {
	return page.evaluate( () => {
		if ( window.veProgressInstalled ) {
			return;
		}
		window.veProgressInstalled = true;
		window.veHeadlessProgress = window.veHeadlessProgress || [];
		const progress = ( msg ) => {
			window.veHeadlessProgress.push( { t: Date.now(), msg: msg } );
		};
		if ( typeof mw === 'undefined' ) {
			progress( 'mw not available' );
			return;
		}
		progress( 'mw available' );
		// Track when the headless loader module begins loading VE modules
		mw.loader.using( 'ext.visualEditor.targetLoader' )
			.then( () => {
				progress( 'ext.visualEditor.targetLoader loaded' );
			} )
			.catch( () => {
				progress( 'ext.visualEditor.targetLoader failed' );
			} );
		mw.loader.using( 'ext.visualEditor.editCheck' )
			.then( () => {
				progress( 'ext.visualEditor.editCheck loaded' );
			} )
			.catch( () => {
				progress( 'ext.visualEditor.editCheck failed' );
			} );
		mw.loader.using( 'ext.visualEditor.editCheck.headless' )
			.then( () => {
				progress( 'ext.visualEditor.editCheck.headless loaded' );
			} )
			.catch( () => {
				progress( 'ext.visualEditor.editCheck.headless failed' );
			} );
	} );
}

/**
 * Abort requests for resources that only affect presentation (images, CSS,
 * fonts, media), leaving the document, scripts and API/XHR traffic that the
 * edit checks actually depend on.
 *
 * @param {Page} page Puppeteer page
 * @return {Promise<void>}
 */
async function blockNonScriptResources( page ) {
	await page.setRequestInterception( true );
	page.on( 'request', ( req ) => {
		if ( BLOCKED_RESOURCE_TYPES.has( req.resourceType() ) ) {
			req.abort();
		} else {
			req.continue();
		}
	} );
}

/**
 * Drain the client-side progress events.
 *
 * @param {Page} page Puppeteer page
 * @return {Promise<Array>} Array of progress events
 */
async function drainClientProgress( page ) {
	return page.evaluate(
		() => ( window.veHeadlessProgress ? window.veHeadlessProgress.splice( 0 ) : [] )
	);
}

/**
 * Start a headless run in the browser.
 *
 * @param {Page} page Puppeteer page
 * @param {string} title Page title to check
 * @param {string|null} parsoidHtml Optional Parsoid HTML to use instead of fetching from the server
 * @return {Promise<string>} Request ID for the headless run
 */
async function startBrowserRun( page, title, parsoidHtml ) {
	return page.evaluate( ( t, html ) => {
		if ( typeof window.veEditCheckHeadlessStart !== 'function' ) {
			throw new Error( 'veEditCheckHeadlessStart is not available' );
		}
		return window.veEditCheckHeadlessStart( t, html || null );
	}, title, parsoidHtml || null );
}

/**
 * Wait for a headless run to complete.
 *
 * @param {Page} page Puppeteer page
 * @param {string} requestId Request ID for the headless run
 * @param {number} timeoutMs Timeout in milliseconds
 * @param {Function} progress Progress callback
 * @return {Promise<Object>} Headless result object
 */
async function waitForResult( page, requestId, timeoutMs, progress ) {
	let lastStatus = null;
	let sawAnyResult = false;
	const deadline = Date.now() + timeoutMs;

	while ( true ) {
		const events = await drainClientProgress( page );
		for ( const event of events ) {
			progress( `[browser] ${ event.msg }`, event.t );
		}

		const result = await readHeadlessResult( page );
		if ( result && result.requestId === requestId ) {
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

			if ( result.status === 'ready' ) {
				return result;
			}
		}

		if ( Date.now() >= deadline ) {
			throw new Error( `Timed out waiting for request ${ requestId }` );
		}
		await new Promise( ( resolve ) => {
			setTimeout( resolve, 100 );
		} );
	}
}

/**
 * Headless browser session for running edit checks.
 *
 * A session drives a headless browser over CDP with puppeteer-core. Two engines
 * are supported: Chrome (the default), launched directly by puppeteer, and
 * Lightpanda, a lightweight rendering-free browser spawned as a dedicated
 * `lightpanda serve` child process. Neither ever needs to paint: the edit checks
 * run against a detached ve.dm document model, which only requires the
 * JavaScript engine and resource loading.
 */
class HeadlessBrowserSession {
	/**
	 * @param {Object} opts Options: engine ('chrome' or 'lightpanda'), scriptPath,
	 *   timeoutMs, restartEveryRequests, lightpandaBinary, lightpandaHost,
	 *   chromeBinary.
	 */
	constructor( opts ) {
		this.opts = opts;
		this.engine = opts.engine || 'chrome';
		// The spawned `lightpanda serve` child process, or null (Chrome, or not
		// running). Chrome is launched directly by puppeteer, so has no such handle.
		this.serverProc = null;
		// The puppeteer Browser/BrowserContext/Page connected to it, or null when
		// not connected.
		this.browser = null;
		this.context = null;
		this.page = null;
		// Base URL the persistent page is currently loaded for, or null if no
		// page is loaded yet. Requests re-navigate only when this differs.
		this.currentBaseUrl = null;
		this.runQueue = Promise.resolve();
		this.completedRequests = 0;
	}

	/**
	 * Spawn Lightpanda and wait for its CDP endpoint to become reachable.
	 *
	 * @param {Function} progress Progress callback
	 * @return {Promise<string>} The CDP WebSocket endpoint URL
	 */
	async launchLightpanda( progress ) {
		const host = this.opts.lightpandaHost || '127.0.0.1';
		const port = await getFreePort();
		const binary = this.opts.lightpandaBinary || 'lightpanda';

		progress( `Launching Lightpanda (${ binary }) on ${ host }:${ port }` );
		const proc = spawn(
			binary,
			[ 'serve', '--host', host, '--port', String( port ) ],
			{ stdio: [ 'ignore', 'pipe', 'pipe' ] }
		);
		this.serverProc = proc;

		// Keep the tail of stderr so a startup failure can be reported usefully.
		let stderrTail = '';
		proc.stderr.on( 'data', ( chunk ) => {
			stderrTail = ( stderrTail + chunk ).slice( -2000 );
		} );

		// Race "port is listening" against "process died during startup". The
		// failure listeners are removed once we're up so they don't fire on a
		// later, expected exit during close().
		let onError, onExit;
		const startupFailed = new Promise( ( resolve, reject ) => {
			onError = ( err ) => reject(
				new Error( `Failed to launch Lightpanda '${ binary }': ${ err.message }` )
			);
			onExit = ( code, signal ) => reject( new Error(
				`Lightpanda exited during startup (code=${ code }, signal=${ signal })` +
				( stderrTail.trim() ? `: ${ stderrTail.trim() }` : '' )
			) );
			proc.once( 'error', onError );
			proc.once( 'exit', onExit );
		} );
		// startupFailed only ever rejects; swallow it if the race is won by the
		// ready promise so it doesn't surface as an unhandled rejection.
		startupFailed.catch( () => {} );

		try {
			await Promise.race( [
				waitForPort( host, port, this.opts.timeoutMs ),
				startupFailed
			] );
		} finally {
			proc.removeListener( 'error', onError );
			proc.removeListener( 'exit', onExit );
		}

		return `ws://${ host }:${ port }`;
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
		if ( this.browser ) {
			return;
		}

		if ( this.engine === 'chrome' ) {
			progress( `Launching Chrome (${ this.opts.chromeBinary || 'system channel' })` );
			this.browser = await puppeteer.launch( {
				executablePath: this.opts.chromeBinary || undefined,
				// Let puppeteer locate an installed Chrome when no path is given.
				channel: this.opts.chromeBinary ? undefined : 'chrome',
				headless: true,
				// No viewport is needed; nothing renders.
				defaultViewport: null,
				args: CHROME_ARGS
			} );
		} else {
			const wsEndpoint = await this.launchLightpanda( progress );
			this.browser = await puppeteer.connect( {
				browserWSEndpoint: wsEndpoint,
				// No viewport is needed; nothing renders.
				defaultViewport: null
			} );
		}

		// Both engines serve pages from an explicit browser context. For Lightpanda
		// this is required: reusing the default page (browser.pages()[0]) fails with
		// "BrowserContextNotLoaded" and leaves navigation hanging.
		this.context = await this.browser.createBrowserContext();
		this.page = await this.context.newPage();

		if ( this.engine === 'chrome' ) {
			await blockNonScriptResources( this.page );
		}

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
		if ( !this.page ) {
			throw new Error( 'Browser session is not initialized' );
		}
		if ( this.currentBaseUrl === baseUrl ) {
			return;
		}

		const url = this.buildPageUrl( baseUrl );
		progress( `Opening persistent headless page: ${ url }` );
		// Clear first so a failed navigation doesn't leave a stale base URL.
		this.currentBaseUrl = null;
		await this.page.goto( url, {
			waitUntil: 'domcontentloaded',
			timeout: this.opts.timeoutMs
		} );
		await injectProgressHooks( this.page );

		await pollUntil(
			() => this.page.evaluate(
				() => typeof window.veEditCheckHeadlessStart === 'function'
			),
			this.opts.timeoutMs,
			'the headless loader to initialise'
		);

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
				const requestId = await startBrowserRun( this.page, title, parsoidHtml );
				progress( `Waiting for request ${ requestId }` );
				const finalResult = await waitForResult(
					this.page, requestId, this.opts.timeoutMs, progress
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
			const result = await readCheckConfigs( this.page );
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
	 * Close the browser session. For Chrome this closes the launched browser
	 * process; for Lightpanda it disconnects the CDP client and terminates the
	 * spawned `lightpanda serve` process.
	 *
	 * @param {Function} [onProgress] Progress callback
	 * @return {Promise<void>}
	 */
	async close( onProgress ) {
		const progress = onProgress || ( () => {} );
		if ( !this.browser && !this.serverProc ) {
			return;
		}
		progress( 'Closing browser session' );

		try {
			if ( this.page ) {
				await this.page.close();
			}
			if ( this.context ) {
				await this.context.close();
			}
		} catch ( e ) {
			// Ignore: we are tearing down anyway.
		}

		if ( this.serverProc ) {
			// Lightpanda: disconnect the CDP client, then stop the process we
			// spawned (disconnect() alone leaves it running).
			try {
				if ( this.browser ) {
					await this.browser.disconnect();
				}
			} catch ( e ) {
				// Ignore.
			}
			const proc = this.serverProc;
			this.serverProc = null;
			// Check the process hasn't crashed already (otherwise there will
			// be no exit event to wait for).
			if ( proc.exitCode === null && proc.signalCode === null ) {
				await new Promise( ( resolve ) => {
					const killTimer = setTimeout( () => {
						proc.kill( 'SIGKILL' );
					}, 2000 );
					killTimer.unref();
					proc.once( 'exit', () => {
						clearTimeout( killTimer );
						resolve();
					} );
					proc.kill( 'SIGTERM' );
				} );
			}
		} else if ( this.browser ) {
			// Chrome: close() terminates the browser process puppeteer launched.
			try {
				await this.browser.close();
			} catch ( e ) {
				// Ignore.
			}
		}

		this.browser = null;
		this.context = null;
		this.page = null;
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
	 * @param {Object} opts Session options (scriptPath, timeoutMs,
	 *   restartEveryRequests, lightpandaBinary, lightpandaHost) plus
	 *   `pinnedBaseUrls` (string[]).
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
