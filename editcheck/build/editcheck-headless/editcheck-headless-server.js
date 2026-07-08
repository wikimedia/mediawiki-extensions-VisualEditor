#!/usr/bin/env node
'use strict';

const http = require( 'http' );
// eslint-disable-next-line n/no-missing-require
const { getInstance, teardown } = require( '@wikimedia/service-utils' );
const { createSessionManager } = require( './editcheck-headless' );
const {
	fetchDbnameMap,
	resolveWiki
} = require( './editcheck-headless-sitematrix' );

function printUsage() {
	console.error( 'Usage:' );
	console.error( '  node editcheck/build/editcheck-headless/editcheck-headless-server.js [options]' );
	console.error( '' );
	console.error( 'Server options:' );
	console.error( '  --wikis <list>         Comma-separated list of wikis to give a' );
	console.error( '                         dedicated persistent session; each is a' );
	console.error( '                         base URL (https://…) or dbname (e.g. enwiki).' );
	console.error( '                         Requests for any other wiki are served by a' );
	console.error( '                         single shared on-demand session. Optional.' );
	console.error( '  --script-path <path>   Script path (default: /w)' );
	console.error( '  --sitematrix-url <url> MediaWiki API endpoint for dbname resolution' );
	console.error( '                         (default: metawiki api.php)' );
	console.error( '  --timeout-ms <ms>      Max wait per request (default: 90000)' );
	console.error( '  --restart-every-requests <n> Restart Chrome after every N processed requests (default: 100, 0 = disabled)' );
	console.error( '  --headed               Run Chrome with a visible window (default: headless)' );
	console.error( '  --chrome-binary <path> Optional Chrome/Chromium binary path' );
	console.error( '  --port <port>          HTTP port to listen on (default: 3000)' );
	console.error( '  --host <host>          Host/address to bind to (default: 127.0.0.1)' );
	console.error( '' );
	console.error( 'API ("wiki" is a base URL or dbname, and is always required):' );
	console.error( '  GET  /check?title=<title>&wiki=<url|dbname>' );
	console.error( '  POST /check  body: { "title": "<title>", "wiki": "<url|dbname>", "parsoidHtml": "<html...>" }' );
	console.error( '  GET  /config?wiki=<url|dbname>' );
	console.error( '' );
}

/**
 * Parse CLI arguments
 *
 * Recognised flags: --wikis, --script-path, --sitematrix-url, --timeout-ms,
 * --headed, --chrome-binary, --restart-every-requests, --port, --host.
 *
 * @param {string[]} argv Arguments (typically process.argv.slice( 2 )).
 * @return {Object} Parsed options.
 */
function parseArgs( argv ) {
	const opts = {
		wikis: process.env.MW_WIKIS || '',
		scriptPath: process.env.MW_SCRIPT_PATH || '/w',
		sitematrixUrl: process.env.MW_SITEMATRIX_URL,
		timeoutMs: 90000,
		headless: true,
		chromeBinary: '',
		restartEveryRequests: 100,
		port: 3000,
		host: '127.0.0.1'
	};

	for ( let i = 0; i < argv.length; i++ ) {
		const arg = argv[ i ];

		if ( arg === '--headed' ) {
			opts.headless = false;
			continue;
		}

		if ( !arg.startsWith( '--' ) ) {
			throw new Error( `Unexpected argument: ${ arg }` );
		}

		const [ key, inlineValue ] = arg.split( '=', 2 );
		const value = inlineValue !== undefined ? inlineValue : argv[ ++i ];

		if ( value === undefined || value.startsWith( '--' ) ) {
			throw new Error( `Missing value for ${ key }` );
		}

		switch ( key ) {
			case '--wikis':
				opts.wikis = value;
				break;
			case '--script-path':
				opts.scriptPath = value;
				break;
			case '--sitematrix-url':
				opts.sitematrixUrl = value;
				break;
			case '--timeout-ms':
				opts.timeoutMs = Number( value );
				break;
			case '--chrome-binary':
				opts.chromeBinary = value;
				break;
			case '--restart-every-requests':
				opts.restartEveryRequests = Number( value );
				break;
			case '--port':
				opts.port = Number( value );
				break;
			case '--host':
				opts.host = value;
				break;
			default:
				throw new Error( `Unknown option: ${ key }` );
		}
	}

	if ( Number.isNaN( opts.timeoutMs ) || opts.timeoutMs < 1 ) {
		throw new Error( '--timeout-ms must be a positive number' );
	}
	if ( Number.isNaN( opts.restartEveryRequests ) || opts.restartEveryRequests < 0 ||
		!Number.isInteger( opts.restartEveryRequests ) ) {
		throw new Error( '--restart-every-requests must be a non-negative integer' );
	}
	if ( Number.isNaN( opts.port ) || opts.port < 1 || opts.port > 65535 ) {
		throw new Error( '--port must be a valid port number (1-65535)' );
	}

	return opts;
}

