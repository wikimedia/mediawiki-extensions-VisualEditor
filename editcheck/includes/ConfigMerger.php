<?php
/**
 * Merging of edit check configs.
 *
 * @file
 * @ingroup Extensions
 * @license MIT
 */

namespace MediaWiki\Extension\VisualEditor\EditCheck;

/**
 * Merges edit check configs with the same rules as mw.editcheck.mergeConfigs.
 *
 * A key with a '+' prefix adds its value to the inherited value.
 * A key with a '-' prefix removes its value from the inherited value.
 * Keep the rules in sync with editcheck/modules/utils.js.
 */
class ConfigMerger {

	/**
	 * Merge configs in sequence, so later configs take priority
	 *
	 * @param array ...$configs
	 * @return array
	 */
	public static function merge( array ...$configs ): array {
		$result = [];
		foreach ( $configs as $config ) {
			$result = self::mergeOne( $result, $config );
		}
		return $result;
	}

	/**
	 * Combine two configs into one config with the same effect as the two in sequence
	 *
	 * Unlike merge(), this keeps the '+' and '-' keys that have nothing to apply to, because
	 * the client applies the result on top of the code defaults.
	 *
	 * @param array $first
	 * @param array $second
	 * @return array
	 */
	public static function compose( array $first, array $second ): array {
		return self::fromParts( self::composeParts( self::toParts( $first ), self::toParts( $second ) ) );
	}

	private static function mergeOne( array $base, array $config ): array {
		$result = $base;
		$add = [];
		$remove = [];
		foreach ( $config as $key => $value ) {
			$prefix = self::getPrefix( $key );
			if ( $prefix === '+' ) {
				$add[substr( $key, 1 )] = $value;
			} elseif ( $prefix === '-' ) {
				$remove[substr( $key, 1 )] = $value;
			} else {
				$result[$key] = $value;
			}
		}
		foreach ( $add as $name => $value ) {
			$result[$name] = array_key_exists( $name, $result ) ?
				self::addValue( $result[$name], $value ) :
				self::resolve( $value );
		}
		foreach ( $remove as $name => $value ) {
			if ( array_key_exists( $name, $result ) ) {
				$result[$name] = self::removeValue( $result[$name], $value );
			}
		}
		return $result;
	}

	/**
	 * @param int|string $key
	 * @return string|null '+', '-', or null for a plain key
	 */
	private static function getPrefix( $key ): ?string {
		if ( is_string( $key ) && strlen( $key ) > 1 && ( $key[0] === '+' || $key[0] === '-' ) ) {
			return $key[0];
		}
		return null;
	}

	/**
	 * Resolve the prefixed keys in a value that has nothing to apply to
	 *
	 * @param mixed $value
	 * @return mixed
	 */
	private static function resolve( $value ) {
		return self::isMap( $value ) ? self::mergeOne( [], $value ) : $value;
	}

	/**
	 * @param mixed $existing
	 * @param mixed $value
	 * @return mixed
	 */
	private static function addValue( $existing, $value ) {
		if ( self::isList( $existing ) && self::isList( $value ) ) {
			return self::union( $existing, $value );
		}
		if ( self::isMap( $existing ) && self::isMap( $value ) ) {
			return self::mergeOne( $existing, $value );
		}
		return self::resolve( $value );
	}

	/**
	 * @param mixed $existing
	 * @param mixed $value Item or key, or a list of them
	 * @return mixed
	 */
	private static function removeValue( $existing, $value ) {
		$values = is_array( $value ) ? $value : [ $value ];
		if ( self::isList( $existing ) ) {
			return self::difference( $existing, $values );
		}
		if ( self::isMap( $existing ) ) {
			foreach ( $values as $key ) {
				if ( is_int( $key ) || is_string( $key ) ) {
					unset( $existing[$key] );
				}
			}
		}
		return $existing;
	}

	/**
	 * JSON decoding gives an empty array for both [] and {}, so an empty array is a list and a map.
	 *
	 * @param mixed $value
	 * @return bool
	 */
	private static function isList( $value ): bool {
		return is_array( $value ) && array_is_list( $value );
	}

	/**
	 * @param mixed $value
	 * @return bool
	 */
	private static function isMap( $value ): bool {
		return is_array( $value ) && ( $value === [] || !array_is_list( $value ) );
	}

	private static function union( array $list, array $items ): array {
		foreach ( $items as $item ) {
			if ( !in_array( $item, $list, true ) ) {
				$list[] = $item;
			}
		}
		return $list;
	}

	private static function difference( array $list, array $items ): array {
		return array_values( array_filter(
			$list,
			static fn ( $item ) => !in_array( $item, $items, true )
		) );
	}

