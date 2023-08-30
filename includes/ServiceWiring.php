<?php

/**
 * ServiceWiring files for VisualEditor.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2011-2021 VisualEditor Team and others; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\VisualEditor;

use MediaWiki\Config\ServiceOptions;
use MediaWiki\MediaWikiServices;

return [
	VisualEditorHookRunner::SERVICE_NAME => static function ( MediaWikiServices $services ): VisualEditorHookRunner {
		return new VisualEditorHookRunner( $services->getHookContainer() );
	},

	VisualEditorParsoidClientFactory::SERVICE_NAME => static function (
		MediaWikiServices $services
	): VisualEditorParsoidClientFactory {
		return new VisualEditorParsoidClientFactory(
			new ServiceOptions(
				VisualEditorParsoidClientFactory::CONSTRUCTOR_OPTIONS,
				$services->getMainConfig()
			),
			$services->getPageRestHelperFactory()
		);
	},
];
