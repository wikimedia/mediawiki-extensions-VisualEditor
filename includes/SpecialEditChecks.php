<?php
/**
 * Special page listing Edit Checks and their configuration.
 */

namespace MediaWiki\Extension\VisualEditor;

use MediaWiki\Content\JsonContent;
use MediaWiki\Extension\VisualEditor\EditCheck\ResourceLoaderData;
use MediaWiki\Html\Html;
use MediaWiki\MediaWikiServices;
use MediaWiki\SpecialPage\SpecialPage;

class SpecialEditChecks extends SpecialPage {

	/**
	 * @inheritDoc
	 */
	public function __construct() {
		parent::__construct( 'EditChecks' );
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
	public function execute( $par ) {
		$this->setHeaders();
		$out = $this->getOutput();
		$out->addModuleStyles( [
			'ext.visualEditor.editCheck.special',
			'mediawiki.content.json'
		] );

		$baseDir = dirname( __DIR__ );
		$checksDir = $baseDir . '/editcheck/modules/editchecks';
		$experimentalDir = $checksDir . '/experimental';
		$abstractClasses = [
			'BaseEditCheck.js',
			'AsyncTextCheck.js',
		];
		$onWikiConfig = ResourceLoaderData::getConfig( $this->getContext() );

		$out->addHtml( $this->msg( 'editcheck-specialeditchecks-info' )->parseAsBlock() );

		$baseCheck = $this->collectChecks( $checksDir . '/BaseEditCheck.js' );
		if ( isset( $baseCheck[0]['defaultConfig'] ) ) {
			$out->addHTML( Html::element( 'h2', [], $this->msg( 'editcheck-specialeditchecks-header-base' )->text() ) );
			$out->addHTML( $this->configDetails(
				$this->tryJsonifyObjectLiteral( $baseCheck[ 0 ]['defaultConfig'] ),
				isset( $onWikiConfig['*'] ) ? $this->jsonTable( $onWikiConfig['*'] ) : ''
			) );
		}

		$abChecks = [];
		$defaultChecks = $this->collectChecks( $checksDir . '/*.js', $abstractClasses );
		$abTest = MediaWikiServices::getInstance()->getMainConfig()->get( 'VisualEditorEditCheckABTest' );
		if ( $abTest !== null ) {
			// Split defaultChecks into ones which have the name matching the AB test and the rest:
			foreach ( $defaultChecks as $i => $check ) {
				if ( $check['name'] === (string)$abTest ) {
					$abChecks[] = $check;
					unset( $defaultChecks[$i] );
				}
			}
		}

		$out->addHTML( Html::element( 'h2', [], $this->msg( 'editcheck-specialeditchecks-header-default' )->text() ) );
		$out->addHTML( $this->buildTableHtml( $defaultChecks, $onWikiConfig ) );

		if ( $abChecks ) {
			$out->addHTML( Html::element( 'h2', [],
				$this->msg( 'editcheck-specialeditchecks-header-abtest' )->text() ) );
			$out->addHTML( $this->buildTableHtml( $abChecks, $onWikiConfig ) );
		}

		if ( is_dir( $experimentalDir ) ) {
			$experimentalChecks = $this->collectChecks( $experimentalDir . '/*.js' );
			$out->addHTML( Html::element( 'h2', [],
				$this->msg( 'editcheck-specialeditchecks-header-experimental' )->text() ) );
			$out->addHTML( $this->buildTableHtml( $experimentalChecks, $onWikiConfig ) );
		}
	}

	/**
	 * Collect edit checks from the given directory.
	 *
	 * @param string $glob Glob pattern for files
	 * @param array $excludeFiles List of filenames to exclude
	 * @return array List of edit checks with metadata
	 */
	private function collectChecks( string $glob, array $excludeFiles = [] ): array {
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

			$name = $this->extractStaticValue( $src, 'name' );
			$title = $this->extractStaticValue( $src, 'title' );
			$description = $this->extractStaticValue( $src, 'description' );
			$defaultConfig = $this->extractDefaultConfig( $src );

			$checks[] = [
				'file' => $file,
				'name' => $name ?: '',
				'title' => $title,
				'description' => $description,
				'defaultConfig' => $defaultConfig,
			];
		}
		usort( $checks, static function ( $a, $b ) {
			return strcmp( basename( $a['file'] ), basename( $b['file'] ) );
		} );
		return $checks;
	}

