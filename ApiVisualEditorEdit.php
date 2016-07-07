<?php
/**
 * Parsoid/RESTBase+MediaWiki API wrapper.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

class ApiVisualEditorEdit extends ApiVisualEditor {

	public function __construct( ApiMain $main, $name, Config $config ) {
		parent::__construct( $main, $name, $config );
	}

	protected function saveWikitext( $title, $wikitext, $params ) {
		$apiParams = [
			'action' => 'edit',
			'title' => $title->getPrefixedDBkey(),
			'text' => $wikitext,
			'summary' => $params['summary'],
			'basetimestamp' => $params['basetimestamp'],
			'starttimestamp' => $params['starttimestamp'],
			'token' => $params['token'],
		];

		if ( $params['minor'] ) {
			$apiParams['minor'] = true;
		} else {
			$apiParams['notminor'] = true;
		}

		// FIXME add some way that the user's preferences can be respected
		$apiParams['watchlist'] = $params['watch'] ? 'watch' : 'unwatch';

		if ( $params['captchaid'] ) {
			$apiParams['captchaid'] = $params['captchaid'];
		}

		if ( $params['captchaword'] ) {
			$apiParams['captchaword'] = $params['captchaword'];
		}

		$api = new ApiMain(
			new DerivativeRequest(
				$this->getRequest(),
				$apiParams + $this->getRequest()->getValues(),
				true // was posted
			),
			true // enable write
		);

		$api->execute();

		if ( defined( 'ApiResult::META_CONTENT' ) ) {
			return $api->getResult()->getResultData();
		} else {
			return $api->getResultData();
		}
	}

	protected function parseWikitext( $title, $newRevId ) {
		$apiParams = [
			'action' => 'parse',
			'page' => $title->getPrefixedDBkey(),
			'oldid' => $newRevId,
			'prop' => 'text|revid|categorieshtml|displaytitle|modules|jsconfigvars',
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
				'BC' => [], // Transform content nodes to '*'
				'Types' => [], // Add back-compat subelements
				'Strip' => 'all', // Remove any metadata keys from the links array
			] );
		} else {
			$result = $api->getResultData();
		}
		$content = isset( $result['parse']['text']['*'] ) ? $result['parse']['text']['*'] : false;
		$categorieshtml = isset( $result['parse']['categorieshtml']['*'] ) ?
			$result['parse']['categorieshtml']['*'] : false;
		$links = isset( $result['parse']['links'] ) ? $result['parse']['links'] : [];
		$revision = Revision::newFromId( $result['parse']['revid'] );
		$timestamp = $revision ? $revision->getTimestamp() : wfTimestampNow();
		$displaytitle = isset( $result['parse']['displaytitle'] ) ?
			$result['parse']['displaytitle'] : false;
		$modules = isset( $result['parse']['modules'] ) ? $result['parse']['modules'] : [];
		$jsconfigvars = isset( $result['parse']['jsconfigvars'] ) ?
			$result['parse']['jsconfigvars'] : [];

		if ( $content === false || ( strlen( $content ) && $revision === null ) ) {
			return false;
		}

		if ( $displaytitle !== false ) {
			// Escape entities as in OutputPage::setPageTitle()
			$displaytitle = Sanitizer::normalizeCharReferences(
				Sanitizer::removeHTMLtags( $displaytitle ) );
		}

		return [
			'content' => $content,
			'categorieshtml' => $categorieshtml,
			'basetimestamp' => $timestamp,
			'starttimestamp' => wfTimestampNow(),
			'displayTitleHtml' => $displaytitle,
			'modules' => $modules,
			'jsconfigvars' => $jsconfigvars
		];
	}

	public function execute() {
		$user = $this->getUser();
		$params = $this->extractRequestParams();
		$title = Title::newFromText( $params['page'] );
		if ( !$title ) {
			$this->dieUsageMsg( 'invalidtitle', $params['page'] );
		}

		$this->checkAllowedNamespace( $title->getNamespace() );

		$parserParams = [];
		if ( isset( $params['oldid'] ) ) {
			$parserParams['oldid'] = $params['oldid'];
		}

		$html = $params['html'];
		if ( substr( $html, 0, 11 ) === 'rawdeflate,' ) {
			$html = gzinflate( base64_decode( substr( $html, 11 ) ) );
		}

		if ( $params['cachekey'] !== null ) {
			$wikitext = $this->trySerializationCache( $params['cachekey'] );
			if ( !is_string( $wikitext ) ) {
				$this->dieUsage( 'No cached serialization found with that key', 'badcachekey' );
			}
		} else {
			$wikitext = $this->postHTML( $title, $html, $parserParams, $params['etag'] );
			if ( $wikitext === false ) {
				$this->dieUsage( 'Error contacting the Parsoid/RESTbase server', 'docserver' );
			}
		}

		$saveresult = $this->saveWikitext( $title, $wikitext, $params );
		$editStatus = $saveresult['edit']['result'];

		// Error
		if ( $editStatus !== 'Success' ) {
			$result = [
				'result' => 'error',
				'edit' => $saveresult['edit']
			];

			if ( isset( $saveresult['edit']['spamblacklist'] ) ) {
				$matches = explode( '|', $saveresult['edit']['spamblacklist'] );
				$matcheslist = $this->getLanguage()->listToText( $matches );
				$result['edit']['sberrorparsed'] = $this->msg( 'spamprotectiontext' )->parse() . ' ' .
					$this->msg( 'spamprotectionmatch', $matcheslist )->parse();
			}

		// Success
		} else {
			if ( isset( $saveresult['edit']['newrevid'] ) ) {
				$newRevId = intval( $saveresult['edit']['newrevid'] );
				if ( $this->veConfig->get( 'VisualEditorUseChangeTagging' ) ) {
					// Defer till after the RC row is inserted
					// @TODO: doEditContent should let callers specify desired tags
					DeferredUpdates::addCallableUpdate( function() use ( $newRevId ) {
						ChangeTags::addTags( 'visualeditor', null, $newRevId, null );
					} );
				}
			} else {
				$newRevId = $title->getLatestRevId();
			}

			// Return result of parseWikitext instead of saveWikitext so that the
			// frontend can update the page rendering without a refresh.
			$result = $this->parseWikitext( $title, $newRevId );
			if ( $result === false ) {
				$this->dieUsage( 'Error contacting the Parsoid/RESTBase server', 'docserver' );
			}

			$result['isRedirect'] = (string) $title->isRedirect();

			if ( class_exists( 'FlaggablePageView' ) ) {
				$view = FlaggablePageView::singleton();

				$originalRequest = $view->getContext()->getRequest();
				$originalTitle = RequestContext::getMain()->getTitle();
				// Defeat !$this->isPageView( $request ) || $request->getVal( 'oldid' ) check in setPageContent
				$newRequest = new DerivativeRequest(
					$this->getRequest(),
					[
						'diff' => null,
						'oldid' => '',
						'title' => $title->getPrefixedText(),
						'action' => 'view'
					] + $this->getRequest()->getValues()
				);
				$view->getContext()->setRequest( $newRequest );
				RequestContext::getMain()->setTitle( $title );

				// The two parameters here are references but we don't care
				// about what FlaggedRevs does with them.
				$outputDone = null;
				$useParserCache = null;
				$view->setPageContent( $outputDone, $useParserCache );
				$view->displayTag();
				$view->getContext()->setRequest( $originalRequest );
				RequestContext::getMain()->setTitle( $originalTitle );
			}

			$context = new RequestContext;
			$context->setTitle( $title );
			$tempOut = new OutputPage( $context );
			$tempOut->setArticleFlag( true );

			$subpagestr = $this->getSkin()->subPageSubtitle( $tempOut );
			if ( $subpagestr !== '' ) {
				$subpagestr = '<span class="subpages">' . $subpagestr . '</span>';
			}
			$result['contentSub'] = $subpagestr . $this->getOutput()->getSubtitle();

			$lang = $this->getLanguage();

			if ( isset( $saveresult['edit']['newtimestamp'] ) ) {
				$ts = $saveresult['edit']['newtimestamp'];

				$result['lastModified'] = [
					'date' => $lang->userDate( $ts, $user ),
					'time' => $lang->userTime( $ts, $user )
				];
			}

			if ( isset( $saveresult['edit']['newrevid'] ) ) {
				$result['newrevid'] = intval( $saveresult['edit']['newrevid'] );
			}

			$result['result'] = 'success';
		}

		$this->getResult()->addValue( null, $this->getModuleName(), $result );
	}

	public function getAllowedParams() {
		return [
			'page' => [
				ApiBase::PARAM_REQUIRED => true,
			],
			'token' => [
				ApiBase::PARAM_REQUIRED => true,
			],
			'wikitext' => null,
			'basetimestamp' => null,
			'starttimestamp' => null,
			'oldid' => null,
			'minor' => null,
			'watch' => null,
			'html' => null,
			'etag' => null,
			'summary' => null,
			'captchaid' => null,
			'captchaword' => null,
			'cachekey' => null,
		];
	}

	public function needsToken() {
		return 'csrf';
	}

	public function getTokenSalt() {
		return '';
	}

	public function mustBePosted() {
		return true;
	}

	public function isWriteMode() {
		return true;
	}
}
