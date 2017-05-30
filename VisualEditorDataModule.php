<?php
/**
 * Resource loader module providing extra data from the server to VisualEditor.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2011-2017 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

class VisualEditorDataModule extends ResourceLoaderModule {

	/* Protected Members */

	protected $origin = self::ORIGIN_USER_SITEWIDE;
	protected $targets = [ 'desktop', 'mobile' ];

	/* Methods */

	/**
	 * @param ResourceLoaderContext $context Object containing information about the state of this
	 *   specific loader request.
	 * @return string JavaScipt code
	 */
	public function getScript( ResourceLoaderContext $context ) {
		$msgInfo = $this->getMessageInfo( $context );
		$parsedMessages = $msgInfo['parsed'];
		$textMessages = [];
		foreach ( $msgInfo['parse'] as $msgKey => $msgObj ) {
			$parsedMessages[ $msgKey ] = $msgObj->parse();
		}
		foreach ( $msgInfo['text'] as $msgKey => $msgObj ) {
			$textMessages[ $msgKey ] = $msgObj->text();
		}

		return 've.init.platform.addParsedMessages(' . FormatJson::encode(
				$parsedMessages,
				ResourceLoader::inDebugMode()
			) . ');'.
			've.init.platform.addMessages(' . FormatJson::encode(
				$textMessages,
				ResourceLoader::inDebugMode()
			) . ');';
	}

	protected function getMessageInfo( ResourceLoaderContext $context ) {
		global $wgEditSubmitButtonLabelPublish;
		$saveButtonLabelKey = $wgEditSubmitButtonLabelPublish ? 'publishpage' : 'savearticle';
		$saveButtonLabel = $context->msg( $saveButtonLabelKey )->text();

		// Messages to be exported as parsed html
		$parseMsgs = [
			'minoredit' => $context->msg( 'minoredit' ),
			'missingsummary' => $context->msg( 'missingsummary', $saveButtonLabel ),
			'summary' => $context->msg( 'summary' ),
			'watchthis' => $context->msg( 'watchthis' ),
			'visualeditor-browserwarning' => $context->msg( 'visualeditor-browserwarning' ),
			'visualeditor-wikitext-warning' => $context->msg( 'visualeditor-wikitext-warning' ),
		];

		// Copyright warning (already parsed)
		$parsedMsgs = [
			'copyrightwarning' => EditPage::getCopyrightWarning(
				// Use a dummy title
				Title::newFromText( 'Dwimmerlaik' ),
				'parse',
				$context->getLanguage()
			),
		];

		// Messages to be exported as text
		$textMsgs = [
			'visualeditor-feedback-link' =>
				$context->msg( 'visualeditor-feedback-link' )
				->inContentLanguage(),
			'visualeditor-quick-access-characters.json' =>
				$context->msg( 'visualeditor-quick-access-characters.json' )
				->inContentLanguage(),
		];

		return [
			'parse' => $parseMsgs,
			// Already parsed
			'parsed' => $parsedMsgs,
			'text' => $textMsgs,
		];
	}

	public function enableModuleContentVersion() {
		return true;
	}

	public function getDependencies( ResourceLoaderContext $context = null ) {
		return [
			'ext.visualEditor.base',
			'ext.visualEditor.mediawiki',
		];
	}
}
