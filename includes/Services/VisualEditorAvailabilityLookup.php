<?php

namespace MediaWiki\Extension\VisualEditor\Services;

use MediaWiki\Config\ServiceOptions;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\Title\NamespaceInfo;
use MediaWiki\User\Options\UserOptionsLookup;

/**
 * Allows VisualEditor and other extensions to determine if VisualEditor is available for a given page.
 *
 * For example, the ConfirmEdit extension uses this service to know if a user could open the VisualEditor
 * interface on the page returned for a given request.
 */
class VisualEditorAvailabilityLookup {

	public const CONSTRUCTOR_OPTIONS = [
		'VisualEditorAvailableNamespaces',
		'VisualEditorAvailableContentModels',
	];

	/**
	 * @internal For use by ServiceWiring.php only or when locating the service
	 */
	public const SERVICE_NAME = 'VisualEditor.VisualEditorAvailabilityLookup';

	public function __construct(
		private readonly ServiceOptions $options,
		private readonly NamespaceInfo $namespaceInfo,
		private readonly ExtensionRegistry $extensionRegistry,
		private readonly UserOptionsLookup $userOptionsLookup,
	) {
	}

	/**
	 * Returns whether VisualEditor is available to use in the given namespace
	 *
	 * @internal Only for use in VisualEditor
	 */
	public function isAllowedNamespace( int $namespaceId ): bool {
		return in_array( $namespaceId, $this->getAvailableNamespaceIds(), true );
	}

	/**
	 * Get a list of the namespace IDs where VisualEditor is available to use.
	 *
	 * @internal Only for use in VisualEditor
	 * @return int[] The order of the namespace IDs is not stable, so sorting should be applied as necessary
	 */
	public function getAvailableNamespaceIds(): array {
		$configuredNamespaces = array_replace(
			$this->extensionRegistry->getAttribute( 'VisualEditorAvailableNamespaces' ),
			$this->options->get( 'VisualEditorAvailableNamespaces' )
		);

		// Get a list of namespace IDs where VisualEditor is enabled
		$normalized = [];
		foreach ( $configuredNamespaces as $namespaceName => $enabled ) {
			$id = $this->namespaceInfo->getCanonicalIndex( strtolower( $namespaceName ) ) ?? $namespaceName;
			$normalized[$id] = $enabled && $this->namespaceInfo->exists( $id );
		}

		return array_keys( array_filter( $normalized ) );
	}

	/**
	 * Check if the configured allowed content models include the specified content model
	 *
	 * @internal Only for use in VisualEditor
	 * @param string $contentModel Content model ID
	 * @return bool
	 */
	public function isAllowedContentType( string $contentModel ): bool {
		$availableContentModels = array_merge(
			$this->extensionRegistry->getAttribute( 'VisualEditorAvailableContentModels' ),
			$this->options->get( 'VisualEditorAvailableContentModels' )
		);

		return (bool)( $availableContentModels[$contentModel] ?? false );
	}
}
