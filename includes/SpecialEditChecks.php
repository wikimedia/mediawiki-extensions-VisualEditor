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
use MediaWiki\Parser\Sanitizer;
use MediaWiki\SpecialPage\SpecialPage;
use MediaWiki\Title\Title;

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
		$out->addModuleStyles( [
			'ext.visualEditor.editCheck.special',
			'mediawiki.content.json'
		] );
		$out->addModules( 'ext.visualEditor.editCheck.special.widgets' );

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
		$abTest = $this->coreConfig->get( 'VisualEditorEditCheckABTest' );
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
			$this->addTocSection( 'betafeatures', 'editcheck-specialeditchecks-header-betafeatures' );
			$out->addHTML( Html::rawElement( 'h2', [ 'id' => Sanitizer::escapeIdForLink( 'betafeatures' ) ],
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
		$out->addHTML( Html::element( 'h2', [ 'id' => Sanitizer::escapeIdForLink( $id ) ], $label ) );
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

			$checks[] = [
				'file' => $file,
				'name' => $name,
				'allowedContentLanguages' => $this->parser->extractStaticValue( $src, 'allowedContentLanguages' ),
				'defaultConfig' => $this->parser->extractDefaultConfig( $src ),
			];
		}
		usort( $checks, static function ( $a, $b ) {
			return strcmp( basename( $a['file'] ), basename( $b['file'] ) );
		} );

		$filteredChecks = [];
		foreach ( $checks as $checkData ) {
			// Each textMatch rule has its own config, so it can be in a different section from textMatch
			$entries = [ $checkData ];
			if ( $checkData['name'] === 'textMatch' ) {
				array_push( $entries, ...$this->getMatchRuleChecks( $checkData, $onWikiConfig ) );
			}
			foreach ( $entries as $entry ) {
				if ( $showAsCheck !== null &&
					$this->getShowValue( $entry, $onWikiConfig, 'showAsCheck' ) !== $showAsCheck
				) {
					continue;
				}
				if ( $showAsSuggestion !== null &&
					$this->getShowValue( $entry, $onWikiConfig, 'showAsSuggestion' ) !== $showAsSuggestion
				) {
					continue;
				}
				$filteredChecks[] = $entry;
			}
		}
		return $filteredChecks;
	}

	/**
	 * Get check data for each matchRule of the textMatch check.
	 *
	 * @param array $checkData textMatch check data
	 * @param array $onWikiConfig On-wiki configuration overrides
	 * @return array List of matchRule check data
	 */
	private function getMatchRuleChecks( array $checkData, array $onWikiConfig ): array {
		$matchRules = $this->getConfigValueFromData( $checkData, $onWikiConfig, 'matchRules' )
			// In T424678 we renamed matchItems to matchRules, but allow 'matchItems'
			// for backwards compatibility temporarily
			?? $this->getConfigValueFromData( $checkData, $onWikiConfig, 'matchItems' )
			?? [];
		$ruleChecks = [];
		foreach ( $matchRules as $name => $item ) {
			$importTitle = null;
			if ( isset( $item['import'] ) ) {
				$importTitle = Title::newFromText( $item['import'] );
				$item = json_decode( $this->msg( $importTitle->getText() )->inContentLanguage()->text(), true );
			}
			$ruleChecks[] = [
				'file' => '',
				'name' => $checkData['name'] . " ($name)",
				'matchRuleId' => (string)$name,
				'parent' => $checkData,
				'allowedContentLanguages' => '',
				'defaultConfig' => json_encode( $item['config'] ?? '' ),
				'matchItem' => $item,
				'importTitle' => $importTitle,
			];
		}
		return $ruleChecks;
	}

	/**
	 * Get whether a check shows as a check or as a suggestion.
	 *
	 * @param array $checkData Check data
	 * @param array $onWikiConfig On-wiki configuration overrides
	 * @param string $key 'showAsCheck' or 'showAsSuggestion'
	 * @return bool
	 */
	private function getShowValue( array $checkData, array $onWikiConfig, string $key ): bool {
		if ( isset( $checkData['parent'] ) ) {
			// A matchRule shows only if textMatch and the matchRule both permit it.
			// Keep these defaults the same as TextMatchRule.static.defaultConfig.
			$ruleDefaults = [ 'showAsCheck' => false, 'showAsSuggestion' => true ];
			return $this->getShowValue( $checkData['parent'], $onWikiConfig, $key ) &&
				(bool)( $checkData['matchItem']['config'][$key] ?? $ruleDefaults[$key] );
		}
		return (bool)( $this->getConfigValueFromData( $checkData, $onWikiConfig, $key ) ?? true );
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
		$html .= Html::rawElement( 'tr', [ 'class' => 'mw-editchecks-header' ],
			Html::element( 'th', [ 'class' => 'mw-editchecks-name' ],
				$this->msg( 'editcheck-specialeditchecks-col-name' )->text() ) .
			Html::element( 'th', [ 'class' => 'mw-editchecks-appearance' ],
				$this->msg( 'editcheck-specialeditchecks-col-appearance' )->text() ) .
			Html::element( 'th', [ 'class' => 'mw-editchecks-config' ],
				$this->msg( 'editcheck-specialeditchecks-config-summary' )->text() )
		);
		foreach ( $checks as $checkData ) {
			$html .= $this->buildRowHtml( $checkData, $onWikiConfig, $suggestions );
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

		$widget = $this->buildWidgetPlaceholder( $checkData, $suggestions );
		$this->addTocSubSection( $checkData['name'], 'rawmessage', $checkData['name'] );

		$html .= Html::rawElement( 'tr', [],
			Html::rawElement( 'td', [],
				Html::element( 'strong', [
					'id' => Sanitizer::escapeIdForLink( $checkData['name'] )
				], $checkData['name'] ) .
				Html::element( 'div', [], basename( $checkData['file'] ) )
			) .
			Html::rawElement( 'td', [], $widget ) .
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

	/**
	 * Build the element into which the client shows the check cards.
	 *
	 * The client uses the editor code for the cards, so they look the same as in the editor.
	 *
	 * @param array $checkData Edit check data
	 * @param bool $suggestion
	 * @return string
	 */
	private function buildWidgetPlaceholder( array $checkData, bool $suggestion ): string {
		$matchRuleId = $checkData['matchRuleId'] ?? null;
		return Html::element( 'div', [
			'class' => 've-ui-editCheckDialog mw-editchecks-widget',
			'data-check' => $matchRuleId === null ? $checkData['name'] : 'textMatch',
			'data-match-rule' => $matchRuleId,
			'data-suggestion' => $suggestion ? '1' : null,
		] );
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
