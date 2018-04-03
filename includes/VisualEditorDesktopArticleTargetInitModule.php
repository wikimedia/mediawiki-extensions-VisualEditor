<?php
/**
 * ResourceLoader module for the 'ext.visualEditor.desktopArticleTarget.init'
 * module. Necessary to incorporate the VisualEditorTabMessages
 * configuration setting.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
 * @license MIT
 */

class VisualEditorDesktopArticleTargetInitModule extends ResourceLoaderFileModule {

	/**
	 * @inheritDoc
	 */
	public function __construct(
		$options = [],
		$localBasePath = null,
		$remoteBasePath = null
	) {
		$veConfig = ConfigFactory::getDefaultInstance()->makeConfig( 'visualeditor' );
		$options['messages'] = array_merge(
			$options['messages'],
			array_filter( $veConfig->get( 'VisualEditorTabMessages' ) )
		);

		parent::__construct( $options, $localBasePath, $remoteBasePath );
	}
}
