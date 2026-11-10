<?php

namespace MediaWiki\Extension\VisualEditor\EditCheck\Tests\Unit\EditSuggestionCounts;

use MediaWiki\Extension\EventBus\LinkedArtifacts\Job\LinkedArtifactPrefetchJob;
use MediaWiki\Extension\EventBus\LinkedArtifacts\LinkedArtifactResponse;
use MediaWiki\Extension\EventBus\LinkedArtifacts\LinkedArtifactsClient;
use MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts\EditSuggestionsCountsLookup;
use MediaWiki\JobQueue\JobQueueGroup;
use MediaWiki\JobQueue\JobSpecification;
use MediaWiki\Page\ExistingPageRecord;
use MediaWiki\Page\PageLookup;
use MediaWiki\Title\Title;
use MediaWiki\User\User;
use MediaWikiUnitTestCase;
use Wikimedia\ObjectCache\HashBagOStuff;
use Wikimedia\ObjectCache\WANObjectCache;

/**
 * @covers \MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts\EditSuggestionsCountsLookup
 */
class EditSuggestionsCountsLookupTest extends MediaWikiUnitTestCase {

	private const COUNTS = [
		'citationNeeded' => 1,
		'externalLink' => 2,
		'suggestedLink' => 4,
	];

	private const ARTIFACT = [
		'wiki_id' => 'enwiki',
		'page' => [ 'namespace_id' => 0, 'page_id' => 42, 'page_title' => 'Example' ],
		'revision' => [
			'rev_id' => 99,
			'rendering' => [
				'render_id' => '83c65a97-bc3e-11f1-9680-b5b59ebb64f0',
				'render_dt' => '2026-09-29T19:02:50Z',
				'edit_suggestions' => [
					'software_info' => [ 'name' => 'VisualEditor', 'version' => '1.46.0-wmf.1' ],
					'config_page_rev_id' => 50,
					'total_count' => 7,
					'counts' => self::COUNTS,
				],
			],
		],
	];

	private const LEGACY_ARTIFACT = [ '*' => 7 ] + self::COUNTS;

	private const CONFIGS = [
		'citationNeeded' => [ 'account' => false, 'minimumEditCount' => false, 'maximumEditCount' => false ],
		'externalLink' => [ 'account' => 'loggedin', 'minimumEditCount' => false, 'maximumEditCount' => false ],
		'suggestedLink' => [ 'account' => false, 'minimumEditCount' => 1000, 'maximumEditCount' => false ],
	];

	private const PAGE_ID = 42;
	private const REV_ID = 99;
	private const CONFIG_PAGE_ID = 5;
	private const CONFIG_REV_ID = 50;

	protected function setUp(): void {
		parent::setUp();
		if ( !class_exists( LinkedArtifactsClient::class ) ) {
			$this->markTestSkipped( 'EventBus LinkedArtifacts not available' );
		}
	}

	private function newTitle( bool $exists = true ): Title {
		$title = $this->createMock( Title::class );
		$title->method( 'exists' )->willReturn( $exists );
		$title->method( 'getNamespace' )->willReturn( 0 );
		$title->method( 'getId' )->willReturn( self::PAGE_ID );
		$title->method( 'getLatestRevID' )->willReturn( self::REV_ID );
		return $title;
	}

	private function newUser( bool $named = true, int $editCount = 0 ): User {
		$user = $this->createMock( User::class );
		$user->method( 'isNamed' )->willReturn( $named );
		$user->method( 'getEditCount' )->willReturn( $editCount );
		return $user;
	}

	/**
	 * @param bool $covers
	 * @param array<int,LinkedArtifactResponse> $responses Keyed by revision ID
	 * @param int[]|null &$fetchedRevIds
	 * @return LinkedArtifactsClient
	 */
	private function newClient( bool $covers, array $responses, ?array &$fetchedRevIds = null ): LinkedArtifactsClient {
		$fetchedRevIds = [];
		$client = $this->createMock( LinkedArtifactsClient::class );
		$client->method( 'coversPage' )
			->with( 'edit_suggestions_counts', false, self::PAGE_ID, 0 )
			->willReturn( $covers );
		$client->method( 'fetchRevisionArtifact' )->willReturnCallback(
			function ( $name, $wikiId, $pageId, $revId, $timeout, $cacheControl ) use ( $responses, &$fetchedRevIds ) {
				$this->assertSame( 'edit_suggestions_counts', $name );
				$this->assertSame( LinkedArtifactsClient::CACHE_CONTROL_ONLY_IF_CACHED, $cacheControl );
				$this->assertSame( $revId === self::CONFIG_REV_ID ? self::CONFIG_PAGE_ID : self::PAGE_ID, $pageId );
				$fetchedRevIds[] = $revId;
				return $responses[$revId] ?? new LinkedArtifactResponse( 504 );
			}
		);
		return $client;
	}

