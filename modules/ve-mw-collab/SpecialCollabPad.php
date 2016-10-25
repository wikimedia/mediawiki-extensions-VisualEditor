<?php
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

	function __construct() {
		parent::__construct( 'CollabPad' );
	}

	protected function getGroupName() {
		return 'wiki';
	}

	public function userCanExecute( User $user ) {
		global $wgVisualEditorRebaserURL;
		return !!$wgVisualEditorRebaserURL && parent::userCanExecute( $user );
	}

	function isListed() {
		global $wgVisualEditorRebaserURL;
		return !!$wgVisualEditorRebaserURL;
	}

	function execute( $par ) {
		$this->setHeaders();
		$this->checkPermissions();

		$request = $this->getRequest();

		$output = $this->getOutput();

		$output->addJsConfigVars( 'collabPadPageName', $par );
		$output->addModuleStyles( 'ext.visualEditor.collabTarget.init.styles' );
		$output->addModules( 'ext.visualEditor.collabTarget.init' );

		$output->enableOOUI();
		if ( $par ) {
			$title = Title::newFromText( $par );
			$output->setPageTitle( 'CollabPad: ' . $title->getPrefixedText() );
			$output->addHTML( new OOUI\ProgressBarWidget( [
				'classes' => [ 've-init-mw-collabTarget-loading' ]
			] ) );
		} else {
			// Scripts only, styles already added above
			$output->addModules( 'ext.visualEditor.collabTarget' );
			// TODO: Output this "form" unconditionally so the user can
			// navigate back to it without reloading the page.
			$output->addHTML( new OOUI\ActionFieldLayout(
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
				[ 'classes' => [ 've-init-mw-collabTarget-nameField' ] ] )
			);
		}
	}
}