/**
 * Read and parse the request body as JSON.
 * Rejects if the body is larger than 10 MiB or cannot be parsed.
 *
 * @param {http.IncomingMessage} req
 * @return {Promise<object>}
 */
function readJsonBody( req ) {
	return new Promise( ( resolve, reject ) => {
		const MAX_BYTES = 10 * 1024 * 1024;
		let bytes = 0;
		const chunks = [];

		req.on( 'data', ( chunk ) => {
			bytes += chunk.length;
			if ( bytes > MAX_BYTES ) {
				req.destroy();
				reject( new Error( 'Request body too large' ) );
				return;
			}
			chunks.push( chunk );
		} );

		req.on( 'end', () => {
			try {
				resolve( JSON.parse( Buffer.concat( chunks ).toString( 'utf8' ) ) );
			} catch ( e ) {
				reject( new Error( 'Invalid JSON body' ) );
			}
		} );

		req.on( 'error', reject );
	} );
}

/**
 * Set permissive CORS headers on a response.
 *
 * @param {http.ServerResponse} res
 */
function setCorsHeaders( res ) {
	res.setHeader( 'Access-Control-Allow-Origin', '*' );
	res.setHeader( 'Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS' );
	res.setHeader( 'Access-Control-Allow-Headers', 'Content-Type' );
	res.setHeader( 'Access-Control-Max-Age', '86400' );
}

/**
 * Send a JSON response.
 *
 * @param {http.ServerResponse} res
 * @param {number} statusCode
 * @param {Object} data
 */
function sendJson( res, statusCode, data ) {
	const body = JSON.stringify( data, null, '\t' );
	setCorsHeaders( res );
	res.writeHead( statusCode, {
		'Content-Type': 'application/json; charset=utf-8',
		'Content-Length': Buffer.byteLength( body )
	} );
	res.end( body );
}

/**
 * Send an error response as JSON.
 *
 * @param {http.ServerResponse} res
 * @param {number} statusCode
 * @param {string} message
 */
function sendError( res, statusCode, message ) {
	sendJson( res, statusCode, { error: message } );
}

/**
 * Create a timed logger.
 *
 * @param {string} prefix
 * @param {Object} serviceLogger
 * @return {Function} log function
 */
function createTimedLogger( prefix, serviceLogger ) {
	const startTime = Date.now();
	let lastTime = startTime;

	return function log( message, timestamp ) {
		const now = typeof timestamp === 'number' ? Math.max( timestamp, lastTime ) : Date.now();
		const sinceStart = now - startTime;
		const delta = now - lastTime;
		lastTime = now;
		serviceLogger.info( `[${ prefix }] [progress ${ sinceStart }ms (+${ delta }ms)] ${ message }` );
	};
}

/**
 * Create a request handler for the headless session manager.
 *
 * @param {HeadlessSessionManager} sessionManager
 * @param {Object} serviceLogger
 * @param {Object} dbnameMap Map of wiki dbname to base URL
 * @return {Function} request handler
 */
