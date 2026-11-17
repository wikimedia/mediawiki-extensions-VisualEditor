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
use MediaWiki\Config\Config;
use MediaWiki\Content\TextContent;
use MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts\EditSuggestionsCountsLookup;
use MediaWiki\Extension\VisualEditor\Hooks as VisualEditorHooks;
use MediaWiki\Extension\VisualEditor\MediaWikiJsonSchemaValidator;
use MediaWiki\Extension\VisualEditor\Services\VisualEditorAvailabilityLookup;
use MediaWiki\Extension\VisualEditor\VisualEditorHookRunner;
use MediaWiki\Hook\UnitTestsListHook;
use MediaWiki\HookContainer\HookContainer;
use MediaWiki\HTMLForm\HTMLForm;
use MediaWiki\Language\MessageCache;
use MediaWiki\Preferences\Hook\GetPreferencesHook;
use MediaWiki\Preferences\Hook\PreferencesFormPreSaveHook;
use MediaWiki\ResourceLoader\Hook\ResourceLoaderRegisterModulesHook;
use MediaWiki\ResourceLoader\ResourceLoader;
use MediaWiki\Revision\RenderedRevision;
use MediaWiki\Skin\Hook\SkinTemplateNavigation__UniversalHook;
use MediaWiki\Skin\SkinTemplate;
use MediaWiki\Status\Status;
use MediaWiki\Storage\Hook\MultiContentSaveHook;
use MediaWiki\User\Options\UserOptionsLookup;
use MediaWiki\User\Options\UserOptionsManager;
use MediaWiki\User\User;
use MediaWiki\User\UserIdentity;

