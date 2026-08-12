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
use MediaWiki\Content\TextContent;
use MediaWiki\Extension\VisualEditor\MediaWikiJsonSchemaValidator;
use MediaWiki\HTMLForm\HTMLForm;
use MediaWiki\MediaWikiServices;
use MediaWiki\Preferences\Hook\GetPreferencesHook;
use MediaWiki\Preferences\Hook\PreferencesFormPreSaveHook;
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
	PreferencesFormPreSaveHook,
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

		$services = MediaWikiServices::getInstance();
		$userOptionsLookup = $services->getUserOptionsLookup();
		if ( $userOptionsLookup->getOption( $user, 'visualeditor-editcheck-suggestions' ) ) {
			$preferences['visualeditor-editcheck-experimental'] = [
				'type' => 'toggle',
				'label-message' => 'editcheck-preference-experimental-enable',
				'help-message' => 'editcheck-preference-experimental-help',
				'section' => 'editing/developertools'
			];
		}
	}

	/**
	 * Implements the PreferencesFormPreSave hook, to remove the experimental preference
	 * when the user it was set on explicitly disables suggestion mode.
	 *
	 * @param array $formData Array of user submitted data
	 * @param HTMLForm $form HTMLForm object, also a ContextSource
	 * @param User $user User with preferences to be saved
	 * @param bool &$result Boolean indicating success
	 * @param array $oldUserOptions Array with user's old options (before save)
	 */
	public function onPreferencesFormPreSave( $formData, $form, $user, &$result, $oldUserOptions ) {
		$services = MediaWikiServices::getInstance();
		$userOptionsManager = $services->getUserOptionsManager();

		// When the user disables suggestion mode, clear the experimental preference before the changes are saved.
		if ( !$userOptionsManager->getOption( $user, 'visualeditor-editcheck-suggestions' ) ) {
			$userOptionsManager->setOption( $user, 'visualeditor-editcheck-experimental', false );
		}
	}

	/**
	 * Validate on-wiki edit check config updates against the bundled JSON schema.
	 *
	 * The main MediaWiki:Editcheck-config.json page is validated against the whole
	 * schema. Pages imported by a TextMatch rule via the "import" key
	 * (MediaWiki:Editcheck-config-<name>.json) hold a single inline rule, so they are
	 * validated against just the textMatchRuleInline part of the schema.
	 *
	 * @param RenderedRevision $renderedRevision
	 * @param UserIdentity $user
	 * @param CommentStoreComment $summary
	 * @param int $flags
	 * @param Status $status
	 * @return bool|void
	 */
	public function onMultiContentSave( $renderedRevision, $user, $summary, $flags, $status ) {
		$schemaPath = dirname( __DIR__ ) . '/editcheck-config.schema.json';
		$result = MediaWikiJsonSchemaValidator::validateOnSave(
			$renderedRevision,
			$status,
			'editcheck-config.json',
			$schemaPath
		);

		if ( $result === false ) {
			return false;
		}

		$page = $renderedRevision->getRevision()->getPageAsLinkTarget();
		if ( $page->getNamespace() !== NS_MEDIAWIKI ) {
			return;
		}

		$dbKey = strtolower( $page->getDBkey() );
		if ( preg_match( '/^editcheck-config-.+\.json$/', $dbKey ) ) {
			$content = $renderedRevision->getRevision()->getMainContentRaw();
			if ( $content instanceof TextContent ) {
				return MediaWikiJsonSchemaValidator::validate(
					$content,
					$status,
					$schemaPath,
					'textMatchRuleInline'
				);
			}
		}
	}
}
