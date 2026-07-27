<?php

namespace MediaWiki\Extension\VisualEditor\Tests\Unit\EditSuggestionCounts;

use InvalidArgumentException;
use MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts\EditSuggestionCountsConfig;
use MediaWikiUnitTestCase;

/**
 * @covers \MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts\EditSuggestionCountsConfig
 */
class EditSuggestionCountsConfigTest extends MediaWikiUnitTestCase {

	private static function newConfig( array $overrides = [] ): EditSuggestionCountsConfig {
		return new EditSuggestionCountsConfig( $overrides + [
			'enabled' => true,
			'linked_artifact_url_template' => 'https://lac.example/{wiki_id}/{page_id}/{revision_id}',
			'linked_artifact_precompute_timeout' => 7,
			'namespaces_enabled' => [ 0 ],
			'page_sample_proportion' => 1.0,
		] );
	}

	public function testScalarGetters(): void {
		$config = self::newConfig();

		$this->assertTrue( $config->isEnabled() );
		$this->assertSame( 7, $config->getLinkedArtifactPrecomputeTimeout() );
	}

	public function testMissingKeysDefaultSafely(): void {
		$config = new EditSuggestionCountsConfig( [] );

		$this->assertFalse( $config->isEnabled() );
		$this->assertSame( 0, $config->getLinkedArtifactPrecomputeTimeout() );
		// No namespaces configured ⇒ all namespaces.
		$this->assertTrue( $config->isNamespaceEnabled( 5 ) );
		// Default proportion 1.0 ⇒ everything.
		$this->assertTrue( $config->isPageInSample( 'enwiki', 42 ) );
	}

	public function testIsNamespaceEnabled(): void {
		$config = self::newConfig( [ 'namespaces_enabled' => [ 0, 6 ] ] );

		$this->assertTrue( $config->isNamespaceEnabled( 0 ) );
		$this->assertTrue( $config->isNamespaceEnabled( 6 ) );
		$this->assertFalse( $config->isNamespaceEnabled( 1 ) );

		// Empty allowlist ⇒ all namespaces.
		$this->assertTrue( self::newConfig( [ 'namespaces_enabled' => [] ] )->isNamespaceEnabled( 1 ) );
	}

	public function testIsPageInSampleHonoursProportionBounds(): void {
		$this->assertTrue( self::newConfig( [ 'page_sample_proportion' => 1.0 ] )->isPageInSample( 'enwiki', 42 ) );
		$this->assertFalse( self::newConfig( [ 'page_sample_proportion' => 0.0 ] )->isPageInSample( 'enwiki', 42 ) );
	}

	public function testIsPageInSampleIsDeterministic(): void {
		$config = self::newConfig( [ 'page_sample_proportion' => 0.5 ] );

		$decision = $config->isPageInSample( 'enwiki', 42 );
		$this->assertSame( $decision, $config->isPageInSample( 'enwiki', 42 ) );
		$this->assertSame( $decision, $config->isPageInSample( 'enwiki', 42 ) );
	}

	/**
	 * @dataProvider provideOutOfRangeProportions
	 */
	public function testInvalidProportionThrows( float $proportion ): void {
		$this->expectException( InvalidArgumentException::class );
		self::newConfig( [ 'page_sample_proportion' => $proportion ] );
	}

	public static function provideOutOfRangeProportions(): array {
		return [ 'above 1' => [ 1.5 ], 'below 0' => [ -0.1 ] ];
	}

	public function testBuildUrlSubstitutesAndRawurlencodes(): void {
		$config = self::newConfig();

		$this->assertSame(
			'https://lac.example/en%20wiki/42/99',
			$config->buildUrl( 'en wiki', 42, 99 )
		);
	}
}
