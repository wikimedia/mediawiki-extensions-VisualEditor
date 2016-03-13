<?php
/**
 * Resource loader module providing extra data from the server to VisualEditor.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

class VisualEditorDataModule extends ResourceLoaderModule {

	/* Protected Members */

	protected $origin = self::ORIGIN_USER_SITEWIDE;
	protected $targets = [ 'desktop', 'mobile' ];

	/* Methods */

	public function getScript( ResourceLoaderContext $context ) {
		$msgInfo = $this->getMessageInfo( $context );
		$parsedMessages = [];
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
		// Messages to be exported as parsed html
		$parseMsgs = [
			'minoredit' => $context->msg( 'minoredit' ),
			'missingsummary' => $context->msg( 'missingsummary' ),
			'summary' => $context->msg( 'summary' ),
			'watchthis' => $context->msg( 'watchthis' ),
			'visualeditor-browserwarning' => $context->msg( 'visualeditor-browserwarning' ),
			'visualeditor-wikitext-warning' => $context->msg( 'visualeditor-wikitext-warning' ),
		];

		// Copyright warning (based on EditPage::getCopyrightWarning)
		$rightsText = $this->config->get( 'RightsText' );
		if ( $rightsText ) {
			$copywarnMsgArgs = [ 'copyrightwarning',
				'[[' . $context->msg( 'copyrightpage' )->inContentLanguage()->text() . ']]',
				$rightsText ];
		} else {
			$copywarnMsgArgs = [ 'copyrightwarning2',
				'[[' . $context->msg( 'copyrightpage' )->inContentLanguage()->text() . ']]' ];
		}
		// EditPage supports customisation based on title, we can't support that
		$title = Title::newFromText( 'Dwimmerlaik' );
		Hooks::run( 'EditPageCopyrightWarning', [ $title, &$copywarnMsgArgs ] );
		// Normalise to 'copyrightwarning' so we have a consistent key in the front-end
		$parseMsgs[ 'copyrightwarning' ] = call_user_func_array(
			[ $context, 'msg' ],
			$copywarnMsgArgs
		);

		// Messages to be exported as text
		$textMsgs = [
			'visualeditor-feedback-link' => $context->msg( 'visualeditor-feedback-link' )
				->inContentLanguage(),
		];

		return [
			'parse' => $parseMsgs,
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
