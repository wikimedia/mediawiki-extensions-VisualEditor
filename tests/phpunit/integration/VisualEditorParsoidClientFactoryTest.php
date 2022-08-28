<?php

namespace MediaWiki\Extension\VisualEditor\Tests;

use IBufferingStatsdDataFactory;
use MediaWiki\Config\ServiceOptions;
use MediaWiki\Edit\ParsoidOutputStash;
use MediaWiki\Extension\VisualEditor\DirectParsoidClient;
use MediaWiki\Extension\VisualEditor\VisualEditorParsoidClientFactory;
use MediaWiki\Extension\VisualEditor\VRSParsoidClient;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\MainConfigNames;
use MediaWiki\Parser\Parsoid\HTMLTransformFactory;
use MediaWiki\Parser\Parsoid\ParsoidOutputAccess;
use MediaWikiIntegrationTestCase;
use MultiHttpClient;
use ParsoidVirtualRESTService;
use Psr\Log\NullLogger;
use Wikimedia\TestingAccessWrapper;

/**
 * @coversDefaultClass \MediaWiki\Extension\VisualEditor\VisualEditorParsoidClientFactory
 */
class VisualEditorParsoidClientFactoryTest extends MediaWikiIntegrationTestCase {

	/**
	 * @covers ::__construct
	 */
	public function testGetVisualEditorParsoidClientFactory() {
		$veParsoidClientFactory = $this->getServiceContainer()
			->get( VisualEditorParsoidClientFactory::SERVICE_NAME );

		$this->assertInstanceOf( VisualEditorParsoidClientFactory::class, $veParsoidClientFactory );
	}

	private function newClientFactory( array $optionValues ) {
		$options = new ServiceOptions( VisualEditorParsoidClientFactory::CONSTRUCTOR_OPTIONS, $optionValues );

		$httpRequestFactory = $this->createNoOpMock( HttpRequestFactory::class, [ 'createMultiClient' ] );
		$httpRequestFactory->method( 'createMultiClient' )->willReturn(
			$this->createNoOpMock( MultiHttpClient::class )
		);

		return new VisualEditorParsoidClientFactory(
			$options,
			$httpRequestFactory,
			new NullLogger(),
			$this->createNoOpMock( ParsoidOutputStash::class ),
			$this->createNoOpMock( IBufferingStatsdDataFactory::class ),
			$this->createNoOpMock( ParsoidOutputAccess::class ),
			$this->createNoOpMock( HTMLTransformFactory::class )
		);
	}

	public function provideGetClient() {
		yield [
			[
				MainConfigNames::ParsoidSettings => [],
				MainConfigNames::VirtualRestConfig => [
					'modules' => []
				],
				VisualEditorParsoidClientFactory::ENABLE_COOKIE_FORWARDING => false,
				VisualEditorParsoidClientFactory::USE_AUTO_CONFIG => true
			],
			DirectParsoidClient::class
		];

		yield [
			[
				MainConfigNames::ParsoidSettings => [],
				MainConfigNames::VirtualRestConfig => [],
				VisualEditorParsoidClientFactory::ENABLE_COOKIE_FORWARDING => false,
				VisualEditorParsoidClientFactory::USE_AUTO_CONFIG => true
			],
			DirectParsoidClient::class
		];

		yield [
			[
				MainConfigNames::ParsoidSettings => [],
				MainConfigNames::VirtualRestConfig => [
					'modules' => [ 'restbase' => [] ]
				],
				VisualEditorParsoidClientFactory::ENABLE_COOKIE_FORWARDING => false,
				VisualEditorParsoidClientFactory::USE_AUTO_CONFIG => true
			],
			VRSParsoidClient::class
		];

		yield [
			[
				MainConfigNames::ParsoidSettings => [],
				MainConfigNames::VirtualRestConfig => [
					'modules' => [ 'parsoid' => [] ]
				],
				VisualEditorParsoidClientFactory::ENABLE_COOKIE_FORWARDING => false,
				VisualEditorParsoidClientFactory::USE_AUTO_CONFIG => true
			],
			VRSParsoidClient::class
		];
	}

	/**
	 * @dataProvider provideGetClient
	 * @covers ::createParsoidClient
	 */
	public function testGetClient( $optionValues, $expectedType ) {
		$client = $this->newClientFactory( $optionValues )->createParsoidClient( false );

		$this->assertInstanceOf( $expectedType, $client );
	}

	public function provideCookieToForward() {
		yield 'When no cookie is sent' => [ false, false ];

		yield 'When a cookie is sent as a string' => [ 'cookie', 'cookie' ];

		yield 'When a cookie is sent as an array' => [ [ 'cookie' ], 'cookie' ];
	}

	/**
	 * @dataProvider provideCookieToForward
	 * @covers ::createParsoidClient
	 */
	public function testGetVRSClientForwardedCookies( $cookie, $expectedCookie ) {
		$optionValues = [
			MainConfigNames::ParsoidSettings => [],
			MainConfigNames::VirtualRestConfig => [
				'modules' => [
					'parsoid' => [
						'forwardCookies' => true,
						'restbaseCompat' => false,
					]
				]
			],
			VisualEditorParsoidClientFactory::ENABLE_COOKIE_FORWARDING => true,
			VisualEditorParsoidClientFactory::USE_AUTO_CONFIG => true
		];

		$parsoidClient = $this->newClientFactory( $optionValues )->createParsoidClient( $cookie );
		$vrsClient = TestingAccessWrapper::newFromObject( $parsoidClient )->vrsClient;

		$mountAndService = $vrsClient->getMountAndService( '/restbase/' );

		// Assert that the mount and service are correct
		$this->assertInstanceOf( ParsoidVirtualRESTService::class, $mountAndService[1] );
		$this->assertSame( '/restbase/', $mountAndService[0] );
		$this->assertSame( 'parsoid', $mountAndService[1]->getName() );

		$reqs = [
			[
				'url' => 'local/v1/page/html/Main_Page',
				'domain' => 'local',
				'timeout' => null,
				'forwardCookies' => true,
				'HTTPProxy' => null,
				'restbaseCompat' => true,
			],
		];
		$res = $mountAndService[1]->onRequests( $reqs, static function () {
			return;
		} );

		if ( $cookie && is_string( $cookie ) ) {
			$this->assertTrue( isset( $res[0]['forwardCookies'] ) );
			$this->assertSame( $expectedCookie, $res[0]['headers']['Cookie'] );
		} elseif ( $cookie && is_array( $cookie ) ) {
			$this->assertTrue( $res[0]['forwardCookies'] );
			$this->assertSame( $expectedCookie, $res[0]['headers']['Cookie'][0] );
		} else {
			$this->assertTrue( $res[0]['forwardCookies'] );
			$this->assertArrayNotHasKey( 'Cookie', $res[0]['headers'] );
		}
		$this->assertSame( 'local', $res[0]['domain'] );
		$this->assertTrue( $res[0]['forwardCookies'] );
		$this->assertArrayHasKey( 'headers', $res[0] );
		$this->assertArrayHasKey( 'Host', $res[0]['headers'] );
	}

}