	private static function ok( array $data ): LinkedArtifactResponse {
		return new LinkedArtifactResponse( 200, [], json_encode( $data ) );
	}

	private function newLookup(
		?LinkedArtifactsClient $client, bool $configPageExists = true, ?JobQueueGroup $jobQueueGroup = null
	): EditSuggestionsCountsLookup {
		$configPage = $this->createMock( ExistingPageRecord::class );
		$configPage->method( 'getId' )->willReturn( self::CONFIG_PAGE_ID );
		$configPage->method( 'getLatest' )->willReturn( self::CONFIG_REV_ID );
		$pageLookup = $this->createMock( PageLookup::class );
		$pageLookup->method( 'getExistingPageByText' )
			->with( 'Editcheck-config.json', NS_MEDIAWIKI )
			->willReturn( $configPageExists ? $configPage : null );
		return new EditSuggestionsCountsLookup(
			$client,
			$pageLookup,
			new WANObjectCache( [ 'cache' => new HashBagOStuff() ] ),
			$jobQueueGroup ?? $this->createMock( JobQueueGroup::class ),
			'testwiki'
		);
	}

	public static function provideGetCount(): iterable {
		$artifacts = [ 'artifact' => self::ARTIFACT, 'legacy artifact' => self::LEGACY_ARTIFACT ];
		foreach ( $artifacts as $label => $artifact ) {
			yield "anon, $label" => [ $artifact, false, 0, 1 ];
			yield "named, $label" => [ $artifact, true, 0, 3 ];
			yield "experienced, $label" => [ $artifact, true, 5000, 7 ];
		}
	}

	/**
	 * @dataProvider provideGetCount
	 */
	public function testGetCount( array $artifact, bool $named, int $editCount, int $expected ): void {
		$client = $this->newClient( true, [
			self::REV_ID => self::ok( $artifact ),
			self::CONFIG_REV_ID => self::ok( self::CONFIGS ),
		], $fetchedRevIds );
		$lookup = $this->newLookup( $client );
		$user = $this->newUser( $named, $editCount );
		$this->assertSame( $expected, $lookup->getCount( $this->newTitle(), $user ) );
		// Second call is served from the WAN cache
		$this->assertSame( $expected, $lookup->getCount( $this->newTitle(), $user ) );
		$this->assertSame( [ self::REV_ID, self::CONFIG_REV_ID ], $fetchedRevIds );
	}

	public function testGetCountNotCached(): void {
		$lookup = $this->newLookup( $this->newClient( true, [], $fetchedRevIds ) );
		$this->assertNull( $lookup->getCount( $this->newTitle(), $this->newUser() ) );
		// Misses are cached briefly, so LAC isn't asked again
		$this->assertNull( $lookup->getCount( $this->newTitle(), $this->newUser() ) );
		$this->assertSame( [ self::REV_ID ], $fetchedRevIds );
	}

	public function testGetCountConfigsUnavailable(): void {
		$responses = [ self::REV_ID => self::ok( self::ARTIFACT ) ];
		$this->assertNull(
			$this->newLookup( $this->newClient( true, $responses ) )
				->getCount( $this->newTitle(), $this->newUser() )
		);
		$this->assertNull(
			$this->newLookup( $this->newClient( true, $responses ), false )
				->getCount( $this->newTitle(), $this->newUser() )
		);
	}

