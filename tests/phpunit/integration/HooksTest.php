<?php

namespace MediaWiki\Extension\VisualEditor\Tests;

use MediaWiki\Extension\VisualEditor\Hooks;
use MediaWikiIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\VisualEditor\Hooks
 * @group Database
 */
class HooksTest extends MediaWikiIntegrationTestCase {

	/**
	 * @dataProvider provideOnResourceLoaderGetConfigVars
	 */
	public function testOnResourceLoaderGetConfigVars( array $config, array $expected ) {
		$this->overrideConfigValues( $config );

		$vars = [];
		Hooks::onResourceLoaderGetConfigVars( $vars );

		$this->assertArrayHasKey( 'wgVisualEditorConfig', $vars );
		$veConfig = $vars['wgVisualEditorConfig'];

		foreach ( $expected as $name => $value ) {
			$this->assertArrayHasKey( $name, $veConfig );
			$this->assertSame( $value, $veConfig[$name] );
		}
	}

	public function provideOnResourceLoaderGetConfigVars() {
		// TODO: test a lot more config!

		yield 'restbaseUrl: No VRS modules' => [
			[
				'VirtualRestConfig' => [ 'modules' => [] ],
				'VisualEditorRestbaseURL' => 'parsoid-url',
				'VisualEditorFullRestbaseURL' => 'full-parsoid-url',
			],
			[
				'restbaseUrl' => false,
				'fullRestbaseUrl' => false,
			]
		];
		yield 'restbaseUrl: VRS modules available' => [
			[
				'VirtualRestConfig' => [ 'modules' => [
					'parsoid' => true,
				] ],
				'VisualEditorRestbaseURL' => 'parsoid-url',
				'VisualEditorFullRestbaseURL' => 'full-parsoid-url',
			],
			[
				'restbaseUrl' => 'parsoid-url',
				'fullRestbaseUrl' => 'full-parsoid-url',
			]
		];
		yield 'restbaseUrl: VRS modules available, but no direct access URLs' => [
			[
				'VirtualRestConfig' => [ 'modules' => [
					'parsoid' => true,
				] ],
				'VisualEditorRestbaseURL' => 'parsoid-url',
				'VisualEditorFullRestbaseURL' => 'full-parsoid-url',
			],
			[
				'restbaseUrl' => 'parsoid-url',
				'fullRestbaseUrl' => 'full-parsoid-url',
			]
		];
	}

}
