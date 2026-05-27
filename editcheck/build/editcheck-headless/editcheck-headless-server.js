#!/usr/bin/env node
'use strict';

const http = require( 'http' );
// eslint-disable-next-line n/no-missing-require
const { getInstance, teardown } = require( '@wikimedia/service-utils' );
const { parseArgs, createSession } = require( './editcheck-headless' );

function printUsage() {
	console.error( 'Usage:' );
	console.error( '  node editcheck/build/editcheck-headless/editcheck-headless-server.js --base-url <url> [options]' );
	console.error( '' );
	console.error( 'Server options:' );
	console.error( '  --base-url <url>       MediaWiki base URL (required)' );
	console.error( '  --script-path <path>   Script path (default: /w)' );
	console.error( '  --timeout-ms <ms>      Max wait per request (default: 90000)' );
	console.error( '  --restart-every-requests <n> Restart Chrome after every N processed requests (default: 100, 0 = disabled)' );
	console.error( '  --headed               Run Chrome with a visible window (default: headless)' );
	console.error( '  --chrome-binary <path> Optional Chrome/Chromium binary path' );
	console.error( '  --port <port>          HTTP port to listen on (default: 3000)' );
	console.error( '  --host <host>          Host/address to bind to (default: 127.0.0.1)' );
	console.error( '' );
	console.error( 'API:' );
	console.error( '  GET  /check?title=<title>' );
	console.error( '  POST /check  body: { "title": "<title>", "parsoidHtml": "<html...>" }' );
	console.error( '' );
	console.error( 'Response: the veEditCheckHeadlessResult JSON object.' );
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
 * Send a JSON response.
 *
 * @param {http.ServerResponse} res
 * @param {number} statusCode
 * @param {Object} data
 */
function sendJson( res, statusCode, data ) {
	const body = JSON.stringify( data, null, '\t' );
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
 * Create a request handler for the headless session.
 *
 * @param {HeadlessBrowserSession} session
 * @param {Object} serviceLogger
 * @return {Function} request handler
 */
function makeHandler( session, serviceLogger ) {
	return async function handler( req, res ) {
		const parsedUrl = new URL( req.url, `http://${ req.headers.host || 'localhost' }` );
		serviceLogger.info( `[request] ${ req.method } ${ parsedUrl.pathname }${ parsedUrl.search }` );

		if ( parsedUrl.pathname !== '/check' ) {
			serviceLogger.info( `[request] ${ req.method } ${ parsedUrl.pathname } -> 404` );
			sendError( res, 404, 'Not found. Use GET /check?title=... or POST /check.' );
			return;
		}

		let title;
		let parsoidHtml = null;

		if ( req.method === 'GET' || req.method === 'HEAD' ) {
			title = parsedUrl.searchParams.get( 'title' );
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
			if ( body.parsoidHtml !== undefined ) {
				if ( typeof body.parsoidHtml !== 'string' || body.parsoidHtml.trim() === '' ) {
					sendError( res, 400, '"parsoidHtml" must be a non-empty string when provided' );
					return;
				}
				parsoidHtml = body.parsoidHtml.trim();
			}
		} else {
			serviceLogger.info( `[request] ${ req.method } ${ parsedUrl.pathname } -> 405` );
			res.writeHead( 405, { Allow: 'GET, HEAD, POST' } );
			res.end();
			return;
		}

		if ( typeof title !== 'string' || title.trim() === '' ) {
			serviceLogger.info( `[request] ${ req.method } ${ parsedUrl.pathname } -> 400 missing title` );
			sendError( res, 400, '"title" is required and must be a non-empty string' );
			return;
		}

		const normalizedTitle = title.trim();
		const log = createTimedLogger( normalizedTitle, serviceLogger );
		log( 'Request accepted' );
		if ( parsoidHtml ) {
			log( `Using posted Parsoid HTML (${ parsoidHtml.length } chars)` );
		}

		try {
			log( 'Dispatching headless check' );
			const result = await session.runCheck( normalizedTitle, ( msg, timestamp ) => {
				log( msg, timestamp );
			}, parsoidHtml );
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
		const session = await createSession( opts, ( msg ) => {
			serviceLogger.info( `[startup] ${ msg }` );
		} );

		const server = http.createServer( makeHandler( session, serviceLogger ) );

		const shutdown = async () => {
			server.close();
			await session.close( ( msg ) => {
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
			serviceLogger.info( `editcheck-headless-server listening on http://${ addr.address }:${ addr.port }` );
			serviceLogger.info( `  base-url:      ${ opts.baseUrl }` );
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
