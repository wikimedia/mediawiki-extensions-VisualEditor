QUnit.module( 've.ui.MWTransclusionOutlineContainerWidget' );

QUnit.test( 'Constructor', ( assert ) => {
	const widget = new ve.ui.MWTransclusionOutlineContainerWidget();

	// eslint-disable-next-line no-jquery/no-class-state
	assert.ok( widget.$element.hasClass( 've-ui-mwTransclusionOutlineContainerWidget' ) );
	assert.deepEqual( widget.partWidgets, {} );
} );

QUnit.test( 'Supports all ve.dm.MWTransclusionPartModel subclasses', ( assert ) => {
	const transclusion = new ve.dm.MWTransclusionModel(),
		widget = new ve.ui.MWTransclusionOutlineContainerWidget();

	widget.onReplacePart( null, new ve.dm.MWTemplateModel( transclusion, {} ) );
	widget.onReplacePart( null, new ve.dm.MWTemplatePlaceholderModel( transclusion ) );
	widget.onReplacePart( null, new ve.dm.MWTransclusionContentModel( transclusion ) );

	assert.ok( widget.partWidgets.part_0 instanceof ve.ui.MWTransclusionOutlineTemplateWidget );
	assert.ok( widget.partWidgets.part_1 instanceof ve.ui.MWTransclusionOutlinePlaceholderWidget );
	assert.ok( widget.partWidgets.part_2 instanceof ve.ui.MWTransclusionOutlineWikitextWidget );
} );

QUnit.test( 'Basic functionality', ( assert ) => {
	const transclusion = new ve.dm.MWTransclusionModel(),
		part0 = new ve.dm.MWTransclusionContentModel( transclusion ),
		part1 = new ve.dm.MWTransclusionContentModel( transclusion ),
		widget = new ve.ui.MWTransclusionOutlineContainerWidget();

	widget.onReplacePart();
	assert.deepEqual( widget.partWidgets, {} );

	widget.onReplacePart( null, part0 );
	widget.onReplacePart( null, part1 );
	assert.deepEqual( Object.keys( widget.partWidgets ), [ 'part_0', 'part_1' ] );

	widget.onReplacePart( part0 );
	assert.deepEqual( Object.keys( widget.partWidgets ), [ 'part_1' ] );

	widget.clear();
	assert.deepEqual( widget.partWidgets, {} );
} );

// TODO: addPartWidget() with different positions.
// TODO: onTransclusionModelChange() is complex and fragile and must be tested.
