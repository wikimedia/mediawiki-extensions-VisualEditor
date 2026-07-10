<?php

namespace MediaWiki\Extension\VisualEditor\Tests;

use JsonSchema\Validator;
use MediaWikiUnitTestCase;

/**
 * @coversNothing
 */
class EditCheckConfigSchemaTest extends MediaWikiUnitTestCase {

	private function loadSchema() {
		$schemaPath = __DIR__ . '/../../../editcheck/editcheck-config.schema.json';
		$schema = json_decode( file_get_contents( $schemaPath ) );

		$this->assertNotFalse( $schema, 'Failed to read schema file' );
		$this->assertSame( JSON_ERROR_NONE, json_last_error(), json_last_error_msg() );

		return $schema;
	}

	private static function loadFixtureData( string $filename ): array {
		$fixturePath = __DIR__ . '/configs/' . $filename;
		$data = json_decode( file_get_contents( $fixturePath ), true );

		if ( $data === null && json_last_error() !== JSON_ERROR_NONE ) {
			throw new \RuntimeException( json_last_error_msg() );
		}

		return $data;
	}

	private function toJsonObject( array $data ) {
		return json_decode( json_encode( $data ) );
	}

	private function formatErrors( array $errors ): string {
		return implode( "\n", array_map(
			static function ( array $error ): string {
				return sprintf( '%s: %s', $error['property'], $error['message'] );
			},
			$errors
		) );
	}

	/**
	 * Wrap a single named definition as a standalone schema, keeping the other
	 * definitions available for internal $ref resolution. Mirrors
	 * MediaWikiJsonSchemaValidator::validateOnSave().
	 *
	 * @param string $definition
	 * @return \stdClass
	 */
	private function loadDefinitionSchema( string $definition ) {
		$schema = $this->loadSchema();
		return (object)[
			'$ref' => '#/definitions/' . $definition,
			'definitions' => $schema->definitions,
		];
	}

	private function assertMatchesSchema( array $config ): void {
		$validator = new Validator();
		$jsonConfig = $this->toJsonObject( $config );
		$validator->validate( $jsonConfig, $this->loadSchema() );

		$this->assertTrue( $validator->isValid(), $this->formatErrors( $validator->getErrors() ) );
	}

	private function assertDoesNotMatchSchema( array $config ): void {
		$validator = new Validator();
		$jsonConfig = $this->toJsonObject( $config );
		$validator->validate( $jsonConfig, $this->loadSchema() );

		$this->assertFalse( $validator->isValid(), 'Config unexpectedly matched schema' );
	}

	private function assertMatchesDefinition( array $config, string $definition ): void {
		$validator = new Validator();
		$jsonConfig = $this->toJsonObject( $config );
		$validator->validate( $jsonConfig, $this->loadDefinitionSchema( $definition ) );

		$this->assertTrue( $validator->isValid(), $this->formatErrors( $validator->getErrors() ) );
	}

	private function assertDoesNotMatchDefinition( array $config, string $definition ): void {
		$validator = new Validator();
		$jsonConfig = $this->toJsonObject( $config );
		$validator->validate( $jsonConfig, $this->loadDefinitionSchema( $definition ) );

		$this->assertFalse( $validator->isValid(), 'Config unexpectedly matched definition' );
	}

	public function testSchemaIsValidJson(): void {
		$schema = $this->loadSchema();

		$this->assertIsObject( $schema );
		$this->assertSame( 'object', $schema->type );
	}

	/**
	 * @dataProvider provideValidConfigs
	 */
	public function testSchemaAcceptsValidConfig( array $config ): void {
		$this->assertMatchesSchema( $config );
	}

	/**
	 * @dataProvider provideInvalidConfigs
	 */
	public function testSchemaRejectsInvalidConfig( array $config ): void {
		$this->assertDoesNotMatchSchema( $config );
	}

	/**
	 * @dataProvider provideValidImports
	 */
	public function testSchemaAcceptsValidImport( array $config ): void {
		$this->assertMatchesDefinition( $config, 'textMatchRuleInline' );
	}

	/**
	 * @dataProvider provideInvalidImports
	 */
	public function testSchemaRejectsInvalidImport( array $config ): void {
		$this->assertDoesNotMatchDefinition( $config, 'textMatchRuleInline' );
	}

	public static function provideValidConfigs(): iterable {
		foreach ( glob( __DIR__ . '/configs/*.json' ) as $fixturePath ) {
			yield basename( $fixturePath ) => [ self::loadFixtureData( basename( $fixturePath ) ) ];
		}
	}

	public static function provideValidImports(): iterable {
		foreach ( glob( __DIR__ . '/configs/textmatch-import/*.json' ) as $fixturePath ) {
			$name = basename( $fixturePath );
			yield $name => [ self::loadFixtureData( 'textmatch-import/' . $name ) ];
		}
	}

	public static function provideInvalidImports(): iterable {
		yield 'missing required query' => [ [
			'title' => 'Bad',
			'message' => 'No query here'
		] ];

		yield 'invalid mode' => [ [
			'query' => 'Foo',
			'mode' => 'rename'
		] ];

		yield 'minOccurrences below minimum' => [ [
			'query' => 'Foo',
			'minOccurrences' => 0
		] ];

		yield 'unknown property' => [ [
			'query' => 'Foo',
			'bogus' => true
		] ];

		yield 'is not itself an import' => [ [
			'import' => 'MediaWiki:Editcheck-config-other.json'
		] ];
	}

	public static function provideInvalidConfigs(): iterable {
		$fixture = self::loadFixtureData( 'enwiki.json' );

		$topLevelMinOccurrences = $fixture;
		$topLevelMinOccurrences['textMatch']['matchRules'] = [
			'bad' => [
				'title' => 'Bad',
				'message' => 'Avoid this term',
				'query' => 'Foo',
				'minOccurrences' => 0
			]
		];
		yield 'top level minOccurrences below minimum' => [ $topLevelMinOccurrences ];

		$legacyMinOccurrences = $fixture;
		$legacyMinOccurrences['textMatch']['matchRules'] = [
			'bad' => [
				'title' => 'Bad',
				'message' => 'Avoid this term',
				'query' => 'Foo',
				'config' => [
					'minOccurrences' => 0
				]
			]
		];
		yield 'legacy minOccurrences below minimum' => [ $legacyMinOccurrences ];

		$invalidMode = $fixture;
		$invalidMode['textMatch']['matchRules'] = [
			'bad' => [
				'title' => 'Bad',
				'message' => 'Avoid this term',
				'query' => 'Foo',
				'mode' => 'rename'
			]
		];
		yield 'invalid text match mode' => [ $invalidMode ];

		$invalidImport = $fixture;
		$invalidImport['textMatch']['matchRules'] = [
			'imported' => [
				'import' => 'MediaWiki:Editcheck-test-rule.txt'
			]
		];
		yield 'invalid import file extension' => [ $invalidImport ];

		$invalidBooleanOverride = $fixture;
		$invalidBooleanOverride['addReference'] = [
			'ignoreSections' => true,
			'includeSections' => true,
			'inCategory' => true,
			'notInCategory' => true,
			'hasTemplate' => true,
			'lacksTemplate' => true
		];
		yield 'optional array overrides only accept false' => [ $invalidBooleanOverride ];
	}
}
