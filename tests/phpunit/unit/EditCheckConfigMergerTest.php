<?php

namespace MediaWiki\Extension\VisualEditor\Tests;

use MediaWiki\Extension\VisualEditor\EditCheck\ConfigMerger;
use MediaWikiUnitTestCase;

/**
 * @covers \MediaWiki\Extension\VisualEditor\EditCheck\ConfigMerger
 */
class EditCheckConfigMergerTest extends MediaWikiUnitTestCase {

	/**
	 * @dataProvider provideMerge
	 */
	public function testMerge( array $configs, array $expected ): void {
		$this->assertSame( $expected, ConfigMerger::merge( ...$configs ) );
	}

	public static function provideMerge(): iterable {
		yield 'plain keys replace' => [
			[ [ 'a' => [ 1 ], 'b' => 1 ], [ 'a' => [ 2 ] ] ],
			[ 'a' => [ 2 ], 'b' => 1 ]
		];
		yield '+ joins lists with no duplicates' => [
			[ [ 'a' => [ 1, 2 ] ], [ '+a' => [ 2, 3 ] ] ],
			[ 'a' => [ 1, 2, 3 ] ]
		];
		yield '+ with no earlier value sets the value' => [
			[ [], [ '+a' => [ 1 ] ] ],
			[ 'a' => [ 1 ] ]
		];
		yield '+ merges maps, with later keys taking priority' => [
			[ [ 'a' => [ 'x' => true, 'y' => true ] ], [ '+a' => [ 'y' => false, 'z' => true ] ] ],
			[ 'a' => [ 'x' => true, 'y' => false, 'z' => true ] ]
		];
		yield '+ merges a map into an empty value' => [
			[ [ 'a' => [] ], [ '+a' => [ 'x' => true ] ] ],
			[ 'a' => [ 'x' => true ] ]
		];
		yield 'prefixes apply in nested maps' => [
			[
				[ 'a' => [ 'x' => [ 'list' => [ 1 ] ], 'y' => [ 'j' => 1, 'k' => 2 ] ] ],
				[ '+a' => [ '+x' => [ '+list' => [ 2 ] ], '-y' => 'k' ] ]
			],
			[ 'a' => [ 'x' => [ 'list' => [ 1, 2 ] ], 'y' => [ 'j' => 1 ] ] ]
		];
		yield '+ on a scalar replaces it, and resolves the new value' => [
			[ [ 'a' => 1 ], [ '+a' => [ '+x' => [ 1 ] ] ] ],
			[ 'a' => [ 'x' => [ 1 ] ] ]
		];
		yield '- removes list items' => [
			[ [ 'a' => [ 1, 2, 3 ] ], [ '-a' => [ 1, 3 ] ] ],
			[ 'a' => [ 2 ] ]
		];
		yield '- removes a single list item' => [
			[ [ 'a' => [ 'x', 'y' ] ], [ '-a' => 'x' ] ],
			[ 'a' => [ 'y' ] ]
		];
		yield '- removes map keys' => [
			[ [ 'a' => [ 'x' => 1, 'y' => 2, 'z' => 3 ] ], [ '-a' => [ 'x', 'z' ] ] ],
			[ 'a' => [ 'y' => 2 ] ]
		];
		yield '- with no earlier value does nothing' => [
			[ [], [ '-a' => [ 1 ] ] ],
			[]
		];
		yield 'in one config, plain keys apply first, then +, then -' => [
			[ [ 'a' => [ 1 ] ], [ '-a' => [ 2 ], '+a' => [ 2, 3 ], 'a' => [ 0 ] ] ],
			[ 'a' => [ 0, 3 ] ]
		];
		yield 'a key that is only a prefix character is a plain key' => [
			[ [ '+' => 1 ], [ '-' => 2 ] ],
			[ '+' => 1, '-' => 2 ]
		];
	}

