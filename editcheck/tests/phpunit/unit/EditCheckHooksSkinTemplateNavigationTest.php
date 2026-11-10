<?php

namespace MediaWiki\Extension\VisualEditor\EditCheck\Tests\Unit;

use MediaWiki\Config\HashConfig;
use MediaWiki\Extension\VisualEditor\EditCheck\EditSuggestionCounts\EditSuggestionsCountsLookup;
use MediaWiki\Extension\VisualEditor\EditCheck\Hooks;
use MediaWiki\Extension\VisualEditor\Services\VisualEditorAvailabilityLookup;
use MediaWiki\Language\MessageCache;
use MediaWiki\Message\Message;
use MediaWiki\Output\OutputPage;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Skin\SkinTemplate;
use MediaWiki\Title\Title;
use MediaWiki\User\Options\UserOptionsLookup;
use MediaWiki\User\Options\UserOptionsManager;
use MediaWiki\User\User;
use MediaWikiUnitTestCase;

/**
 * @covers \MediaWiki\Extension\VisualEditor\EditCheck\Hooks::onSkinTemplateNavigation__Universal
 * @covers \MediaWiki\Extension\VisualEditor\Hooks::isEditCheckSuggestionsAvailable
 * @covers \MediaWiki\Extension\VisualEditor\VisualEditorHookRunner::onVisualEditorEditCheckReadSuggestionsIndicator
 */
class EditCheckHooksSkinTemplateNavigationTest extends MediaWikiUnitTestCase {

	private function newSkin(
		OutputPage $output, string $skinName = 'monobook', string $action = 'view', array $query = []
	): SkinTemplate {
		$message = $this->createMock( Message::class );
		$message->method( 'text' )->willReturn( '(editcheck-read-suggestions)' );
		$skin = $this->createMock( SkinTemplate::class );
		$skin->method( 'getTitle' )->willReturn( $this->createMock( Title::class ) );
		$skin->method( 'getRequest' )->willReturn( new FauxRequest( $query ) );
		$skin->method( 'getUser' )->willReturn( $this->createMock( User::class ) );
		$skin->method( 'getActionName' )->willReturn( $action );
		$skin->method( 'getSkinName' )->willReturn( $skinName );
		$skin->method( 'getOutput' )->willReturn( $output );
		$skin->method( 'msg' )->with( 'editcheck-read-suggestions' )->willReturn( $message );
		return $skin;
	}

	private function newHooks(
		bool $suggestionsPref = true, bool $veAvailable = true, ?int $count = 3,
		bool $featureFlag = true, array $hookHandlers = []
	): Hooks {
		$userOptionsLookup = $this->createMock( UserOptionsLookup::class );
		$userOptionsLookup->method( 'getOption' )
			->with( $this->anything(), 'visualeditor-editcheck-suggestions' )
			->willReturn( $suggestionsPref ? 1 : 0 );
		$veAvailability = $this->createMock( VisualEditorAvailabilityLookup::class );
		$veAvailability->method( 'isAvailable' )->willReturn( $veAvailable );
		$countsLookup = $this->createMock( EditSuggestionsCountsLookup::class );
		$countsLookup->method( 'getCount' )->willReturn( $count );
		return new Hooks(
			$userOptionsLookup,
			$this->createMock( UserOptionsManager::class ),
			$this->createMock( MessageCache::class ),
			$countsLookup,
			$veAvailability,
			new HashConfig( [ 'VisualEditorEditCheckReadSuggestionsCount' => $featureFlag ] ),
			$this->createHookContainer( $hookHandlers )
		);
	}

	public function testAddsTab(): void {
		$output = $this->createMock( OutputPage::class );
		$output->expects( $this->once() )->method( 'addModuleStyles' )
			->with( 'ext.visualEditor.editCheck.read.styles' );
		$links = [ 'views' => [] ];
		$this->newHooks()->onSkinTemplateNavigation__Universal( $this->newSkin( $output ), $links );
		$this->assertSame( '(editcheck-read-suggestions)', $links['views']['suggestions']['text'] );
		$this->assertSame( [ 'count' => 3 ], $links['views']['suggestions']['data'] );
	}

	public function testVector2022(): void {
		$output = $this->createMock( OutputPage::class );
		$output->expects( $this->once() )->method( 'addHtmlClasses' )
			->with( 'ext-editcheck-read-suggestions-count' );
		$output->expects( $this->once() )->method( 'addInlineStyle' )
			->with( ":root { --ext-editcheck-suggestion-count: '3'; }" );
		$links = [ 'views' => [] ];
		$this->newHooks()->onSkinTemplateNavigation__Universal(
			$this->newSkin( $output, 'vector-2022' ), $links
		);
		$this->assertSame( [ 'views' => [] ], $links );
	}

	public function testEditAction(): void {
		$links = [ 'views' => [] ];
		$this->newHooks()->onSkinTemplateNavigation__Universal(
			$this->newSkin( $this->createMock( OutputPage::class ), 'monobook', 'edit' ), $links
		);
		$this->assertArrayHasKey( 'suggestions', $links['views'] );
	}

	public function testSuggestionsEnabledByUrl(): void {
		$links = [ 'views' => [] ];
		$this->newHooks( false )->onSkinTemplateNavigation__Universal(
			$this->newSkin(
				$this->createMock( OutputPage::class ), 'monobook', 'view', [ 'ecenable' => 'suggestions' ]
			),
			$links
		);
		$this->assertArrayHasKey( 'suggestions', $links['views'] );
	}

