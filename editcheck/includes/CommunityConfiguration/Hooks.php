<?php

namespace MediaWiki\Extension\VisualEditor\EditCheck\CommunityConfiguration;

use MediaWiki\Config\Config;
use MediaWiki\Extension\CommunityConfiguration\Hooks\CommunityConfigurationProvider_initListHook;

class Hooks implements CommunityConfigurationProvider_initListHook {

	public function __construct(
		private readonly Config $config
	) {
	}

	/**
	 * Only list Edit Check on Special:CommunityConfiguration when Edit Check is enabled.
	 *
	 * @inheritDoc
	 */
	public function onCommunityConfigurationProvider_initList( array &$providers ) {
		if ( !$this->config->get( 'VisualEditorEditCheck' ) ) {
			unset( $providers['EditCheck'] );
		}
	}
}
