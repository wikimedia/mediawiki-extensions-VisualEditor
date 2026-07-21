'use strict';

/**
 * OpenTelemetry bootstrap for editcheck-headless.
 *
 * Must be required (and `startTracing()` called) before any other module in
 * this process requires `http`, `https`, `undici`/`fetch`, or `@grpc/grpc-js`
 * — the instrumentation packages patch those modules via a require hook, and
 * that hook only affects modules loaded *after* it is installed.
 *
 * Configuration (exporter endpoint, service name, sampler) is entirely via
 * standard OTEL_* environment variables, per
 * https://wikitech.wikimedia.org/wiki/Distributed_tracing — there are no
 * service-specific CLI flags for this. In production, `OTEL_SERVICE_NAME` and
 * `OTEL_EXPORTER_OTLP_ENDPOINT` are set by the deployment, and
 * `OTEL_TRACES_SAMPLER=parentbased_always_off` delegates the root sampling
 * decision to the Envoy mesh sidecar. Locally, unset vars fall back to a
 * sane default service name and localhost:4318, where the exporter retries and
 * fails quietly if no collector is listening; set `OTEL_SDK_DISABLED=true` to
 * turn tracing off instead.
 *
 * Incoming trace context is propagated per T430223: W3CTraceContextPropagator
 * (the standard `traceparent` header) plus XRequestPropagator (WMF's
 * `x-request-id` header), from @wikimedia/service-utils/otel. Only
 * `traceparent` carries trace context — XRequestPropagator puts
 * `x-request-id` in baggage, so it correlates a request with WMF logs but does
 * not itself continue a trace.
 */

const { NodeSDK } = require( '@opentelemetry/sdk-node' );
const { HttpInstrumentation } = require( '@opentelemetry/instrumentation-http' );
const { UndiciInstrumentation } = require( '@opentelemetry/instrumentation-undici' );
const { GrpcInstrumentation } = require( '@opentelemetry/instrumentation-grpc' );
const { OTLPTraceExporter } = require( '@opentelemetry/exporter-trace-otlp-http' );
const { resourceFromAttributes } = require( '@opentelemetry/resources' );
const { CompositePropagator, W3CTraceContextPropagator } = require( '@opentelemetry/core' );
const { ATTR_SERVICE_NAME } = require( '@opentelemetry/semantic-conventions' );
const { trace, SpanStatusCode } = require( '@opentelemetry/api' );
const { XRequestPropagator } = require( '@wikimedia/service-utils/otel' );

// Identifies the spans this module creates by hand, as
// opposed to those created by the auto-instrumentation packages.
const TRACER_NAME = 'editcheck-headless';

// Service-specific span attributes. Sessions are per-wiki and the run queue is
// per-session, so a saturated queue is only attributable with the wiki
// recorded on the span.
const ATTR_WIKI_BASE_URL = 'editcheck.wiki.base_url';
const ATTR_ENGINE = 'editcheck.engine';
const ATTR_TITLE = 'editcheck.title';
const ATTR_SESSION_WARM = 'editcheck.session.warm';
const ATTR_COMPLETED_REQUESTS = 'editcheck.completed_requests';

// Fallback for OTEL_SERVICE_NAME when the deployment doesn't set it. Matches
// `service_name` in service-utils.config.yaml (and the package name), so a
// locally run server reports itself the same way it does in production.
const SERVICE_NAME = 'visualeditor-editcheck-headless';

/**
 * Start the OpenTelemetry Node SDK.
 *
 * Failure is non-fatal: the service is expected to keep serving requests
 * untraced rather than refuse to start because tracing is unavailable.
 *
 * @return {NodeSDK|null} The started SDK instance (pass to shutdownTracing() on
 *   exit), or null if tracing could not be started
 */
function startTracing() {
	try {
		const sdk = new NodeSDK( {
			resource: resourceFromAttributes( {
				[ ATTR_SERVICE_NAME ]: process.env.OTEL_SERVICE_NAME || SERVICE_NAME
			} ),
			traceExporter: new OTLPTraceExporter(),
			textMapPropagator: new CompositePropagator( {
				propagators: [ new W3CTraceContextPropagator(), new XRequestPropagator() ]
			} ),
			instrumentations: [
				new HttpInstrumentation(),
				new UndiciInstrumentation(),
				new GrpcInstrumentation()
			]
		} );
		sdk.start();
		return sdk;
	} catch ( e ) {
		// The service logger isn't available this early
		console.error( `Failed to start tracing: ${ e && e.stack ? e.stack : String( e ) }` );
		return null;
	}
}

/**
 * Flush and shut down the OpenTelemetry SDK.
 *
 * @param {NodeSDK|null} sdk As returned by startTracing()
 * @return {Promise<void>}
 */
async function shutdownTracing( sdk ) {
	if ( !sdk ) {
		return;
	}
	await sdk.shutdown();
}

/**
 * Get the shared tracer for manual spans (e.g. wrapping the browser-driven
 * check work, which isn't covered by the http/grpc auto-instrumentation).
 *
 * @return {Object} An OpenTelemetry Tracer
 */
function getTracer() {
	return trace.getTracer( TRACER_NAME );
}

/**
 * Run fn inside a child span, recording exceptions and ending the span.
 *
 * @param {string} name Span name
 * @param {Function} fn Async function to run
 * @param {Object} [attributes] Span attributes. Keep high-cardinality values
 *   (titles, URLs) here rather than in the span name.
 * @return {Promise<*>} fn's return value
 */
function withSpan( name, fn, attributes ) {
	return getTracer().startActiveSpan( name, { attributes }, async ( span ) => {
		try {
			return await fn();
		} catch ( e ) {
			span.recordException( e );
			span.setStatus( { code: SpanStatusCode.ERROR, message: e.message } );
			throw e;
		} finally {
			span.end();
		}
	} );
}

/**
 * Start a child span of the currently active span, without making it active.
 *
 * For work whose start and end aren't a single function call — e.g. time spent
 * waiting in a queue, which ends when some later callback runs. The caller is
 * responsible for calling `.end()`; use withSpan() otherwise.
 *
 * @param {string} name Span name
 * @param {Object} [attributes] Span attributes
 * @return {Object} An OpenTelemetry Span
 */
function startSpan( name, attributes ) {
	return getTracer().startSpan( name, { attributes } );
}

module.exports = {
	startTracing,
	shutdownTracing,
	getTracer,
	withSpan,
	startSpan,
	ATTR_WIKI_BASE_URL,
	ATTR_ENGINE,
	ATTR_TITLE,
	ATTR_SESSION_WARM,
	ATTR_COMPLETED_REQUESTS
};
