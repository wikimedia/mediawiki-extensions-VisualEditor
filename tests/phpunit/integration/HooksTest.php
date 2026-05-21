<?php

namespace MediaWiki\Extension\VisualEditor\Tests;

use MediaWiki\Config\HashConfig;
use MediaWiki\Extension\VisualEditor\Hooks;
use MediaWiki\Extension\VisualEditor\Services\VisualEditorAvailabilityLookup;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWikiIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\VisualEditor\Hooks
 * @group Database
 */
class HooksTest extends MediaWikiIntegrationTestCase {

	public function newHooks( array $overrides = [] ): Hooks {
		$services = $this->getServiceContainer();
		return new Hooks(
			$overrides['ExtensionRegistry'] ??
				ExtensionRegistry::getInstance(),
			$overrides[VisualEditorAvailabilityLookup::SERVICE_NAME] ??
				$services->get( VisualEditorAvailabilityLookup::SERVICE_NAME ),
			$overrides['UserOptionsLookup'] ??
				$services->getUserOptionsLookup(),
			$overrides['HookContainer'] ??
				$services->getHookContainer(),
			$overrides['ConfigFactory'] ??
				$services->getConfigFactory(),
			$overrides['MobileFrontend.Context'] ?? null,
		);
	}

	/**
	 * @dataProvider provideOnResourceLoaderGetConfigVars
	 */
	public function testOnResourceLoaderGetConfigVars( array $config, array $expected ) {
		$this->overrideConfigValues( $config );

		$vars = [];
		$hooks = $this->newHooks();
		$hooks->onResourceLoaderGetConfigVars( $vars, '', new HashConfig() );

		$this->assertArrayHasKey( 'wgVisualEditorConfig', $vars );
		$veConfig = $vars['wgVisualEditorConfig'];

		foreach ( $expected as $name => $value ) {
			$this->assertArrayHasKey( $name, $veConfig );
			$this->assertSame( $value, $veConfig[$name] );
		}
	}

	public static function provideOnResourceLoaderGetConfigVars() {
		yield [ [], [] ];
		// TODO: test a lot more config!
	}

	/**
	 * @dataProvider provideLoadingTemplateDiscovery
	 */
	public function testLoadingTemplateDiscovery( bool $tdLoaded, bool $featureFlagEnabled, bool $hasModule ) {
		$extensionRegistry = $this->createMock( ExtensionRegistry::class );
		$extensionRegistry->method( 'isLoaded' )->willReturnCallback(
			static function ( $extension ) use ( $tdLoaded ) {
				return $extension === 'TemplateData' && $tdLoaded;
			}
		);
		$extensionRegistry->method( 'getAttribute' )
			->willReturn( [] );
		$this->overrideConfigValues( [ 'TemplateDataEnableDiscovery' => $featureFlagEnabled ] );

		$vars = [];
		$hooks = $this->newHooks( [
			'ExtensionRegistry' => $extensionRegistry,
		] );
		$hooks->onResourceLoaderGetConfigVars( $vars, '', new HashConfig() );

		$this->assertArrayHasKey( 'wgVisualEditorConfig', $vars );
		if ( $hasModule ) {
			$this->assertArrayContains(
				[ 'ext.templateData.templateDiscovery' ],
				$vars['wgVisualEditorConfig']['pluginModules']
			);
		} else {
			$this->assertNotContains(
				'ext.templateData.templateDiscovery',
				$vars['wgVisualEditorConfig']['pluginModules']
			);
		}
	}

	public static function provideLoadingTemplateDiscovery(): array {
		return [
			[ false, false, false ],
			[ false, true, false ],
			[ true, false, false ],
			[ true, true, true ],
		];
	}
}
