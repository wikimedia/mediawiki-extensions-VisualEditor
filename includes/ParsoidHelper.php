<?php
/**
 * Helper functions for contacting Parsoid/RESTBase.
 *
 * Because clearly we don't have enough APIs yet for accomplishing this Herculean task.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2022 VisualEditor Team and others; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\VisualEditor;

use Language;
use MediaWiki\Revision\RevisionRecord;
use Psr\Log\LoggerInterface;
use StatusValue;
use Title;

class ParsoidHelper {

	/** @var VisualEditorParsoidClientFactory */
	private $veParsoidClientFactory;

	/** @var false|string|string[] */
	private $cookiesToForward;

	/**
	 * @param LoggerInterface $logger unused
	 * @param string|string[]|false $cookiesToForward
	 * @param VisualEditorParsoidClientFactory $clientFactory
	 */
	public function __construct(
		// NOTE: DiscussionTools is still setting this
		LoggerInterface $logger,
		$cookiesToForward,
		VisualEditorParsoidClientFactory $clientFactory
	) {
		$this->cookiesToForward = $cookiesToForward;
		$this->veParsoidClientFactory = $clientFactory;
	}

	/**
	 * @return ParsoidClient
	 */
	private function getClient(): ParsoidClient {
		return $this->veParsoidClientFactory->createParsoidClient( $this->cookiesToForward );
	}

	/**
	 * Request page HTML from RESTBase
	 *
	 * @param RevisionRecord $revision Page revision
	 * @param ?Language $language Desired output language (default: `null`)
	 *
	 * @return StatusValue If successful, the value is the RESTbase server's response as an array
	 *   with keys 'code', 'reason', 'headers' and 'body'
	 */
	public function requestRestbasePageHtml( RevisionRecord $revision, ?Language $language = null ): StatusValue {
		$title = Title::newFromLinkTarget( $revision->getPageAsLinkTarget() );
		$client = $this->getClient();

		return $this->wrapResponse( $client->getPageHtml(
			$revision,
			$language ?: $title->getPageLanguage()
		) );
	}

	/**
	 * Transform HTML to wikitext via Parsoid through RESTbase. Wrapper for ::postData().
	 *
	 * @param Title $title The title of the page
	 * @param string $html The HTML of the page to be transformed
	 * @param int|null $oldid What oldid revision, if any, to base the request from (default: `null`)
	 * @param string|null $etag The ETag to set in the HTTP request header
	 * @param ?Language $pageLanguage Page language (default: `null`)
	 * @return StatusValue If successful, the value is the RESTbase server's response as an array
	 *   with keys 'code', 'reason', 'headers' and 'body'
	 */
	public function transformHTML(
		Title $title, string $html, int $oldid = null, string $etag = null, ?Language $pageLanguage = null
	): StatusValue {
		$client = $this->getClient();
		return $this->wrapResponse( $client->transformHtml(
			$title, $pageLanguage ?: $title->getPageLanguage(), $html, $oldid, $etag
		) );
	}

	/**
	 * Transform wikitext to HTML via Parsoid through RESTbase. Wrapper for ::postData().
	 *
	 * @param Title $title The title of the page to use as the parsing context
	 * @param string $wikitext The wikitext fragment to parse
	 * @param bool $bodyOnly Whether to provide only the contents of the `<body>` tag
	 * @param int|null $oldid What oldid revision, if any, to base the request from (default: `null`)
	 * @param bool $stash Whether to stash the result in the server-side cache (default: `false`)
	 * @param ?Language $pageLanguage Page language (default: `null`)
	 * @return StatusValue If successful, the value is the RESTbase server's response as an array
	 *   with keys 'code', 'reason', 'headers' and 'body'
	 */
	public function transformWikitext(
		Title $title, string $wikitext, bool $bodyOnly, int $oldid = null, bool $stash = false,
		?Language $pageLanguage = null
	): StatusValue {
		$client = $this->getClient();
		return $this->wrapResponse( $client->transformWikitext(
			$title, $pageLanguage ?: $title->getPageLanguage(),
			$wikitext, $bodyOnly, $oldid, $stash
		) );
	}

	/**
	 * @param array $response
	 *
	 * @return StatusValue
	 */
	private function wrapResponse( array $response ): StatusValue {
		if ( !empty( $response['error'] ) ) {
			return StatusValue::newFatal( $response['error'] );
		}

		return StatusValue::newGood( $response );
	}

}
