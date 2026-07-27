<?php

namespace MediaWiki\Extension\VisualEditor\Tests\Unit\EditSuggestionCounts;

use MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts\EditSuggestionCountsConfig;
use MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts\EditSuggestionCountsPrecomputeIngress;
use MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts\Job\EditSuggestionCountsPrecomputeJob;
use MediaWiki\JobQueue\JobQueueGroup;
use MediaWiki\JobQueue\JobSpecification;
use MediaWiki\Page\Event\PageLatestRevisionChangedEvent;
use MediaWiki\Page\ProperPageIdentity;
use MediaWiki\Revision\RevisionRecord;
use MediaWikiUnitTestCase;
use PHPUnit\Framework\Assert;

/**
 * @covers \MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts\EditSuggestionCountsPrecomputeIngress
 */
class EditSuggestionCountsPrecomputeIngressTest extends MediaWikiUnitTestCase {

	private static function newConfig( array $overrides = [] ): EditSuggestionCountsConfig {
		return new EditSuggestionCountsConfig( $overrides + [
			'enabled' => true,
			'linked_artifact_url_template' => 'https://lac.example/{wiki_id}/{page_id}/{revision_id}',
			'linked_artifact_precompute_timeout' => 5,
			'namespaces_enabled' => [ 0 ],
			'page_sample_proportion' => 1.0,
		] );
	}

	private function newEvent( int $namespace = 0 ): PageLatestRevisionChangedEvent {
		$revision = $this->createMock( RevisionRecord::class );
		$revision->method( 'getId' )->willReturn( 99 );

		$page = $this->createMock( ProperPageIdentity::class );
		$page->method( 'getNamespace' )->willReturn( $namespace );
		$page->method( 'getWikiId' )->willReturn( 'enwiki' );

		$event = $this->createMock( PageLatestRevisionChangedEvent::class );
		$event->method( 'getPage' )->willReturn( $page );
		$event->method( 'getPageId' )->willReturn( 42 );
		$event->method( 'getLatestRevisionAfter' )->willReturn( $revision );

		return $event;
	}

	public function testPushesJobForNewRevision(): void {
		$jobQueueGroup = $this->createMock( JobQueueGroup::class );
		$jobQueueGroup->expects( $this->once() )
			->method( 'lazyPush' )
			->willReturnCallback( static function ( JobSpecification $spec ) {
				Assert::assertSame( EditSuggestionCountsPrecomputeJob::JOB_NAME, $spec->getType() );
				$params = $spec->getParams();
				Assert::assertSame( 'enwiki', $params['wiki_id'] );
				Assert::assertSame( 42, $params['page_id'] );
				Assert::assertSame( 99, $params['revision_id'] );
			} );

		$ingress = new EditSuggestionCountsPrecomputeIngress( $jobQueueGroup, self::newConfig() );
		$ingress->handlePageLatestRevisionChangedEvent( $this->newEvent() );
	}

	public function testPushesEvenWhenContentIsUnchanged(): void {
		// Null edits and dummy revisions (same content) must still precompute: null edits
		// force recomputation, and reads use the page's latest revision id regardless.
		$jobQueueGroup = $this->createMock( JobQueueGroup::class );
		$jobQueueGroup->expects( $this->once() )->method( 'lazyPush' );

		$ingress = new EditSuggestionCountsPrecomputeIngress( $jobQueueGroup, self::newConfig() );
		$ingress->handlePageLatestRevisionChangedEvent( $this->newEvent() );
	}

	public function testDisabledDoesNotPush(): void {
		$jobQueueGroup = $this->createMock( JobQueueGroup::class );
		$jobQueueGroup->expects( $this->never() )->method( 'lazyPush' );

		$ingress = new EditSuggestionCountsPrecomputeIngress(
			$jobQueueGroup,
			self::newConfig( [ 'enabled' => false ] )
		);
		$ingress->handlePageLatestRevisionChangedEvent( $this->newEvent() );
	}

	public function testNamespaceFilterSkipsOutOfListNamespace(): void {
		$jobQueueGroup = $this->createMock( JobQueueGroup::class );
		$jobQueueGroup->expects( $this->never() )->method( 'lazyPush' );

		$ingress = new EditSuggestionCountsPrecomputeIngress(
			$jobQueueGroup,
			self::newConfig( [ 'namespaces_enabled' => [ 0 ] ] )
		);
		// Namespace 1 (Talk) is not in the [0] allowlist.
		$ingress->handlePageLatestRevisionChangedEvent( $this->newEvent( 1 ) );
	}

	public function testSampleZeroSkips(): void {
		$jobQueueGroup = $this->createMock( JobQueueGroup::class );
		$jobQueueGroup->expects( $this->never() )->method( 'lazyPush' );

		$ingress = new EditSuggestionCountsPrecomputeIngress(
			$jobQueueGroup,
			self::newConfig( [ 'page_sample_proportion' => 0.0 ] )
		);
		$ingress->handlePageLatestRevisionChangedEvent( $this->newEvent() );
	}
}