	public static function provideNoCount(): iterable {
		yield 'other action' => [ [ 'action' => 'history' ] ];
		yield 'suggestions not enabled' => [ [ 'suggestionsPref' => false ] ];
		yield 'suggestions disabled by URL' => [ [ 'query' => [ 'ecenable' => '0' ] ] ];
		yield 'VisualEditor not available' => [ [ 'veAvailable' => false ] ];
		yield 'no count' => [ [ 'count' => null ] ];
		yield 'zero count' => [ [ 'count' => 0 ] ];
		yield 'feature flag off' => [ [ 'featureFlag' => false ] ];
		yield 'hidden by hook' => [ [ 'hookHandlers' => [
			'VisualEditorEditCheckReadSuggestionsIndicator' => static function ( $skin, $count, &$indicator ) {
				$indicator = null;
			},
		] ] ];
		yield 'unknown indicator' => [ [ 'hookHandlers' => [
			'VisualEditorEditCheckReadSuggestionsIndicator' => static function ( $skin, $count, &$indicator ) {
				$indicator = 'unknown';
			},
		] ] ];
	}

	/**
	 * @dataProvider provideNoCount
	 */
	public function testNoCount( array $options ): void {
		$options += [
			'action' => 'view', 'suggestionsPref' => true, 'query' => [], 'veAvailable' => true, 'count' => 3,
			'featureFlag' => true, 'hookHandlers' => [],
		];
		$output = $this->createMock( OutputPage::class );
		$output->expects( $this->never() )->method( 'addModuleStyles' );
		$links = [ 'views' => [] ];
		$this->newHooks(
			$options['suggestionsPref'], $options['veAvailable'], $options['count'], $options['featureFlag'],
			$options['hookHandlers']
		)
			->onSkinTemplateNavigation__Universal(
				$this->newSkin( $output, 'monobook', $options['action'], $options['query'] ), $links
			);
		$this->assertSame( [ 'views' => [] ], $links );
	}

	public function testHookArguments(): void {
		$skin = $this->newSkin( $this->createMock( OutputPage::class ) );
		$links = [ 'views' => [] ];
		$this->newHooks( true, true, 3, true, [
			'VisualEditorEditCheckReadSuggestionsIndicator' => function (
				$hookSkin, $count, $indicator
			) use ( $skin ) {
				$this->assertSame( $skin, $hookSkin );
				$this->assertSame( 3, $count );
				$this->assertSame( 'count', $indicator );
			},
		] )->onSkinTemplateNavigation__Universal( $skin, $links );
		$this->assertArrayHasKey( 'suggestions', $links['views'] );
	}

	private static function lightbulbHandler(): array {
		return [
			'VisualEditorEditCheckReadSuggestionsIndicator' => static function ( $skin, $count, &$indicator ) {
				$indicator = 'lightbulb';
			},
		];
	}

	public function testLightbulbTab(): void {
		$links = [ 'views' => [] ];
		$this->newHooks( true, true, 3, true, self::lightbulbHandler() )->onSkinTemplateNavigation__Universal(
			$this->newSkin( $this->createMock( OutputPage::class ) ), $links
		);
		$this->assertArrayHasKey( 'suggestions', $links['views'] );
		$this->assertArrayNotHasKey( 'data', $links['views']['suggestions'] );
	}

	public function testLightbulbVector2022(): void {
		$output = $this->createMock( OutputPage::class );
		$output->expects( $this->once() )->method( 'addHtmlClasses' )
			->with( 'ext-editcheck-read-suggestions-lightbulb' );
		$output->expects( $this->never() )->method( 'addInlineStyle' );
		$output->expects( $this->once() )->method( 'addModuleStyles' )
			->with( 'ext.visualEditor.editCheck.read.styles' );
		$links = [ 'views' => [] ];
		$this->newHooks( true, true, 3, true, self::lightbulbHandler() )->onSkinTemplateNavigation__Universal(
			$this->newSkin( $output, 'vector-2022' ), $links
		);
		$this->assertSame( [ 'views' => [] ], $links );
	}

	public static function provideEditButtonSkins(): iterable {
		yield 'Vector 2022, count' => [ 'vector-2022', [], 'count' ];
		yield 'Vector 2022, lightbulb' => [ 'vector-2022', self::lightbulbHandler(), 'lightbulb' ];
		yield 'Minerva, count' => [ 'minerva', [], 'count' ];
		yield 'Minerva, lightbulb' => [ 'minerva', self::lightbulbHandler(), 'lightbulb' ];
	}

	/**
	 * @dataProvider provideEditButtonSkins
	 */
	public function testEditButtonSkins( string $skinName, array $hookHandlers, string $indicator ): void {
		$output = $this->createMock( OutputPage::class );
		$output->expects( $this->once() )->method( 'addHtmlClasses' )
			->with( "ext-editcheck-read-suggestions-$indicator" );
		$output->expects( $indicator === 'count' ? $this->once() : $this->never() )->method( 'addInlineStyle' );
		$output->expects( $this->once() )->method( 'addModules' )->with( 'ext.visualEditor.editCheck.read' );
		$links = [ 'views' => [] ];
		$this->newHooks( true, true, 3, true, $hookHandlers )->onSkinTemplateNavigation__Universal(
			$this->newSkin( $output, $skinName ), $links
		);
		$this->assertSame( [ 'views' => [] ], $links );
	}
}
