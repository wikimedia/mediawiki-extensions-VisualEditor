# EditCheck Headless

A Node.js service that runs VisualEditor edit checks against a page **without
opening the editor**, and reports the resulting edit-suggestion counts. It
drives a headless browser (Chrome or Lightpanda) over CDP, loads VisualEditor
in the background on `Special:EditCheckHeadless`, fetches the Parsoid document,
builds a detached `ve.dm` document model, and runs the checks directly.

It exposes two interfaces backed by the same browser session pool:

- an **HTTP** API for interactive use and testing, and
- a **gRPC** "lambda" API implementing the [Linked Artifact Cache](https://phabricator.wikimedia.org/T419734) (LAC,
  aka *hoarde*) contract, so LAC can invoke this service to fill a cache miss.

## How it works

- A **session pool** keeps one headless browser page per wiki. Each wiki named
  in `--wikis` gets a dedicated *pinned* session, pre-loaded at startup and kept
  warm; every other wiki is served by a single shared on-demand session that
  navigates as needed.
- A wiki is identified either by **base URL** (`https://en.wikipedia.org`) or by
  **dbname** (`enwiki`). Dbnames are resolved to base URLs from the sitematrix,
  fetched once at startup.
- Account/edit-count gating is bypassed so *all* possible suggestions are
  returned; per-user gating can be applied later by the caller.

## Requirements

- Node.js `>=21`.
- A browser engine:
  - **Chrome/Chromium** (default) — auto-detected, or set with `--chrome-binary`.
  - **Lightpanda** — a lightweight rendering-free browser; spawned as a
    `lightpanda serve` child process (`--engine lightpanda`).
- Network access to the target wiki's `api.php` and Parsoid.

## Install

```bash
cd editcheck/build/editcheck-headless/
npm install          # or: npm install --omit=dev
```

## Running

```bash
npm start            # node editcheck-headless-server.js (all defaults)
```

or with options, e.g. against a local wiki, pre-warming enwiki:

```bash
node editcheck-headless-server.js \
  --engine chrome \
  --script-path /w \
  --wikis enwiki \
  --port 3000 \
  --grpc-port 50051
```

### Options

`wiki` in every request is a base URL or a dbname, and is always required.

| Flag | Env | Default | Description |
| :--- | :--- | :--- | :--- |
| `--engine <name>` | `MW_BROWSER_ENGINE` | `chrome` | Browser engine: `chrome` or `lightpanda`. |
| `--wikis <list>` | `MW_WIKIS` | *(none)* | Comma-separated wikis (base URL or dbname) to give a dedicated, pre-warmed session. |
| `--script-path <path>` | `MW_SCRIPT_PATH` | `/w` | MediaWiki script path. |
| `--sitematrix-url <url>` | `MW_SITEMATRIX_URL` | metawiki `api.php` | API endpoint used to resolve dbnames → base URLs. |
| `--timeout-ms <ms>` | | `90000` | Max wait per request. |
| `--restart-every-requests <n>` | | `100` | Restart the browser every N requests (`0` = never). |
| `--chrome-binary <path>` | `CHROME_BINARY` | auto-detected | Chrome/Chromium binary (engine=chrome). |
| `--lightpanda-binary <path>` | `LIGHTPANDA_BINARY` | `lightpanda` | Lightpanda binary (engine=lightpanda). |
| `--lightpanda-host <host>` | | `127.0.0.1` | Host Lightpanda binds its CDP endpoint to. |
| `--port <port>` | | `3000` | HTTP port (`0` is not valid). |
| `--host <host>` | | `127.0.0.1` | HTTP bind address. |
| `--grpc-port <port>` | | `50051` | gRPC port; `0` disables the gRPC server. |
| `--grpc-host <host>` | | `127.0.0.1` | gRPC bind address. |

## HTTP API

```
GET  /check?title=<title>&wiki=<url|dbname>
POST /check   body: { "title": "<title>", "wiki": "<url|dbname>", "parsoidHtml": "<html...>" }
GET  /config?wiki=<url|dbname>
```

`/check` returns the full result, including the per-type suggestion counts and
the serialized suggestions:

```bash
curl 'http://127.0.0.1:3000/check?title=Paris&wiki=enwiki'
```

```json
{
  "suggestionCounts": { "*": 40, "addReference": 34, "externalLink": 4, "convertReference": 2 },
  "suggestions": [ /* ... */ ]
}
```

`POST /check` accepts an optional `parsoidHtml` string to check supplied HTML
instead of fetching it from the wiki. `/config` returns the resolved per-check
configuration for a wiki (independent of any page).

## gRPC API (Linked Artifact Cache lambda)

The service implements the LAC `LambdaService` contract — see
[`lambda.proto`](./lambda.proto):

```proto
service LambdaService {
  rpc GetRevisionArtifact(LambdaRevisionRequest) returns (LambdaResponse);
}
message LambdaRevisionRequest { string wiki_id = 1; int64 page_id = 2; int64 revision_id = 3; }
message LambdaResponse        { bytes content = 1; map<string, string> metadata = 2; }
```

- `wiki_id` — dbname (`enwiki`) or base URL.
- `page_id` — MediaWiki `page_id` (required, positive).
- `revision_id` — MediaWiki `rev_id` (see the caveat below).

