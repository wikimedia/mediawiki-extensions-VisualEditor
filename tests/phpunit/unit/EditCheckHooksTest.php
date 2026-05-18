<?php

namespace MediaWiki\Extension\VisualEditor\Tests;

use MediaWiki\CommentStore\CommentStoreComment;
use MediaWiki\Content\JsonContent;
use MediaWiki\Extension\VisualEditor\EditCheck\Hooks;
use MediaWiki\Revision\MutableRevisionRecord;
use MediaWiki\Revision\RenderedRevision;
use MediaWiki\Status\Status;
use MediaWiki\Title\TitleValue;
use MediaWiki\User\UserIdentity;
use MediaWikiUnitTestCase;

/**
 * @covers \MediaWiki\Extension\VisualEditor\EditCheck\Hooks
 */
class EditCheckHooksTest extends MediaWikiUnitTestCase {

	private static function loadFixtureData( string $filename ): array {
		$fixturePath = __DIR__ . '/configs/' . $filename;
		$data = json_decode( file_get_contents( $fixturePath ), true );

		if ( $data === null && json_last_error() !== JSON_ERROR_NONE ) {
			throw new \RuntimeException( json_last_error_msg() );
		}

		return $data;
	}

	private function newRenderedRevision( TitleValue $title, string $text ): RenderedRevision {
		$revision = $this->getMockBuilder( MutableRevisionRecord::class )
			->disableOriginalConstructor()
			->onlyMethods( [ 'getPageAsLinkTarget', 'getMainContentRaw' ] )
			->getMock();
		$revision->method( 'getPageAsLinkTarget' )
			->willReturn( $title );
		$revision->method( 'getMainContentRaw' )
			->willReturn( new JsonContent( $text ) );

		$renderedRevision = $this->getMockBuilder( RenderedRevision::class )
			->disableOriginalConstructor()
			->onlyMethods( [ 'getRevision' ] )
			->getMock();
		$renderedRevision->method( 'getRevision' )
			->willReturn( $revision );

		return $renderedRevision;
	}

	public function testOnMultiContentSaveAllowsValidEditCheckConfig(): void {
		$config = self::loadFixtureData( 'enwiki.json' );
		$hooks = new Hooks();
		$status = Status::newGood();

		$result = $hooks->onMultiContentSave(
			$this->newRenderedRevision(
				new TitleValue( NS_MEDIAWIKI, 'Editcheck-config.json' ),
				json_encode( $config )
			),
			$this->createMock( UserIdentity::class ),
			$this->createMock( CommentStoreComment::class ),
			0,
			$status
		);

		$this->assertNull( $result );
		$this->assertTrue( $status->isGood() );
	}

	public function testOnMultiContentSaveRejectsInvalidEditCheckConfig(): void {
		$config = self::loadFixtureData( 'enwiki.json' );
		$config['textMatch']['matchRules'] = [
			'bad' => [
				'title' => 'Bad',
				'message' => 'Avoid this term',
				'query' => 'Foo',
				'minOccurrences' => 0
			]
		];

		$hooks = new Hooks();
		$status = Status::newGood();

		$result = $hooks->onMultiContentSave(
			$this->newRenderedRevision(
				new TitleValue( NS_MEDIAWIKI, 'Editcheck-config.json' ),
				json_encode( $config )
			),
			$this->createMock( UserIdentity::class ),
			$this->createMock( CommentStoreComment::class ),
			0,
			$status
		);

		$this->assertFalse( $result );
		$this->assertFalse( $status->isGood() );
	}

	public function testOnMultiContentSaveIgnoresOtherPages(): void {
		$hooks = new Hooks();
		$status = Status::newGood();

		$result = $hooks->onMultiContentSave(
			$this->newRenderedRevision(
				new TitleValue( NS_MEDIAWIKI, 'Other-message.json' ),
				'{ invalid json'
			),
			$this->createMock( UserIdentity::class ),
			$this->createMock( CommentStoreComment::class ),
			0,
			$status
		);

		$this->assertNull( $result );
		$this->assertTrue( $status->isGood() );
	}
}
