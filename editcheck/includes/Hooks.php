<?php
/**
 * VisualEditor extension hooks for EditCheck
 *
 * @file
 * @ingroup Extensions
 * @copyright 2025 VisualEditor Team and others; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\VisualEditor\EditCheck;

use MediaWiki\CommentStore\CommentStoreComment;
use MediaWiki\Extension\VisualEditor\MediaWikiJsonSchemaValidator;
use MediaWiki\MediaWikiServices;
use MediaWiki\Preferences\Hook\GetPreferencesHook;
use MediaWiki\ResourceLoader\Hook\ResourceLoaderRegisterModulesHook;
use MediaWiki\ResourceLoader\ResourceLoader;
use MediaWiki\Revision\RenderedRevision;
use MediaWiki\Status\Status;
use MediaWiki\Storage\Hook\MultiContentSaveHook;
use MediaWiki\User\User;
use MediaWiki\User\UserIdentity;

class Hooks implements
	ResourceLoaderRegisterModulesHook,
	GetPreferencesHook,
	MultiContentSaveHook
{

	public function onResourceLoaderRegisterModules( ResourceLoader $resourceLoader ): void {
		$services = MediaWikiServices::getInstance();
		$veConfig = $services->getConfigFactory()->makeConfig( 'visualeditor' );

		$checksDir = dirname( __DIR__ ) . '/modules/editchecks/checks';
		$files = array_diff( scandir( $checksDir ), [ '..', '.' ] );

		$veResourceTemplate = [
			'localBasePath' => $checksDir,
			'remoteExtPath' => 'VisualEditor',
		];
		$resourceLoader->register( [
			'ext.visualEditor.editCheck.checks' => $veResourceTemplate + [
				'group' => 'visualEditorA',
				'packageFiles' => $files + [
					[
						"name" => "init.js",
						"main" => true,
						"content" => array_reduce( $files, static function ( $carry, $file ) {
							return $carry . "require('./$file');\n";
						}, "" ),
					],
				],
				"dependencies" => [ 'ext.visualEditor.editCheck' ],
			] ] );
	}

	/**
	 * Handler for the GetPreferences hook, to add and hide user preferences as configured
	 *
	 * @param User $user
	 * @param array &$preferences Their preferences object
	 */
	public function onGetPreferences( $user, &$preferences ) {
		$api = [ 'type' => 'api' ];
		$preferences['visualeditor-editcheck-suggestions-toggle'] = $api;
	}

	/**
	 * Validate on-wiki edit check config updates against the bundled JSON schema.
	 *
	 * @param RenderedRevision $renderedRevision
	 * @param UserIdentity $user
	 * @param CommentStoreComment $summary
	 * @param int $flags
	 * @param Status $status
	 * @return bool|void
	 */
	public function onMultiContentSave( $renderedRevision, $user, $summary, $flags, $status ) {
		return MediaWikiJsonSchemaValidator::validateOnSave(
			$renderedRevision,
			$status,
			'editcheck-config.json',
			dirname( __DIR__ ) . '/editcheck-config.schema.json'
		);
	}
}