This service is not called directly by end users. Clients request an artifact
from hoarde's own **HTTP** API (see `API.md` in the hoarde repository):

```
GET /revisions/v1/{name}/{wiki}/{page}[/{revision}]
```

where `{name}` is the configured cache (table) name. On a cache **miss**, hoarde
invokes this service's `GetRevisionArtifact` with `{wiki_id, page_id, revision_id}`, stores the
returned `content` and `metadata`, and serves it. So the gRPC contract here is
the miss-fill path behind that HTTP API, not a public endpoint.

The response `content` is the artifact body: a JSON object mapping each check
type to its suggestion count, with `"*"` as the total. `metadata` carries
`Content-Type: application/json` and `X-Hoarde-Revision-ID` (the revision
actually checked).

```json
{"*":40,"addReference":34,"externalLink":4,"convertReference":2}
```

The transport is **plaintext** (no TLS), matching hoarde's client.

### Example with [`grpcurl`](https://github.com/fullstorydev/grpcurl)

```bash
grpcurl -plaintext \
  -proto lambda.proto \
  -d '{"wiki_id": "enwiki", "page_id": 12345, "revision_id": 0}' \
  127.0.0.1:50051 \
  lambda.LambdaService/GetRevisionArtifact
```

`content` is a `bytes` field, so grpcurl prints it base64-encoded; decode it to
read the JSON counts map.

### Error codes

| Condition | gRPC status |
| :--- | :--- |
| Missing/empty `wiki_id`, unknown dbname, or non-positive `page_id` | `INVALID_ARGUMENT` |
| No page with the given `page_id` on the wiki | `NOT_FOUND` |
| Page-lookup HTTP request failed | `UNAVAILABLE` |
| Browser/check failure or any other error | `INTERNAL` |

### Caveat: revision handling

Phase 1 ([T431492](https://phabricator.wikimedia.org/T431492)) checks the wiki's **current** revision. The
requested `revision` is accepted and logged (a warning is emitted when it does
not match the current revision), but honouring an exact historical revision —
fetching that `oldid`'s Parsoid HTML — is deferred future work. LAC still keys
the cached artifact by the requested revision.

## Tracing

Requests are traced with OpenTelemetry ([T431495](https://phabricator.wikimedia.org/T431495)), so that in
production a request to this service — whether over HTTP or via the gRPC
lambda API — shows up as part of a distributed trace at
[trace.wikimedia.org](https://trace.wikimedia.org/). Both entrypoints
automatically extract the incoming `traceparent` header, so a trace started by
an upstream caller (e.g. LAC/Hoarde calling `GetRevisionArtifact`) continues
into this service, with nested spans around the actual browser-driven check
work. WMF's `x-request-id` header is also extracted, but into baggage only —
it correlates a request with its log entries and is passed on to outbound
requests; it does not itself continue a trace.

A slow request has several possible causes, so each is given its own span
rather than being absorbed into the overall `runCheck` time:

| Span | Covers |
| :--- | :--- |
| `runCheck` / `getConfigs` | The run itself, once the session is free. |
| `runCheck.queueWait` | Waiting for a turn: a session runs one check at a time, so this is the queue delay. Sibling to `runCheck`, not a child. |
| `ensureReady` | Launching the browser and loading the page. A no-op on a warm session (see the `editcheck.session.warm` attribute), seconds on a cold one. |
| `browserRestart` | The periodic restart from `--restart-every-requests`, which is billed to whichever request happens to trip it. |

Spans carry the wiki (`editcheck.wiki.base_url`) and engine
(`editcheck.engine`) as attributes, since sessions — and therefore run queues —
are per-wiki, so queue saturation is only attributable with the wiki recorded.
`runCheck` also carries `editcheck.title`. High-cardinality values stay in
attributes and out of span names.

Configuration is entirely via standard OpenTelemetry environment variables —
there are no service-specific CLI flags:

| Variable | Purpose |
| :--- | :--- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Collector endpoint (e.g. the in-cluster collector in production). |
| `OTEL_SERVICE_NAME` | Service name shown in traces; defaults to `visualeditor-editcheck-headless` (matching `service_name` in [`service-utils.config.yaml`](./service-utils.config.yaml)) if unset. |
| `OTEL_TRACES_SAMPLER` | Set to `parentbased_always_off` in production so the Envoy mesh sidecar makes the root sampling decision (see [Distributed tracing](https://wikitech.wikimedia.org/wiki/Distributed_tracing)). |
| `OTEL_SDK_DISABLED` | Set to `true` to turn tracing off entirely. Use this rather than `OTEL_TRACES_EXPORTER=none`, which the explicit exporter in `editcheck-headless-tracing.js` overrides. Without a collector the exporter retries a local connection and fails quietly (set `OTEL_LOG_LEVEL=debug` to see it). |

Note that the Parsoid HTML fetch performed *inside* the headless browser
(driven over CDP, not by this Node process) is not part of the trace — it's a
same-process, in-page fetch outside this service's instrumentation.

## Configuration

Logging and service metadata are read from
[`service-utils.config.yaml`](./service-utils.config.yaml) via
`@wikimedia/service-utils`.
