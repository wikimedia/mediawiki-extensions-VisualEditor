<?php

// @phpcs:disable MediaWiki.Files.ClassMatchesFilename.NotMatch
// @phpcs:disable Generic.Files.OneObjectStructurePerFile.MultipleFound
// @phpcs:disable Squiz.Classes.ValidClassName.NotCamelCaps
// @phpcs:disable MediaWiki.NamingConventions.LowerCamelFunctionsName.FunctionName

/**
 * Phan stubs for the soft dependency to CommunityConfiguration extension
 * There is no hard dependency and VisualEditor is a dependency to many other extensions,
 * so these classes are stubbed and not verified against the original classes
 */

namespace MediaWiki\Extension\CommunityConfiguration\Provider {

	interface IConfigurationProvider {
	}

}

namespace MediaWiki\Extension\CommunityConfiguration\EditorCapabilities {

	use MediaWiki\Context\IContextSource;
	use MediaWiki\Extension\CommunityConfiguration\Provider\IConfigurationProvider;
	use MediaWiki\Title\Title;

	abstract class AbstractEditorCapability {

		public function __construct( IContextSource $ctx, Title $parentTitle ) {
		}

		final protected function getContext(): IContextSource {
		}

		abstract public function execute( ?IConfigurationProvider $provider, ?string $subpage = null ): void;
	}

}

namespace MediaWiki\Extension\CommunityConfiguration\Hooks {

	interface CommunityConfigurationProvider_initListHook {

		/**
		 * @param array &$providers List of registered providers, mapping of provider name to provider specification.
		 * @return bool|void True or no return value to continue or false to abort
		 */
		public function onCommunityConfigurationProvider_initList( array &$providers );
	}

}
