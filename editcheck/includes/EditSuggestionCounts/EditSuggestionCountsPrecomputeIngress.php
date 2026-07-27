<?php

declare( strict_types=1 );

namespace MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts;

use MediaWiki\DomainEvent\DomainEventIngress;
use MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts\Job\EditSuggestionCountsPrecomputeJob;
use MediaWiki\JobQueue\JobQueueGroup;
use MediaWiki\JobQueue\JobSpecification;
use MediaWiki\Page\Event\PageLatestRevisionChangedEvent;
use MediaWiki\Page\Event\PageLatestRevisionChangedListener;
use MediaWiki\WikiMap\WikiMap;

/**
 * Reacts to new page revisions by enqueuing a job that calls the edit-suggestion-counts
 * LAC endpoint, so the counts for the new revision are computed before a reader asks.
 *
 * A single PageLatestRevisionChanged listener covers all new revisions. The job is
 * submitted for edits, page creations, null edits, and dummy revisions.
 *
 * PoC: edit-suggestions-specific, living in VisualEditor for now. The generic LAC
 * cache-warming approach will move to a proper home (TBD) later. See
 * https://phabricator.wikimedia.org/T432733.
 */
class EditSuggestionCountsPrecomputeIngress
	extends DomainEventIngress
	implements PageLatestRevisionChangedListener
{

	/** Object spec for use with {@link DomainEventSource::registerSubscriber()} / extension.json. */
	public const OBJECT_SPEC = [
		'class' => self::class,
		'services' => [
			'JobQueueGroup',
			EditSuggestionCountsConfig::SERVICE_NAME,
		],
		'events' => [
			PageLatestRevisionChangedEvent::TYPE,
		],
	];

	private JobQueueGroup $jobQueueGroup;
	private EditSuggestionCountsConfig $config;

	public function __construct(
		JobQueueGroup $jobQueueGroup,
		EditSuggestionCountsConfig $config
	) {
		$this->jobQueueGroup = $jobQueueGroup;
		$this->config = $config;
	}

	public function handlePageLatestRevisionChangedEvent(
		PageLatestRevisionChangedEvent $event
	): void {
		if ( !$this->config->isEnabled() ) {
			return;
		}

		// Precompute for EVERY latest-revision change, deliberately including null edits
		// and dummy revisions (e.g. protection changes) — i.e. we do NOT filter on
		// isEffectiveContentChange():
		//  - Null edits are a (hacky) way for users to force recomputation of derived data.
		//  - Read should fetch the counts by the page's *latest* revision id, so the latest
		//    revision must always be precomputed, even when its content is unchanged.
		$page = $event->getPage();
		if ( !$this->config->isNamespaceEnabled( $page->getNamespace() ) ) {
			return;
		}

		// A page's getWikiId() returns false for the local wiki.
		$wikiId = $page->getWikiId() ?: WikiMap::getCurrentWikiId();
		$pageId = $event->getPageId();
		if ( !$this->config->isPageInSample( $wikiId, $pageId ) ) {
			return;
		}

		$this->jobQueueGroup->lazyPush(
			new JobSpecification(
				EditSuggestionCountsPrecomputeJob::JOB_NAME,
				[
					'wiki_id' => $wikiId,
					'page_id' => $pageId,
					'revision_id' => $event->getLatestRevisionAfter()->getId(),
				],
				[ 'removeDuplicates' => true ]
			)
		);
	}
}
