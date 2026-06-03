<?php
/**
 * Special page listing Edit Checks and their configuration.
 */

namespace MediaWiki\Extension\VisualEditor;

use MediaWiki\Config\Config;
use MediaWiki\Config\ConfigFactory;
use MediaWiki\Content\JsonContent;
use MediaWiki\Extension\VisualEditor\EditCheck\ResourceLoaderData;
use MediaWiki\Html\Html;
use MediaWiki\Html\TocGeneratorTrait;
use MediaWiki\Language\RawMessage;
use MediaWiki\MediaWikiServices;
use MediaWiki\SpecialPage\SpecialPage;
use MediaWiki\Title\Title;
use OOUI\MessageWidget;

class SpecialEditChecks extends SpecialPage {
	use TocGeneratorTrait;

	private readonly Config $config;
	private readonly EditCheckFileParser $parser;

	/**
	 * @inheritDoc
	 */
	public function __construct(
		private readonly Config $coreConfig,
		ConfigFactory $configFactory
	) {
		parent::__construct( 'EditChecks' );

		$this->config = $configFactory->makeConfig( 'visualeditor' );
		$this->parser = new EditCheckFileParser( $this->getContext() );
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
	public function isListed() {
		return (bool)$this->getConfig()->get( 'VisualEditorEditCheck' );
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $par ) {
		$this->setHeaders();
		$out = $this->getOutput();
		if ( !$this->getConfig()->get( 'VisualEditorEditCheck' ) ) {
			$out->addHTML( Html::element( 'p', [], $this->msg( 'editcheck-specialeditchecks-disabled' )->text() ) );
			return;
		}
		$out->enableOOUI();
		$out->addModuleStyles( [
			'oojs-ui.styles.icons-content',
			'oojs-ui.styles.icons-interactions',
			'ext.visualEditor.editCheck.special',
			'mediawiki.content.json'
		] );

		$contentLang = $this->getContext()->getLanguage()->getCode();
		$dir = dirname( __DIR__ );
		$baseDir = $dir . '/editcheck/modules/editchecks';
		$checksDir = $baseDir . '/checks';
		$abstractClasses = [
			'BaseEditCheck.js',
			'AsyncTextCheck.js',
		];
		$onWikiConfig = ResourceLoaderData::getConfig( $this->getContext() );

		$out->addHtml( $this->msg( 'editcheck-specialeditchecks-info' )->parseAsBlock() );

		$abChecks = [];
		$unsupportedChecks = [];
		$defaultChecks = $this->collectChecks(
			$checksDir . '/*.js', $abstractClasses, false, true, null, $onWikiConfig
		);
		$disabledChecks = $this->collectChecks(
			$checksDir . '/*.js', $abstractClasses, false, false, false, $onWikiConfig
		);
		$experimentalEnabledChecks = $this->collectChecks(
			$checksDir . '/*.js', [], false, false, true, $onWikiConfig
		);
		$abTest = MediaWikiServices::getInstance()->getMainConfig()->get( 'VisualEditorEditCheckABTest' );
		if ( $abTest !== null ) {
			foreach ( [ &$defaultChecks, &$disabledChecks, &$experimentalEnabledChecks ] as &$checks ) {
				foreach ( $checks as $i => $check ) {
					// Extract AB test check
					if ( $check['name'] === (string)$abTest ) {
						$abChecks[] = $check;
						unset( $checks[$i] );
					}
					// Extract unsupported checks (not in allowedContentLanguages)
					if ( $check['allowedContentLanguages'] ) {
						if ( !in_array( $contentLang, $check['allowedContentLanguages'], true ) ) {
							$unsupportedChecks[] = $check;
							unset( $checks[$i] );
						}
					}
				}
			}
		}

		$this->outputSection( 'default-checks', $this->msg( 'editcheck-specialeditchecks-header-default' )->text() );
		$out->addHTML( $this->buildTableHtml( $defaultChecks, $onWikiConfig ) );

		if ( $abChecks ) {
			$this->outputSection( 'abtest-checks', $this->msg( 'editcheck-specialeditchecks-header-abtest' )->text() );
			$out->addHTML( $this->buildTableHtml( $abChecks, $onWikiConfig ) );
		}

		if ( $this->coreConfig->get( 'VisualEditorEnableEditCheckSuggestionsBeta' ) ) {
			// Split beta and experimental checks based on if they are enabled by default
			$out->addHTML( Html::rawElement( 'h2', [],
				Html::element( 'a', [
					'href' => $this->getTitleFor( 'Preferences' )->getLocalURL() . '#mw-prefsection-betafeatures',
				],
				$this->msg( 'editcheck-specialeditchecks-header-betafeatures' )->text() ) )
			);
			$out->addHTML( $this->buildTableHtml( $experimentalEnabledChecks, $onWikiConfig, true ) );

			$this->outputSection(
				'experimental-checks',
				$this->msg( 'editcheck-specialeditchecks-header-experimental' )->text()
			);
			$out->addHTML( $this->buildTableHtml( $disabledChecks, $onWikiConfig, true ) );
		} else {
			$allExperimentalChecks = array_merge( $experimentalEnabledChecks, $disabledChecks );
			// Sort checks by 'name' property
			usort( $allExperimentalChecks, static function ( $a, $b ) {
				return strcmp( $a['name'], $b['name'] );
			} );
			$this->outputSection(
				'experimental-checks',
				$this->msg( 'editcheck-specialeditchecks-header-experimental' )->text()
			);
			$out->addHTML( $this->buildTableHtml( $allExperimentalChecks, $onWikiConfig, true ) );
		}

		if ( $unsupportedChecks ) {
			$this->outputSection(
				'unsupported-checks',
				$this->msg( 'editcheck-specialeditchecks-header-unsupported' )->text()
			);
			$out->addHTML( $this->buildTableHtml( $unsupportedChecks, $onWikiConfig ) );
		}

		$baseCheck = $this->collectChecks( $baseDir . '/BaseEditCheck.js', [], true );
		if ( isset( $baseCheck[0]['defaultConfig'] ) ) {
			$this->outputSection( 'base-check', $this->msg( 'editcheck-specialeditchecks-header-base' )->text() );
			$out->addHTML( $this->configDetails(
				$this->jsonTableFromObjectString( $baseCheck[ 0 ]['defaultConfig'] ),
				isset( $onWikiConfig['*'] ) ? $this->jsonTable( $onWikiConfig['*'] ) : ''
			) );
		}

		$out->addTOCPlaceholder( $this->getTocData() );
	}

	/**
	 * Output a section header and add it to the TOC.
	 *
	 * @param string $id Section ID
	 * @param string $label Section label
	 */
	private function outputSection( string $id, string $label ): void {
		$out = $this->getOutput();
		$out->addHTML( Html::element( 'h2', [ 'id' => $id ], $label ) );
		$this->addTocSection( $id, 'rawmessage', $label );
	}

	/**
	 * Collect edit checks from the given directory.
	 *
	 * @param string $glob Glob pattern for files
	 * @param array $excludeFiles List of filenames to exclude
	 * @param bool $includeAbstract Whether to include abstract classes
	 * @param bool|null $showAsCheck If a boolean, only checks whose 'showAsCheck' value matches this
	 * @param bool|null $showAsSuggestion If a boolean, only checks whose 'showAsSuggestion' value matches this
	 * @return array List of edit checks with metadata
	 */
	private function collectChecks(
		string $glob, array $excludeFiles = [], bool $includeAbstract = false,
		?bool $showAsCheck = null, ?bool $showAsSuggestion = null, array $onWikiConfig = []
	): array {
		$checks = [];
		$files = glob( $glob ) ?: [];
		foreach ( $files as $file ) {
			if ( in_array( basename( $file ), $excludeFiles, true ) ) {
				continue;
			}
			$src = file_get_contents( $file );
			if ( $src === false ) {
				continue;
			}

			$name = $this->parser->extractStaticValue( $src, 'name' );

			// Skip abstract classes (those without a name)
			if ( !$includeAbstract && $name === '' ) {
				continue;
			}

			$checkData = [
				'file' => $file,
				'name' => $name,
				'mode' => '',
				'title' => $this->parser->extractStaticValue( $src, 'title' ),
				'description' => $this->parser->extractStaticValue( $src, 'description' ),
				'prompt' => $this->parser->extractStaticValue( $src, 'prompt' ),
				'footer' => $this->parser->extractStaticValue( $src, 'footer' ),
				'footerIcon' => $this->parser->extractStaticValue( $src, 'footerIcon' ),
				'choices' => $this->parser->extractStaticValue( $src, 'choices' ),
				'allowedContentLanguages' => $this->parser->extractStaticValue( $src, 'allowedContentLanguages' ),
				'defaultConfig' => $this->parser->extractDefaultConfig( $src ),
			];

			// Filter by showAsCheck value if requested
			if ( $showAsCheck !== null ) {
				$showAsCheckValue = $this->getConfigValueFromData( $checkData, $onWikiConfig, 'showAsCheck' ) ?? true;
				if ( $showAsCheckValue !== $showAsCheck ) {
					continue;
				}
			}

			// Filter by showAsSuggestion value if requested
			if ( $showAsSuggestion !== null ) {
				$showAsSuggestionValue =
					$this->getConfigValueFromData( $checkData, $onWikiConfig, 'showAsSuggestion' ) ?? true;
				if ( $showAsSuggestionValue !== $showAsSuggestion ) {
					continue;
				}
			}

			$checkData['extraModes'] = $this->parser->findExtraActionModes( $src, $checkData );
			$checks[] = $checkData;
		}
		usort( $checks, static function ( $a, $b ) {
			return strcmp( basename( $a['file'] ), basename( $b['file'] ) );
		} );
		return $checks;
	}

	/**
	 * Build HTML table listing the given edit checks.
	 *
	 * @param array $checks List of edit checks
	 * @param array $onWikiConfig On-wiki configuration overrides
	 * @param bool $suggestions
	 * @return string
	 */
	private function buildTableHtml(
		array $checks, array $onWikiConfig, bool $suggestions = false
	): string {
		if ( !$checks ) {
			return Html::element( 'p', [], $this->msg( 'table_pager_empty' )->text() );
		}
		$html = Html::openElement( 'table', [ 'class' => 'wikitable mw-editchecks' ] );
		$html .= Html::rawElement( 'tr', [],
			Html::element( 'th', [ 'class' => 'mw-editchecks-name' ],
				$this->msg( 'editcheck-specialeditchecks-col-name' )->text() ) .
			Html::element( 'th', [ 'class' => 'mw-editchecks-appearance' ],
				$this->msg( 'editcheck-specialeditchecks-col-appearance' )->text() ) .
			Html::element( 'th', [ 'class' => 'mw-editchecks-config' ],
				$this->msg( 'editcheck-specialeditchecks-config-summary' )->text() )
		);
		foreach ( $checks as $checkData ) {
			$html .= $this->buildRowHtml( $checkData, $onWikiConfig, $suggestions );
			if ( $checkData['name'] === 'textMatch' ) {
				$matchRules = $this->getConfigValueFromData( $checkData, $onWikiConfig, 'matchRules' )
					// In T424678 we renamed matchItems to matchRules, but allow 'matchItems'
					// for backwards compatibility temporarily
					?? $this->getConfigValueFromData( $checkData, $onWikiConfig, 'matchItems' )
					?? [];
				foreach ( $matchRules as $name => $item ) {
					$importTitle = null;
					if ( isset( $item['import'] ) ) {
						$importTitle = Title::newFromText( $item['import'] );
						$item = json_decode( $this->msg( $importTitle->getText() )->inContentLanguage()->text(), true );
					}
					$matchCheckData = [
						'file' => '',
						'name' => $checkData['name'] . " ($name)",
						'mode' => $item['mode'] ?? '',
						'title' => $item['title'] ?? '',
						'description' => new \OOUI\HtmlSnippet( ( new RawMessage( $item['message'] ?? '' ) )->parse() ),
						'prompt' => $item['prompt'] ?? '',
						'footer' => $item['footer'] ?? '',
						'choices' => $checkData['choices'] ?? [],
						'allowedContentLanguages' => '',
						'defaultConfig' => json_encode( $item['config'] ?? '' ),
						'matchItem' => $item,
						'importTitle' => $importTitle,
					];
					$html .= $this->buildRowHtml( $matchCheckData, $onWikiConfig, $suggestions );
				}
			}
		}
		$html .= Html::closeElement( 'table' );
		return $html;
	}

	/**
	 * Build HTML for a single edit check row.
	 *
	 * @param array $checkData Edit check data
	 * @param array $onWikiConfig On-wiki configuration overrides
	 * @param bool $suggestions
	 * @return string Row HTML or empty string if filtered out
	 */
	private function buildRowHtml(
		array $checkData, array $onWikiConfig, bool $suggestions = false
	): string {
		$html = '';
		$override = '';
		if ( isset( $onWikiConfig[$checkData['name']] ) ) {
			$override = $this->jsonTable( $onWikiConfig[$checkData['name']] );
		}
		$defaultConfig = '';
		if ( $checkData['defaultConfig'] ) {
			$defaultConfig = $this->jsonTableFromObjectString( $checkData['defaultConfig'] );
		}

		if ( empty( $checkData['title'] ) && empty( $checkData['description'] ) ) {
			$widget = '';
		} else {
			$widget = $this->buildEditCheckActionWidget( $checkData, $suggestions );
		}
		$this->addTocSubSection( $checkData['name'], 'rawmessage', $checkData['name'] );

		foreach ( $checkData['extraModes'] ?? [] as $modeCheckData ) {
			$widget .= $this->buildEditCheckActionWidget( $modeCheckData, $suggestions );
		}

		$html .= Html::rawElement( 'tr', [],
			Html::rawElement( 'td', [],
				Html::element( 'strong', [ 'id' => $checkData['name'] ], $checkData['name'] ) .
				Html::element( 'div', [], basename( $checkData['file'] ) )
			) .
			Html::rawElement( 'td', [],
				Html::rawElement(
					'div',
					[ 'class' => 've-ui-editCheckDialog' ],
					$widget
				)
			) .
			Html::rawElement( 'td', [],
				( isset( $checkData['importTitle'] ) ?
					Html::rawElement( 'p', [],
						$this->msg( 'editcheck-specialeditchecks-imported-configs' )
							->rawParams(
								Html::element(
									'a',
									[ 'href' => $checkData['importTitle']->getLocalURL() ],
									$checkData['importTitle']->getPrefixedText()
								)
							)
							->parse()
					) : ''
				) .
				( $defaultConfig !== '' || $override !== '' ?
					$this->configDetails( $defaultConfig, $override ) : ''
				) .
				( !empty( $checkData['matchItem'] ) ?
					$this->matchItemDetails( $checkData['matchItem'] ) : ''
				)
			)
		);
		return $html;
	}

	private function buildEditCheckActionWidget( array $checkData, bool $suggestion ): MessageWidget {
		$widget = new MessageWidget(
			[
				'type' => $suggestion ? 'progressive' : 'warning',
				'icon' => $suggestion ? 'lightbulb' : null,
				'label' => $checkData['title'] ?: "\u{00A0}",
				'classes' => [ 've-ui-editCheckActionWidget' ]
			]
		);
		if ( $suggestion ) {
			$widget->clearFlags()->setFlags( [ 'progressive' ] );
		}
		if ( $suggestion ) {
			$widget->addClasses( [ 've-ui-editCheckActionWidget-suggestion' ] );
		}
		$actions = new \OOUI\Tag( 'div' );
		$actions->addClasses( [ 've-ui-editCheckActionWidget-actions' ]	);
		if ( $checkData['prompt'] ) {
			$actions
				->addClasses( [ 've-ui-editCheckActionWidget-actions-prompted' ] )
				->appendContent(
					new \OOUI\LabelWidget( [
						'label' => $checkData['prompt'],
						'classes' => [ 've-ui-editCheckActionWidget-prompt' ]
					] ),
				);
		}
		$body = ( new \OOUI\Tag( 'div' ) )->addClasses( [ 've-ui-editCheckActionWidget-body' ] );
		$widget->appendContent(
			$body
				->appendContent( new \OOUI\LabelWidget( [ 'label' => $checkData['description'] ] ) )
				->appendContent( $actions )
		);
		if ( $checkData['footer'] ) {
			if ( $checkData['footerIcon'] ) {
				$body->appendContent(
					new \OOUI\MessageWidget( [
						'icon' => $checkData['footerIcon'],
						'label' => $checkData['footer'],
						'inline' => true,
						'classes' => [ 've-ui-editCheckActionWidget-footer' ]
					] )
				);
			} else {
				$body->appendContent(
					new \OOUI\LabelWidget( [
						'label' => $checkData['footer'],
						'classes' => [ 've-ui-editCheckActionWidget-footer' ]
					] ),
				);
			}
		}

		if ( !empty( $checkData['choices'] ) ) {
			foreach ( $checkData['choices'] as $choice ) {
				// Filter by mode
				if (
					isset( $choice['modes'] ) && is_array( $choice['modes'] ) &&
					!in_array( $checkData['mode'], $choice['modes'], true )
				) {
					continue;
				}
				$actionButton = new \OOUI\ButtonWidget( [
					'label' => $choice[ 'label' ],
					'flags' => $choice['flags'] ?? [],
					'icon' => $choice['icon'] ?? null,
					'classes' => [ 'oo-ui-actionWidget' ],
				] );
				$actions->appendContent( $actionButton );
			}
		}
		return $widget;
	}

	/**
	 * Get a configuration value for a given check from on-wiki config or default config.
	 *
	 * @param array $checkData Check metadata
	 * @param array $onWikiConfig On-wiki configuration overrides
	 * @param string $key Configuration key to retrieve
	 * @return mixed|null JSON encoded value or null if not found
	 */
	private function getConfigValueFromData( array $checkData, array $onWikiConfig, string $key ) {
		// Check on-wiki config first
		if ( isset( $onWikiConfig[$checkData['name']] ) &&
			is_array( $onWikiConfig[$checkData['name']] ) &&
			array_key_exists( $key, $onWikiConfig[$checkData['name']] )
		) {
			return $onWikiConfig[$checkData['name']][$key];
		} elseif ( $checkData['defaultConfig'] !== '' ) {
			// Fallback to default config
			$defaultConfig = $this->parser->tryJsonDecodeObjectString( $checkData['defaultConfig'] );
			if ( is_array( $defaultConfig ) && array_key_exists( $key, $defaultConfig ) ) {
				return $defaultConfig[$key];
			}
		}
		return null;
	}

	/**
	 * Build the details element showing default and on-wiki configuration.
	 *
	 * @param string $defaultConfig Default configuration display
	 * @param string $override On-wiki override display
	 * @return string
	 */
	private function configDetails( string $defaultConfig, string $override ): string {
		return ( $defaultConfig !== '' ?
			Html::element( 'strong', [ 'class' => 'mw-editchecks-config-header' ],
				$this->msg( 'editcheck-specialeditchecks-config-default' )->text() ) .
			$defaultConfig
		: '' ) .
		( $override !== '' ?
			Html::rawElement( 'details', [],
				Html::rawElement( 'summary', [],
					Html::element( 'strong', [ 'class' => 'mw-editchecks-config-header' ],
						$this->msg( 'editcheck-specialeditchecks-config-onwiki' )->text() )
				) .
				$override
			)
			: ''
		);
	}

	/**
	 * Build the details element showing a textMatch matchItem configuration.
	 *
	 * @param array $matchItem Match item data
	 * @return string
	 */
	private function matchItemDetails( array $matchItem ): string {
		// Skip already displayed fields
		$matchItemFiltered = array_filter(
			$matchItem,
			static function ( $key ) {
				return !in_array( $key, [ 'config', 'title', 'message', 'prompt', 'footer' ], true );
			},
			ARRAY_FILTER_USE_KEY
		);

		return Html::rawElement( 'details', [],
			Html::rawElement( 'summary', [],
				Html::element( 'strong', [ 'class' => 'mw-editchecks-config-header' ],
					$this->msg( 'editcheck-specialeditchecks-config-matchitem' )->text() )
			) .
			$this->jsonTable( $matchItemFiltered )
		);
	}

	/**
	 * Attempt to convert a JS object literal to valid JSON for display.
	 * Returns pretty-printed JSON string or null on failure.
	 *
	 * @param string $js JS object literal
	 * @return string
	 */
	private function jsonTableFromObjectString( string $js ): string {
		$data = $this->parser->tryJsonDecodeObjectString( $js );

		return $data === null ? $js : $this->jsonTable( $data );
	}

	/**
	 * Format a JSON value as a table.
	 *
	 * @param mixed $value
	 * @return string
	 */
	private function jsonTable( $value ): string {
		$json = json_encode( $value );
		$content = new JsonContent( $json );
		return $content->rootValueTable( $content->getData()->getValue() );
	}
}
