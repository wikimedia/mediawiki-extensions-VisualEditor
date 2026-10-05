<?php

namespace MediaWiki\Extension\VisualEditor\EditCheck\CommunityConfiguration;

use MediaWiki\Extension\CommunityConfiguration\EditorCapabilities\AbstractEditorCapability;
use MediaWiki\Extension\CommunityConfiguration\Provider\IConfigurationProvider;
use MediaWiki\SpecialPage\SpecialPage;

/**
 * Editor capability that sends users from Special:CommunityConfiguration/EditCheck
 * to Special:EditChecks, where Edit Check configuration is documented.
 */
class EditCheckRedirectEditorCapability extends AbstractEditorCapability {

	/**
	 * @inheritDoc
	 */
	public function execute( ?IConfigurationProvider $provider, ?string $subpage = null ): void {
		$this->getContext()->getOutput()->redirect(
			SpecialPage::getTitleFor( 'EditChecks' )->getFullURL()
		);
	}
}
