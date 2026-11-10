<?php

// @phpcs:disable MediaWiki.Files.ClassMatchesFilename.NotMatch
// @phpcs:disable Generic.Files.OneObjectStructurePerFile.MultipleFound

/**
 * Phan stubs for the soft dependency on the EventBus extension
 *
 * TODO: Consider checking out EventBus in CI instead.
 */

namespace MediaWiki\Extension\EventBus\LinkedArtifacts;

class LinkedArtifactsClient {

	public const CACHE_CONTROL_ONLY_IF_CACHED = 'only-if-cached';

	public const PURPOSE_READ = 'read';

	public function coversPage(
		string $artifactName,
		string|false $wikiId,
		int $pageId,
		int $namespace,
	): bool {
		return false;
	}

	public function fetchRevisionArtifact(
		string $artifactName,
		string|false $wikiId,
		int $pageId,
		int $revisionId,
		int $timeoutMs,
		?string $cacheControl = null,
		string $purpose = self::PURPOSE_READ
	): LinkedArtifactResponse {
		return new LinkedArtifactResponse( 0 );
	}
}

class LinkedArtifactResponse {

	/**
	 * @param int $statusCode
	 * @param array<string,string> $headers
	 * @param string $body
	 */
	public function __construct( int $statusCode, array $headers = [], string $body = '' ) {
	}

	public function isSuccess(): bool {
		return false;
	}

	public function getJsonBody(): ?array {
		return null;
	}
}

namespace MediaWiki\Extension\EventBus\LinkedArtifacts\Job;

use MediaWiki\JobQueue\JobSpecification;
use Wikimedia\Timestamp\ConvertibleTimestamp;

class LinkedArtifactPrefetchJob {

	public static function newRevisionJobSpec(
		string $artifactName,
		string $wikiId,
		int $pageId,
		int $revisionId,
		bool $isReconciliationRequest = false,
		?string $triggerEventType = null,
		?string $triggerCause = null,
		?ConvertibleTimestamp $triggerTimestamp = null
	): JobSpecification {
		return new JobSpecification( '', [] );
	}
}
