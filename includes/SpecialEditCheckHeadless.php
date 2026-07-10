<?php

namespace MediaWiki\Extension\VisualEditor;

use MediaWiki\Skin\SkinFactory;
use MediaWiki\SpecialPage\SpecialPage;

class SpecialEditCheckHeadless extends SpecialPage {

	private SkinFactory $skinFactory;

	public function __construct( SkinFactory $skinFactory ) {
		parent::__construct( 'EditCheckHeadless' );
		$this->skinFactory = $skinFactory;
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

		// This page is only ever loaded in a headless browser to run edit checks
		// in JavaScript; it renders no visible UI. Suppress as much of the normal
		// page output as possible to speed up load:
		// - Use the minimal "apioutput" skin (as core does for API HTML output) to
		//   drop the sidebar, personal tools, footer, logo and skin CSS while still
		//   emitting the ResourceLoader bootstrap so our module's JS can run.
		// - Disallow user JS
		// - Tell crawlers not to index it.
		$this->getContext()->setSkin( $this->skinFactory->makeSkin( 'apioutput' ) );
		$out->disallowUserJs();
		$out->setRobotPolicy( 'noindex,nofollow' );

		$out->addModules( 'ext.visualEditor.editCheck.headless' );
	}
}
