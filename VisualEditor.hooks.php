<?php
/**
 * VisualEditor extension hooks
 *
 * @file
 * @ingroup Extensions
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

class VisualEditorHooks {
	/**
	 * Initialise the 'VisualEditorAvailableNamespaces' setting, and add content
	 * namespaces to it. This will run after LocalSettings.php is processed.
	 */
	public static function onRegistration() {
		global $wgVisualEditorAvailableNamespaces, $wgContentNamespaces;

		foreach ( $wgContentNamespaces as $contentNamespace ) {
			if ( !isset( $wgVisualEditorAvailableNamespaces[$contentNamespace] ) ) {
				$wgVisualEditorAvailableNamespaces[$contentNamespace] = true;
			}
		}

	}

	public static function VisualEditorApiFactory( $main, $name ) {
		$config = ConfigFactory::getDefaultInstance()->makeConfig( 'visualeditor' );
		$class = $name === 'visualeditor' ? 'ApiVisualEditor' : 'ApiVisualEditorEdit';
		return new $class( $main, $name, $config );
	}

	/**
	 * Adds VisualEditor JS to the output.
	 *
	 * This is attached to the MediaWiki 'BeforePageDisplay' hook.
	 *
	 * @param OutputPage $output
	 * @param Skin $skin
	 * @return boolean
	 */
	public static function onBeforePageDisplay( OutputPage &$output, Skin &$skin ) {
		$output->addModules( [
			'ext.visualEditor.desktopArticleTarget.init',
			'ext.visualEditor.targetLoader'
		] );
		$output->addModuleStyles( [ 'ext.visualEditor.desktopArticleTarget.noscript' ] );
		// add scroll offset js variable to output
		$veConfig = ConfigFactory::getDefaultInstance()->makeConfig( 'visualeditor' );
		$skinsToolbarScrollOffset = $veConfig->get( 'VisualEditorSkinToolbarScrollOffset' );
		$toolbarScrollOffset = 0;
		$skinName = $skin->getSkinName();
		if ( isset( $skinsToolbarScrollOffset[$skinName] ) ) {
			$toolbarScrollOffset = $skinsToolbarScrollOffset[$skinName];
		}
		$output->addJsConfigVars( 'wgVisualEditorToolbarScrollOffset', $toolbarScrollOffset );
		return true;
	}

	/**
	 * Detect incompatibile browsers which we can't expect to load VE
	 *
	 * @param WebRequest $req The web request to check the details of
	 * @param Config $config VE config object
	 * @param boolean
	 */
	private static function isUABlacklisted( WebRequest $req, $config ) {
		if ( $req->getVal( 'vewhitelist' ) ) {
			return false;
		}
		$blacklist = $config->get( 'VisualEditorBrowserBlacklist' );
		$ua = strtolower( $req->getHeader( 'User-Agent' ) );
		foreach ( $blacklist as $uaSubstr => $rules ) {
			if ( !strpos( $ua, $uaSubstr . '/' ) ) {
				continue;
			}
			if ( !is_array( $rules ) ) {
				return true;
			}

			$matches = [];
			$ret = preg_match( '/' . $uaSubstr . '\/([0-9\.]*) ?/i', $ua, $matches );
			if ( $ret !== 1 ) {
				continue;
			}
			$version = $matches[1];
			foreach ( $rules as $rule ) {
				list( $op, $matchVersion ) = $rule;
				if (
					( $op === '<' && $version < $matchVersion ) ||
					( $op === '>' && $version > $matchVersion ) ||
					( $op === '<=' && $version <= $matchVersion ) ||
					( $op === '>=' && $version >= $matchVersion )
				) {
					return true;
				}
			}

		}
		return false;
	}

	/**
	 * Decide whether to bother showing the wikitext editor at all.
	 * If not, we expect the VE initialisation JS to activate.
	 * @param $article Article
	 * @param $user User
	 * @return bool Whether to show the wikitext editor or not.
	 */
	public static function onCustomEditor( Article $article, User $user ) {
		$req = $article->getContext()->getRequest();
		$veConfig = ConfigFactory::getDefaultInstance()->makeConfig( 'visualeditor' );

		if (
			!$user->getOption( 'visualeditor-enable' ) ||
			$user->getOption( 'visualeditor-betatempdisable' ) ||
			$user->getOption( 'visualeditor-autodisable' ) ||
			$user->getOption( 'visualeditor-tabs' ) === 'prefer-wt' ||
			$user->getOption( 'visualeditor-tabs' ) === 'multi-tab' ||
			( $veConfig->get( 'VisualEditorDisableForAnons' ) && $user->isAnon() ) ||
			self::isUABlacklisted( $req, $veConfig )
		) {
			return true;
		}

		$title = $article->getTitle();

		$params = $req->getValues();

		if ( isset( $params['venoscript'] ) ) {
			$req->response()->setCookie( 'VEE', 'wikitext', 0, [ 'prefix' => '' ] );
			$user->setOption( 'visualeditor-editor', 'wikitext' );
			if ( !wfReadOnly() && !$user->isAnon() ) {
				DeferredUpdates::addCallableUpdate( function () use ( $user ) {
					$user->saveSettings();
				} );
			}
			return true;
		}

		$ret = $req->getVal( 'action' ) !== 'edit' ||
			!$veConfig->get( 'VisualEditorUseSingleEditTab' ) ||
			self::getUserEditor( $user, $req ) === 'wikitext' ||
			!$title->quickUserCan( 'edit' ) ||
			!ApiVisualEditor::isAllowedNamespace( $veConfig, $title->getNamespace() ) ||
			$title->getContentModel() !== CONTENT_MODEL_WIKITEXT ||
			// Known parameters that VE does not handle
			// TODO: Other params too? See identical list in ve.init.mw.DesktopArticleTarget.init.js
			isset( $params['undo'] ) ||
			isset( $params['undoafter'] ) ||
			isset( $params['editintro'] ) ||
			isset( $params['preload'] ) ||
			isset( $params['preloadtitle'] ) ||
			isset( $params['preloadparams'] ) ||
			isset( $params['veswitched'] );
			// Known-good parameters: edit, veaction, section, vesection

		$params['venoscript'] = '1';
		$url = wfScript() . '?' . wfArrayToCgi( $params );
		$out = $article->getContext()->getOutput();
		if ( !$ret ) {
			$escapedUrl = htmlspecialchars( $url );
			$out->addHeadItem(
				've-noscript-fallback',
				"<noscript><meta http-equiv=\"refresh\" content=\"0; url=$escapedUrl\"></noscript>"
			);

			$titleMsg = $title->exists() ? 'editing' : 'creating';
			$out->setPageTitle( wfMessage( $titleMsg, $title->getPrefixedText() ) );
			$out->addWikiMsg( 'visualeditor-toload', wfExpandUrl( $url ) );
		}
		$out->addScript( Html::inlineScript(
			"(window.NORLQ=window.NORLQ||[]).push(" .
				"function(){" .
					"location.href=\"$url\";" .
				"}" .
			");"
		) );
		return $ret;
	}

	private static function getUserEditor( User $user, WebRequest $req ) {
		if ( $user->isAnon() ) {
			return $req->getCookie(
				'VEE',
				'',
				User::getDefaultOption( 'visualeditor-editor' )
			);
		} else {
			return $user->getOption( 'visualeditor-editor' );
		}
	}

	/**
	 * Convert the content model of a message that is actually JSON to JSON.
	 * This only affects validation and UI when saving and editing, not
	 * loading the content.
	 *
	 * @param Title $title
	 * @param string $model
	 * @return bool
	 */
	public static function onContentHandlerDefaultModelFor( Title $title, &$model ) {
		if (
			$title->inNamespace( NS_MEDIAWIKI ) &&
			$title->getText() === 'Visualeditor-quick-access-characters.json'
		) {
			$model = CONTENT_MODEL_JSON;
		}

		return true;
	}

	/**
	 * Changes the Edit tab and adds the VisualEditor tab.
	 *
	 * This is attached to the MediaWiki 'SkinTemplateNavigation' hook.
	 *
	 * @param SkinTemplate $skin
	 * @param array $links Navigation links
	 * @return boolean
	 */
	public static function onSkinTemplateNavigation( SkinTemplate &$skin, array &$links ) {
		$config = ConfigFactory::getDefaultInstance()->makeConfig( 'visualeditor' );

		// Exit if there's no edit link for whatever reason (e.g. protected page)
		if ( !isset( $links['views']['edit'] ) ) {
			return true;
		}

		$user = $skin->getUser();
		if (
			$config->get( 'VisualEditorUseSingleEditTab' ) &&
			$user->getOption( 'visualeditor-tabs' ) === 'prefer-wt'
		) {
			return true;
		}

		$dbr = wfGetDB( DB_SLAVE );
		if (
			$config->get( 'VisualEditorUseSingleEditTab' ) &&
			!$user->isAnon() &&
			!$user->getOption( 'visualeditor-autodisable' ) &&
			!$user->getOption( 'visualeditor-betatempdisable' ) &&
			!$user->getOption( 'visualeditor-hidetabdialog' ) &&
			$user->getOption( 'visualeditor-tabs' ) === 'remember-last' &&
			$dbr->select(
				'revision',
				'1',
				[
					'rev_user' => $user->getId(),
					'rev_timestamp < ' . $dbr->addQuotes(
						$config->get( 'VisualEditorSingleEditTabSwitchTime' )
					)
				],
				__METHOD__,
				[ 'LIMIT' => 1 ]
			)->numRows() === 1
		) {
			$links['views']['edit']['class'] .= ' visualeditor-showtabdialog';
		}

		// Exit if the user doesn't have VE enabled
		if (
			!$user->getOption( 'visualeditor-enable' ) ||
			$user->getOption( 'visualeditor-betatempdisable' ) ||
			$user->getOption( 'visualeditor-autodisable' ) ||
			( $config->get( 'VisualEditorDisableForAnons' ) && $user->isAnon() )
		) {
			return true;
		}

		$title = $skin->getRelevantTitle();
		$namespaceEnabled = ApiVisualEditor::isAllowedNamespace( $config, $title->getNamespace() );
		$pageContentModel = $title->getContentModel();
		// Don't exit if this page isn't VE-enabled, since we should still
		// change "Edit" to "Edit source".
		$isAvailable = (
			$namespaceEnabled &&
			$pageContentModel === CONTENT_MODEL_WIKITEXT
		);

		// HACK: Exit if we're in the Education Program namespace (even though it's content)
		if ( defined( 'EP_NS' ) && $title->inNamespace( EP_NS ) ) {
			return true;
		}

		$tabMessages = $config->get( 'VisualEditorTabMessages' );
		// Rebuild the $links['views'] array and inject the VisualEditor tab before or after
		// the edit tab as appropriate. We have to rebuild the array because PHP doesn't allow
		// us to splice into the middle of an associative array.
		$newViews = [];
		foreach ( $links['views'] as $action => $data ) {
			if ( $action === 'edit' ) {
				// Build the VisualEditor tab
				$existing = $title->exists() || (
					$title->inNamespace( NS_MEDIAWIKI ) &&
					$title->getDefaultMessageText() !== false
				);
				$action = $existing ? 'edit' : 'create';
				$veParams = $skin->editUrlOptions();
				unset( $veParams['action'] ); // Remove action=edit
				$veParams['veaction'] = 'edit'; // Set veaction=edit
				$veTabMessage = $tabMessages[$action];
				$veTabText = $veTabMessage === null ? $data['text'] :
					$skin->msg( $veTabMessage )->text();
				$veTab = [
					'href' => $title->getLocalURL( $veParams ),
					'text' => $veTabText,
					'primary' => true,
					'class' => '',
				];

				// Alter the edit tab
				$editTab = $data;
				if (
					$title->inNamespace( NS_FILE ) &&
					WikiPage::factory( $title ) instanceof WikiFilePage &&
					!WikiPage::factory( $title )->isLocal()
				) {
					$editTabMessage = $tabMessages[$action . 'localdescriptionsource'];
				} else {
					$editTabMessage = $tabMessages[$action . 'source'];
				}

				if ( $editTabMessage !== null ) {
					$editTab['text'] = $skin->msg( $editTabMessage )->text();
				}

				$editor = self::getUserEditor( $user, RequestContext::getMain()->getRequest() );
				if (
					$isAvailable &&
					$config->get( 'VisualEditorUseSingleEditTab' ) &&
					(
						$user->getOption( 'visualeditor-tabs' ) === 'prefer-ve' ||
						(
							$user->getOption( 'visualeditor-tabs' ) === 'remember-last' &&
							$editor === 'visualeditor'
						)
					)
				) {
					$editTab['text'] = $veTabText;
					$newViews['edit'] = $editTab;
				} elseif (
					$isAvailable &&
					(
						!$config->get( 'VisualEditorUseSingleEditTab' ) ||
						$user->getOption( 'visualeditor-tabs' ) === 'multi-tab'
					)
				) {
					// Inject the VE tab before or after the edit tab
					if ( $config->get( 'VisualEditorTabPosition' ) === 'before' ) {
						$editTab['class'] .= ' collapsible';
						$newViews['ve-edit'] = $veTab;
						$newViews['edit'] = $editTab;
					} else {
						$veTab['class'] .= ' collapsible';
						$newViews['edit'] = $editTab;
						$newViews['ve-edit'] = $veTab;
					}
				} elseif (
					!$config->get( 'VisualEditorUseSingleEditTab' ) ||
					!$isAvailable ||
					$user->getOption( 'visualeditor-tabs' ) === 'multi-tab' ||
					(
						$user->getOption( 'visualeditor-tabs' ) === 'remember-last' &&
						$editor === 'wikitext'
					)
				) {
					// Don't add ve-edit, but do update the edit tab (e.g. "Edit source").
					$newViews['edit'] = $editTab;
				} else {
					// This should not happen.
				}
			} else {
				// Just pass through
				$newViews[$action] = $data;
			}
		}
		$links['views'] = $newViews;
		return true;
	}

	/**
	 * Called when the normal wikitext editor is shown.
	 * Inserts a 'veswitched' hidden field if requested by the client
	 *
	 * @param $editPage EditPage
	 * @param $output OutputPage
	 * @return boolean true
	 */
	public static function onEditPageShowEditFormFields( EditPage $editPage, OutputPage $output ) {
		$request = $output->getRequest();
		if ( $request->getBool( 'veswitched' ) ) {
			$output->addHTML( Xml::input( 'veswitched', false, '1', [ 'type' => 'hidden' ] ) );
		}
		return true;
	}

	/**
	 * Called when an edit is saved
	 * Adds 'visualeditor-switched' tag to the edit if requested
	 *
	 * @param RecentChange $rc
	 * @return boolean true
	 */
	public static function onRecentChange_save( RecentChange $rc ) {
		$request = RequestContext::getMain()->getRequest();
		if ( $request->getBool( 'veswitched' ) && $rc->mAttribs['rc_this_oldid'] ) {
			ChangeTags::addTags( 'visualeditor-switched',
				$rc->mAttribs['rc_id'], $rc->mAttribs['rc_this_oldid'] );
		}
		return true;
	}

	/**
	 * Changes the section edit links to add a VE edit link.
	 *
	 * This is attached to the MediaWiki 'SkinEditSectionLinks' hook.
	 *
	 * @param $skin Skin
	 * @param $title Title
	 * @param $section string
	 * @param $tooltip string
	 * @param $result array
	 * @param $lang Language
	 * @return bool true
	 */
	public static function onSkinEditSectionLinks( Skin $skin, Title $title, $section,
		$tooltip, &$result, $lang
	) {
		$config = ConfigFactory::getDefaultInstance()->makeConfig( 'visualeditor' );

		// Exit if we're using the single edit tab.
		if (
			$config->get( 'VisualEditorUseSingleEditTab' ) &&
			$skin->getUser()->getOption( 'visualeditor-tabs' ) !== 'multi-tab'
		) {
			return true;
		}

		// Exit if we're in parserTests
		if ( isset( $GLOBALS[ 'wgVisualEditorInParserTests' ] ) ) {
			return true;
		}

		// Exit if the user doesn't have VE enabled
		if (
			!$skin->getUser()->getOption( 'visualeditor-enable' ) ||
			$skin->getUser()->getOption( 'visualeditor-betatempdisable' ) ||
			$skin->getUser()->getOption( 'visualeditor-autodisable' ) ||
			( $config->get( 'VisualEditorDisableForAnons' ) && $skin->getUser()->isAnon() )
		) {
			return true;
		}

		// Exit if we're on a foreign file description page
		if (
			$title->inNamespace( NS_FILE ) &&
			WikiPage::factory( $title ) instanceof WikiFilePage &&
			!WikiPage::factory( $title )->isLocal()
		) {
			return true;
		}

		$tabMessages = $config->get( 'VisualEditorTabMessages' );
		$sourceEditSection = $tabMessages['editsectionsource'] !== null ?
			$tabMessages['editsectionsource'] : 'editsection';

		$result['editsection']['text'] = $skin->msg( $sourceEditSection )->inLanguage( $lang )->text();

		// add VE edit section in VE available namespaces
		if ( ApiVisualEditor::isAllowedNamespace( $config, $title->getNamespace() ) ) {
			$veEditSection = $tabMessages['editsection'] !== null ?
				$tabMessages['editsection'] : 'editsection';
			$veLink = [
				'text' => $skin->msg( $veEditSection )->inLanguage( $lang )->text(),
				'targetTitle' => $title,
				'attribs' => $result['editsection']['attribs'] + [
					'class' => 'mw-editsection-visualeditor'
				],
				'query' => [ 'veaction' => 'edit', 'vesection' => $section ],
				'options' => [ 'noclasses', 'known' ]
			];

			$result['veeditsection'] = $veLink;
			if ( $config->get( 'VisualEditorTabPosition' ) === 'before' ) {
				krsort( $result );
				// TODO: This will probably cause weird ordering if any other extensions added something
				// already.
				// ... wfArrayInsertBefore?
			}
		}
		return true;
	}

	/**
	 * Convert a namespace index to the local text for display to the user.
	 *
	 * @param $nsIndex int
	 * @return string
	 */
	private static function convertNs( $nsIndex ) {
		global $wgLang;
		if ( $nsIndex ) {
			return $wgLang->convertNamespace( $nsIndex );
		} else {
			return wfMessage( 'blanknamespace' )->text();
		}
	}

	public static function onGetPreferences( User $user, array &$preferences ) {
		global $wgLang;
		if ( !class_exists( 'BetaFeatures' ) ) {
			$namespaces = ConfigFactory::getDefaultInstance()
				->makeConfig( 'visualeditor' )
				->get( 'VisualEditorAvailableNamespaces' );
			$onNamespaces = array_keys( array_filter( $namespaces ) );

			$enablePreference = [
				'type' => 'toggle',
				'label-message' => [
					'visualeditor-preference-enable',
					$wgLang->commaList( array_map(
						[ 'self', 'convertNs' ],
						$onNamespaces
					) ),
					count( $onNamespaces )
				],
				'section' => 'editing/editor'
			];
			if ( $user->getOption( 'visualeditor-autodisable' ) ) {
				$enablePreference['default'] = false;
			}
			$preferences['visualeditor-enable'] = $enablePreference;
		}
		$preferences['visualeditor-betatempdisable'] = [
			'type' => 'toggle',
			'label-message' => 'visualeditor-preference-betatempdisable',
			'section' => 'editing/editor',
			'default' => $user->getOption( 'visualeditor-betatempdisable' ) ||
				$user->getOption( 'visualeditor-autodisable' )
		];

		$config = ConfigFactory::getDefaultInstance()->makeConfig( 'visualeditor' );
		if (
			$config->get( 'VisualEditorUseSingleEditTab' ) &&
			!$user->getOption( 'visualeditor-autodisable' ) &&
			!$user->getOption( 'visualeditor-betatempdisable' )
		) {
			$preferences['visualeditor-tabs'] = [
				'type' => 'select',
				'label-message' => 'visualeditor-preference-tabs',
				'section' => 'editing/editor',
				'options' => [
					wfMessage( 'visualeditor-preference-tabs-remember-last' )->escaped() => 'remember-last',
					wfMessage( 'visualeditor-preference-tabs-prefer-ve' )->escaped() => 'prefer-ve',
					wfMessage( 'visualeditor-preference-tabs-prefer-wt' )->escaped() => 'prefer-wt',
					wfMessage( 'visualeditor-preference-tabs-multi-tab' )->escaped() => 'multi-tab'
				]
			];
		}

		$api = [ 'type' => 'api' ];
		$preferences['visualeditor-autodisable'] = $api;
		$preferences['visualeditor-editor'] = $api;
		$preferences['visualeditor-hidebetawelcome'] = $api;
		$preferences['visualeditor-hidetabdialog'] = $api;
		$preferences['visualeditor-hidesourceswitchpopup'] = $api;
		$preferences['visualeditor-hidevisualswitchpopup'] = $api;
		$preferences['visualeditor-hideusered'] = $api;
		$preferences['visualeditor-findAndReplace-findText'] = $api;
		$preferences['visualeditor-findAndReplace-replaceText'] = $api;
		$preferences['visualeditor-findAndReplace-regex'] = $api;
		$preferences['visualeditor-findAndReplace-matchCase'] = $api;
		$preferences['visualeditor-findAndReplace-word'] = $api;
		return true;
	}

	public static function onGetBetaPreferences( User $user, array &$preferences ) {
		$coreConfig = RequestContext::getMain()->getConfig();
		$iconpath = $coreConfig->get( 'ExtensionAssetsPath' ) . "/VisualEditor";

		$veConfig = ConfigFactory::getDefaultInstance()->makeConfig( 'visualeditor' );
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
				'blacklist' => $veConfig->get( 'VisualEditorBrowserBlacklist' ),
				'skins' => $veConfig->get( 'VisualEditorSupportedSkins' ),
			]
		];
	}

	/**
	 * Implements the PreferencesFormPreSave hook, to remove the 'autodisable' flag
	 * when the user it was set on explicitly enables VE.
	 * @param array $data User-submitted data
	 * @param PreferencesForm $form A ContextSource
	 * @param User $user User with new preferences already set
	 * @param bool &$result Success or failure
	 */
	public static function onPreferencesFormPreSave( $data, $form, $user, &$result ) {
		$veConfig = ConfigFactory::getDefaultInstance()->makeConfig( 'visualeditor' );
		// On a wiki where enable is hidden and set to 1, if user sets betatempdisable=0
		// then set autodisable=0
		// On a wiki where betatempdisable is hidden and set to 0, if user sets enable=1
		// then set autodisable=0
		if (
			$user->getOption( 'visualeditor-autodisable' ) &&
			$user->getOption( 'visualeditor-enable' ) &&
			!$user->getOption( 'visualeditor-betatempdisable' )
		) {
			$user->setOption( 'visualeditor-autodisable', false );
		} elseif (
			// On a wiki where betatempdisable is hidden and set to 0, if user sets enable=0,
			// then set autodisable=1
			$veConfig->get( 'VisualEditorTransitionDefault' ) &&
			!$user->getOption( 'visualeditor-betatempdisable' ) &&
			!$user->getOption( 'visualeditor-enable' ) &&
			!$user->getOption( 'visualeditor-autodisable' )
		) {
			$user->setOption( 'visualeditor-autodisable', true );
		}
	}

	/**
	 * Implements the ListDefinedTags and ChangeTagsListActive hooks, to populate
	 * core Special:Tags with the change tags in use by VisualEditor.
	 *
	 * @param array $tags
	 * @return bool true
	 */
	public static function onListDefinedTags( &$tags ) {
		$tags[] = 'visualeditor';
		$tags[] = 'visualeditor-needcheck'; // No longer in active use
		$tags[] = 'visualeditor-switched';
		return true;
	}

	/**
	 * Adds extra variables to the page config.
	 */
	public static function onMakeGlobalVariablesScript( array &$vars, OutputPage $out ) {
		$pageLanguage = $out->getTitle()->getPageLanguage();

		$vars['wgVisualEditor'] = [
			'pageLanguageCode' => $pageLanguage->getHtmlCode(),
			'pageLanguageDir' => $pageLanguage->getDir(),
			'usePageImages' => defined( 'PAGE_IMAGES_INSTALLED' ),
			'usePageDescriptions' => defined( 'WBC_VERSION' ),
		];

		return true;
	}

	/**
	 * Adds extra variables to the global config
	 */
	public static function onResourceLoaderGetConfigVars( array &$vars ) {
		$coreConfig = RequestContext::getMain()->getConfig();
		$defaultUserOptions = $coreConfig->get( 'DefaultUserOptions' );
		$thumbLimits = $coreConfig->get( 'ThumbLimits' );
		$veConfig = ConfigFactory::getDefaultInstance()->makeConfig( 'visualeditor' );
		$availableNamespaces = $veConfig->get( 'VisualEditorAvailableNamespaces' );
		$enabledNamespaces = array_map( function ( $namespace ) {
			// Convert canonical namespace names to IDs
			return is_numeric( $namespace ) ?
				$namespace :
				MWNamespace::getCanonicalIndex( strtolower( $namespace ) );
		}, array_keys( array_filter( $availableNamespaces ) ) );

		$vars['wgVisualEditorConfig'] = [
			'disableForAnons' => $veConfig->get( 'VisualEditorDisableForAnons' ),
			'preferenceModules' => $veConfig->get( 'VisualEditorPreferenceModules' ),
			'namespaces' => $enabledNamespaces,
			'signatureNamespaces' => array_values(
				array_filter( $enabledNamespaces, 'MWNamespace::wantSignatures' )
			),
			'pluginModules' => array_merge(
				ExtensionRegistry::getInstance()->getAttribute( 'VisualEditorPluginModules' ),
				$veConfig->get( 'VisualEditorPluginModules' ) // @todo deprecate the global setting
			),
			'defaultUserOptions' => [
				'defaultthumbsize' => $thumbLimits[ $defaultUserOptions['thumbsize'] ]
			],
			'blacklist' => $veConfig->get( 'VisualEditorBrowserBlacklist' ),
			'skins' => $veConfig->get( 'VisualEditorSupportedSkins' ),
			'tabPosition' => $veConfig->get( 'VisualEditorTabPosition' ),
			'tabMessages' => $veConfig->get( 'VisualEditorTabMessages' ),
			'singleEditTab' => $veConfig->get( 'VisualEditorUseSingleEditTab' ),
			'showBetaWelcome' => $veConfig->get( 'VisualEditorShowBetaWelcome' ),
			'enableTocWidget' => $veConfig->get( 'VisualEditorEnableTocWidget' ),
			'svgMaxSize' => $coreConfig->get( 'SVGMaxSize' ),
			'namespacesWithSubpages' => $coreConfig->get( 'NamespacesWithSubpages' ),
			'specialBooksources' => urldecode( SpecialPage::getTitleFor( 'Booksources' )->getPrefixedURL() ),
			'restbaseUrl' => $coreConfig->get( 'VisualEditorRestbaseURL' ),
			'fullRestbaseUrl' => $coreConfig->get( 'VisualEditorFullRestbaseURL' ),
			'feedbackApiUrl' =>  $veConfig->get( 'VisualEditorFeedbackAPIURL' ),
			'feedbackTitle' =>  $veConfig->get( 'VisualEditorFeedbackTitle' ),
		];

		return true;
	}

	/**
	 * Conditionally register the jquery.uls.data and jquery.i18n modules, in case they've already
	 * been registered by the UniversalLanguageSelector extension or the TemplateData extension.
	 *
	 * @param ResourceLoader $resourceLoader
	 * @return boolean true
	 */
	public static function onResourceLoaderRegisterModules( ResourceLoader &$resourceLoader ) {
		$resourceModules = $resourceLoader->getConfig()->get( 'ResourceModules' );

		$veResourceTemplate = [
			'localBasePath' => __DIR__,
			'remoteExtPath' => 'VisualEditor',
		];

		// Only pull in VisualEditor core's local version of jquery.uls.data if it hasn't been
		// installed locally already (presumably, by the UniversalLanguageSelector extension).
		if (
			!isset( $resourceModules[ 'jquery.uls.data' ] ) &&
			!$resourceLoader->isModuleRegistered( 'jquery.uls.data' )
		) {
			$resourceLoader->register( [
				'jquery.uls.data' => $veResourceTemplate + [
					'scripts' => [
						'lib/ve/lib/jquery.uls/src/jquery.uls.data.js',
						'lib/ve/lib/jquery.uls/src/jquery.uls.data.utils.js',
					],
					'targets' => [ 'desktop', 'mobile' ],
			] ] );
		}

		return true;
	}

	public static function onResourceLoaderTestModules(
		array &$testModules,
		ResourceLoader &$resourceLoader
	) {
		$testModules['qunit']['ext.visualEditor.test'] = [
			'styles' => [
				// jsdifflib
				'lib/ve/lib/jsdifflib/diffview.css',
			],
			'scripts' => [
				// MW config preload
				'modules/ve-mw/tests/mw-preload.js',
				// jsdifflib
				'lib/ve/lib/jsdifflib/diffview.js',
				'lib/ve/lib/jsdifflib/difflib.js',
				// QUnit plugin
				'lib/ve/tests/ve.qunit.js',
				// VisualEditor Tests
				'lib/ve/tests/ve.test.utils.js',
				'modules/ve-mw/tests/ve.test.utils.js',
				'lib/ve/tests/ve.test.js',
				'lib/ve/tests/ve.Document.test.js',
				'lib/ve/tests/ve.Node.test.js',
				'lib/ve/tests/ve.BranchNode.test.js',
				'lib/ve/tests/ve.LeafNode.test.js',
				// VisualEditor DataModel Tests
				'lib/ve/tests/dm/ve.dm.example.js',
				'lib/ve/tests/dm/ve.dm.AnnotationSet.test.js',
				'lib/ve/tests/dm/ve.dm.NodeFactory.test.js',
				'lib/ve/tests/dm/ve.dm.Node.test.js',
				'lib/ve/tests/dm/ve.dm.Converter.test.js',
				'lib/ve/tests/dm/ve.dm.BranchNode.test.js',
				'lib/ve/tests/dm/ve.dm.LeafNode.test.js',
				'lib/ve/tests/dm/ve.dm.LinearData.test.js',
				'lib/ve/tests/dm/nodes/ve.dm.TextNode.test.js',
				'modules/ve-mw/tests/dm/nodes/ve.dm.MWTransclusionNode.test.js',
				'lib/ve/tests/dm/ve.dm.Document.test.js',
				'modules/ve-mw/tests/dm/ve.dm.Document.test.js',
				'lib/ve/tests/dm/ve.dm.DocumentSynchronizer.test.js',
				'lib/ve/tests/dm/ve.dm.IndexValueStore.test.js',
				'lib/ve/tests/dm/ve.dm.InternalList.test.js',
				'lib/ve/tests/dm/ve.dm.Transaction.test.js',
				'lib/ve/tests/dm/ve.dm.TransactionProcessor.test.js',
				'lib/ve/tests/dm/ve.dm.APIResultsQueue.test.js',
				'lib/ve/tests/dm/ve.dm.Surface.test.js',
				'lib/ve/tests/dm/ve.dm.SurfaceFragment.test.js',
				'modules/ve-mw/tests/dm/ve.dm.SurfaceFragment.test.js',
				'lib/ve/tests/dm/ve.dm.ModelRegistry.test.js',
				'lib/ve/tests/dm/ve.dm.MetaList.test.js',
				'lib/ve/tests/dm/lineardata/ve.dm.FlatLinearData.test.js',
				'lib/ve/tests/dm/lineardata/ve.dm.ElementLinearData.test.js',
				'lib/ve/tests/dm/lineardata/ve.dm.MetaLinearData.test.js',
				'modules/ve-mw/tests/dm/ve.dm.mwExample.js',
				'modules/ve-mw/tests/dm/ve.dm.Converter.test.js',
				'modules/ve-mw/tests/dm/ve.dm.MWImageModel.test.js',
				// VisualEditor ContentEditable Tests
				'lib/ve/tests/ce/ve.ce.test.js',
				'lib/ve/tests/ce/ve.ce.Document.test.js',
				'lib/ve/tests/ce/ve.ce.Surface.test.js',
				'modules/ve-mw/tests/ce/ve.ce.Surface.test.js',
				'lib/ve/tests/ce/ve.ce.NodeFactory.test.js',
				'lib/ve/tests/ce/ve.ce.Node.test.js',
				'lib/ve/tests/ce/ve.ce.BranchNode.test.js',
				'lib/ve/tests/ce/ve.ce.ContentBranchNode.test.js',
				'modules/ve-mw/tests/ce/ve.ce.ContentBranchNode.test.js',
				'lib/ve/tests/ce/ve.ce.LeafNode.test.js',
				'lib/ve/tests/ce/nodes/ve.ce.TextNode.test.js',
				// VisualEditor Actions Tests
				'lib/ve/tests/ui/actions/ve.ui.AnnotationAction.test.js',
				'lib/ve/tests/ui/actions/ve.ui.FormatAction.test.js',
				'modules/ve-mw/tests/ui/actions/ve.ui.FormatAction.test.js',
				'lib/ve/tests/ui/actions/ve.ui.IndentationAction.test.js',
				'lib/ve/tests/ui/actions/ve.ui.LinkAction.test.js',
				'modules/ve-mw/tests/ui/actions/ve.ui.MWLinkAction.test.js',
				'lib/ve/tests/ui/actions/ve.ui.ListAction.test.js',
				// VisualEditor DataTransferHandler tests
				'lib/ve/tests/ui/datatransferhandlers/ve.ui.DSVFileTransferHandler.test.js',
				'lib/ve/tests/ui/datatransferhandlers/ve.ui.UrlStringTransferHandler.test.js',
				'modules/ve-mw/tests/ui/datatransferhandlers/ve.ui.MWWikitextStringTransferHandler.test.js',
				'modules/ve-mw/tests/ui/datatransferhandlers/ve.ui.UrlStringTransferHandler.test.js',
				// VisualEditor initialization Tests
				'lib/ve/tests/init/ve.init.Platform.test.js',
				'modules/ve-mw/tests/init/targets/ve.init.mw.DesktopArticleTarget.test.js',
				// IME tests
				'lib/ve/tests/ce/ve.ce.TestRunner.js',
				'lib/ve/tests/ce/ve.ce.imetests.test.js',
				'lib/ve/tests/ce/imetests/backspace-chromium-ubuntu-none.js',
				'lib/ve/tests/ce/imetests/backspace-firefox-ubuntu-none.js',
				'lib/ve/tests/ce/imetests/backspace-ie9-win7-none.js',
				'lib/ve/tests/ce/imetests/home-firefox-win7-none.js',
				'lib/ve/tests/ce/imetests/input-chrome-mac-native-japanese-hiragana.js',
				'lib/ve/tests/ce/imetests/input-chrome-mac-native-japanese-katakana.js',
				'lib/ve/tests/ce/imetests/input-chrome-win7-chinese-traditional-handwriting.js',
				'lib/ve/tests/ce/imetests/input-chrome-win7-greek.js',
				'lib/ve/tests/ce/imetests/input-chrome-win7-polish.js',
				'lib/ve/tests/ce/imetests/input-chrome-win7-welsh.js',
				'lib/ve/tests/ce/imetests/input-chromium-ubuntu-ibus-chinese-cantonese.js',
				'lib/ve/tests/ce/imetests/input-chromium-ubuntu-ibus-japanese-anthy--hiraganaonly.js',
				'lib/ve/tests/ce/imetests/input-chromium-ubuntu-ibus-japanese-mozc.js',
				'lib/ve/tests/ce/imetests/input-chromium-ubuntu-ibus-korean-korean.js',
				'lib/ve/tests/ce/imetests/input-chromium-ubuntu-ibus-malayalam-swanalekha.js',
				'lib/ve/tests/ce/imetests/input-firefox-mac-native-japanese-hiragana.js',
				'lib/ve/tests/ce/imetests/input-firefox-mac-native-japanese-katakana.js',
				'lib/ve/tests/ce/imetests/input-firefox-ubuntu-ibus-chinese-cantonese.js',
				'lib/ve/tests/ce/imetests/input-firefox-ubuntu-ibus-japanese-anthy--hiraganaonly.js',
				'lib/ve/tests/ce/imetests/input-firefox-ubuntu-ibus-japanese-mozc.js',
				'lib/ve/tests/ce/imetests/input-firefox-ubuntu-ibus-korean-korean.js',
				'lib/ve/tests/ce/imetests/input-firefox-ubuntu-ibus-malayalam.swanalekha.js',
				'lib/ve/tests/ce/imetests/input-firefox-win7-chinese-traditional-handwriting.js',
				'lib/ve/tests/ce/imetests/input-firefox-win7-greek.js',
				'lib/ve/tests/ce/imetests/input-firefox-win7-welsh.js',
				'lib/ve/tests/ce/imetests/input-ie9-win7-chinese-traditional-handwriting.js',
				'lib/ve/tests/ce/imetests/input-ie9-win7-greek.js',
				'lib/ve/tests/ce/imetests/input-ie9-win7-korean.js',
				'lib/ve/tests/ce/imetests/input-ie9-win7-welsh.js',
				'lib/ve/tests/ce/imetests/input-ie11-win8.1-korean.js',
				'lib/ve/tests/ce/imetests/input-safari-mac-native-japanese-hiragana.js',
				'lib/ve/tests/ce/imetests/input-safari-mac-native-japanese-katakana.js',
				'lib/ve/tests/ce/imetests/leftarrow-chromium-ubuntu-none.js',
				'lib/ve/tests/ce/imetests/leftarrow-firefox-ubuntu-none.js',
				'lib/ve/tests/ce/imetests/leftarrow-ie9-win7-none.js',
			],
			'dependencies' => [
				'unicodejs',
				'ext.visualEditor.standalone',
				'ext.visualEditor.core',
				'ext.visualEditor.mwcore',
				'ext.visualEditor.mwformatting',
				'ext.visualEditor.mwlink',
				'ext.visualEditor.mwgallery',
				'ext.visualEditor.mwimage',
				'ext.visualEditor.mwmeta',
				'ext.visualEditor.mwtransclusion',
				'ext.visualEditor.mwalienextension',
				'ext.visualEditor.experimental',
				'ext.visualEditor.desktopArticleTarget.init',
				'ext.visualEditor.desktopArticleTarget',
			],
			'localBasePath' => __DIR__,
			'remoteExtPath' => 'VisualEditor',
		];

		return true;
	}

	/**
	 * Ensures that we know whether we're running inside a parser test.
	 */
	public static function onParserTestGlobals( array &$settings ) {
		$settings['wgVisualEditorInParserTests'] = true;
	}

	/**
	 * @param Array $redirectParams Parameters preserved on special page redirects
	 *   to wiki pages
	 * @return bool Always true
	 */
	public static function onRedirectSpecialArticleRedirectParams( &$redirectParams ) {
		array_push( $redirectParams, 'veaction', 'vesection' );

		return true;
	}

	/**
	 * If the user has specified that they want to edit the page with VE, suppress any redirect.
	 * @param Title $title Title being used for request
	 * @param Article|null $article
	 * @param OutputPage $output
	 * @param User $user
	 * @param WebRequest $request
	 * @param MediaWiki $mediaWiki
	 * @return bool Always true
	 */
	public static function onBeforeInitialize(
		Title $title, $article, OutputPage $output,
		User $user, WebRequest $request, MediaWiki $mediaWiki
	) {
		if ( $request->getVal( 'veaction' ) === 'edit' ) {
			$request->setVal( 'redirect', 'no' );
		}
		return true;
	}

	/**
	 * Set user preferences for new and auto-created accounts if so configured.
	 *
	 * Sets user preference to enable the VisualEditor account for new auto-
	 * created ('auth') accounts, if $wgVisualEditorAutoAccountEnable is set.
	 *
	 * Sets user preference to enable the VisualEditor account for new non-auto-
	 * created accounts, if the account's userID matches, modulo the value of
	 * $wgVisualEditorNewAccountEnableProportion, if set. If set to '1', all new
	 * accounts would have VisualEditor enabled; at '2', 50% would; at '20',
	 * 5% would, and so on.
	 *
	 * To be removed once no longer needed.
	 */
	public static function onLocalUserCreated( $user, $autocreated ) {
		$config = RequestContext::getMain()->getConfig();
		$enableProportion = $config->get( 'VisualEditorNewAccountEnableProportion' );

		if (
			// Only act on actual accounts (avoid race condition bugs)
			$user->isLoggedin() &&
			// Only act if the default isn't already set
			!User::getDefaultOption( 'visualeditor-enable' ) &&
			// Act if either …
			(
				// … this is an auto-created account and we're configured so to do
				(
					$autocreated &&
					$config->get( 'VisualEditorAutoAccountEnable' )
				) ||
				// … this is a real new account that matches the modulo and we're configured so to do
				(
					!$autocreated &&
					$enableProportion &&
					( ( $user->getId() % $enableProportion ) === 0 )
				)
			)
		) {
			$user->setOption( 'visualeditor-enable', 1 );
			$user->saveSettings();
		}

		return true;
	}

}
