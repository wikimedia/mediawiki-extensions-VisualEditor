<?php
/**
 * Parser for reading metadata from edit check JavaScript source files.
 */

namespace MediaWiki\Extension\VisualEditor;

use MediaWiki\Language\MessageLocalizer;

/**
 * Extracts structured metadata from edit check JavaScript source files.
 *
 * Handles three kinds of value expression that appear in the JS:
 *  - string literals ('foo' / "foo")
 *  - message-function calls (ve.msg, mw.msg, OO.ui.deferMsg, …)
 *  - structured arrays / objects (decoded via tryJsonDecodeObjectString)
 */
class EditCheckFileParser {

	public function __construct(
		private readonly MessageLocalizer $localizer
	) {
	}

	/**
	 * Extract all static property values from a JS source file.
	 *
	 * @param string $src Source code
	 * @param string $prop Property name (e.g. 'name', 'title', 'choices')
	 * @return string|array|null|\OOUI\HtmlSnippet
	 */
	public function extractStaticValue( string $src, string $prop ) {
		$expr = $this->extractStaticAssignmentExpression( $src, $prop );
		if ( $expr === null ) {
			return null;
		}

		// String literal
		if ( preg_match( '/^([\"\\\'])(.*?)\1$/', $expr, $mm ) ) {
			if ( $prop === 'name' ) {
				return $mm[2];
			} else {
				return new \OOUI\HtmlSnippet( $mm[2] );
			}
		}

		$message = $this->parseMessage( $expr );
		if ( $message !== '' ) {
			return $message;
		}

		// For non-literal, non-message values, only expose data we explicitly care about.
		// The common use-case here is extracting multi-line arrays/objects like `static.choices = [ ... ];`.
		if ( $prop === 'choices' || $prop === 'allowedContentLanguages' ) {
			return $this->tryJsonDecodeObjectString( $expr );
		}

		return null;
	}

