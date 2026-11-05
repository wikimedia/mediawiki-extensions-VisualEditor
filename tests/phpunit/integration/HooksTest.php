<?php

namespace MediaWiki\Extension\VisualEditor\Tests;

use MediaWiki\Config\HashConfig;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\VisualEditor\Hooks;
use MediaWiki\Extension\VisualEditor\Services\VisualEditorAvailabilityLookup;
use MediaWiki\Output\OutputPage;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Title\Title;
use MediaWikiIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\VisualEditor\Hooks
 * @group Database
 */
class HooksTest extends MediaWikiIntegrationTestCase {

	public function newHooks( array $overrides = [] ): Hooks {
		$services = $this->getServiceContainer();
		return new Hooks(
			$services->getConnectionProvider(),
			$overrides['ExtensionRegistry'] ??
				ExtensionRegistry::getInstance(),
			$overrides[VisualEditorAvailabilityLookup::SERVICE_NAME] ??
				$services->get( VisualEditorAvailabilityLookup::SERVICE_NAME ),
			$services->getLanguageConverterFactory(),
			$services->getMagicWordFactory(),
			$services->getNamespaceInfo(),
			$services->getPermissionManager(),
			$services->getReadOnlyMode(),
			$services->getShadowPageLoader(),
			$services->getUrlUtils(),
			$services->getUserOptionsManager(),
			$services->getWikiPageFactory(),
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

	/**
	 * @dataProvider provideOnMakeGlobalVariablesScriptEditCheckSuggestionsAvailable
	 */
	public function testOnMakeGlobalVariablesScriptEditCheckSuggestionsAvailable(
		?string $ecenable, bool $userOptionEnabled, bool $expected
	) {
		$user = $this->getTestUser()->getUser();
		$this->getServiceContainer()->getUserOptionsManager()->setOption(
			$user, 'visualeditor-editcheck-suggestions', $userOptionEnabled
		);
		$this->getServiceContainer()->getUserOptionsManager()->saveOptions( $user );

		$request = new FauxRequest();
		if ( $ecenable !== null ) {
			$request->setVal( 'ecenable', $ecenable );
		}

		$context = new RequestContext();
		$context->setRequest( $request );
		$context->setTitle( Title::makeTitle( NS_MAIN, 'Test' ) );
		$context->setUser( $user );

		$out = new OutputPage( $context );

		$vars = [];
		$hooks = $this->newHooks();
		$hooks->onMakeGlobalVariablesScript( $vars, $out );

		$this->assertArrayHasKey( 'wgVisualEditor', $vars );
		$this->assertArrayHasKey( 'editCheckSuggestionsAvailable', $vars['wgVisualEditor'] );
		$this->assertSame( $expected, $vars['wgVisualEditor']['editCheckSuggestionsAvailable'] );
	}

	public static function provideOnMakeGlobalVariablesScriptEditCheckSuggestionsAvailable(): array {
		return [
			'No ecenable, user option disabled' => [ null, false, false ],
			'No ecenable, user option enabled' => [ null, true, true ],
			'ecenable=0 overrides enabled user option' => [ '0', true, false ],
			'ecenable=0, user option disabled' => [ '0', false, false ],
			'ecenable=suggestions enables regardless of user option' => [ 'suggestions', false, true ],
			'ecenable=experimental,suggestions enables regardless of user option' =>
				[ 'experimental,suggestions', false, true ],
			'ecenable=experimental without suggestions, user option disabled' => [ 'experimental', false, false ],
			'ecenable with invalid characters is ignored, falls back to user option' =>
				[ 'suggestions;drop', false, false ],
		];
	}
}