	/**
	 * @dataProvider provideCompose
	 */
	public function testCompose(
		array $first, array $second, ?array $expected = null, array $skipBases = []
	): void {
		$composed = ConfigMerger::compose( $first, $second );
		if ( $expected !== null ) {
			$this->assertSame( $expected, $composed );
		}
		$bases = [
			'no value' => [],
			'empty value' => [ 'a' => [] ],
			'list' => [ 'a' => [ 1, 2, 'x' ] ],
			'map' => [ 'a' => [ 'x' => [ 'list' => [ 1 ] ], 'y' => 1, 'z' => 1 ] ],
			'scalar' => [ 'a' => 1 ],
		];
		foreach ( array_diff_key( $bases, array_flip( $skipBases ) ) as $baseName => $base ) {
			$this->assertSame(
				self::normalize( ConfigMerger::merge( $base, $first, $second ) ),
				self::normalize( ConfigMerger::merge( $base, $composed ) ),
				"Same result as the two configs in sequence, on base with $baseName"
			);
		}
	}

	public static function provideCompose(): iterable {
		yield 'second plain value replaces' => [
			[ '+a' => [ 1 ], '-a' => [ 2 ] ], [ 'a' => [ 3 ] ],
			[ 'a' => [ 3 ] ]
		];
		yield 'second changes apply to first plain value' => [
			[ 'a' => [ 1, 2 ] ], [ '+a' => [ 3 ], '-a' => [ 1 ] ],
			[ 'a' => [ 2, 3 ] ]
		];
		yield 'changes with no earlier value are kept' => [
			[ '+a' => [ 1 ] ], [ '+a' => [ 2 ] ],
			[ '+a' => [ 1, 2 ] ]
		];
		yield 'added list item that was removed before' => [
			[ '-a' => [ 1, 'x' ] ], [ '+a' => [ 1 ] ],
			[ '+a' => [ 1 ], '-a' => [ 'x' ] ]
		];
		yield 'removed list item that was added before' => [
			[ '+a' => [ 1, 3 ] ], [ '-a' => [ 1 ] ],
			[ '+a' => [ 1, 3 ], '-a' => [ 1 ] ]
		];
		yield 'map changes compose recursively' => [
			[ '+a' => [ '+x' => [ '+list' => [ 2 ] ] ] ], [ '+a' => [ '+x' => [ '+list' => [ 3 ] ], 'y' => 2 ] ],
			[ '+a' => [ '+x' => [ '+list' => [ 2, 3 ] ], 'y' => 2 ] ]
		];
		yield 'map key that was removed before is set from nothing' => [
			[ '-a' => [ 'x', 'y' ] ], [ '+a' => [ '+x' => [ 'list' => [ 2 ] ] ] ],
			[ '+a' => [ 'x' => [ 'list' => [ 2 ] ] ], '-a' => [ 'y' ] ]
		];
		yield 'map key that was removed before is set by a plain value' => [
			[ '-a' => [ 'x' ] ], [ '+a' => [ 'x' => [ 'list' => [ 2 ] ] ] ],
			[ '+a' => [ 'x' => [ 'list' => [ 2 ] ] ] ]
		];
		yield 'map key that was removed before stays removed if only removed again' => [
			[ '-a' => [ 'x' ] ], [ '+a' => [ '-x' => [ 'list' ] ] ],
			[ '+a' => [], '-a' => [ 'x' ] ],
			// The empty '+a' can be a list or a map, so map changes on a list base give a different result
			[ 'list' ]
		];
		yield 'mismatched types replace' => [
			[ '+a' => [ 1 ] ], [ '+a' => [ 'x' => true ] ],
			[ 'a' => [ 'x' => true ] ]
		];
		yield 'names in only one config are kept' => [
			[ 'b' => 1, '+a' => [ 1 ] ], [ 'c' => 2 ],
			[ 'b' => 1, '+a' => [ 1 ], 'c' => 2 ]
		];
		yield 'plain and changes in one config' => [
			[ 'a' => [ 1 ], '+a' => [ 2 ] ], [ '-a' => [ 1 ] ],
			[ 'a' => [ 2 ] ]
		];
	}

	/**
	 * Order of list items and map keys is not important for configs
	 *
	 * @param mixed $value
	 * @return mixed
	 */
	private static function normalize( $value ) {
		if ( !is_array( $value ) ) {
			return $value;
		}
		$value = array_map( [ self::class, 'normalize' ], $value );
		if ( array_is_list( $value ) ) {
			usort( $value, static fn ( $a, $b ) => strcmp( json_encode( $a ), json_encode( $b ) ) );
		} else {
			ksort( $value );
		}
		return $value;
	}
}
