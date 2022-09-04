<?php

namespace MediaWiki\Extension\VisualEditor\Tests;

use Generator;
use Language;
use MediaWiki\Extension\VisualEditor\DirectParsoidClient;
use MediaWiki\Page\PageIdentityValue;
use MediaWikiIntegrationTestCase;

/**
 * @coversDefaultClass \MediaWiki\Extension\VisualEditor\DirectParsoidClient
 * @group Database
 */
class DirectParsoidClientTest extends MediaWikiIntegrationTestCase {

	/**
	 * @return DirectParsoidClient
	 */
	private function createDirectClient(): DirectParsoidClient {
		$services = $this->getServiceContainer();
		$directClient = new DirectParsoidClient(
			[],
			$services->getParsoidSiteConfig(),
			$services->getParsoidPageConfigFactory(),
			$services->getParsoidDataAccess(),
			$services->getGlobalIdGenerator()
		);

		return $directClient;
	}

	/** @return Generator */
	public function provideLanguageCodes() {
		yield 'German language code' => [ 'de' ];
		yield 'English language code' => [ 'en' ];
		yield 'French language code' => [ 'fr' ];
		yield 'No language code, fallback to en' => [ null ];
	}

	private function createLanguage( $langCode ) {
		if ( $langCode === null ) {
			$language = $this->getServiceContainer()->getContentLanguage();
			$langCode = $language->getCode();
		} else {
			$language = $this->createNoOpMock(
				Language::class,
				[ 'getCode' ]
			);
			$language->method( 'getCode' )->willReturn( $langCode );
		}

		return [ $language, $langCode ];
	}

	/**
	 * @covers ::getPageHtml
	 * @dataProvider provideLanguageCodes
	 */
	public function testGetPageHtml( $langCode ) {
		$directClient = $this->createDirectClient();

		$revision = $this->getExistingTestPage( 'DirectParsoidClient' )
			->getRevisionRecord();

		[ $language, $langCode ] = $this->createLanguage( $langCode );
		$response = $directClient->getPageHtml( $revision, $language );

		$pageHtml = $response['body'];
		$headers = $response['headers'];

		$this->assertIsArray( $response );
		$this->assertArrayHasKey( 'body', $response );
		$this->assertStringContainsString( 'DirectParsoidClient', $pageHtml );

		$this->assertArrayHasKey( 'headers', $response );
		$this->assertSame( $langCode, $headers['content-language'] );
		$this->assertStringContainsString( 'lang="' . $langCode . '"', $pageHtml );

		$this->assertArrayHasKey( 'etag', $headers );
		$this->assertStringContainsString( 'W/"' . $revision->getId(), $headers['etag'] );
	}

	/**
	 * @covers ::transformHTML
	 * @dataProvider provideLanguageCodes
	 */
	public function testTransformHtml( $langCode ) {
		$directClient = $this->createDirectClient();

		$pageIdentity = PageIdentityValue::localIdentity(
			1,
			NS_MAIN,
			'DirectParsoidClient'
		);
		[ $language, ] = $this->createLanguage( $langCode );

		$html = '<h2>Hello World</h2>';
		$oldid = $pageIdentity->getId();
		$etag = 'W/"' . $oldid . '/abc-123"';

		$response = $directClient->transformHTML(
			$pageIdentity,
			$language,
			$html,
			$oldid,
			$etag
		);

		$this->assertIsArray( $response );
		$this->assertArrayHasKey( 'headers', $response );
		$this->assertSame( [], $response['headers'] );

		$this->assertArrayHasKey( 'body', $response );
		// Trim to remove trailing newline
		$wikitext = trim( $response['body'] );
		$this->assertStringContainsString( '== Hello World ==', $wikitext );
	}

	/**
	 * @covers ::transformWikitext
	 * @dataProvider provideLanguageCodes
	 */
	public function testTransformWikitext( $langCode ) {
		$directClient = $this->createDirectClient();

		$page = $this->getExistingTestPage( 'DirectParsoidClient' );
		$wikitext = '== Hello World ==';
		[ $language, $langCode ] = $this->createLanguage( $langCode );

		$response = $directClient->transformWikitext(
			$page,
			$language,
			$wikitext,
			false,
			$page->getId(),
			false
		);

		$this->assertIsArray( $response );
		$this->assertArrayHasKey( 'body', $response );
		$this->assertArrayHasKey( 'headers', $response );

		$headers = $response['headers'];
		$this->assertSame( $langCode, $headers['content-language'] );

		$html = $response['body'];
		$this->assertStringContainsString( $page->getTitle()->getText(), $html );
		$this->assertStringContainsString( '>Hello World</h2>', $html );
	}

}
