<?php
/**
 * Utilities for ResourceLoader modules used by EditCheck.
 *
 * @file
 * @ingroup Extensions
 * @license MIT
 */

namespace MediaWiki\Extension\VisualEditor\EditCheck;

use MediaWiki\Language\MessageLocalizer;
use MediaWiki\MediaWikiServices;

class ResourceLoaderData {

	/**
	 * Return configuration data for edit checks, fetched from an on-wiki JSON message
	 *
	 * @param MessageLocalizer $context
	 * @return array Configuration data for edit checks
	 */
	public static function getConfig( MessageLocalizer $context ): array {
		$onWikiConfig = json_decode( $context->msg( 'editcheck-config.json' )->inContentLanguage()->plain(), true );

		$config = MediaWikiServices::getInstance()->getConfigFactory()->makeConfig( 'visualeditor' );
		$siteConfig = $config->get( 'VisualEditorEditCheckDefaultConfig' );

		return self::combineConfigs(
			is_array( $siteConfig ) ? $siteConfig : [],
			is_array( $onWikiConfig ) ? $onWikiConfig : []
		);
	}

	/**
	 * Combine the site config and the on-wiki config, keyed by check name
	 *
	 * The on-wiki config for a check takes priority over the site config for that check.
	 *
	 * @param array $siteConfig
	 * @param array $onWikiConfig
	 * @return array
	 */
	public static function combineConfigs( array $siteConfig, array $onWikiConfig ): array {
		$result = $siteConfig;
		foreach ( $onWikiConfig as $name => $checkConfig ) {
			$result[$name] = is_array( $checkConfig ) && is_array( $result[$name] ?? null ) ?
				ConfigMerger::compose( $result[$name], $checkConfig ) :
				$checkConfig;
		}
		return $result;
	}
}