class Hooks implements
	ResourceLoaderRegisterModulesHook,
	GetPreferencesHook,
	PreferencesFormPreSaveHook,
	MultiContentSaveHook,
	SkinTemplateNavigation__UniversalHook,
	UnitTestsListHook
{

	private readonly VisualEditorHookRunner $hookRunner;

	public function __construct(
		private readonly UserOptionsLookup $userOptionsLookup,
		private readonly UserOptionsManager $userOptionsManager,
		private readonly MessageCache $messageCache,
		private readonly EditSuggestionsCountsLookup $editSuggestionsCountsLookup,
		private readonly VisualEditorAvailabilityLookup $visualEditorAvailabilityLookup,
		private readonly Config $config,
		HookContainer $hookContainer,
	) {
		$this->hookRunner = new VisualEditorHookRunner( $hookContainer );
	}

	/**
	 * @param string[] &$paths
	 */
	public function onUnitTestsList( &$paths ) {
		$paths[] = dirname( __DIR__ ) . '/tests/phpunit';
	}

	public function onResourceLoaderRegisterModules( ResourceLoader $resourceLoader ): void {
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
		$preferences['visualeditor-editcheck-showpublishpath'] = $api;
		$preferences['visualeditor-editcheck-discoverability'] = $api;
		$preferences['visualeditor-editcheck-showdiscoverabilitywelcome'] = $api;

		if ( $this->userOptionsLookup->getOption( $user, 'visualeditor-editcheck-suggestions' ) ) {
			$preferences['visualeditor-editcheck-experimental'] = [
				'type' => 'toggle',
				'label-message' => 'editcheck-preference-experimental-enable',
				'help-message' => 'editcheck-preference-experimental-help',
				'section' => 'editing/editor'
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
		// When the user disables suggestion mode, clear the experimental preference before the changes are saved.
		if ( !$this->userOptionsManager->getOption( $user, 'visualeditor-editcheck-suggestions' ) ) {
			$this->userOptionsManager->setOption( $user, 'visualeditor-editcheck-experimental', false );
		}
	}

	/**
	 * Validate on-wiki edit check config updates against the bundled JSON schema.
	 *
	 * The main MediaWiki:Editcheck-config.json page is validated against the whole
	 * schema. Saves of its language subpages (e.g. MediaWiki:Editcheck-config.json/de)
	 * always fail. The message cache can use them as language fallbacks, and the
	 * config must have one source.
	 *
	 * Pages imported by a TextMatch rule via the "import" key
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
		$revision = $renderedRevision->getRevision();
		$page = $revision->getPageAsLinkTarget();
		if ( $page->getNamespace() !== NS_MEDIAWIKI ) {
			return;
		}

		$dbKey = strtolower( $page->getDBkey() );
		[ $messageKey ] = $this->messageCache->figureMessage( $dbKey );
		if ( $messageKey === 'editcheck-config.json' && $dbKey !== $messageKey ) {
			$status->fatal( 'editcheck-config-save-language-subpage' );
			return false;
		} elseif ( $dbKey === 'editcheck-config.json' ) {
			$definition = null;
		} elseif ( preg_match( '/^editcheck-config-.+\.json$/', $dbKey ) ) {
			$definition = 'textMatchRuleInline';
		} else {
			return;
		}

		$content = $revision->getMainContentRaw();
		if ( !( $content instanceof TextContent ) ) {
			// If for some reason the content isn't text, we can't validate it
			return;
		}

		return MediaWikiJsonSchemaValidator::validate(
			$content,
			$status,
			dirname( __DIR__ ) . '/editcheck-config.schema.json',
			$definition
		);
	}

	/**
	 * Shows the page's suggestion indicator: on the sticky header's edit button in
	 * Vector 2022, on the edit button in Minerva, or on a Suggestions tab in other skins.
	 *
	 * $wgVisualEditorEditCheckReadSuggestionsCount enables this feature.
	 * The VisualEditorEditCheckReadSuggestionsIndicator hook can show a lightbulb
	 * instead of the count, or hide the indicator.
	 *
	 * @param SkinTemplate $skin The skin template on which the UI is built.
	 * @param array &$links Navigation links.
	 */
	public function onSkinTemplateNavigation__Universal( $skin, &$links ): void {
		if ( !$this->config->get( 'VisualEditorEditCheckReadSuggestionsCount' ) ) {
			return;
		}
		$title = $skin->getTitle();
		$request = $skin->getRequest();
		$user = $skin->getUser();
		if (
			!in_array( $skin->getActionName(), [ 'view', 'edit' ], true ) ||
			!VisualEditorHooks::isEditCheckSuggestionsAvailable( $request, $user, $this->userOptionsLookup ) ||
			!$this->visualEditorAvailabilityLookup->isAvailable( $title, $request, $user )
		) {
			return;
		}
		$count = $this->editSuggestionsCountsLookup->getCount( $title, $user );
		if ( !$count ) {
			return;
		}
		$indicator = 'count';
		$this->hookRunner->onVisualEditorEditCheckReadSuggestionsIndicator( $skin, $count, $indicator );
		if ( !in_array( $indicator, [ 'count', 'lightbulb' ], true ) ) {
			return;
		}
		$output = $skin->getOutput();
		// Matches edit mode: 100 or more shows as "99+"
		$label = $skin->msg( 'editcheck-toolbar-suggestions-count', min( 100, $count ) )->text();
		if ( in_array( $skin->getSkinName(), [ 'vector-2022', 'minerva' ], true ) ) {
			// The edit buttons of these skins can't get attributes from here, so pass the indicator to CSS
			$output->addHtmlClasses( "ext-editcheck-read-suggestions-$indicator" );
			if ( $indicator === 'count' ) {
				$cssLabel = preg_replace_callback(
					'/[^0-9A-Za-z +]/u',
					static fn ( $m ) => sprintf( '\\%x ', mb_ord( $m[0] ) ),
					$label
				);
				// @phan-suppress-next-line SecurityCheck-XSS $cssLabel only has escapes and safe characters
				$output->addInlineStyle( ":root { --ext-editcheck-suggestion-count: '$cssLabel'; }" );
			}
			// Pulses the indicator on its first view
			$output->addModules( 'ext.visualEditor.editCheck.read' );
		} else {
			// The tab has a lightbulb icon, so the lightbulb indicator is the tab without a count
			$links['views']['suggestions'] = [
				'text' => $skin->msg( 'editcheck-read-suggestions' )->text(),
				'href' => $title->getLocalURL( [ 'veaction' => 'edit' ] ),
				'icon' => 'lightbulb',
				'class' => '',
			];
			if ( $indicator === 'count' ) {
				$links['views']['suggestions']['data'] = [ 'count' => $label ];
			}
		}
		$output->addModuleStyles( 'ext.visualEditor.editCheck.read.styles' );
	}
}
