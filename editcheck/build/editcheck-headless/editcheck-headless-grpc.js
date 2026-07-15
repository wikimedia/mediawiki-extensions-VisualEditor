'use strict';

/**
 * gRPC "lambda" interface for the headless edit check service.
 *
 * Implements the Linked Artifact Cache (LAC, aka "hoarde") LambdaService
 * contract, so LAC can invoke this service to fill a cache miss:
 *
 *   service LambdaService {
 *     rpc GetRevisionArtifact(LambdaRevisionRequest) returns (LambdaResponse);
 *   }
 *   LambdaRevisionRequest { string wiki_id; int64 page_id; int64 revision_id; }
 *   LambdaResponse        { bytes content; map<string,string> metadata; }
 *
 * The contract is defined in lambda.proto (see that file).
 *
 * Phase 1 (T431492) returns edit-suggestion counts per check type for a page.
 * The artifact body ("content") is the JSON-encoded counts map, e.g.
 *   {"*":5,"textMatch":2,"duplicateLink":3}
 * where the "*" key is the total across all types.
 *
 * NOTE: Phase 1 checks the wiki's CURRENT revision. The requested `revision_id`
 * is accepted and logged but not yet honoured; LAC still keys the cached
 * artifact by the requested revision. Honouring an exact historical revision
 * (fetching that oldid's Parsoid HTML) is deferred future work.
 */

const path = require( 'path' );
// eslint-disable-next-line n/no-missing-require
const grpc = require( '@grpc/grpc-js' );
// eslint-disable-next-line n/no-missing-require
const protoLoader = require( '@grpc/proto-loader' );
const { resolveWiki } = require( './editcheck-headless-sitematrix' );

const PROTO_PATH = path.join( __dirname, 'lambda.proto' );

// WMF web APIs reject requests without a descriptive User-Agent, so identify
// ourselves the same way the sitematrix fetch does.
const USER_AGENT =
	'VisualEditor-EditCheck-Headless/1.0 (https://www.mediawiki.org/wiki/VisualEditor)';

/**
 * An Error carrying a gRPC status code, so the handler can map failures to the
 * appropriate status without a big switch.
 *
 * @param {number} code A grpc.status.* value
 * @param {string} message Human-readable detail
 * @return {Error} Error with a `.code` property
 */
function grpcError( code, message ) {
	const err = new Error( message );
	err.code = code;
	return err;
}

/**
 * Load the LambdaService definition from the vendored proto.
 *
 * @return {grpc.ServiceClientConstructor} The LambdaService constructor (carries `.service`)
 */
function loadLambdaService() {
	const packageDefinition = protoLoader.loadSync( PROTO_PATH, {
		keepCase: true,
		// int64 fields (page_id, revision_id) as strings to avoid precision loss.
		longs: String,
		enums: String,
		defaults: true,
		oneofs: true
	} );
	const proto = grpc.loadPackageDefinition( packageDefinition );
	return proto.lambda.LambdaService;
}

/**
 * Resolve a MediaWiki page ID to its (current) prefixed title, using the wiki's
 * action API.
 *
 * @param {string} baseUrl Wiki base URL (no trailing slash)
 * @param {string} scriptPath Script path (e.g. "/w")
 * @param {string} pageId Page ID (a positive integer, as a string)
 * @return {Promise<{title: string, lastRevId: number}|null>} Resolved page, or
 *   null if no such page exists
 */
async function resolvePageTitle( baseUrl, scriptPath, pageId ) {
	const trimmedPath = scriptPath.replace( /^\/+|\/+$/g, '' );
	const prefix = trimmedPath ? `${ baseUrl }/${ trimmedPath }` : baseUrl;
	const url = new URL( `${ prefix }/api.php` );
	url.search = new URLSearchParams( {
		action: 'query',
		pageids: pageId,
		prop: 'info',
		format: 'json',
		formatversion: '2'
	} ).toString();

	const res = await fetch( url, {
		headers: {
			accept: 'application/json',
			'user-agent': USER_AGENT
		}
	} );
	if ( !res.ok ) {
		throw grpcError(
			grpc.status.UNAVAILABLE,
			`Page lookup failed: HTTP ${ res.status } from ${ baseUrl }`
		);
	}

	const data = await res.json();
	const page = data && data.query && data.query.pages && data.query.pages[ 0 ];
	if ( !page || page.missing || page.invalid || typeof page.title !== 'string' ) {
		return null;
	}
	return { title: page.title, lastRevId: page.lastrevid };
}

