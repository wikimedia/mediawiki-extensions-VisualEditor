<?php

// @phpcs:disable MediaWiki.Files.ClassMatchesFilename.NotMatch

use MediaWiki\Title\Title;

/**
 * Phan stub for the soft dependency to FlaggedRevs extension
 * There is no hard dependency and VisualEditor is a dependency to many other extensions,
 * so this class is stubbed and not verified against the original class
 */
class FlaggablePageView extends ContextSource {

	/**
	 * @param Title|MediaWiki\Page\PageIdentity $title
	 * @return self
	 */
	public static function newFromTitle( $title ) {
	}

	/**
	 * @return true
	 */
	public function displayTag() {
	}

	/**
	 * @param bool &$outputDone
	 * @param bool &$useParserCache
	 * @return bool
	 */
	public function setPageContent( &$outputDone, &$useParserCache ) {
	}

}
