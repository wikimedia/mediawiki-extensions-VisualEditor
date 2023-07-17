<?php

namespace MediaWiki\Extension\VisualEditor;

use MediaWiki\Page\PageIdentity;
use MediaWiki\Permissions\Authority;
use MediaWiki\Revision\RevisionRecord;
use Wikimedia\Bcp47Code\Bcp47Code;

/**
 * A decorator implementation of ParsoidClient that will delegate to the appropriate
 * implementation of ParsoidClient based on the incoming ETag.
 *
 * The purpose of this decorator is to ensure that VE sessions that loaded HTML from
 * one ParsoidClient implementation will use the same implementation when saving the HTML,
 * even when the preferred implementation was changed on the server while the editor was open.
 *
 * This avoids users losing edits at the time of the config change: if the HTML the user
 * submits when saving the page doesn't get handled by the same implementation that originally
 * provided the HTML for editing, the ETag will mismatch and the edit will fail.
 */
class DualParsoidClient implements ParsoidClient {

	/** @var VisualEditorParsoidClientFactory */
	private VisualEditorParsoidClientFactory $factory;

	/** @var Authority */
	private Authority $authority;

	/**
	 * @note Called by DiscussionTools, keep compatible!
	 *
	 * @param VisualEditorParsoidClientFactory $factory
	 * @param Authority $authority
	 */
	public function __construct(
		VisualEditorParsoidClientFactory $factory,
		Authority $authority
	) {
		$this->factory = $factory;
		$this->authority = $authority;
	}

	/**
	 * Strip information about what ParsoidClient implementation to use from the ETag,
	 * restoring it to the original ETag originally emitted by that ParsoidClient.
	 *
	 * @param string $etag
	 *
	 * @return string
	 */
	private static function stripMode( string $etag ): string {
		// Remove any prefix between double-quote and colon
		return preg_replace( '/"(\w+):/', '"', $etag );
	}

	/**
	 * Create a DirectParsoidClient.
	 *
	 * @return ParsoidClient
	 */
	private function createParsoidClient(): ParsoidClient {
		return $this->factory->createParsoidClientInternal( $this->authority );
	}

	/**
	 * @inheritDoc
	 */
	public function getPageHtml( RevisionRecord $revision, ?Bcp47Code $targetLanguage ): array {
		return $this->createParsoidClient()->getPageHtml( $revision, $targetLanguage );
	}

	/**
	 * @inheritDoc
	 */
	public function transformHTML(
		PageIdentity $page,
		Bcp47Code $targetLanguage,
		string $html,
		?int $oldid,
		?string $etag
	): array {
		$client = $this->createParsoidClient();

		if ( $etag ) {
			$etag = self::stripMode( $etag );
		}

		return $client->transformHTML( $page, $targetLanguage, $html, $oldid, $etag );
	}

	/**
	 * @inheritDoc
	 */
	public function transformWikitext(
		PageIdentity $page,
		Bcp47Code $targetLanguage,
		string $wikitext,
		bool $bodyOnly,
		?int $oldid,
		bool $stash
	): array {
		return $this->createParsoidClient()->transformWikitext(
			$page, $targetLanguage, $wikitext, $bodyOnly, $oldid, $stash
		);
	}
}