	/**
	 * Build HTML table listing the given edit checks.
	 *
	 * @param array $rows List of edit checks
	 * @param array $onWikiConfig On-wiki configuration overrides
	 * @return string
	 */
	private function buildTableHtml( array $rows, array $onWikiConfig ): string {
		if ( !$rows ) {
			return Html::element( 'p', [], $this->msg( 'table_pager_empty' )->text() );
		}
		$html = Html::openElement( 'table', [ 'class' => 'wikitable mw-editchecks' ] );
		$html .= Html::rawElement( 'tr', [],
			Html::element( 'th', [ 'class' => 'mw-editchecks-title' ],
				$this->msg( 'editcheck-specialeditchecks-col-title' )->text() ) .
			Html::element( 'th', [ 'class' => 'mw-editchecks-name' ],
				$this->msg( 'editcheck-specialeditchecks-col-name' )->text() ) .
			Html::element( 'th', [ 'class' => 'mw-editchecks-description' ],
				$this->msg( 'editcheck-specialeditchecks-col-description' )->text() )
		);
		foreach ( $rows as $r ) {
			$override = '';
			if ( $r['name'] !== '' && isset( $onWikiConfig[$r['name']] ) ) {
				$override = $this->jsonTable( $onWikiConfig[$r['name']] );
			}
			$defaultConfig = '';
			if ( $r['defaultConfig'] ) {
				$defaultConfig = $this->tryJsonifyObjectLiteral( $r['defaultConfig'] );
			}
			$html .= Html::rawElement( 'tr', [],
				Html::element( 'td', [], $r['title'] ) .
				Html::rawElement( 'td', [],
					Html::element( 'strong', [], $r['name'] ) .
					Html::element( 'div', [], basename( $r['file'] ) )
				) .
				Html::rawElement( 'td', [],
					Html::element( 'div', [], $r['description'] ) .
					( $defaultConfig !== '' || $override !== '' ?
						$this->configDetails( $defaultConfig, $override ) : ''
					)
				)
			);
		}
		$html .= Html::closeElement( 'table' );
		return $html;
	}

	/**
	 * Build the details element showing default and on-wiki configuration.
	 *
	 * @param string $defaultConfig Default configuration display
	 * @param string $override On-wiki override display
	 * @return string
	 */
	private function configDetails( string $defaultConfig, string $override ): string {
		return Html::rawElement( 'details', [],
			Html::element( 'summary', [], $this->msg( 'editcheck-specialeditchecks-config-summary' )->text() ) .
			( $defaultConfig !== '' ?
				Html::element( 'h4', [], $this->msg( 'editcheck-specialeditchecks-config-default' )->text() ) .
				$defaultConfig
			: '' ) .
			( $override !== '' ?
				Html::element( 'h4', [], $this->msg( 'editcheck-specialeditchecks-config-onwiki' )->text() ) .
				$override
			: '' )
		);
	}

	/**
	 * Extract a static property value which can be a string literal or a message expression.
	 * Returns an array describing the value.
	 *
	 * @param string $src Source code
	 * @param string $prop Property name
	 * @return string
	 */
	private function extractStaticValue( string $src, string $prop ): string {
		// Capture the assigned expression allowing semicolons inside quoted strings
		$pattern =
			'/static\s*\.\s*' .
			preg_quote( $prop, '/' ) .
			'\s*=\s*((?:\"(?:\\.|[^\\\"])*\"|\'(?:\\.|[^\\\'])*\'|[^;\"\']+)*)\s*;/';
		if ( !preg_match( $pattern, $src, $m ) ) {
			return '';
		}
		$expr = trim( $m[1] );

		// Literal
		if ( preg_match( '/^([\"\\\'])(.*?)\1$/', $expr, $mm ) ) {
			return $mm[2];
		}

		// Message calls: ve.msg(...), mw.msg(...), OO.ui.deferMsg(...)
		if ( preg_match( '/^(ve\.msg|mw\.msg|OO\.ui\.deferMsg)\s*\(\s*([\"\\\'])([^\"\']+)\2(.*)\)$/', $expr, $mm ) ) {
			$argsStr = $mm[4];
			$args = [];
			if ( preg_match_all( '/,\s*([\"\\\'])(.*?)\1/', $argsStr, $am, PREG_SET_ORDER ) ) {
				foreach ( $am as $a ) {
					$args[] = $a[2];
				}
			}
			$msg = $this->getContext()->msg( $mm[3], ...$args );
			return $msg->text();
		}

		return '';
	}

