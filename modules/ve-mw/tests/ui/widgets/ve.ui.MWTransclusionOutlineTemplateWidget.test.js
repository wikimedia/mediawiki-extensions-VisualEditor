QUnit.module( 've.ui.MWTransclusionOutlineTemplateWidget' );

QUnit.test( 'Constructor', ( assert ) => {
	const transclusion = new ve.dm.MWTransclusionModel(),
		template = new ve.dm.MWTemplateModel( transclusion, { wt: 'Example' } ),
		widget = new ve.ui.MWTransclusionOutlineTemplateWidget( template );

	assert.strictEqual( widget.getData(), 'part_0' );
	assert.strictEqual(
		widget.$element.find( '.ve-ui-mwTransclusionOutlineButtonWidget' ).text(),
		'Example'
	);
} );

// TODO: insertCheckboxAtCanonicalPosition() is complex and fragile and must be tested.

QUnit.test( 'filterParameters() on an empty template', ( assert ) => {
	const transclusion = new ve.dm.MWTransclusionModel(),
		template = new ve.dm.MWTemplateModel( transclusion, {} ),
		widget = new ve.ui.MWTransclusionOutlineTemplateWidget( template );

	let eventsFired = 0;
	widget.connect( this, {
		filterParameters: ( visibility ) => {
			assert.deepEqual( visibility, {} );
			eventsFired++;
		}
	} );

	widget.filterParameters( '' );
	assert.strictEqual( widget.infoWidget.isVisible(), true );
	assert.strictEqual( eventsFired, 1 );
} );

QUnit.test( 'filterParameters() considers everything from the spec', ( assert ) => {
	const transclusion = new ve.dm.MWTransclusionModel(),
		template = ve.dm.MWTemplateModel.newFromData( transclusion, {
			target: {},
			params: { a: {}, b: {}, c: {}, d: {}, e: {} }
		} ),
		widget = new ve.ui.MWTransclusionOutlineTemplateWidget( template );

	template.getSpec().setTemplateData( {
		params: {
			c: { label: 'Contains a' },
			d: { description: 'Contains a' },
			e: { aliases: [ 'Contains a' ] },
			f: { label: 'Also contains a, but is not used in the template' }
		}
	} );

	let eventsFired = 0;
	widget.connect( this, {
		filterParameters: ( visibility ) => {
			assert.deepEqual( visibility, {
				'part_0/a': true,
				'part_0/b': false,
				'part_0/c': true,
				'part_0/d': true,
				'part_0/e': true
			} );
			eventsFired++;
		}
	} );

	widget.filterParameters( ' A ' );
	assert.strictEqual( widget.infoWidget.isVisible(), false );
	assert.strictEqual( eventsFired, 1 );
} );
