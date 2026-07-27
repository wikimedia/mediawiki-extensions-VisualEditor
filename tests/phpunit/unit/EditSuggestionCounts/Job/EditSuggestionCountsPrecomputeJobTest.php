<?php

namespace MediaWiki\Extension\VisualEditor\Tests\Unit\EditSuggestionCounts\Job;

use MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts\EditSuggestionCountsConfig;
use MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts\Job\EditSuggestionCountsPrecomputeJob;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\Http\MWHttpRequest;
use MediaWiki\Status\Status;
use MediaWikiUnitTestCase;
use PHPUnit\Framework\Assert;

/**
 * @covers \MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts\Job\EditSuggestionCountsPrecomputeJob
 */
class EditSuggestionCountsPrecomputeJobTest extends MediaWikiUnitTestCase {

	private const PARAMS = [
		'wiki_id' => 'enwiki',
		'page_id' => 42,
		'revision_id' => 99,
	];

	private function newConfig(): EditSuggestionCountsConfig {
		return new EditSuggestionCountsConfig( [
			'enabled' => true,
			'linked_artifact_url_template' => 'https://lac.example/{wiki_id}/{page_id}/{revision_id}',
			'linked_artifact_precompute_timeout' => 5,
		] );
	}

	/**
	 * @param bool $ok Whether the HTTP request's status isOK().
	 * @param int $httpStatus The HTTP status code getStatus() reports.
	 */
	private function newHttpRequestFactory( bool $ok, int $httpStatus ): HttpRequestFactory {
		$status = $this->createMock( Status::class );
		$status->method( 'isOK' )->willReturn( $ok );

		$request = $this->createMock( MWHttpRequest::class );
		$request->method( 'execute' )->willReturn( $status );
		$request->method( 'getStatus' )->willReturn( $httpStatus );

		$factory = $this->createMock( HttpRequestFactory::class );
		$factory->method( 'create' )->willReturn( $request );

		return $factory;
	}

	public function testSuccessfulRequestReturnsTrue(): void {
		$captured = null;
		$status = $this->createMock( Status::class );
		$status->method( 'isOK' )->willReturn( true );

		$request = $this->createMock( MWHttpRequest::class );
		$request->method( 'execute' )->willReturn( $status );
		$request->expects( $this->once() )
			->method( 'setHeader' )
			->with( 'Cache-Control', 'no-cache' );

		$factory = $this->createMock( HttpRequestFactory::class );
		$factory->expects( $this->once() )
			->method( 'create' )
			->willReturnCallback( static function ( $url, $options ) use ( &$captured, $request ) {
				$captured = [ 'url' => $url, 'options' => $options ];
				return $request;
			} );

		$job = new EditSuggestionCountsPrecomputeJob( self::PARAMS, $this->newConfig(), $factory );

		$this->assertTrue( $job->run() );
		Assert::assertSame( 'https://lac.example/enwiki/42/99', $captured['url'] );
		Assert::assertSame( 'GET', $captured['options']['method'] );
		Assert::assertSame( 5, $captured['options']['timeout'] );
	}

	public function testFailedRequestSetsLastErrorAndReturnsFalse(): void {
		$factory = $this->newHttpRequestFactory( false, 500 );

		$job = new EditSuggestionCountsPrecomputeJob( self::PARAMS, $this->newConfig(), $factory );

		$this->assertFalse( $job->run() );
		$this->assertNotFalse( $job->getLastError() );
		$this->assertStringContainsString( '500', $job->getLastError() );
	}
}
