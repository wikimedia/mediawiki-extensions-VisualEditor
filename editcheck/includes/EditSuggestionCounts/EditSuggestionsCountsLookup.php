<?php

declare( strict_types=1 );

namespace MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts;

use MediaWiki\Extension\EventBus\LinkedArtifacts\Job\LinkedArtifactPrefetchJob;
use MediaWiki\Extension\EventBus\LinkedArtifacts\LinkedArtifactsClient;
use MediaWiki\JobQueue\JobQueueGroup;
use MediaWiki\Page\PageLookup;
use MediaWiki\Title\Title;
use MediaWiki\User\User;
use Wikimedia\ObjectCache\WANObjectCache;

/**
 * Reads a page's edit suggestion count from the Linked Artifacts Cache (LAC),
 * filtered to the checks that would be shown to a given user in suggestion mode.
 *
 * The check configs are stored in LAC as the artifact of MediaWiki:Editcheck-config.json,
 * which never has suggestions of its own. Edits to that page do not prefetch it, so a
 * miss queues a prefetch job.
 */
class EditSuggestionsCountsLookup {

	/**
	 * @internal For use by ServiceWiring.php only or when locating the service.
	 */
	public const SERVICE_NAME = 'VisualEditor.EditSuggestionsCountsLookup';

	private const ARTIFACT_NAME = 'edit_suggestions_counts';

	private const CONFIG_PAGE = 'Editcheck-config.json';

	private const TIMEOUT_MS = 500;

	public function __construct(
		private readonly ?LinkedArtifactsClient $linkedArtifactsClient,
		private readonly PageLookup $pageLookup,
		private readonly WANObjectCache $cache,
		private readonly JobQueueGroup $jobQueueGroup,
		private readonly string $wikiId,
	) {
	}

	/**
	 * @param Title $title
	 * @param User $user
	 * @return int|null Null if the page is not covered, or the counts or configs are unavailable
	 */
	public function getCount( Title $title, User $user ): ?int {
		$client = $this->linkedArtifactsClient;
		if (
			!$client ||
			!$title->exists() ||
			!$client->coversPage( self::ARTIFACT_NAME, false, $title->getId(), $title->getNamespace() )
		) {
			return null;
		}

		$artifact = $this->fetchArtifact( $title->getId(), $title->getLatestRevID() );
		$counts = $artifact !== null ? self::getCountsFromArtifact( $artifact ) : null;
		if ( $counts === null ) {
			return null;
		}
		$configPage = $this->pageLookup->getExistingPageByText( self::CONFIG_PAGE, NS_MEDIAWIKI );
		$configs = $configPage ?
			$this->fetchArtifact( $configPage->getId(), $configPage->getLatest(), true ) :
			null;
		if ( $configs === null ) {
			return null;
		}

		$count = 0;
		foreach ( $counts as $name => $checkCount ) {
			$config = self::getConfigForCount( $configs, (string)$name );
			if ( $config && !self::doesConfigMatch( $config, $user ) ) {
				continue;
			}
			$count += (int)$checkCount;
		}
		return $count;
	}

	/**
	 * Find the config for a count. Some checks name their actions "<check>-<sub>", e.g.
	 * "textMatch-british-english" for a match rule, which has config "textMatch/british-english".
	 *
	 * @param array $configs Config summaries by key
	 * @param string $name Count name
	 * @return array|null
	 */
	public static function getConfigForCount( array $configs, string $name ): ?array {
		$keys = [ $name ];
		if ( str_contains( $name, '-' ) ) {
			[ $check, $sub ] = explode( '-', $name, 2 );
			$keys[] = "$check/$sub";
			$keys[] = $check;
		}
		foreach ( $keys as $key ) {
			if ( is_array( $configs[$key] ?? null ) ) {
				return $configs[$key];
			}
		}
		return null;
	}

	/**
	 * @param array $artifact Decoded counts artifact
	 * @return array|null Suggestion counts by check name, or null if malformed
	 */
	public static function getCountsFromArtifact( array $artifact ): ?array {
		if ( !isset( $artifact['revision'] ) ) {
			// Legacy flat format, e.g. {"*":5,"textMatch":2,"duplicateLink":3}, still in LAC
			// for revisions computed before T444218. Remove once those have been evicted.
			unset( $artifact['*'] );
			return $artifact;
		}
		$counts = $artifact['revision']['rendering']['edit_suggestions']['counts'] ?? null;
		return is_array( $counts ) ? $counts : null;
	}

	/**
	 * Duplicates the account/edit count logic of mw.editcheck.BaseEditCheck.static.doesConfigMatch.
	 *
	 * @param array $config Suggestion-mode config summary of one check
	 * @param User $user
	 * @return bool
	 */
	public static function doesConfigMatch( array $config, User $user ): bool {
		$account = $config['account'] ?? false;
		$maximumEditCount = $config['maximumEditCount'] ?? false;
		$minimumEditCount = $config['minimumEditCount'] ?? false;

		if ( $account === 'loggedout' && $user->isNamed() ) {
			return false;
		}
		if ( $account === 'loggedin' && !$user->isNamed() ) {
			return false;
		}
		$userEditCount = $user->getEditCount() ?? 0;
		if ( $maximumEditCount !== false && $userEditCount > $maximumEditCount ) {
			return false;
		}
		if ( $minimumEditCount !== false && $userEditCount < $minimumEditCount ) {
			return false;
		}
		return true;
	}

	/**
	 * @param int $pageId
	 * @param int $revisionId
	 * @param bool $prefetchOnMiss Queue a prefetch job if LAC doesn't have it
	 * @return array|null Decoded artifact, or null if LAC doesn't have it
	 */
	private function fetchArtifact( int $pageId, int $revisionId, bool $prefetchOnMiss = false ): ?array {
		$client = $this->linkedArtifactsClient;
		$jobQueueGroup = $this->jobQueueGroup;
		$wikiId = $this->wikiId;
		return $this->cache->getWithSetCallback(
			$this->cache->makeKey( 'visualeditor-editsuggestionscounts', $revisionId ),
			WANObjectCache::TTL_DAY,
			static function ( $oldValue, &$ttl ) use (
				$client, $jobQueueGroup, $wikiId, $pageId, $revisionId, $prefetchOnMiss
			) {
				$response = $client->fetchRevisionArtifact(
					self::ARTIFACT_NAME,
					false,
					$pageId,
					$revisionId,
					self::TIMEOUT_MS,
					LinkedArtifactsClient::CACHE_CONTROL_ONLY_IF_CACHED
				);
				$data = $response->isSuccess() ? $response->getJsonBody() : null;
				if ( $data === null ) {
					// Cache misses and failures briefly so a slow or missing LAC
					// doesn't hold up every page view
					$ttl = WANObjectCache::TTL_MINUTE;
					if ( $prefetchOnMiss ) {
						$jobQueueGroup->lazyPush( LinkedArtifactPrefetchJob::newRevisionJobSpec(
							self::ARTIFACT_NAME, $wikiId, $pageId, $revisionId
						) );
					}
				}
				return $data;
			}
		);
	}
}
