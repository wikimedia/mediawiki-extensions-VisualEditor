<?php
/**
 * Utilities for ResourceLoader modules used by VisualEditor.
 *
 * @file
 * @ingroup Extensions
 * @license MIT
 */

namespace MediaWiki\Extension\VisualEditor;

use MediaWiki\MediaWikiServices;
use MediaWiki\ResourceLoader\Context;

class ResourceLoaderData {

	/**
	 * Generate a script populating the list of double-underscore behaviour
	 * switches (e.g. __TOC__) offered by ve.ui.MWMagicWordCompletionAction.
	 *
	 * The list is taken from the wiki's configured magic words, so it reflects
	 * the content language and any switches added by installed extensions.
	 *
	 * The returned script assigns to the action class, so it must be listed
	 * after that class's own script in the ext.visualEditor.mwwikitext module.
	 *
	 * @param Context $context
	 * @return string JavaScript
	 */
	public static function makeMagicWordData( Context $context ): string {
		$magicWordFactory = MediaWikiServices::getInstance()->getMagicWordFactory();
		$words = [];
		foreach ( $magicWordFactory->getDoubleUnderscoreArray()->getNames() as $name ) {
			foreach ( $magicWordFactory->get( $name )->getSynonyms() as $synonym ) {
				$words[ $synonym ] = true;
			}
		}
		ksort( $words );
		return 've.ui.MWMagicWordCompletionAction.static.magicWords = '
			. $context->encodeJson( array_keys( $words ) ) . ';';
	}
}
