<?php
/**
 * ResourceLoader module for the 'ext.visualEditor.desktopArticleTarget.init'
 * module. Necessary to incorporate the VisualEditorTabMessages
 * configuration setting.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

class VisualEditorDesktopArticleTargetInitModule extends ResourceLoaderFileModule {

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