/**
 * Create the GetRevisionArtifact unary handler.
 *
 * @param {Object} deps
 * @param {HeadlessSessionManager} deps.sessionManager Shared session manager
 * @param {Object} deps.serviceLogger Logger with info()/error()
 * @param {Object} deps.dbnameMap Map of wiki dbname to base URL
 * @param {string} deps.scriptPath Script path for API lookups (e.g. "/w")
 * @return {Function} grpc unary handler (call, callback)
 */
function makeGetRevisionArtifactHandler(
	{ sessionManager, serviceLogger, dbnameMap, scriptPath }
) {
	/**
	 * Do the work for a single request, returning a LambdaResponse-shaped object
	 * or throwing a grpcError.
	 *
	 * @param {Object} request Decoded LambdaRevisionRequest
	 * @return {Promise<{content: Buffer, metadata: Object}>}
	 */
	async function handle( request ) {
		const wiki = request.wiki_id;
		// With longs:String, page_id/revision_id arrive as decimal strings ("0" if unset).
		const pageId = String( request.page_id );
		const revision = String( request.revision_id );

		if ( typeof wiki !== 'string' || wiki.trim() === '' ) {
			throw grpcError( grpc.status.INVALID_ARGUMENT, '"wiki_id" is required' );
		}
		if ( !/^\d+$/.test( pageId ) || pageId === '0' ) {
			throw grpcError(
				grpc.status.INVALID_ARGUMENT, '"page_id" must be a positive integer'
			);
		}

		let baseUrl;
		try {
			baseUrl = resolveWiki( wiki, dbnameMap );
		} catch ( e ) {
			throw grpcError( grpc.status.INVALID_ARGUMENT, e.message );
		}

		const started = Date.now();
		const label = `${ wiki }#${ pageId }@${ revision }`;
		const progress = ( msg ) => {
			serviceLogger.info( `[grpc GetRevisionArtifact ${ label }] ${ msg }` );
		};

		progress( `Resolving page ${ pageId } on ${ baseUrl }` );
		const resolved = await resolvePageTitle( baseUrl, scriptPath, pageId );
		if ( !resolved ) {
			throw grpcError(
				grpc.status.NOT_FOUND,
				`No page with id ${ pageId } on "${ wiki }"`
			);
		}

		if ( revision !== '0' && String( resolved.lastRevId ) !== revision ) {
			// Phase 1 always checks the current revision; make the mismatch visible.
			progress(
				`Requested revision ${ revision } but checking current revision ` +
				`${ resolved.lastRevId } of "${ resolved.title }"`
			);
		}

		progress( `Running edit checks for "${ resolved.title }"` );
		const result = await sessionManager.runCheck( resolved.title, baseUrl, progress );
		const counts = ( result && result.suggestionCounts ) || {};
		const content = Buffer.from( JSON.stringify( counts ), 'utf8' );

		progress(
			`Done in ${ Date.now() - started }ms: ${ counts[ '*' ] || 0 } suggestions`
		);

		const metadata = { 'Content-Type': 'application/json' };
		// Report the revision actually checked so LAC can key on it when the
		// request omitted a revision (documented X-Hoarde-Revision-ID header).
		if ( Number.isInteger( resolved.lastRevId ) ) {
			metadata[ 'X-Hoarde-Revision-ID' ] = String( resolved.lastRevId );
		}

		return { content, metadata };
	}

	return function getRevisionArtifact( call, callback ) {
		handle( call.request || {} ).then(
			( response ) => callback( null, response ),
			( err ) => {
				const code = typeof err.code === 'number' ? err.code : grpc.status.INTERNAL;
				if ( code === grpc.status.INTERNAL ) {
					serviceLogger.error(
						`[grpc GetRevisionArtifact] ${ err && err.stack ? err.stack : String( err ) }`
					);
				} else {
					serviceLogger.info( `[grpc GetRevisionArtifact] -> ${ code } ${ err.message }` );
				}
				callback( { code, message: err.message } );
			}
		);
	};
}

/**
 * Build a gRPC server exposing LambdaService, backed by the shared session
 * manager. The returned server is not yet bound; call bindAsync() on it.
 *
 * @param {Object} deps See makeGetRevisionArtifactHandler
 * @return {grpc.Server}
 */
function createGrpcServer( deps ) {
	const LambdaService = loadLambdaService();
	const server = new grpc.Server();
	server.addService( LambdaService.service, {
		GetRevisionArtifact: makeGetRevisionArtifactHandler( deps )
	} );
	return server;
}

module.exports = {
	createGrpcServer,
	// Exported for testing.
	resolvePageTitle,
	loadLambdaService
};
