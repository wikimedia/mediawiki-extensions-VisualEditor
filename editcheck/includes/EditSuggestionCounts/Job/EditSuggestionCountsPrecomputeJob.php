<?php

declare( strict_types=1 );

namespace MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts\Job;

use MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts\EditSuggestionCountsConfig;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\JobQueue\Job;

/**
 * Calls the configured edit-suggestion-counts LAC endpoint for a single revision with a
 * `Cache-Control: no-cache` header, so the LAC lambda (re)computes and stores the counts.
 *
 * PoC: edit-suggestions-specific, living in VisualEditor for now. The generic LAC
 * cache-warming approach will move to a proper home (TBD) later. See
 * https://phabricator.wikimedia.org/T432733.
 */
class EditSuggestionCountsPrecomputeJob extends Job {

	public const JOB_NAME = 'editSuggestionCountsPrecompute';

	private EditSuggestionCountsConfig $config;
	private HttpRequestFactory $httpRequestFactory;

	public function __construct(
		array $params,
		EditSuggestionCountsConfig $config,
		HttpRequestFactory $httpRequestFactory
	) {
		parent::__construct( self::JOB_NAME, $params );
		$this->config = $config;
		$this->httpRequestFactory = $httpRequestFactory;
	}

	/** @inheritDoc */
	public function run(): bool {
		$url = $this->config->buildUrl(
			(string)$this->params['wiki_id'],
			(int)$this->params['page_id'],
			(int)$this->params['revision_id']
		);

		$request = $this->httpRequestFactory->create(
			$url,
			[ 'method' => 'GET', 'timeout' => $this->config->getLinkedArtifactPrecomputeTimeout() ],
			__METHOD__
		);
		// Force the LAC lambda to (re)compute the edit-suggestion counts for this revision.
		$request->setHeader( 'Cache-Control', 'no-cache' );

		$status = $request->execute();
		if ( $status->isOK() ) {
			return true;
		}

		$this->setLastError(
			__METHOD__ .
				": edit-suggestions precompute request to Linked Artifacts Cache failed, " .
				"status {$request->getStatus()}"
		);
		return false;
	}
}