function makeHandler( sessionManager, serviceLogger, dbnameMap ) {
	/**
	 * Resolve the wiki for a request to a base URL. Throws (→ 400) if "wiki" is
	 * missing or a dbname cannot be resolved.
	 *
	 * @param {string|null|undefined} wiki Per-request wiki (URL or dbname)
	 * @return {string} Base URL
	 */
	const resolveRequestWiki = ( wiki ) => resolveWiki( wiki, dbnameMap );

	return async function handler( req, res ) {
		const parsedUrl = new URL( req.url, `http://${ req.headers.host || 'localhost' }` );
		serviceLogger.info( `[request] ${ req.method } ${ parsedUrl.pathname }${ parsedUrl.search }` );

		// Answer CORS preflight requests before any routing.
		if ( req.method === 'OPTIONS' ) {
			setCorsHeaders( res );
			res.writeHead( 204 );
			res.end();
			return;
		}

		if ( parsedUrl.pathname === '/config' ) {
			if ( req.method !== 'GET' && req.method !== 'HEAD' ) {
				serviceLogger.info( `[request] ${ req.method } ${ parsedUrl.pathname } -> 405` );
				setCorsHeaders( res );
				res.writeHead( 405, { Allow: 'GET, HEAD' } );
				res.end();
				return;
			}
			let configBaseUrl;
			try {
				configBaseUrl = resolveRequestWiki( parsedUrl.searchParams.get( 'wiki' ) );
			} catch ( e ) {
				serviceLogger.info( `[request] ${ req.method } ${ parsedUrl.pathname } -> 400 ${ e.message }` );
				sendError( res, 400, e.message );
				return;
			}
			const configLog = createTimedLogger( 'config', serviceLogger );
			try {
				configLog( `Reading edit check configs for ${ configBaseUrl }` );
				const configs = await sessionManager.getConfigs(
					configBaseUrl,
					( msg, timestamp ) => {
						configLog( msg, timestamp );
					}
				);
				configLog( 'Sending response' );
				sendJson( res, 200, configs );
			} catch ( e ) {
				serviceLogger.error( `[error "config"] ${ e && e.stack ? e.stack : String( e ) }` );
				sendError( res, 500, e.message || 'Internal error reading configs' );
			}
			return;
		}

		if ( parsedUrl.pathname !== '/check' ) {
			serviceLogger.info( `[request] ${ req.method } ${ parsedUrl.pathname } -> 404` );
			sendError( res, 404, 'Not found. Use GET /check?title=..., POST /check, or GET /config.' );
			return;
		}

		let title;
		let wiki;
		let parsoidHtml = null;

		if ( req.method === 'GET' || req.method === 'HEAD' ) {
			title = parsedUrl.searchParams.get( 'title' );
			wiki = parsedUrl.searchParams.get( 'wiki' );
		} else if ( req.method === 'POST' ) {
			let body;
			try {
				body = await readJsonBody( req );
			} catch ( e ) {
				sendError( res, 400, e.message );
				return;
			}
			if ( typeof body !== 'object' || body === null ) {
				sendError( res, 400, 'JSON body must be an object' );
				return;
			}
			title = body.title;
			wiki = body.wiki !== undefined ? body.wiki : parsedUrl.searchParams.get( 'wiki' );
			if ( body.parsoidHtml !== undefined ) {
				if ( typeof body.parsoidHtml !== 'string' || body.parsoidHtml.trim() === '' ) {
					sendError( res, 400, '"parsoidHtml" must be a non-empty string when provided' );
					return;
				}
				parsoidHtml = body.parsoidHtml.trim();
			}
		} else {
			serviceLogger.info( `[request] ${ req.method } ${ parsedUrl.pathname } -> 405` );
			setCorsHeaders( res );
			res.writeHead( 405, { Allow: 'GET, HEAD, POST' } );
			res.end();
			return;
		}

		if ( typeof title !== 'string' || title.trim() === '' ) {
			serviceLogger.info( `[request] ${ req.method } ${ parsedUrl.pathname } -> 400 missing title` );
			sendError( res, 400, '"title" is required and must be a non-empty string' );
			return;
		}

		let baseUrl;
		try {
			baseUrl = resolveRequestWiki( wiki );
		} catch ( e ) {
			serviceLogger.info( `[request] ${ req.method } ${ parsedUrl.pathname } -> 400 ${ e.message }` );
			sendError( res, 400, e.message );
			return;
		}

		const normalizedTitle = title.trim();
		const log = createTimedLogger( normalizedTitle, serviceLogger );
		log( `Request accepted for ${ baseUrl }` );
		if ( parsoidHtml ) {
			log( `Using posted Parsoid HTML (${ parsoidHtml.length } chars)` );
		}

		try {
			log( 'Dispatching headless check' );
			const result = await sessionManager.runCheck(
				normalizedTitle,
				baseUrl,
				( msg, timestamp ) => {
					log( msg, timestamp );
				},
				parsoidHtml
			);
			log( 'Sending response' );
			sendJson( res, 200, result );
		} catch ( e ) {
			serviceLogger.error( `[error "${ normalizedTitle }"] ${ e && e.stack ? e.stack : String( e ) }` );
			sendError( res, 500, e.message || 'Internal error running editcheck' );
		}
	};
}

