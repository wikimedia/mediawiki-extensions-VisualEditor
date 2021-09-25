<?php

namespace MediaWiki\Extension\VisualEditor\Tests;

use ApiVisualEditor;
use ExtensionRegistry;
use HashConfig;
use MediaWikiIntegrationTestCase;
use Wikimedia\ScopedCallback;

/**
 * @covers \ApiVisualEditor
 */
class ApiVisualEditorTest extends MediaWikiIntegrationTestCase {

	/** @var ScopedCallback|null */
	private $scopedCallback;

	protected function setUp(): void {
		parent::setUp();
		$this->scopedCallback = ExtensionRegistry::getInstance()->setAttributeForTest(
			'VisualEditorAvailableNamespaces',
			[ 'Template_Talk' => true ]
		);
	}

	protected function tearDown(): void {
		$this->scopedCallback = null;
		parent::tearDown();
	}

	public function testIsAllowedNamespace() {
		$config = new HashConfig( [ 'VisualEditorAvailableNamespaces' => [
			0 => true,
			1 => false,
		] ] );
		$this->assertTrue( ApiVisualEditor::isAllowedNamespace( $config, 0 ) );
		$this->assertFalse( ApiVisualEditor::isAllowedNamespace( $config, 1 ) );
	}

	public function testGetAvailableNamespaceIds() {
		$config = new HashConfig( [ 'VisualEditorAvailableNamespaces' => [
			0 => true,
			1 => false,
			-1 => true,
			999999 => true,
			'Template' => true,
			'Foobar' => true,
		] ] );
		$this->assertSame(
			[ 0, -1, 10, 11 ],
			ApiVisualEditor::getAvailableNamespaceIds( $config )
		);
	}

	public function testIsAllowedContentType() {
		$config = new HashConfig( [ 'VisualEditorAvailableContentModels' => [
			'on' => true,
			'off' => false,
		] ] );
		$this->assertTrue( ApiVisualEditor::isAllowedContentType( $config, 'on' ) );
		$this->assertFalse( ApiVisualEditor::isAllowedContentType( $config, 'off' ) );
		$this->assertFalse( ApiVisualEditor::isAllowedContentType( $config, 'unknown' ) );
	}

}
