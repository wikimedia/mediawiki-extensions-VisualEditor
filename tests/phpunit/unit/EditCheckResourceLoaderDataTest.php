<?php

namespace MediaWiki\Extension\VisualEditor\Tests;

use MediaWiki\Extension\VisualEditor\EditCheck\ResourceLoaderData;
use MediaWikiUnitTestCase;

/**
 * @covers \MediaWiki\Extension\VisualEditor\EditCheck\ResourceLoaderData
 */
class EditCheckResourceLoaderDataTest extends MediaWikiUnitTestCase {

	/**
	 * @dataProvider provideCombineConfigs
	 */
	public function testCombineConfigs( array $siteConfig, array $onWikiConfig, array $expected ): void {
		$this->assertSame( $expected, ResourceLoaderData::combineConfigs( $siteConfig, $onWikiConfig ) );
	}

	public static function provideCombineConfigs(): iterable {
		yield 'on-wiki scalar replaces site scalar' => [
			[ 'tone' => [ 'showAsCheck' => true, 'maximumEditCount' => 100 ] ],
			[ 'tone' => [ 'showAsCheck' => false ] ],
			[ 'tone' => [ 'showAsCheck' => false, 'maximumEditCount' => 100 ] ]
		];
		yield 'on-wiki list replaces site list' => [
			[ '*' => [ 'ignoreSections' => [ 'References' ] ] ],
			[ '*' => [ 'ignoreSections' => [ 'Notes' ] ] ],
			[ '*' => [ 'ignoreSections' => [ 'Notes' ] ] ]
		];
		yield 'on-wiki + adds to site list' => [
			[ '*' => [ 'ignoreSections' => [ 'References' ] ] ],
			[ '*' => [ '+ignoreSections' => [ 'Notes' ] ] ],
			[ '*' => [ 'ignoreSections' => [ 'References', 'Notes' ] ] ]
		];
		yield '+ with no site value is kept for the client' => [
			[ 'tone' => [ '+ignoreSections' => [ 'References' ] ] ],
			[ 'tone' => [ '+ignoreSections' => [ 'Notes' ] ] ],
			[ 'tone' => [ '+ignoreSections' => [ 'References', 'Notes' ] ] ]
		];
		yield 'checks in only one config are kept' => [
			[ 'tone' => [ 'showAsCheck' => true ] ],
			[ 'paste' => [ 'showAsCheck' => false ] ],
			[ 'tone' => [ 'showAsCheck' => true ], 'paste' => [ 'showAsCheck' => false ] ]
		];
	}
}
