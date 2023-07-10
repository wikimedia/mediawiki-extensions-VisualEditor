<?php

namespace MediaWiki\Extension\VisualEditor\Tests;

use MediaWiki\Config\ServiceOptions;
use MediaWiki\Extension\VisualEditor\DirectParsoidClient;
use MediaWiki\Extension\VisualEditor\DualParsoidClient;
use MediaWiki\Extension\VisualEditor\VisualEditorParsoidClientFactory;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\Permissions\Authority;
use MediaWiki\Rest\Handler\Helper\PageRestHelperFactory;
use MediaWikiIntegrationTestCase;
use MultiHttpClient;

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
			$this->createNoOpMock( PageRestHelperFactory::class )
		);
	}

	/**
	 * @covers ::createParsoidClientInternal
	 * @covers ::createParsoidClient
	 */
	public function testGetClient() {
		$authority = $this->createNoOpMock( Authority::class );

		$factory = $this->newClientFactory( [
			VisualEditorParsoidClientFactory::ENABLE_COOKIE_FORWARDING => false,
			VisualEditorParsoidClientFactory::DEFAULT_PARSOID_CLIENT_SETTING => 'direct',
		] );

		$client = $factory->createParsoidClientInternal( $authority );
		$this->assertInstanceOf( DirectParsoidClient::class, $client );

		// This just checks that nothing explodes.
		$client = $factory->createParsoidClient( false, $authority );
		$this->assertInstanceOf( DualParsoidClient::class, $client );
	}
}
