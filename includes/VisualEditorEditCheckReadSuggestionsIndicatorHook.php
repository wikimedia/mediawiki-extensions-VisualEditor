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
	 * This hook runs before the page's edit suggestion count is looked up for read mode.
	 *
	 * The indicator shows only if the page has suggestions. The hook can show it to users who
	 * do not have suggestion mode enabled. This changes read mode only.
	 *
	 * @param Skin $skin
	 * @param string|null &$indicator Indicator to show: 'count' or 'lightbulb'.
	 *  Set to 'hidden' to show no indicator, but look up the count and give it to the client,
	 *  e.g. for a control group. Set to null to show no indicator and not look up the count.
	 *  The default is 'count' if the user has suggestion mode enabled, and null if not.
	 */
	public function onVisualEditorEditCheckReadSuggestionsIndicator(
		Skin $skin,
		?string &$indicator
	): void;

}