/* Entry point */

{
	let opts;
	try {
		opts = parseArgs( process.argv.slice( 2 ) );
	} catch ( e ) {
		console.error( e.message );
		printUsage();
		// eslint-disable-next-line n/no-process-exit
		process.exit( 1 );
	}

	( async () => {
		const serviceUtils = await getInstance();
		const serviceLogger = serviceUtils.logger;

		// Pre-fetch the dbname -> base URL mapping so requests can name a wiki
		// by dbname. A failure here is non-fatal: base URL requests still work,
		// and dbname requests will report the wiki as unknown.
		let dbnameMap = Object.create( null );
		try {
			serviceLogger.info( '[startup] Fetching sitematrix' );
			dbnameMap = await fetchDbnameMap( opts.sitematrixUrl );
			serviceLogger.info( `[startup] Loaded ${ Object.keys( dbnameMap ).length } wiki dbnames` );
		} catch ( e ) {
			serviceLogger.error( `[startup] Failed to fetch sitematrix: ${ e.message }. dbname resolution unavailable.` );
		}

		// Resolve the list of wikis that each get a dedicated persistent
		// session, pre-loaded and kept warm. All other wikis are served by a
		// single shared on-demand session.
		const pinnedBaseUrls = opts.wikis
			.split( ',' )
			.map( ( w ) => w.trim() )
			.filter( ( w ) => w !== '' )
			.map( ( w ) => resolveWiki( w, dbnameMap ) );

		const sessionManager = await createSessionManager(
			Object.assign( {}, opts, { pinnedBaseUrls } ),
			( msg ) => {
				serviceLogger.info( `[startup] ${ msg }` );
			}
		);

		const server = http.createServer(
			makeHandler( sessionManager, serviceLogger, dbnameMap )
		);

		const shutdown = async () => {
			server.close();
			await sessionManager.close( ( msg ) => {
				serviceLogger.info( `[shutdown] ${ msg }` );
			} );
			// eslint-disable-next-line mocha/no-top-level-hooks
			await teardown();
			// eslint-disable-next-line n/no-process-exit
			process.exit( 0 );
		};

		process.on( 'SIGINT', () => {
			shutdown().catch( ( err ) => {
				serviceLogger.error( `Shutdown error: ${ err && err.stack ? err.stack : String( err ) }` );
				// eslint-disable-next-line n/no-process-exit
				process.exit( 1 );
			} );
		} );
		process.on( 'SIGTERM', () => {
			shutdown().catch( ( err ) => {
				serviceLogger.error( `Shutdown error: ${ err && err.stack ? err.stack : String( err ) }` );
				// eslint-disable-next-line n/no-process-exit
				process.exit( 1 );
			} );
		} );

		server.listen( opts.port, opts.host, () => {
			const addr = server.address();
			const pinnedSummary = pinnedBaseUrls.length ?
				pinnedBaseUrls.join( ', ' ) :
				'(none; all wikis served on demand)';
			serviceLogger.info( `editcheck-headless-server listening on http://${ addr.address }:${ addr.port }` );
			serviceLogger.info( `  pinned wikis:  ${ pinnedSummary }` );
			serviceLogger.info( `  script-path:   ${ opts.scriptPath }` );
			serviceLogger.info( `  timeout-ms:    ${ opts.timeoutMs }` );
			serviceLogger.info( `  restart-every-requests: ${ opts.restartEveryRequests }` );
			serviceLogger.info( `  headless:      ${ opts.headless }` );
		} );

		server.on( 'error', ( err ) => {
			serviceLogger.error( `Server error: ${ err.message }` );
			// eslint-disable-next-line n/no-process-exit
			process.exit( 1 );
		} );
	} )().catch( ( e ) => {
		console.error( e && e.stack ? e.stack : String( e ) );
		// eslint-disable-next-line n/no-process-exit
		process.exit( 1 );
	} );
}
