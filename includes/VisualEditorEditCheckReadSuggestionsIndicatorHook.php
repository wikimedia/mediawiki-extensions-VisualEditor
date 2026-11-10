<?php
/**
 * @file
 * @ingroup Extensions
 * @copyright 2011-2026 VisualEditor Team and others; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\VisualEditor;

use MediaWiki\Skin\Skin;

/**
 * TEMPORARY: This hook exists only for the A/B test of the read mode suggestion indicator (T430712).
 * Remove it when the test ends.
 *
 * @unstable
 */
interface VisualEditorEditCheckReadSuggestionsIndicatorHook {

	/**
	 * This hook runs before the page's edit suggestion indicator shows in read mode.
	 *
	 * @param Skin $skin
	 * @param int $count Number of suggestions, more than zero
	 * @param string|null &$indicator Indicator to show: 'count' (default) or 'lightbulb'.
	 *  Set to null to show no indicator.
	 */
	public function onVisualEditorEditCheckReadSuggestionsIndicator(
		Skin $skin,
		int $count,
		?string &$indicator
	): void;

}