	/**
	 * Group the keys of a config by name
	 *
	 * A name has a 'plain' value, or 'add' and 'remove' values, or both.
	 * A plain value already includes the 'add' and 'remove' values, so they are dropped.
	 *
	 * @param array $config
	 * @return array[]
	 */
	private static function toParts( array $config ): array {
		$parts = [];
		foreach ( $config as $key => $value ) {
			$prefix = self::getPrefix( $key );
			if ( $prefix === '+' ) {
				$parts[substr( $key, 1 )]['add'] = $value;
			} elseif ( $prefix === '-' ) {
				$parts[substr( $key, 1 )]['remove'] = $value;
			} else {
				$parts[$key]['plain'] = $value;
			}
		}
		foreach ( $parts as $name => $part ) {
			if ( array_key_exists( 'plain', $part ) ) {
				$parts[$name] = [ 'plain' => self::applyParts( $part, [ 'plain' => $part['plain'] ] )['plain'] ];
			}
		}
		return $parts;
	}

	/**
	 * @param array[] $parts
	 * @return array
	 */
	private static function fromParts( array $parts ): array {
		$config = [];
		foreach ( $parts as $name => $part ) {
			if ( array_key_exists( 'plain', $part ) ) {
				$config[$name] = $part['plain'];
				continue;
			}
			if ( array_key_exists( 'add', $part ) ) {
				$config['+' . $name] = $part['add'];
			}
			if ( array_key_exists( 'remove', $part ) ) {
				$config['-' . $name] = $part['remove'];
			}
		}
		return $config;
	}

	/**
	 * Apply the 'add' and 'remove' values of a name to an earlier value
	 *
	 * @param array $part
	 * @param array $earlier Empty array if there is no earlier value, or [ 'plain' => value ]
	 * @return array Empty array if there is no value, or [ 'plain' => value ]
	 */
	private static function applyParts( array $part, array $earlier ): array {
		$base = $earlier ? [ 'name' => $earlier['plain'] ] : [];
		$config = [];
		if ( array_key_exists( 'add', $part ) ) {
			$config['+name'] = $part['add'];
		}
		if ( array_key_exists( 'remove', $part ) ) {
			$config['-name'] = $part['remove'];
		}
		$result = self::mergeOne( $base, $config );
		return array_key_exists( 'name', $result ) ? [ 'plain' => $result['name'] ] : [];
	}

	/**
	 * @param array[] $first
	 * @param array[] $second
	 * @return array[]
	 */
	private static function composeParts( array $first, array $second ): array {
		$result = $first;
		foreach ( $second as $name => $part ) {
			if ( !isset( $first[$name] ) || array_key_exists( 'plain', $part ) ) {
				$result[$name] = $part;
			} elseif ( array_key_exists( 'plain', $first[$name] ) ) {
				$applied = self::applyParts( $part, $first[$name] );
				if ( $applied ) {
					$result[$name] = $applied;
				} else {
					unset( $result[$name] );
				}
			} else {
				$result[$name] = self::composeChanges( $first[$name], $part );
			}
		}
		return $result;
	}

	/**
	 * Combine two sets of 'add' and 'remove' values for one name
	 *
	 * @param array $first
	 * @param array $second
	 * @return array
	 */
	private static function composeChanges( array $first, array $second ): array {
		$firstAdd = $first['add'] ?? null;
		$firstRemove = array_key_exists( 'remove', $first ) ? (array)$first['remove'] : [];
		$secondRemove = array_key_exists( 'remove', $second ) ? (array)$second['remove'] : [];
		$remove = $firstRemove;
		if ( !array_key_exists( 'add', $second ) ) {
			$add = $firstAdd;
		} else {
			$secondAdd = $second['add'];
			if ( self::isList( $secondAdd ) && ( $firstAdd === null || self::isList( $firstAdd ) ) ) {
				$add = self::union( $firstAdd ?? [], $secondAdd );
				// An item that the second config adds again is not removed
				$remove = self::difference( $remove, $secondAdd );
			} elseif ( self::isMap( $secondAdd ) && ( $firstAdd === null || self::isMap( $firstAdd ) ) ) {
				$secondAddParts = self::toParts( $secondAdd );
				foreach ( $remove as $i => $key ) {
					if ( !( is_int( $key ) || is_string( $key ) ) || !isset( $secondAddParts[$key] ) ) {
						continue;
					}
					// The first config removes the key, so the second config sets it from nothing
					$applied = array_key_exists( 'plain', $secondAddParts[$key] ) ?
						$secondAddParts[$key] :
						self::applyParts( $secondAddParts[$key], [] );
					if ( $applied ) {
						$secondAddParts[$key] = $applied;
						unset( $remove[$i] );
					} else {
						unset( $secondAddParts[$key] );
					}
				}
				$remove = array_values( $remove );
				$add = self::fromParts( self::composeParts( self::toParts( $firstAdd ?? [] ), $secondAddParts ) );
			} else {
				// Types do not match, so the second config replaces the value
				return self::applyParts( [ 'remove' => $secondRemove ], [ 'plain' => self::resolve( $secondAdd ) ] );
			}
		}
		$result = [];
		if ( $add !== null ) {
			$result['add'] = $add;
		}
		$remove = self::union( $remove, $secondRemove );
		if ( $remove ) {
			$result['remove'] = $remove;
		}
		return $result;
	}
}
