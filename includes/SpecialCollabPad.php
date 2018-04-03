<?php
/**
 * CollabPad special page
 *
 * @file
 * @ingroup Extensions
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
 * @license MIT
 */

class SpecialCollabPad extends SpecialPage {
	private $prefixes = [];

	/**
	 * @var null|Title
	 */
	private $title = null;

	/**
	 * @var null|ParserOutput
	 */
	private $output = null;

	public function __construct() {
		parent::__construct( 'CollabPad' );
	}

	/**
	 * @inheritDoc
	 */
	protected function getGroupName() {
		return 'wiki';
	}

	/**
	 * @inheritDoc
	 */
	public function userCanExecute( User $user ) {
		global $wgVisualEditorRebaserURL;
		return !!$wgVisualEditorRebaserURL && parent::userCanExecute( $user );
	}

	/**
	 * @inheritDoc
	 */
	public function isListed() {
		global $wgVisualEditorRebaserURL;
		return !!$wgVisualEditorRebaserURL;
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $par ) {
		$this->setHeaders();
		$this->checkPermissions();

		$request = $this->getRequest();

		$output = $this->getOutput();

		$output->addJsConfigVars( 'collabPadPageName', $par );
		$output->addModuleStyles( 'ext.visualEditor.collabTarget.init.styles' );
		$output->addModules( 'ext.visualEditor.collabTarget.init' );

		$output->enableOOUI();

		$documentNameField = new OOUI\ActionFieldLayout(
			new OOUI\TextInputWidget( [
				'classes' => [ 've-init-mw-collabTarget-nameInput' ],
				'placeholder' => $this->msg( 'visualeditor-rebase-client-document-name' )->text(),
				'autofocus' => true,
				'infusable' => true
			] ),
			new OOUI\ButtonWidget( [
				'classes' => [ 've-init-mw-collabTarget-nameButton' ],
				'label' => $this->msg( 'visualeditor-rebase-client-document-create-edit' )->text(),
				// Only enable once JS has loaded
				'disabled' => true,
				'infusable' => true
			] ),
			[
				'classes' => [ 've-init-mw-collabTarget-nameField' ],
				'infusable' => true
			]
		);
		$progressBar = new OOUI\ProgressBarWidget( [
			'classes' => [ 've-init-mw-collabTarget-loading' ],
			'infusable' => true
		] );

		if ( $par ) {
			$title = Title::newFromText( $par );
			$output->setPageTitle( 'CollabPad: ' . $title->getPrefixedText() );
			$documentNameField->addClasses( [ 'oo-ui-element-hidden' ] );
		} else {
			// Scripts only, styles already added above
			$output->addModules( 'ext.visualEditor.collabTarget' );
			$progressBar->addClasses( [ 'oo-ui-element-hidden' ] );
		}
		$output->addHTML( $progressBar . $documentNameField );
	}
}
