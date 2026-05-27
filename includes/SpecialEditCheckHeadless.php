<?php

namespace MediaWiki\Extension\VisualEditor;

use MediaWiki\SpecialPage\SpecialPage;

class SpecialEditCheckHeadless extends SpecialPage {

	public function __construct() {
		parent::__construct( 'EditCheckHeadless' );
	}

	/**
	 * @inheritDoc
	 */
	public function isListed() {
		return false;
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $subPage ) {
		$this->setHeaders();

		$out = $this->getOutput();
		$out->setPageTitle( '' );
		$out->addModules( 'ext.visualEditor.editCheck.headless' );
	}
}
