<?php

namespace MediaWiki\Extension\VisualEditor\Tests;

use MediaWiki\Config\ServiceOptions;
use MediaWiki\Extension\VisualEditor\VisualEditorParsoidClient;
use MediaWiki\Extension\VisualEditor\VisualEditorParsoidClientFactory;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\MainConfigNames;
use MediaWiki\Parser\Parsoid\Config\DataAccess;
use MediaWiki\Parser\Parsoid\Config\PageConfigFactory;
use MediaWiki\Parser\Parsoid\Config\SiteConfig;
use MediaWikiIntegrationTestCase;
use MultiHttpClient;
use ParsoidVirtualRESTService;
use VirtualRESTServiceClient;
use Wikimedia\UUID\GlobalIdGenerator;

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
			$this->createNoOpMock( SiteConfig::class ),
			$this->createNoOpMock( PageConfigFactory::class ),
			$this->createNoOpMock( DataAccess::class ),
			$this->createNoOpMock( GlobalIdGenerator::class ),
			$httpRequestFactory
		);
	}

	/**
	 * @covers ::getVisualEditorParsoidClient
	 */
	public function testGetDirectClient() {
		$optionValues = [
			MainConfigNames::ParsoidSettings => [],
			MainConfigNames::VirtualRestConfig => [ 'modules' => [] ],
			VisualEditorParsoidClientFactory::ENABLE_COOKIE_FORWARDING => false,
			VisualEditorParsoidClientFactory::USE_AUTO_CONFIG => true
		];

		$veParsoidClient = $this->newClientFactory( $optionValues )
			->getDirectClient();

		$this->assertInstanceOf( VisualEditorParsoidClient::class, $veParsoidClient );
	}

	public function provideGetDirectCLientReturnsNull() {
		yield [
			[
				MainConfigNames::ParsoidSettings => [],
				MainConfigNames::VirtualRestConfig => [
					'modules' => [ 'restbase' => '' ]
				],
				VisualEditorParsoidClientFactory::ENABLE_COOKIE_FORWARDING => false,
				VisualEditorParsoidClientFactory::USE_AUTO_CONFIG => true
			],
		];

		yield [
			[
				MainConfigNames::ParsoidSettings => [],
				MainConfigNames::VirtualRestConfig => [
					'modules' => [ 'parsoid' => '' ]
				],
				VisualEditorParsoidClientFactory::ENABLE_COOKIE_FORWARDING => false,
				VisualEditorParsoidClientFactory::USE_AUTO_CONFIG => true
			]
		];

		yield [
			[
				MainConfigNames::ParsoidSettings => [],
				MainConfigNames::VirtualRestConfig => [],
				VisualEditorParsoidClientFactory::ENABLE_COOKIE_FORWARDING => false,
				VisualEditorParsoidClientFactory::USE_AUTO_CONFIG => false
			]
		];
	}

	/**
	 * @dataProvider provideGetDirectCLientReturnsNull
	 * @covers ::getVisualEditorParsoidClient
	 */
	public function testGetDirectClientReturnsNull( $optionValues ) {
		$veParsoidClient = $this->newClientFactory( $optionValues )->getDirectClient();

		$this->assertNull( $veParsoidClient );
	}

	/**
	 * @covers ::getVRSClient
	 */
	public function testGetVRSClient() {
		$optionValues = [
			MainConfigNames::ParsoidSettings => [],
			MainConfigNames::VirtualRestConfig => [
				'modules' => [ 'restbase' => [] ]
			],
			VisualEditorParsoidClientFactory::ENABLE_COOKIE_FORWARDING => false,
			VisualEditorParsoidClientFactory::USE_AUTO_CONFIG => true
		];

		$vrsClient = $this->newClientFactory( $optionValues )->getVRSClient( false );

		$this->assertInstanceOf( VirtualRESTServiceClient::class, $vrsClient );
	}

	public function provideCookieToForward() {
		yield 'When no cookie is sent' => [ false, false ];

		yield 'When a cookie is sent as a string' => [ 'cookie', 'cookie' ];

		yield 'When a cookie is sent as an array' => [ [ 'cookie' ], 'cookie' ];
	}

	/**
	 * @dataProvider provideCookieToForward
	 * @covers ::getVRSClient
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

		$vrsClient = $this->newClientFactory( $optionValues )->getVRSClient( $cookie );
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
