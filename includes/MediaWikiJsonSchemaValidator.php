<?php
/**
 * Helper for validating on-wiki JSON config pages.
 *
 * Validates a specific JSON message page against a bundled JSON schema file when
 * it is saved.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2025 VisualEditor Team and others; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\VisualEditor;

use JsonSchema\Validator;
use MediaWiki\Content\TextContent;
use MediaWiki\Revision\RenderedRevision;
use MediaWiki\Status\Status;
use Wikimedia\Message\MessageValue;

class MediaWikiJsonSchemaValidator {

	/**
	 * Validate against a JSON schema.
	 *
	 * Intended to be called from a MultiContentSave hook handler, returning its
	 * result directly. Saves of unrelated pages, or non-text content, are ignored.
	 *
	 * @param RenderedRevision $renderedRevision The revision being saved
	 * @param Status $status Status to populate with a fatal error on failure
	 * @param string $pageDBkey Lower-cased DB key of the MediaWiki: page to validate,
	 *   e.g. 'editcheck-config.json'
	 * @param string $schemaPath Absolute path to the JSON schema file to validate against
	 * @return bool|null False to abort the save when validation fails, null otherwise
	 */
	public static function validateOnSave(
		RenderedRevision $renderedRevision,
		Status $status,
		string $pageDBkey,
		string $schemaPath
	): ?bool {
		$page = $renderedRevision->getRevision()->getPageAsLinkTarget();
		if (
			$page->getNamespace() !== NS_MEDIAWIKI ||
			strtolower( $page->getDBkey() ) !== $pageDBkey
		) {
			return null;
		}

		$content = $renderedRevision->getRevision()->getMainContentRaw();
		if ( !( $content instanceof TextContent ) ) {
			// If for some reason the content isn't text, we can't validate it
			return null;
		}

		$config = json_decode( $content->getText() );
		if ( json_last_error() !== JSON_ERROR_NONE ) {
			$status->fatal( 'visualeditor-config-save-invalid-schema', json_last_error_msg() );
			return false;
		}

		$validator = new Validator();
		$schema = json_decode( file_get_contents( $schemaPath ) );
		$validator->validate( $config, $schema );
		if ( $validator->isValid() ) {
			return null;
		}

		$status->fatal(
			// MessageValue ensures our formatted error is treated as wikitext.
			new MessageValue(
				'visualeditor-config-save-invalid-schema',
				[ self::formatSchemaErrors( $validator->getErrors() ) ]
			)
		);
		return false;
	}

	/**
	 * Format JSON schema validation errors as a wikitext definition list.
	 *
	 * @param array[] $errors Errors as returned by Validator::getErrors()
	 * @return string Wikitext
	 */
	private static function formatSchemaErrors( array $errors ): string {
		$lastProperty = null;
		return implode( '', array_map(
			static function ( array $error ) use ( &$lastProperty ): string {
				$prefix = '';
				if ( $lastProperty !== $error['property'] ) {
					$prefix = "\n;<nowiki>" . $error['property'] . "</nowiki>";
					$lastProperty = $error['property'];
				}
				return $prefix . "\n:" . $error['message'];
			},
			$errors
		) );
	}
}