	/**
	 * Extract the defaultConfig object literal from the source code.
	 */
	private function extractDefaultConfig( string $src ): string {
		// Capture object literal used as overrides in ve.extendObject(..., {...}) or a direct object.
		if (
			preg_match(
				'/static\s*\.\s*defaultConfig\s*=' .
				'\s*ve\.extendObject\s*\(\s*\{.*?\}\s*,\s*[^,]+,\s*(\{[\s\S]*?\})\s*\)\s*;/',
				$src, $m )
		) {
			return $m[ 1 ];
		}
		if ( preg_match( '/static\s*\.\s*defaultConfig\s*=\s*(\{[\s\S]*?\})\s*;/', $src, $m ) ) {
			return $m[ 1 ];
		}
		return '';
	}

	/**
	 * Attempt to convert a JS object literal to valid JSON for display.
	 * Returns pretty-printed JSON string or null on failure.
	 *
	 * @param string $js JS object literal
	 * @return string
	 */
	private function tryJsonifyObjectLiteral( string $js ): string {
		$src = trim( $js );
		// Remove comments
		$src = preg_replace( '/\/\/.*?(?=\n|$)/', '', $src );
		$src = preg_replace( '/\/\*[\s\S]*?\*\//', '', $src );
		// Remove trailing commas before } or ]
		$src = preg_replace( '/,\s*(\}|\])/', '$1', $src );
		// Replace undefined with null
		$src = preg_replace( '/\bundefined\b/', 'null', $src );
		// Quote unquoted keys: { key: ... } or , key: ...
		$src = preg_replace( '/([\{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:/', '$1"$2":', $src );

		$src = $this->convertSingleQuotedToDoubleQuoted( $src );

		// Try decode
		$data = json_decode( $src, true );
		if ( json_last_error() !== JSON_ERROR_NONE ) {
			return $js;
		}
		return $this->jsonTable( $data );
	}

	/**
	 * Convert all JS single-quoted string literals to double-quoted, handling escapes.
	 */
	private function convertSingleQuotedToDoubleQuoted( string $code ): string {
		$out = '';
		$len = strlen( $code );
		$inSingle = false;
		$inDouble = false;
		$escape = false;
		for ( $i = 0; $i < $len; $i++ ) {
			$ch = $code[$i];
			if ( $escape ) {
				// Preserve escaped char, but if we are in a single-quoted string
				// and the escaped char is a single quote, drop the escape
				if ( $inSingle && $ch === '\'' ) {
					$out .= '\'';
				} else {
					$out .= '\\' . $ch;
				}
				$escape = false;
				continue;
			}
			if ( $ch === '\\' ) {
				$escape = true;
				continue;
			}
			if ( !$inDouble && $ch === '\'' ) {
				// Toggle single-quoted string; replace quote with double quote
				$inSingle = !$inSingle;
				$out .= '"';
				continue;
			}
			if ( !$inSingle && $ch === '"' ) {
				// Track double quotes to avoid interfering while inside
				$inDouble = !$inDouble;
				$out .= '"';
				continue;
			}
			// Inside single-quoted string: ensure double quotes are escaped
			if ( $inSingle && $ch === '"' ) {
				$out .= '\\"';
				continue;
			}
			$out .= $ch;
		}
		return $out;
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
