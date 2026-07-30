<?php

namespace MediaWiki\Extension\VisualEditor\Tests\Integration\EditSuggestionCounts;

use MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts\EditSuggestionCountsConfig;
use MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts\EditSuggestionCountsPrecomputeIngress;
use MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts\Job\EditSuggestionCountsPrecomputeJob;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\Http\MWHttpRequest;
use MediaWiki\JobQueue\Job;
use MediaWiki\Page\Event\PageLatestRevisionChangedEvent;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Status\Status;
use MediaWiki\Storage\PageUpdateCauses;
use MediaWiki\Storage\RevisionSlotsUpdate;
use MediaWiki\WikiMap\WikiMap;
use MediaWikiIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts\EditSuggestionCountsPrecomputeIngress
 * @covers \MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts\Job\EditSuggestionCountsPrecomputeJob
 * @group Database
 * @group VisualEditor
 */
class EditSuggestionCountsPrecomputeIngressTest extends MediaWikiIntegrationTestCase {

	private const URL_TEMPLATE =
		'https://lac.example/v1/edit-suggestion-counts/{wiki_id}/{page_id}/{revision_id}';

	private function enableFeature(): void {
		$this->overrideConfigValue( 'VisualEditorEditSuggestionCounts', [
			'enabled' => true,
			'linked_artifact_url_template' => self::URL_TEMPLATE,
			'linked_artifact_precompute_timeout' => 5,
			'namespaces_enabled' => [ 0 ],
			'page_sample_proportion' => 1.0,
		] );
	}

	/**
	 * Edit a page and run the ingress on the resulting revision (which enqueues the
	 * precompute job). Does not pop — callers pop when ready (e.g. after mocking HTTP).
	 *
	 * @param string $pageTitle
	 * @return RevisionRecord the new revision
	 */
	private function enqueuePrecomputeJobForNewEdit( string $pageTitle ): RevisionRecord {
		$status = $this->editPage( $pageTitle, 'content' );
		$revision = $status->getNewRevision();
		$pageRecord = $this->getServiceContainer()->getPageStore()
			->getPageById( $revision->getPageId() );

		$event = new PageLatestRevisionChangedEvent(
			PageUpdateCauses::CAUSE_EDIT,
			null,
			$pageRecord,
			null,
			$revision,
			new RevisionSlotsUpdate(),
			null,
			$this->getTestUser()->getUserIdentity()
		);

		$services = $this->getServiceContainer();
		$ingress = new EditSuggestionCountsPrecomputeIngress(
			$services->getJobQueueGroup(),
			$services->getService( EditSuggestionCountsConfig::SERVICE_NAME )
		);
		$ingress->handlePageLatestRevisionChangedEvent( $event );

		return $revision;
	}

	private function popPrecomputeJob(): ?Job {
		// Under CLI (PHPUnit), JobQueueGroup::lazyPush() pushes immediately.
		return $this->getServiceContainer()->getJobQueueGroup()
			->get( EditSuggestionCountsPrecomputeJob::JOB_NAME )->pop();
	}

	public function testHandlerEnqueuesPrecomputeJobForContentChange(): void {
		$this->enableFeature();

		$revision = $this->enqueuePrecomputeJobForNewEdit( 'EditSuggestionCountsPrecomputeTestPage' );

		$job = $this->popPrecomputeJob();
		$this->assertInstanceOf( EditSuggestionCountsPrecomputeJob::class, $job );
		$params = $job->getParams();
		$this->assertSame( WikiMap::getCurrentWikiId(), $params['wiki_id'] );
		$this->assertSame( $revision->getPageId(), $params['page_id'] );
		$this->assertSame( $revision->getId(), $params['revision_id'] );
	}

	public function testEnqueuedJobCallsLacEndpoint(): void {
		$this->enableFeature();

		$revision = $this->enqueuePrecomputeJobForNewEdit( 'EditSuggestionCountsJobRunTestPage' );

		// Mock the LAC HTTP call so running the job makes no real request, capturing the
		// URL and the Cache-Control header. Set AFTER the edit (so any hooks/listeners
		// firing during the edit use the real HTTP factory) but BEFORE popping (the job is
		// instantiated at pop and is then wired with the mock).
		$captured = [];
		$request = $this->createMock( MWHttpRequest::class );
		$request->method( 'execute' )->willReturn( Status::newGood() );
		$request->method( 'setHeader' )
			->willReturnCallback( static function ( $name, $value ) use ( &$captured ) {
				$captured['headers'][$name] = $value;
			} );

		$httpRequestFactory = $this->createMock( HttpRequestFactory::class );
		$httpRequestFactory->method( 'create' )
			->willReturnCallback( static function ( $url, $options ) use ( &$captured, $request ) {
				$captured['url'] = $url;
				$captured['options'] = $options;
				return $request;
			} );
		$this->setService( 'HttpRequestFactory', $httpRequestFactory );

		$job = $this->popPrecomputeJob();
		$this->assertInstanceOf( EditSuggestionCountsPrecomputeJob::class, $job );

		$this->assertTrue( $job->run() );

		$wikiId = WikiMap::getCurrentWikiId();
		$expectedUrl = 'https://lac.example/v1/edit-suggestion-counts/'
			. rawurlencode( $wikiId ) . '/' . $revision->getPageId() . '/' . $revision->getId();

		$this->assertSame( $expectedUrl, $captured['url'] );
		$this->assertSame( 'GET', $captured['options']['method'] );
		$this->assertSame( 'no-cache', $captured['headers']['Cache-Control'] );
	}
}
