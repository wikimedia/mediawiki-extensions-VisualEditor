<?php

declare( strict_types=1 );

namespace MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts;

use InvalidArgumentException;

/**
 * Configuration value object for edit-suggestion-counts LAC, built from the
 * `VisualEditorEditSuggestionCounts` config array.
 *
 * Shared by both sides of the feature: the **precompute** path (which warms the LAC after
 * each new revision) and the **product read** path (which fetches precomputed counts from
 * LAC for the page being viewed). Both need the same answers — is the feature enabled on
 * this wiki, is this page's namespace in scope, is the feature enabled for this page, and
 * what is the LAC URL for a given revision.
 *
 * PoC: edit-suggestions-specific, living in VisualEditor for now. The generic, reusable
 * LAC cache-warming approach is the intended long-term home and will move to a proper
 * home (TBD) later. See https://phabricator.wikimedia.org/T432733.
 */
class EditSuggestionCountsConfig {

	/**
	 * @internal For use by ServiceWiring.php only or when locating the service.
	 */
	public const SERVICE_NAME = 'VisualEditor.EditSuggestionCountsConfig';

	private bool $enabled;
	private string $linkedArtifactUrlTemplate;
	private int $linkedArtifactPrecomputeTimeout;

	/** @var int[] Enabled page namespaces; empty means "all namespaces". */
	private array $namespacesEnabled;

	private float $pageSampleProportion;

	/**
	 * @param array $config Parsed VisualEditorEditSuggestionCounts config, with keys:
	 *   - enabled: bool whether the feature is enabled on this wiki
	 *   - linked_artifact_url_template: string URL template with `{wiki_id}`/`{page_id}`/`{revision_id}`
	 *   - linked_artifact_precompute_timeout: int (seconds)
	 *   - namespaces_enabled: int[] enabled page namespaces (empty = all)
	 *   - page_sample_proportion: float in [0.0, 1.0] proportion of pages the feature is enabled for
	 * @throws InvalidArgumentException if page_sample_proportion is outside [0.0, 1.0]
	 */
	public function __construct( array $config ) {
		$this->enabled = (bool)( $config['enabled'] ?? false );
		$this->linkedArtifactUrlTemplate = (string)( $config['linked_artifact_url_template'] ?? '' );
		$this->linkedArtifactPrecomputeTimeout = (int)( $config['linked_artifact_precompute_timeout'] ?? 0 );
		$this->namespacesEnabled = array_map( 'intval', $config['namespaces_enabled'] ?? [] );
		$this->pageSampleProportion = (float)( $config['page_sample_proportion'] ?? 1.0 );

		if ( $this->pageSampleProportion < 0.0 || $this->pageSampleProportion > 1.0 ) {
			throw new InvalidArgumentException(
				"page_sample_proportion must be between 0.0 and 1.0, got {$this->pageSampleProportion}"
			);
		}
	}

	/**
	 * Whether the EditSuggestionCounts feature is enabled on this wiki. Checked by both the
	 * precompute path and the product read path.
	 *
	 * @return bool
	 */
	public function isEnabled(): bool {
		return $this->enabled;
	}

	public function getLinkedArtifactPrecomputeTimeout(): int {
		return $this->linkedArtifactPrecomputeTimeout;
	}

	/**
	 * Whether the feature is enabled for pages in the given namespace. True when no
	 * namespace allowlist is configured (⇒ all) or the namespace is listed.
	 *
	 * @param int $namespace
	 * @return bool
	 */
	public function isNamespaceEnabled( int $namespace ): bool {
		return $this->namespacesEnabled === [] || in_array( $namespace, $this->namespacesEnabled, true );
	}

	/**
	 * Whether the feature is enabled for a given page, i.e. whether the page is in the
	 * sample. Deterministic on the page's identity `(wiki_id, page_id)` so a page is a
	 * stable cohort member — its in/out decision does not change between requests.
	 *
	 * How the calculation works: we hash "wiki_id:page_id" with sha1 and take the first
	 * 8 hex digits (32 bits). hexdec() turns those into an integer in [0, 2^32 - 1], and
	 * dividing by 2^32 maps it to a "bucket" — a fraction in [0, 1). Because sha1 is
	 * uniformly distributed, buckets are spread evenly across [0, 1), so the share of
	 * pages with `bucket < proportion` is ~`proportion` (e.g. 0.1 ⇒ ~10% of pages). The
	 * hash is stable, so a given page always lands in the same bucket and is always in or
	 * out. Dividing by 2^32 (not 2^32 - 1) keeps the bucket strictly below 1.0, so a
	 * proportion of 1.0 samples every page in and 0.0 samples every page out.
	 *
	 * @param string $wikiId
	 * @param int $pageId
	 * @return bool
	 */
	public function isPageInSample( string $wikiId, int $pageId ): bool {
		$bucket = hexdec( substr( sha1( "$wikiId:$pageId" ), 0, 8 ) ) / 0x100000000;
		return $bucket < $this->pageSampleProportion;
	}

	/**
	 * Build the LAC endpoint URL for a revision by substituting the configured URL
	 * template's `{wiki_id}`/`{page_id}`/`{revision_id}` placeholders (rawurlencode'd).
	 *
	 * @param string $wikiId
	 * @param int $pageId
	 * @param int $revisionId
	 * @return string
	 */
	public function buildUrl( string $wikiId, int $pageId, int $revisionId ): string {
		return strtr( $this->linkedArtifactUrlTemplate, [
			'{wiki_id}' => rawurlencode( $wikiId ),
			'{page_id}' => rawurlencode( (string)$pageId ),
			'{revision_id}' => rawurlencode( (string)$revisionId ),
		] );
	}
}