	/**
	 * Extract the defaultConfig object literal from the source code.
	 *
	 * @param string $src Source code
	 * @return string Raw JS object literal, or empty string if not found
	 */
	public function extractDefaultConfig( string $src ): string {
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
	 * Find additional action modes by parsing EditCheckAction constructor calls.
	 *
	 * @param string $src Source code
	 * @param array $checkData Base check data
	 * @return array Derived check entries
	 */
	public function findExtraActionModes( string $src, array $checkData ): array {
		$entries = [];
		$objectBodies = [];
		$patterns = [
			'/new\s+mw\.editcheck\.EditCheckAction\s*\(\s*\{([\s\S]*?)\}\s*\)/',
			'/buildActionFromLinkRange\s*\([\s\S]*?,\s*\{([\s\S]*?)\}\s*\)/',
		];
		foreach ( $patterns as $pattern ) {
			if ( preg_match_all( $pattern, $src, $matches, PREG_SET_ORDER ) ) {
				foreach ( $matches as $match ) {
					$objectBodies[] = $match[1];
				}
			}
		}

		if ( !$objectBodies ) {
			return $entries;
		}

		foreach ( $objectBodies as $objectBody ) {
			$modeExpr = $this->extractObjectPropertyExpression( $objectBody, 'mode' );
			if ( $modeExpr === null || !preg_match( '/^(["\'])(.*?)\1$/', trim( $modeExpr ), $modeMatch ) ) {
				continue;
			}
			$mode = $modeMatch[2];

			$footerIconExpr = $this->extractObjectPropertyExpression( $objectBody, 'footerIcon' );

			$entryCheckData = $checkData;
			$entryCheckData['name'] = $checkData['name'] . ' (' . $mode . ')';
			$entryCheckData['mode'] = $mode;
			$parsedMessageFields = [
				'title' => 'title',
				'message' => 'description',
				'prompt' => 'prompt',
				'footer' => 'footer',
			];
			foreach ( $parsedMessageFields as $prop => $targetKey ) {
				$expr = $this->extractObjectPropertyExpression( $objectBody, $prop );
				if ( !$expr ) {
					continue;
				}
				$parsedValue = $this->parseMessage( $expr );
				if ( $parsedValue !== '' ) {
					$entryCheckData[$targetKey] = $parsedValue;
				}
			}
			if ( $footerIconExpr !== null && preg_match( '/^(["\'])(.*?)\1$/', trim( $footerIconExpr ), $iconMatch ) ) {
				$entryCheckData['footerIcon'] = $iconMatch[2];
			}
			$entries[] = $entryCheckData;
		}

		return $entries;
	}

	/**
	 * Attempt to decode a JS object/array literal as PHP data.
	 *
	 * Handles JS-specific syntax: single-quoted strings, unquoted keys, trailing commas,
	 * `undefined`, inline comments, and message-function calls.
	 *
	 * @param string $js JS object literal
	 * @return mixed|null PHP value, or null on parse failure
	 */
	public function tryJsonDecodeObjectString( string $js ) {
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
		// Message expressions, e.g. ve.msg('...'), OO.ui.deferMsg('...'), mw.msg('...')
		$messageExprPattern = $this->getMessageExpressionPattern( false );
		$src = preg_replace_callback(
			$messageExprPattern,
			function ( $mm ) {
				return json_encode( (string)$this->parseMessage( $mm[0] ) );
			},
			$src
		);

		$src = $this->convertSingleQuotedToDoubleQuoted( $src );

		// Try decode
		$data = json_decode( $src, true );
		if ( json_last_error() !== JSON_ERROR_NONE ) {
			return null;
		}
		return $data;
	}

	/**
	 * Parse a JS message expression and return the rendered message.
	 *
	 * Supported call forms:
	 *  - ve.msg(...)
	 *  - ve.htmlMsg(...)
	 *  - ve.deferHtmlMsg(...)
	 *  - ve.deferJQueryMsg(...)
	 *  - mw.msg(...)
	 *  - OO.ui.deferMsg(...)
	 *
	 * @param string $expr JS expression
	 * @return string|\OOUI\HtmlSnippet Empty string if the expression doesn't match.
	 */
	public function parseMessage( string $expr ) {
		if ( preg_match( $this->getMessageExpressionPattern( true ), $expr, $mm ) ) {
			$argsStr = $mm[4];
			$args = [];
			if ( preg_match_all( '/,\s*([\"\\\'])(.*?)\1/', $argsStr, $am, PREG_SET_ORDER ) ) {
				foreach ( $am as $a ) {
					$args[] = $a[2];
				}
			}
			$msg = $this->localizer->msg( $mm[3], ...$args );
			switch ( $mm[1] ) {
				case 've.htmlMsg':
				case 've.deferHtmlMsg':
				case 've.deferJQueryMsg':
					return new \OOUI\HtmlSnippet( $msg->parse() );
				default:
					return $msg->text();
			}
		}

		return '';
	}

	/**
	 * Extract the full RHS expression of a `static.<prop> = ...;` assignment.
	 *
	 * @param string $src Source code
	 * @param string $prop Property name
	 * @return string|null RHS expression, or null if not found
	 */
	public function extractStaticAssignmentExpression( string $src, string $prop ): ?string {
		$pattern = '/static\s*\.\s*' . preg_quote( $prop, '/' ) . '\s*=\s*/';
		if ( !preg_match( $pattern, $src, $m, PREG_OFFSET_CAPTURE ) ) {
			return null;
		}
		$start = $m[ 0 ][ 1 ] + strlen( $m[ 0 ][ 0 ] );
		$end = $this->findTopLevelDelimiter( $src, $start, [ ';' ] );
		return trim( $end === null ?
			substr( $src, $start ) :
			substr( $src, $start, $end - $start )
		);
	}

	/**
	 * Extract a top-level object property expression from a JS object literal body.
	 *
	 * @param string $objectBody Object literal content without surrounding braces
	 * @param string $prop Property name
	 * @return string|null The value expression, or null if the property is not present
	 */
	public function extractObjectPropertyExpression( string $objectBody, string $prop ): ?string {
		$pattern = '/(^|,)\s*' . preg_quote( $prop, '/' ) . '\s*:\s*/m';
		if ( !preg_match( $pattern, $objectBody, $m, PREG_OFFSET_CAPTURE ) ) {
			return null;
		}
		$start = $m[0][1] + strlen( $m[0][0] );
		$end = $this->findTopLevelDelimiter( $objectBody, $start, [ ',' ] );
		return trim( $end === null ?
			substr( $objectBody, $start ) :
			substr( $objectBody, $start, $end - $start )
		);
	}

	/**
	 * Find the offset of the first character from $delimiters that appears at the
	 * top level of a JS expression (not inside a string or nested brackets/parens/braces).
	 *
	 * @param string $src Source string
	 * @param int $start Start offset
	 * @param string[] $delimiters Single-character stop characters
	 * @return int|null Offset of the delimiter, or null if not found before end of string
	 */
	private function findTopLevelDelimiter( string $src, int $start, array $delimiters ): ?int {
		$len = strlen( $src );
		$depthParen = 0;
		$depthBracket = 0;
		$depthBrace = 0;
		$inSingle = false;
		$inDouble = false;
		$escape = false;

		for ( $i = $start; $i < $len; $i++ ) {
			$ch = $src[$i];
			if ( $escape ) {
				$escape = false;
				continue;
			}
			if ( $ch === '\\' ) {
				$escape = true;
				continue;
			}
			if ( !$inDouble && $ch === '\'' ) {
				$inSingle = !$inSingle;
				continue;
			}
			if ( !$inSingle && $ch === '"' ) {
				$inDouble = !$inDouble;
				continue;
			}
			if ( $inSingle || $inDouble ) {
				continue;
			}
			switch ( $ch ) {
				case '(':
					$depthParen++;
					break;
				case ')':
					$depthParen = max( 0, $depthParen - 1 );
					break;
				case '[':
					$depthBracket++;
					break;
				case ']':
					$depthBracket = max( 0, $depthBracket - 1 );
					break;
				case '{':
					$depthBrace++;
					break;
				case '}':
					$depthBrace = max( 0, $depthBrace - 1 );
					break;
				default:
					if ( $depthParen === 0 && $depthBracket === 0 && $depthBrace === 0
						&& in_array( $ch, $delimiters, true )
					) {
						return $i;
					}
			}
		}
		return null;
	}

	/**
	 * Build a regex for matching supported message-call expressions.
	 *
	 * @param bool $anchored Whether to anchor the pattern to the whole string
	 * @return string
	 */
	private function getMessageExpressionPattern( bool $anchored ): string {
		$start = $anchored ? '^' : '\b';
		$end = $anchored ? '$' : '';
		$pattern =
			'/' .
			$start .
			'(ve\.msg|ve\.htmlMsg|ve\.deferHtmlMsg|ve\.deferJQueryMsg|mw\.msg|OO\.ui\.deferMsg)' .
			"\\s*\\(\\s*(\"|')" .
			"([^\"']+)" .
			"\\2(.*?)\\)" .
			$end .
			'/s';
		return $pattern;
	}

	/**
	 * Convert all JS single-quoted string literals to double-quoted, handling escapes.
	 *
	 * @param string $code JS source
	 * @return string
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
}
