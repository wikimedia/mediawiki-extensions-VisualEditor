<?php

// @phpcs:disable MediaWiki.Files.ClassMatchesFilename.NotMatch

/**
 * Phan stub for the soft dependency on the Disambiguator extension.
 */

namespace MediaWiki\Extension\Disambiguator;

use MediaWiki\Output\OutputPage;

class Lookup {

	public static function isMarkedAsDisambiguationPage( OutputPage $outputPage ): bool {
		return true;
	}
}
