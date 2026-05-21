<?php
namespace MediaWiki\Extension\VisualEditor;

/**
 * Section edit link behaviour used to split the parser cache.
 * Note that modifying the values of this enum will invalidate parts of the post-processing parser cache.
 */
enum SectionLinkBehaviour: string {
	/**
	 * Display a single link (wikitext source or visualeditor) for section edit links
	 */
	case LINK_SINGLE = "single";

	/**
	 * Display a single link, explicitly wikitext source link, for section edit links
	 */
	case LINK_WT = "wtsingle";

	/**
	 * Display both "edit" and "edit source" links
	 */
	case LINK_BOTH = "both";
}
