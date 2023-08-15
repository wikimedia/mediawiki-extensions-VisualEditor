<?php

namespace MediaWiki\Extension\VisualEditor;

use Config;
use ConfigFactory;
use MediaWiki\Extension\BetaFeatures\Hooks\GetBetaFeaturePreferencesHook;
use MediaWiki\MainConfigNames;
use User;

/**
 * Hooks from BetaFeatures extension,
 * which is optional to use with this extension.
 */
class BetaFeaturesHooks implements GetBetaFeaturePreferencesHook {

	private Config $coreConfig;
	private Config $config;

	public function __construct(
		Config $coreConfig,
		ConfigFactory $configFactory
	) {
		$this->coreConfig = $coreConfig;
		$this->config = $configFactory->makeConfig( 'visualeditor' );
	}

	/**
	 * Handler for the GetBetaPreferences hook, to add and hide user beta preferences as configured
	 *
	 * @param User $user
	 * @param array &$preferences Their preferences object
	 */
	public function onGetBetaFeaturePreferences( User $user, array &$preferences ) {
		$iconpath = $this->coreConfig->get( MainConfigNames::ExtensionAssetsPath ) . '/VisualEditor/images';

		if (
			!$this->config->get( 'VisualEditorUnifiedPreference' ) &&
			$this->config->get( 'VisualEditorEnableBetaFeature' )
		) {
			$preferences['visualeditor-enable'] = [
				'version' => '1.0',
				'label-message' => 'visualeditor-preference-core-label',
				'desc-message' => 'visualeditor-preference-core-description',
				'screenshot' => [
					'ltr' => "$iconpath/betafeatures-icon-VisualEditor-ltr.svg",
					'rtl' => "$iconpath/betafeatures-icon-VisualEditor-rtl.svg",
				],
				'info-message' => 'visualeditor-preference-core-info-link',
				'discussion-message' => 'visualeditor-preference-core-discussion-link',
				'requirements' => [
					'javascript' => true,
					'unsupportedList' => $this->config->get( 'VisualEditorBrowserUnsupportedList' ),
				]
			];
		}

		if (
			$this->config->get( 'VisualEditorEnableWikitextBetaFeature' ) &&
			// Don't try to register as a beta feature if enabled by default
			!$this->config->get( 'VisualEditorEnableWikitext' )
		) {
			$preferences['visualeditor-newwikitext'] = [
				'version' => '1.0',
				'label-message' => 'visualeditor-preference-newwikitexteditor-label',
				'desc-message' => 'visualeditor-preference-newwikitexteditor-description',
				'screenshot' => [
					'ltr' => "$iconpath/betafeatures-icon-WikitextEditor-ltr.svg",
					'rtl' => "$iconpath/betafeatures-icon-WikitextEditor-rtl.svg",
				],
				'info-message' => 'visualeditor-preference-newwikitexteditor-info-link',
				'discussion-message' => 'visualeditor-preference-newwikitexteditor-discussion-link',
				'requirements' => [
					'javascript' => true,
					'unsupportedList' => $this->config->get( 'VisualEditorBrowserUnsupportedList' ),
				]
			];
		}
	}
}
