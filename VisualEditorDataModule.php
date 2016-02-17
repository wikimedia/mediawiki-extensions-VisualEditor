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

	public function __construct() {
	}

	public function getScript( ResourceLoaderContext $context ) {
		// Messages
		$msgInfo = $this->getMessageInfo();
		$parsedMessages = [];
		$messages = [];
		foreach ( $msgInfo['args'] as $msgKey => $msgArgs ) {
			$parsedMessages[ $msgKey ] = call_user_func_array( 'wfMessage', $msgArgs )
				->inLanguage( $context->getLanguage() )
				->parse();
		}
		foreach ( $msgInfo['vals'] as $msgKey => $msgVal ) {
			$messages[ $msgKey ] = $msgVal;
		}

		return
			've.init.platform.addParsedMessages(' . FormatJson::encode(
				$parsedMessages,
				ResourceLoader::inDebugMode()
			) . ');'.
			've.init.platform.addMessages(' . FormatJson::encode(
				$messages,
				ResourceLoader::inDebugMode()
			) . ');';
	}

	protected function getMessageInfo() {
		// Messages that just require simple parsing
		$msgArgs = [
			'minoredit' => [ 'minoredit' ],
			'missingsummary' => [ 'missingsummary' ],
			'summary' => [ 'summary' ],
			'watchthis' => [ 'watchthis' ],
			'visualeditor-browserwarning' => [ 'visualeditor-browserwarning' ],
			'visualeditor-wikitext-warning' => [ 'visualeditor-wikitext-warning' ],
		];

		// Override message value
		$msgVals = [
			'visualeditor-feedback-link' => wfMessage( 'visualeditor-feedback-link' )
				->inContentLanguage()
				->text(),
		];

		// Copyright warning (based on EditPage::getCopyrightWarning)
		$rightsText = $this->config->get( 'RightsText' );
		if ( $rightsText ) {
			$copywarnMsg = [ 'copyrightwarning',
				'[[' . wfMessage( 'copyrightpage' )->inContentLanguage()->text() . ']]',
				$rightsText ];
		} else {
			$copywarnMsg = [ 'copyrightwarning2',
				'[[' . wfMessage( 'copyrightpage' )->inContentLanguage()->text() . ']]' ];
		}
		// EditPage supports customisation based on title, we can't support that here
		// since these messages are cached on a site-level. $wgTitle is likely set to null.
		$title = Title::newFromText( 'Dwimmerlaik' );
		Hooks::run( 'EditPageCopyrightWarning', [ $title, &$copywarnMsg ] );

		// Normalise to 'copyrightwarning' so we have a consistent key in the front-end.
		$msgArgs[ 'copyrightwarning' ] = $copywarnMsg;

		return [
			'args' => $msgArgs,
			'vals' => $msgVals,
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
