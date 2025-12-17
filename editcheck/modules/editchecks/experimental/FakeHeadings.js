mw.editcheck.FakeHeadingsEditCheck = function MWFakeHeadingsEditCheck() {
	// Parent constructor
	mw.editcheck.FakeHeadingsEditCheck.super.apply( this, arguments );
};

OO.inheritClass( mw.editcheck.FakeHeadingsEditCheck, mw.editcheck.BaseEditCheck );

mw.editcheck.FakeHeadingsEditCheck.static.title = 'Heading formatting';

mw.editcheck.FakeHeadingsEditCheck.static.name = 'fakeHeadings';

mw.editcheck.FakeHeadingsEditCheck.static.description = 'Real headings should be used, not bold text';

mw.editcheck.FakeHeadingsEditCheck.static.choices = [
	{
		action: 'fix',
		label: 'Fix',
		icon: 'edit'
	},
	{
		action: 'dismiss',
		label: 'Dismiss' // TODO: i18n
	}
];

mw.editcheck.FakeHeadingsEditCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.BaseEditCheck.static.defaultConfig, {
	enabled: false
} );

mw.editcheck.FakeHeadingsEditCheck.static.onlyCoveredNodes = true;

mw.editcheck.FakeHeadingsEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	// We need to cover complete new nodes, and also existing nodes that have been bolded
	const documentModel = surfaceModel.getDocument();
	// Get fully covered nodes only, and only their content ranges
	return this.getModifiedRanges( documentModel, true, true, false )
		.filter( ( range ) => !this.isDismissedRange( range ) )
		.filter( ( range ) => {
			const annotations = documentModel.data.getAnnotationsFromRange( range );
			return annotations.hasAnnotationWithName( 'textStyle/bold' );
		} )
		.map( ( range ) => new mw.editcheck.EditCheckAction( {
			check: this,
			fragments: [ surfaceModel.getFragment( new ve.dm.LinearSelection( range ) ) ]
		} ) );
};

mw.editcheck.FakeHeadingsEditCheck.prototype.act = function ( choice, action, surface ) {
	switch ( choice ) {
		case 'dismiss':
			this.dismiss( action );
			break;
		case 'fix': {
			const heading = surface.getModel().documentModel.getNearestNodeMatching(
				( nodeType ) => nodeType === 'mwHeading',
				// Note: we set a limit of 1 here because otherwise this will turn around
				// to keep looking when it hits the document boundary:
				action.fragments[ 0 ].getSelection().getCoveringRange().start - 1, -1, 1
			);
			// A bolded heading doesn't look like the level 1 or 2 headings on
			// normal mediawiki css; 3 is where it starts to look like bold text.
			const level = heading ? Math.max( heading.getAttribute( 'level' ), 3 ) : 3;
			action.fragments[ 0 ]
				.convertNodes( 'mwHeading', { level } )
				.annotateContent( 'clear', 'textStyle/bold' );
			break;
		}
	}
};

mw.editcheck.editCheckFactory.register( mw.editcheck.FakeHeadingsEditCheck );
