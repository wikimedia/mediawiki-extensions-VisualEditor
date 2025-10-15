<?php

namespace MediaWiki\Extension\VisualEditor\Tests\Integration\Services;

use MediaWiki\Extension\VisualEditor\Services\VisualEditorAvailabilityLookup;
use MediaWikiIntegrationTestCase;
use Wikimedia\ScopedCallback;

/**
 * @covers \MediaWiki\Extension\VisualEditor\Services\VisualEditorAvailabilityLookup
 */
class VisualEditorAvailabilityLookupTest extends MediaWikiIntegrationTestCase {

	private function getObjectUnderTest(): VisualEditorAvailabilityLookup {
		return $this->getServiceContainer()->get( VisualEditorAvailabilityLookup::SERVICE_NAME );
	}

	public function testIsAllowedNamespace() {
		$this->overrideConfigValue( 'VisualEditorAvailableNamespaces', [ NS_MAIN => true, NS_TALK => false ] );

		$objectUnderTest = $this->getObjectUnderTest();
		$this->assertTrue( $objectUnderTest->isAllowedNamespace( 0 ) );
		$this->assertFalse( $objectUnderTest->isAllowedNamespace( 1 ) );
	}

	public function testGetAvailableNamespaceIds() {
		$scopedCallback = $this->getServiceContainer()->getExtensionRegistry()->setAttributeForTest(
			'VisualEditorAvailableNamespaces',
			[ 'User' => true, 'Template_Talk' => true ]
		);

		$this->overrideConfigValue(
			'VisualEditorAvailableNamespaces',
			[
				0 => true,
				1 => false,
				-1 => true,
				999999 => true,
				2 => false,
				'Template' => true,
				'Foobar' => true,
			]
		);

		$this->assertArrayEquals(
			[ -1, 0, 10, 11 ],
			$this->getObjectUnderTest()->getAvailableNamespaceIds()
		);

		ScopedCallback::consume( $scopedCallback );
	}

	public function testIsAllowedContentType() {
		$this->overrideConfigValue( 'VisualEditorAvailableContentModels', [ 'on' => true, 'off' => false ] );

		$objectUnderTest = $this->getObjectUnderTest();
		$this->assertTrue( $objectUnderTest->isAllowedContentType( 'on' ) );
		$this->assertFalse( $objectUnderTest->isAllowedContentType( 'off' ) );
		$this->assertFalse( $objectUnderTest->isAllowedContentType( 'unknown' ) );
	}
}
