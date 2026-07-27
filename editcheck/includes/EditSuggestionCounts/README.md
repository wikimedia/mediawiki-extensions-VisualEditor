[T432733 Server Side Edit Suggestions - Linked Artifacts Cache precompute job](https://phabricator.wikimedia.org/T432733)

This EditSuggestionCounts/ directory contains 'throwaway' code that
is meant to only exist here for the first couple of quarters of WMF FY2026-2027.

Rather than hardcoding an individual job specifically for EditSuggestionCounts
Linked Artifacts Cache warming (precompute), we can generalize a job for other
LAC usages.

Another PoC here: https://gerrit.wikimedia.org/r/c/mediawiki/extensions/EventBus/+/1305805

This code should not exist here beyond
[T430712 [EPIC] Launch controlled experiment of surfacing suggestion counts on articles to logged-in editors](https://phabricator.wikimedia.org/T430712).
If that experiment confirms that we will continue with the Server Side Edit Suggestions project,
then this responsibility should move elsewhere.

### VisualEditorEditSuggestionCounts config

An array controlling the EditSuggestionCounts feature. Read by both sides of the
feature — the precompute path (which warms the LAC after each edit) and the
product read path (which fetches precomputed counts from LAC for the page being
viewed).

**`enabled`** — `bool`, default `false`
: Whether the feature is enabled on this wiki. When `false`, the feature is off:
  nothing is precomputed and the product code does not fetch counts. Set per
  wiki.

**`linked_artifact_url_template`** — `string`
: LAC endpoint URL template. The `{wiki_id}`, `{page_id}`, and `{revision_id}`
  placeholders are substituted (rawurlencoded) per revision. Default:
  `https://linked-artifacts.discovery.wmnet:30443/v1/edit-suggestion-counts/{wiki_id}/{page_id}/{revision_id}`

**`linked_artifact_precompute_timeout`** — `int`, default `5`
: HTTP request timeout, in seconds, for the precompute call to LAC.

**`namespaces_enabled`** — `int[]`, default `[ 0 ]`
: Page namespaces the feature is enabled for. Only pages in these namespaces are
  in scope. An empty array `[]` means **all** namespaces.

**`page_sample_proportion`** — `float`, default `1.0`
: Proportion of pages the feature is enabled for, in `[0.0, 1.0]`. Deterministic
  per page. `1.0` = every page, `0.0` = none. Out-of-range values throw
  `InvalidArgumentException`.

#### Notes

- **Sampling is deterministic and per-page.** Whether the feature is enabled for
  a page is a stable hash of `(wiki_id, page_id)`, so a page is always in the
  same cohort — its in/out decision doesn't change between requests, and both the
  precompute and read paths agree.