	public function testGetCountConfigsNotCachedQueuesPrefetch(): void {
		$jobQueueGroup = $this->createMock( JobQueueGroup::class );
		$jobQueueGroup->expects( $this->once() )->method( 'lazyPush' )->willReturnCallback(
			function ( JobSpecification $job ) {
				$params = $job->getParams();
				$this->assertSame( 'edit_suggestions_counts', $params[LinkedArtifactPrefetchJob::ARTIFACT_NAME_PARAM] );
				$this->assertSame( 'testwiki', $params[LinkedArtifactPrefetchJob::WIKI_ID_PARAM] );
				$this->assertSame( self::CONFIG_PAGE_ID, $params[LinkedArtifactPrefetchJob::PAGE_ID_PARAM] );
				$this->assertSame( self::CONFIG_REV_ID, $params[LinkedArtifactPrefetchJob::REVISION_ID_PARAM] );
			}
		);
		$lookup = $this->newLookup(
			$this->newClient( true, [ self::REV_ID => self::ok( self::ARTIFACT ) ] ), true, $jobQueueGroup
		);
		$this->assertNull( $lookup->getCount( $this->newTitle(), $this->newUser() ) );
		// The miss is cached, so the job is queued once
		$this->assertNull( $lookup->getCount( $this->newTitle(), $this->newUser() ) );
	}

	public function testGetCountNotCachedDoesNotQueuePrefetch(): void {
		$jobQueueGroup = $this->createMock( JobQueueGroup::class );
		$jobQueueGroup->expects( $this->never() )->method( 'lazyPush' );
		$lookup = $this->newLookup( $this->newClient( true, [] ), true, $jobQueueGroup );
		$this->assertNull( $lookup->getCount( $this->newTitle(), $this->newUser() ) );
	}

	public static function provideGetConfigForCount(): iterable {
		$configs = [
			'textMatch' => [ 'account' => 'check' ],
			'textMatch/british-english' => [ 'account' => 'rule' ],
			'llmSuggestion' => [ 'account' => 'llm' ],
			'llm-paste' => [ 'account' => 'paste' ],
			'notArray' => false,
		];
		yield 'exact' => [ $configs, 'textMatch', 'check' ];
		yield 'match rule' => [ $configs, 'textMatch-british-english', 'rule' ];
		yield 'match rule without config' => [ $configs, 'textMatch-other', 'check' ];
		yield 'sub-type' => [ $configs, 'llmSuggestion-copyedit', 'llm' ];
		yield 'hyphen in check name' => [ $configs, 'llm-paste', 'paste' ];
		yield 'unknown' => [ $configs, 'addReference', null ];
		yield 'unknown with sub-type' => [ $configs, 'addReference-foo', null ];
		yield 'not an array' => [ $configs, 'notArray', null ];
	}

	/**
	 * @dataProvider provideGetConfigForCount
	 */
	public function testGetConfigForCount( array $configs, string $name, ?string $expectedAccount ): void {
		$config = EditSuggestionsCountsLookup::getConfigForCount( $configs, $name );
		$this->assertSame( $expectedAccount, $config['account'] ?? null );
	}

	public function testGetCountMatchRule(): void {
		$artifact = self::ARTIFACT;
		$artifact['revision']['rendering']['edit_suggestions']['counts'] = [
			'textMatch-british-english' => 2,
			'textMatch-other' => 3,
		];
		$client = $this->newClient( true, [
			self::REV_ID => self::ok( $artifact ),
			self::CONFIG_REV_ID => self::ok( [
				'textMatch' => [ 'account' => false, 'minimumEditCount' => false, 'maximumEditCount' => false ],
				'textMatch/british-english' => [
					'account' => 'loggedin', 'minimumEditCount' => false, 'maximumEditCount' => false
				],
			] ),
		] );
		$this->assertSame( 3, $this->newLookup( $client )->getCount( $this->newTitle(), $this->newUser( false ) ) );
	}

	public function testGetCountMalformed(): void {
		$artifact = self::ARTIFACT;
		unset( $artifact['revision']['rendering']['edit_suggestions'] );
		$client = $this->newClient( true, [
			self::REV_ID => self::ok( $artifact ),
			self::CONFIG_REV_ID => self::ok( self::CONFIGS ),
		] );
		$this->assertNull( $this->newLookup( $client )->getCount( $this->newTitle(), $this->newUser() ) );
	}

	public function testGetCountUnavailable(): void {
		$user = $this->newUser();
		$this->assertNull( $this->newLookup( null )->getCount( $this->newTitle(), $user ) );
		$this->assertNull(
			$this->newLookup( $this->newClient( false, [], $fetchedRevIds ) )->getCount( $this->newTitle(), $user )
		);
		$this->assertNull(
			$this->newLookup( $this->newClient( true, [], $fetchedRevIds ) )
				->getCount( $this->newTitle( false ), $user )
		);
		$this->assertSame( [], $fetchedRevIds );
	}
}
