<?php
/**
 * Parsoid/RESTBase+MediaWiki API wrapper.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

class ApiVisualEditor extends ApiBase {
	// These are safe even if VE is not enabled on the page.
	// This is intended for other VE interfaces, such as Flow's.
	protected static $SAFE_ACTIONS = [
		'parsefragment',
	];

	/**
	 * @var Config
	 */
	protected $veConfig;

	/**
	 * @var VirtualRESTServiceClient
	 */
	protected $serviceClient;

	public function __construct( ApiMain $main, $name, Config $config ) {
		parent::__construct( $main, $name );
		$this->veConfig = $config;
		$this->serviceClient = new VirtualRESTServiceClient( new MultiHttpClient( [] ) );
		$this->serviceClient->mount( '/restbase/', $this->getVRSObject() );
	}

	/**
	 * Creates the virtual REST service object to be used in VE's API calls. The
	 * method determines whether to instantiate a ParsoidVirtualRESTService or a
	 * RestbaseVirtualRESTService object based on configuration directives: if
	 * $wgVirtualRestConfig['modules']['restbase'] is defined, RESTBase is chosen,
	 * otherwise Parsoid is used (either by using the MW Core config, or the
	 * VE-local one).
	 *
	 * @return VirtualRESTService the VirtualRESTService object to use
	 */
	private function getVRSObject() {
		// the params array to create the service object with
		$params = [];
		// the VRS class to use, defaults to Parsoid
		$class = 'ParsoidVirtualRESTService';
		$config = $this->veConfig;
		// the global virtual rest service config object, if any
		$vrs = $this->getConfig()->get( 'VirtualRestConfig' );
		if ( isset( $vrs['modules'] ) && isset( $vrs['modules']['restbase'] ) ) {
			// if restbase is available, use it
			$params = $vrs['modules']['restbase'];
			$params['parsoidCompat'] = false; // backward compatibility
			$class = 'RestbaseVirtualRESTService';
		} elseif ( isset( $vrs['modules'] ) && isset( $vrs['modules']['parsoid'] ) ) {
			// there's a global parsoid config, use it next
			$params = $vrs['modules']['parsoid'];
			$params['restbaseCompat'] = true;
		} else {
			// no global modules defined, fall back to old defaults
			$params = [
				'URL' => $config->get( 'VisualEditorParsoidURL' ),
				'prefix' => $config->get( 'VisualEditorParsoidPrefix' ),
				'domain' => $config->get( 'VisualEditorParsoidDomain' ),
				'timeout' => $config->get( 'VisualEditorParsoidTimeout' ),
				'HTTPProxy' => $config->get( 'VisualEditorParsoidHTTPProxy' ),
				'forwardCookies' => $config->get( 'VisualEditorParsoidForwardCookies' ),
				'restbaseCompat' => true
			];
		}
		// merge the global and service-specific params
		if ( isset( $vrs['global'] ) ) {
			$params = array_merge( $vrs['global'], $params );
		}
		// set up cookie forwarding
		if ( $params['forwardCookies'] && !User::isEveryoneAllowed( 'read' ) ) {
			$params['forwardCookies'] = RequestContext::getMain()->getRequest()->getHeader( 'Cookie' );
		} else {
			$params['forwardCookies'] = false;
		}
		// create the VRS object and return it
		return new $class( $params );
	}

	private function requestRestbase( $method, $path, $params, $reqheaders = [] ) {
		global $wgVersion;
		$request = [
			'method' => $method,
			'url' => '/restbase/local/v1/' . $path
		];
		if ( $method === 'GET' ) {
			$request['query'] = $params;
		} else {
			$request['body'] = $params;
		}
		// Should be synchronised with modules/ve-mw/init/ve.init.mw.ArticleTargetLoader.js
		$reqheaders['Accept'] = 'text/html; charset=utf-8; profile="mediawiki.org/specs/html/1.2.0"';
		$reqheaders['User-Agent'] = 'VisualEditor-MediaWiki/' . $wgVersion;
		$request['headers'] = $reqheaders;
		$response = $this->serviceClient->run( $request );
		if ( $response['code'] === 200 && $response['error'] === "" ) {
			// If response was served directly from Varnish, use the response
			// (RP) header to declare the cache hit and pass the data to the client.
			$headers = $response['headers'];
			$rp = null;
			if ( isset( $headers['x-cache'] ) && strpos( $headers['x-cache'], 'hit' ) !== false ) {
				$rp = 'cached-response=true';
			}
			if ( $rp !== null ) {
				$resp = $this->getRequest()->response();
				$resp->header( 'X-Cache: ' . $rp );
			}
		} elseif ( $response['error'] !== '' ) {
			$this->dieUsage( 'docserver-http-error: ' . $response['error'], $response['error'] );
		} else { // error null, code not 200
			$this->dieUsage( 'docserver-http: HTTP ' . $response['code'], $response['code'] );
		}
		return $response['body'];
	}

	protected function storeInSerializationCache( $title, $oldid, $html, $etag ) {
		global $wgMemc;

		// Convert the VE HTML to wikitext
		$text = $this->postHTML( $title, $html, [ 'oldid' => $oldid ], $etag );
		if ( $text === false ) {
			return false;
		}

		// Store the corresponding wikitext, referenceable by a new key
		$hash = md5( $text );
		$key = wfMemcKey( 'visualeditor', 'serialization', $hash );
		$wgMemc->set( $key, $text,
			$this->veConfig->get( 'VisualEditorSerializationCacheTimeout' ) );

		// Also parse and prepare the edit in case it might be saved later
		$page = WikiPage::factory( $title );
		$content = ContentHandler::makeContent( $text, $title, CONTENT_MODEL_WIKITEXT );

		$status = ApiStashEdit::parseAndStash( $page, $content, $this->getUser(), '' );
		if ( $status === ApiStashEdit::ERROR_NONE ) {
			wfDebugLog( 'StashEdit', "Cached parser output for VE content key '$key'." );
		}
		$this->getStats()->increment( "editstash.ve_cache_stores.$status" );

		return $hash;
	}

	protected function trySerializationCache( $hash ) {
		global $wgMemc;
		$key = wfMemcKey( 'visualeditor', 'serialization', $hash );
		return $wgMemc->get( $key );
	}

	protected function postHTML( $title, $html, $parserParams, $etag ) {
		if ( $parserParams['oldid'] === 0 ) {
			$parserParams['oldid'] = '';
		}
		$path = 'transform/html/to/wikitext/' . urlencode( $title->getPrefixedDBkey() );
		if ( $parserParams['oldid'] ) {
			$path .= '/' . $parserParams['oldid'];
		}
		if ( !is_string( $etag ) || $etag === '' ) {
			wfDebugLog( 'AdHocDebug', 'VisualEditr T135171 - bad etag: ' . var_export( $etag, true ) );
		}
		return $this->requestRestbase(
			'POST',
			$path,
			[
				'html' => $html,
				'scrub_wikitext' => 1,
			],
			[ 'If-Match' => $etag ]
		);
	}

	protected function pstWikitext( $title, $wikitext ) {
		return ContentHandler::makeContent( $wikitext, $title, CONTENT_MODEL_WIKITEXT )
			->preSaveTransform(
				$title,
				$this->getUser(),
				WikiPage::factory( $title )->makeParserOptions( $this->getContext() )
			)
			->serialize( 'text/x-wiki' );
	}

	protected function parseWikitextFragment( $title, $wikitext ) {
		return $this->requestRestbase(
			'POST',
			'transform/wikitext/to/html/' . urlencode( $title->getPrefixedDBkey() ),
			[
				'wikitext' => $wikitext,
				'body_only' => 1,
			]
		);
	}

	protected function diffWikitext( $title, $wikitext ) {
		$apiParams = [
			'action' => 'query',
			'prop' => 'revisions',
			'titles' => $title->getPrefixedDBkey(),
			'rvdifftotext' => $this->pstWikitext( $title, $wikitext )
		];
		$api = new ApiMain(
			new DerivativeRequest(
				$this->getRequest(),
				$apiParams,
				false // was posted?
			),
			false // enable write?
		);
		$api->execute();
		if ( defined( 'ApiResult::META_CONTENT' ) ) {
			$result = $api->getResult()->getResultData( null, [
				'BC' => [], // Transform content nodes to '*'
				'Types' => [], // Add back-compat subelements
			] );
		} else {
			$result = $api->getResultData();
		}
		if ( !isset( $result['query']['pages'][$title->getArticleID()]['revisions'][0]['diff']['*'] ) ) {
			return [ 'result' => 'fail' ];
		}
		$diffRows = $result['query']['pages'][$title->getArticleID()]['revisions'][0]['diff']['*'];

		if ( $diffRows !== '' ) {
			$context = new DerivativeContext( $this->getContext() );
			$context->setTitle( $title );
			$engine = new DifferenceEngine( $context );
			return [
				'result' => 'success',
				'diff' => $engine->addHeader(
					$diffRows,
					$context->msg( 'currentrev' )->parse(),
					$context->msg( 'yourtext' )->parse()
				)
			];
		} else {
			return [ 'result' => 'nochanges' ];
		}
	}

	protected function getLangLinks( $title ) {
		$apiParams = [
			'action' => 'query',
			'prop' => 'langlinks',
			'lllimit' => 500,
			'titles' => $title->getPrefixedDBkey(),
			'indexpageids' => 1,
		];
		$api = new ApiMain(
			new DerivativeRequest(
				$this->getRequest(),
				$apiParams,
				false // was posted?
			),
			true // enable write?
		);

		$api->execute();
		if ( defined( 'ApiResult::META_CONTENT' ) ) {
			$result = $api->getResult()->getResultData( null, [
				'BC' => [], // Backwards-compatible structure transformations
				'Types' => [], // Backwards-compatible structure transformations
				'Strip' => 'all', // Remove any metadata keys from the langlinks array
			] );
		} else {
			$result = $api->getResultData();
		}
		if ( !isset( $result['query']['pages'][$title->getArticleID()]['langlinks'] ) ) {
			return false;
		}
		$langlinks = $result['query']['pages'][$title->getArticleID()]['langlinks'];
		$langnames = Language::fetchLanguageNames();
		foreach ( $langlinks as $i => $lang ) {
			$langlinks[$i]['langname'] = $langnames[$langlinks[$i]['lang']];
		}
		return $langlinks;
	}

	public function execute() {
		$user = $this->getUser();
		$params = $this->extractRequestParams();

		$title = Title::newFromText( $params['page'] );
		if ( !$title ) {
			$this->dieUsageMsg( 'invalidtitle', $params['page'] );
		}

		$isSafeAction = in_array( $params['paction'], self::$SAFE_ACTIONS, true );

		if ( !$isSafeAction ) {
			$this->checkAllowedNamespace( $title->getNamespace() );
		}

		$parserParams = [];
		if ( isset( $params['oldid'] ) ) {
			$parserParams['oldid'] = $params['oldid'];
		}

		$html = $params['html'];
		if ( substr( $html, 0, 11 ) === 'rawdeflate,' ) {
			$deflated = base64_decode( substr( $html, 11 ) );
			wfSuppressWarnings();
			$html = gzinflate( $deflated );
			wfRestoreWarnings();
			if ( $deflated === $html || $html === false ) {
				$this->dieUsage( "HTML provided is not properly deflated", 'invaliddeflate' );
			}
		}

		wfDebugLog( 'visualeditor', "called on '$title' with paction: '{$params['paction']}'" );
		switch ( $params['paction'] ) {
			case 'parse':
			case 'metadata':
				// Dirty hack to provide the correct context for edit notices
				global $wgTitle; // FIXME NOOOOOOOOES
				$wgTitle = $title;
				RequestContext::getMain()->setTitle( $title );

				// Get information about current revision
				if ( $title->exists() ) {
					$latestRevision = Revision::newFromTitle( $title );
					if ( $latestRevision === null ) {
						$this->dieUsage( 'Could not find latest revision for title', 'latestnotfound' );
					}
					$revision = null;
					if ( !isset( $parserParams['oldid'] ) || $parserParams['oldid'] === 0 ) {
						$parserParams['oldid'] = $latestRevision->getId();
						$revision = $latestRevision;
					} else {
						$revision = Revision::newFromId( $parserParams['oldid'] );
						if ( $revision === null ) {
							$this->dieUsage( 'Could not find revision ID ' . $parserParams['oldid'], 'oldidnotfound' );
						}
					}

					$restoring = $revision && !$revision->isCurrent();
					$baseTimestamp = $latestRevision->getTimestamp();
					$oldid = intval( $parserParams['oldid'] );

					// If requested, request HTML from Parsoid/RESTBase
					if ( $params['paction'] === 'parse' ) {
						$content = $this->requestRestbase(
							'GET',
							'page/html/' . urlencode( $title->getPrefixedDBkey() ) . '/' . $oldid . '?redirect=false',
							[]
						);
						if ( $content === false ) {
							$this->dieUsage( 'Error contacting the document server', 'docserver' );
						}
					}

				} else {
					$content = '';
					Hooks::run( 'EditFormPreloadText', [ &$content, &$title ] );
					if ( $content !== '' ) {
						$content = $this->parseWikitextFragment( $title, $content );
					}
					$baseTimestamp = wfTimestampNow();
					$oldid = 0;
					$restoring = false;
				}

				// Get edit notices
				$notices = $title->getEditNotices();

				// Anonymous user notice
				if ( $user->isAnon() ) {
					$notices[] = $this->msg(
						'anoneditwarning',
						// Log-in link
						'{{fullurl:Special:UserLogin|returnto={{FULLPAGENAMEE}}}}',
						// Sign-up link
						'{{fullurl:Special:UserLogin/signup|returnto={{FULLPAGENAMEE}}}}'
					)->parseAsBlock();
				}

				// Old revision notice
				if ( $restoring ) {
					$notices[] = $this->msg( 'editingold' )->parseAsBlock();
				}

				if ( wfReadOnly() ) {
					$notices[] = $this->msg( 'readonlywarning', wfReadOnlyReason() );
				}

				// New page notices
				if ( !$title->exists() ) {
					$notices[] = $this->msg(
						$user->isLoggedIn() ? 'newarticletext' : 'newarticletextanon',
						wfExpandUrl( Skin::makeInternalOrExternalUrl(
							$this->msg( 'helppage' )->inContentLanguage()->text()
						) )
					)->parseAsBlock();
					// Page protected from creation
					if ( $title->getRestrictions( 'create' ) ) {
						$notices[] = $this->msg( 'titleprotectedwarning' )->parseAsBlock();
					}
				}

				// Look at protection status to set up notices + surface class(es)
				$protectedClasses = [];
				if ( MWNamespace::getRestrictionLevels( $title->getNamespace() ) !== [ '' ] ) {
					// Page protected from editing
					if ( $title->isProtected( 'edit' ) ) {
						# Is the title semi-protected?
						if ( $title->isSemiProtected() ) {
							$protectedClasses[] = 'mw-textarea-sprotected';

							$noticeMsg = 'semiprotectedpagewarning';
						} else {
							$protectedClasses[] = 'mw-textarea-protected';

							# Then it must be protected based on static groups (regular)
							$noticeMsg = 'protectedpagewarning';
						}
						$notices[] = $this->msg( $noticeMsg )->parseAsBlock() .
						$this->getLastLogEntry( $title, 'protect' );
					}

					// Deal with cascading edit protection
					list( $sources, $restrictions ) = $title->getCascadeProtectionSources();
					if ( isset( $restrictions['edit'] ) ) {
						$protectedClasses[] = ' mw-textarea-cprotected';

						$notice = $this->msg( 'cascadeprotectedwarning' )->parseAsBlock() . '<ul>';
						// Unfortunately there's no nice way to get only the pages which cause
						// editing to be restricted
						foreach ( $sources as $source ) {
							$notice .= "<li>" . Linker::link( $source ) . "</li>";
						}
						$notice .= '</ul>';
						$notices[] = $notice;
					}
				}

				// Permission notice
				$permErrors = $title->getUserPermissionsErrors( 'create', $user );
				if ( $permErrors && !$title->exists() ) {
					$notices[] = $this->msg(
						'permissionserrorstext-withaction', 1, $this->msg( 'action-createpage' )
					) . "<br>" . call_user_func_array( [ $this, 'msg' ], $permErrors[0] )->parse();
				}

				// Show notice when editing user / user talk page of a user that doesn't exist
				// or who is blocked
				// HACK of course this code is partly duplicated from EditPage.php :(
				if ( $title->getNamespace() == NS_USER || $title->getNamespace() == NS_USER_TALK ) {
					$parts = explode( '/', $title->getText(), 2 );
					$targetUsername = $parts[0];
					$targetUser = User::newFromName( $targetUsername, false /* allow IP users*/ );

					if (
						!( $targetUser && $targetUser->isLoggedIn() ) &&
						!User::isIP( $targetUsername )
					) { // User does not exist
						$notices[] = "<div class=\"mw-userpage-userdoesnotexist error\">\n" .
							$this->msg( 'userpage-userdoesnotexist', wfEscapeWikiText( $targetUsername ) ) .
							"\n</div>";
					} elseif ( $targetUser->isBlocked() ) { // Show log extract if the user is currently blocked
						$notices[] = $this->msg(
							'blocked-notice-logextract',
							$targetUser->getName() // Support GENDER in notice
						)->parseAsBlock() . $this->getLastLogEntry( $targetUser->getUserPage(), 'block' );
					}
				}

				// Blocked user notice
				if ( $user->isBlockedFrom( $title ) && $user->getBlock()->prevents( 'edit' ) !== false ) {
					$notices[] = call_user_func_array(
						[ $this, 'msg' ],
						$user->getBlock()->getPermissionsError( $this->getContext() )
					)->parseAsBlock();
				}

				// Blocked user notice for global blocks
				if ( $user->isBlockedGlobally() ) {
					$notices[] = call_user_func_array(
						[ $this, 'msg' ],
						$user->getGlobalBlock()->getPermissionsError( $this->getContext() )
					)->parseAsBlock();
				}

				// HACK: Build a fake EditPage so we can get checkboxes from it
				$article = new Article( $title ); // Deliberately omitting ,0 so oldid comes from request
				$ep = new EditPage( $article );
				$req = $this->getRequest();
				$req->setVal( 'format', 'text/x-wiki' );
				$ep->importFormData( $req ); // By reference for some reason (bug 52466)
				$tabindex = 0;
				$states = [
					'minor' => $user->getOption( 'minordefault' ) && $title->exists(),
					'watch' => $user->getOption( 'watchdefault' ) ||
						( $user->getOption( 'watchcreations' ) && !$title->exists() ) ||
						$user->isWatched( $title ),
				];
				$checkboxes = $ep->getCheckboxes( $tabindex, $states );

				// HACK: Find out which red links are on the page
				// We do the lookup for the current version. This might not be entirely complete
				// if we're loading an oldid, but it'll probably be close enough, and LinkCache
				// will automatically request any additional data it needs.
				$links = [];
				$wikipage = WikiPage::factory( $title );
				$popts = $wikipage->makeParserOptions( 'canonical' );
				$cached = ParserCache::singleton()->get( $article, $popts, true );
				$links = [
					// Array of linked pages that are missing
					'missing' => [],
					// For current revisions: 1 (treat all non-missing pages as known)
					// For old revisions: array of linked pages that are known
					'known' => $restoring || !$cached ? [] : 1,
				];
				if ( $cached ) {
					foreach ( $cached->getLinks() as $namespace => $cachedTitles ) {
						foreach ( $cachedTitles as $cachedTitleText => $exists ) {
							$cachedTitle = Title::makeTitle( $namespace, $cachedTitleText );
							if ( !$cachedTitle->isKnown() ) {
								$links['missing'][] = $cachedTitle->getPrefixedText();
							} elseif ( $links['known'] !== 1 ) {
								$links['known'][] = $cachedTitle->getPrefixedText();
							}
						}
					}
				}
				// Add information about current page
				if ( !$title->isKnown() ) {
					$links['missing'][] = $title->getPrefixedText();
				} elseif ( $links['known'] !== 1 ) {
					$links['known'][] = $title->getPrefixedText();
				}

				// On parser cache miss, just don't bother populating red link data

				$result = [
					'result' => 'success',
					'notices' => $notices,
					'checkboxes' => $checkboxes,
					'links' => $links,
					'protectedClasses' => implode( ' ', $protectedClasses ),
					'basetimestamp' => $baseTimestamp,
					'starttimestamp' => wfTimestampNow(),
					'oldid' => $oldid,

				];
				if ( $params['paction'] === 'parse' ) {
					$result['content'] = $content;
				}
				break;

			case 'parsefragment':
				$wikitext = $params['wikitext'];
				if ( $params['pst'] ) {
					$wikitext = $this->pstWikitext( $title, $wikitext );
				}
				$content = $this->parseWikitextFragment( $title, $wikitext );
				if ( $content === false ) {
					$this->dieUsage( 'Error contacting the document server', 'docserver' );
				} else {
					$result = [
						'result' => 'success',
						'content' => $content
					];
				}
				break;

			case 'serialize':
				if ( $params['cachekey'] !== null ) {
					$content = $this->trySerializationCache( $params['cachekey'] );
					if ( !is_string( $content ) ) {
						$this->dieUsage( 'No cached serialization found with that key', 'badcachekey' );
					}
				} else {
					if ( $params['html'] === null ) {
						$this->dieUsageMsg( 'missingparam', 'html' );
					}
					$content = $this->postHTML( $title, $html, $parserParams, $params['etag'] );
					if ( $content === false ) {
						$this->dieUsage( 'Error contacting the document server', 'docserver' );
					}
				}
				$result = [ 'result' => 'success', 'content' => $content ];
				break;

			case 'diff':
				if ( $params['cachekey'] !== null ) {
					$wikitext = $this->trySerializationCache( $params['cachekey'] );
					if ( !is_string( $wikitext ) ) {
						$this->dieUsage( 'No cached serialization found with that key', 'badcachekey' );
					}
				} else {
					$wikitext = $this->postHTML( $title, $html, $parserParams, $params['etag'] );
					if ( $wikitext === false ) {
						$this->dieUsage( 'Error contacting the document server', 'docserver' );
					}
				}

				$diff = $this->diffWikitext( $title, $wikitext );
				if ( $diff['result'] === 'fail' ) {
					$this->dieUsage( 'Diff failed', 'difffailed' );
				}
				$result = $diff;

				break;

			case 'serializeforcache':
				if ( !isset( $parserParams['oldid'] ) ) {
					$parserParams['oldid'] = Revision::newFromTitle( $title )->getId();
				}
				$key = $this->storeInSerializationCache(
					$title,
					$parserParams['oldid'],
					$html,
					$params['etag']
				);
				$result = [ 'result' => 'success', 'cachekey' => $key ];
				break;

			case 'getlanglinks':
				$langlinks = $this->getLangLinks( $title );
				if ( $langlinks === false ) {
					$this->dieUsage( 'Error querying MediaWiki API', 'api-langlinks-error' );
				} else {
					$result = [ 'result' => 'success', 'langlinks' => $langlinks ];
				}
				break;
		}

		$this->getResult()->addValue( null, $this->getModuleName(), $result );
	}

	/**
	 * Check if the request is allowed to proceed in the current namespace, and abort if not
	 *
	 * @param int $namespaceId Namespace ID
	 */
	public function checkAllowedNamespace( $namespaceId ) {
		if ( !self::isAllowedNamespace( $this->veConfig, $namespaceId ) ) {
			$this->dieUsage( "VisualEditor is not enabled in '" .
				MWNamespace::getCanonicalName( $namespaceId ) . "' namespace ",
			'novenamespace' );
		}
	}

	/**
	 * Check if the configured allowed namespaces include the specified namespace
	 *
	 * @param Config $config Configuration object
	 * @param int $namespaceId Namespace ID
	 * @return boolean
	 */
	public static function isAllowedNamespace( Config $config, $namespaceId ) {
		$availableNamespaces = self::getAvailableNamespaceIds( $config );
		return in_array( $namespaceId, $availableNamespaces );
	}

	/**
	 * Get a list of allowed namespace IDs
	 *
	 * @param Config $config Configuration object
	 * @return array
	 */
	public static function getAvailableNamespaceIds( Config $config ) {
		$availableNamespaces =
			// Note: existing numeric keys might exist, and so array_merge cannot be used
			(array) $config->get( 'VisualEditorAvailableNamespaces' ) +
			(array) ExtensionRegistry::getInstance()->getAttribute( 'VisualEditorAvailableNamespaces' );
		return array_values( array_unique( array_map( function ( $namespace ) {
			// Convert canonical namespace names to IDs
			return is_numeric( $namespace ) ?
				$namespace :
				MWNamespace::getCanonicalIndex( strtolower( $namespace ) );
		}, array_keys( array_filter( $availableNamespaces ) ) ) ) );
	}

	/**
	 * Check if the configured allowed content models include the specified content model
	 *
	 * @param Config $config Configuration object
	 * @param string $contentModel Content model ID
	 * @return boolean
	 */
	public static function isAllowedContentType( Config $config, $contentModel ) {
		$availableContentModels = array_merge(
			ExtensionRegistry::getInstance()->getAttribute( 'VisualEditorAvailableContentModels' ),
			$config->get( 'VisualEditorAvailableContentModels' )
		);
		return
			isset( $availableContentModels[ $contentModel ] ) &&
			$availableContentModels[ $contentModel ];
	}

	/**
	 * Gets the relevant HTML for the latest log entry on a given title, including a full log link.
	 *
	 * @param $title Title
	 * @param $types array|string
	 * @return string
	 */
	private function getLastLogEntry( $title, $types = '' ) {
		$lp = new LogPager(
			new LogEventsList( $this->getContext() ),
			$types,
			'',
			$title->getPrefixedDbKey()
		);
		$lp->mLimit = 1;

		return $lp->getBody() . Linker::link(
			SpecialPage::getTitleFor( 'Log' ),
			$this->msg( 'log-fulllog' )->escaped(),
			[],
			[
				'page' => $title->getPrefixedDBkey(),
				'type' => is_string( $types ) ? $types : null
			]
		);
	}

	public function getAllowedParams() {
		return [
			'page' => [
				ApiBase::PARAM_REQUIRED => true,
			],
			'format' => [
				ApiBase::PARAM_DFLT => 'jsonfm',
				ApiBase::PARAM_TYPE => [ 'json', 'jsonfm' ],
			],
			'paction' => [
				ApiBase::PARAM_REQUIRED => true,
				ApiBase::PARAM_TYPE => [
					'parse',
					'metadata',
					'parsefragment',
					'serialize',
					'serializeforcache',
					'diff',
					'getlanglinks',
				],
			],
			'wikitext' => null,
			'oldid' => null,
			'html' => null,
			'etag' => null,
			'cachekey' => null,
			'pst' => false,
		];
	}

	public function needsToken() {
		return false;
	}

	public function mustBePosted() {
		return false;
	}

	public function isInternal() {
		return true;
	}

	public function isWriteMode() {
		return false;
	}
}
