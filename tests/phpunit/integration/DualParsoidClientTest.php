<?php

namespace MediaWiki\Extension\VisualEditor\Tests;

use MediaWiki\Extension\VisualEditor\DirectParsoidClient;
use MediaWiki\Extension\VisualEditor\DualParsoidClient;
use MediaWiki\Extension\VisualEditor\ParsoidClient;
use MediaWiki\Extension\VisualEditor\VisualEditorParsoidClientFactory;
use MediaWiki\Page\PageIdentity;
use MediaWiki\Page\PageIdentityValue;
use MediaWiki\Permissions\Authority;
use MediaWiki\Revision\RevisionRecord;
use MediaWikiIntegrationTestCase;
use Wikimedia\Bcp47Code\Bcp47Code;
use Wikimedia\Bcp47Code\Bcp47CodeValue;

/**
 * @covers \MediaWiki\Extension\VisualEditor\DualParsoidClient
 * @group Database
 */
class DualParsoidClientTest extends MediaWikiIntegrationTestCase {

	/**
	 * @return ParsoidClient
	 */
	public function createMockClient() {
		$client = $this->createMock( DirectParsoidClient::class );

		$client->method( 'getPageHtml' )->willReturnCallback(
			static function () {
				return [
					'body' => '',
					'headers' => [
						'etag' => '"abcdef1234"',
					]
				];
			}
		);

		$client->method( 'transformWikitext' )->willReturnCallback(
			static function () {
				return [
					'body' => '',
					'headers' => [
						'etag' => '"abcdef1234"',
					]
				];
			}
		);

		$client->method( 'transformHTML' )->willReturnCallback(
			static function (
				PageIdentity $page,
				Bcp47Code $targetLanguage,
				string $html,
				?int $oldid,
				?string $etag
			) {
				return [
					'body' => 'etag:' . $etag,
					'headers' => []
				];
			}
		);

		return $client;
	}

	/**
	 * @return VisualEditorParsoidClientFactory
	 */
	private function createClientFactory() {
		$factory = $this->createMock( VisualEditorParsoidClientFactory::class );

		$factory->method( 'createParsoidClientInternal' )->willReturnCallback(
			function () {
				return $this->createMockClient();
			}
		);

		return $factory;
	}

	/**
	 * @return DualParsoidClient
	 */
	private function createDualClient(): DualParsoidClient {
		$directClient = new DualParsoidClient(
			$this->createClientFactory(),
			$this->createNoOpMock( Authority::class )
		);

		return $directClient;
	}

	public function testGetPageHTML() {
		$client = $this->createDualClient();
		$result = $client->getPageHtml( $this->createNoOpMock( RevisionRecord::class ), null );

		$etag = $result['headers']['etag'];

		// Check round trip using the etag returned by the call above
		$client = $this->createDualClient( 'xyzzy' );
		$result = $client->transformHTML(
			PageIdentityValue::localIdentity( 0, NS_MAIN, 'Dummy' ),
			new Bcp47CodeValue( 'qqx' ),
			'input html',
			null,
			$etag
		);
		$this->assertStringNotContainsString( 'mode:direct', $result['body'] );
	}

	public function testTransformWikitext() {
		$client = $this->createDualClient();
		$result = $client->transformWikitext(
			PageIdentityValue::localIdentity( 0, NS_MAIN, 'Dummy' ),
			new Bcp47CodeValue( 'qqx' ),
			'input wikitext',
			false,
			null,
			false
		);

		$etag = $result['headers']['etag'];
		$this->assertStringNotContainsString( '"direct:', $etag );

		// Check round trip using the etag returned by the call above
		$client = $this->createDualClient( 'xyzzy' );
		$result = $client->transformHTML(
			PageIdentityValue::localIdentity( 0, NS_MAIN, 'Dummy' ),
			new Bcp47CodeValue( 'qqx' ),
			'input html',
			null,
			$etag
		);
		$this->assertStringNotContainsString( 'mode:direct', $result['body'] );
	}

	public static function provideTransformHTML() {
		yield 'no etag' => [ null ];
		yield 'etag without prefix' => [ '"abcdef1234"' ];
		yield 'etag with bogus prefix' => [ '"bogus:abcdef1234"' ];
		yield 'etag with direct prefix' => [ '"direct:abcdef1234"' ];
	}

	/**
	 * @dataProvider provideTransformHTML
	 */
	public function testTransformHTML( $etag ) {
		$client = $this->createDualClient();

		$result = $client->transformHTML(
			PageIdentityValue::localIdentity( 0, NS_MAIN, 'Dummy' ),
			new Bcp47CodeValue( 'qqx' ),
			'input html',
			null,
			$etag
		);

		if ( $etag ) {
			$this->assertStringContainsString( "abcdef", $result['body'] );
			$this->assertStringNotContainsString( "etag:\"direct:", $result['body'] );
		}
	}

}
