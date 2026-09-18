QUnit.module( 've.ui.MWTemplatePlaceholderPage', ve.test.utils.newMwEnvironment() );

QUnit.test( 'onAddTemplate', ( assert ) => {
	const transclusion = new ve.dm.MWTransclusionModel(),
		placeholder = new ve.dm.MWTemplatePlaceholderModel( transclusion ),
		onAddTemplate = ve.ui.MWTemplatePlaceholderPage.prototype.onAddTemplate;

	let added = null;
	// Stub, because the real method starts an API request
	transclusion.replacePart = ( part, newPart ) => {
		added = newPart;
		return ve.createDeferred().resolve().promise();
	};
	transclusion.addPromptedParameters = () => {};

	const page = {
		placeholder,
		usingTemplateDiscovery: true
	};

	onAddTemplate.call( page, { title: 'Template:Sakujo', substPrefix: 'subst:' } );
	assert.strictEqual( added.getTarget().wt, 'subst:Sakujo', 'magic word is in the wikitext' );
	assert.strictEqual( added.getTemplateDataQueryTitle(), 'Template:Sakujo',
		'TemplateData of the template is still found' );

	onAddTemplate.call( page, { title: 'Template:Sakujo' } );
	assert.strictEqual( added.getTarget().wt, 'Sakujo', 'nothing is added to a plain name' );

	added = null;
	onAddTemplate.call( page, { title: '<invalid>' } );
	assert.strictEqual( added, null, 'an invalid title is not added' );

	// A title is at most 255 bytes long
	const longName = 'a'.repeat( 250 );
	onAddTemplate.call( page, { title: 'Template:' + longName, substPrefix: 'subst:' } );
	assert.strictEqual( added, null, 'a magic word must not make the title too long' );
} );
