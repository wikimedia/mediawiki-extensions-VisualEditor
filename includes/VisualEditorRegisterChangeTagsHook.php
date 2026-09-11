<?php
/**
 * @file
 * @ingroup Extensions
 * @copyright 2011-2021 VisualEditor Team and others; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\VisualEditor;

interface VisualEditorRegisterChangeTagsHook {

	/**
	 * This hook is executed when VisualEditor collects the change tags that it knows.
	 *
	 * Tags added here work in the same way as the tags of VisualEditor. VisualEditor
	 * applies them to the edit if the client sends them in the vetags parameter, and
	 * lists them on Special:Tags. The extension that adds a tag must supply the
	 * related tag-* interface messages.
	 *
	 * @param string[] &$tags Tags to add
	 * @return void
	 */
	public function onVisualEditorRegisterChangeTags( array &$tags ): void;

}
