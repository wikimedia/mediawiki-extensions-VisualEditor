/**
 * Edit check to detect bold text used as headings
 *
 * @class
 * @extends mw.editcheck.BaseEditCheck
 *
 * @constructor
 * @param {mw.editcheck.Controller} controller
 * @param {Object} [config]
 * @param {boolean} [includeSuggestions=false]
 */
mw.editcheck.FakeHeadingEditCheck = function MWFakeHeadingEditCheck() {
	// Parent constructor
	mw.editcheck.FakeHeadingEditCheck.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( mw.editcheck.FakeHeadingEditCheck, mw.editcheck.BaseEditCheck );

/* Static properties */

mw.editcheck.FakeHeadingEditCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.FakeHeadingEditCheck.super.static.defaultConfig, {
	showAsCheck: false,
	showAsSuggestion: false
} );

mw.editcheck.FakeHeadingEditCheck.static.title = 'Use real headings';

mw.editcheck.FakeHeadingEditCheck.static.name = 'fakeHeading';

mw.editcheck.FakeHeadingEditCheck.static.description = 'Real headings should be used, not bold text.';

mw.editcheck.FakeHeadingEditCheck.static.choices = [
	{
		action: 'fix',
		label: 'Adjust heading'
	},
	{
		action: 'dismiss',
		label: OO.ui.deferMsg( 'ooui-dialog-process-dismiss' )
	}
];

mw.editcheck.FakeHeadingEditCheck.static.onlyCoveredNodes = true;

/* Methods */

mw.editcheck.FakeHeadingEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	// We need to cover complete new nodes, and also existing nodes that have been bolded
	const documentModel = surfaceModel.getDocument();
	// Get fully covered nodes only, and only their content ranges
	return this.getModifiedRanges( documentModel, true, true, false )
		.filter( ( range ) => {
			if ( this.isDismissedRange( range ) ) {
				return false;
			}
			const annotations = documentModel.data.getAnnotationsFromRange( range );
			if ( !( annotations.hasAnnotationWithName( 'textStyle/bold' ) ) ) {
				return false;
			}
			// Check we're in a root paragraph
			const node = documentModel.getBranchNodeFromOffset( range.start );
			return node && node.getType() === 'paragraph' && node.getParent() === documentModel.attachedRoot;
		} )
		.map( ( range ) => new mw.editcheck.EditCheckAction( {
			check: this,
			fragments: [ surfaceModel.getFragment( new ve.dm.LinearSelection( range ) ) ]
		} ) );
};

mw.editcheck.FakeHeadingEditCheck.prototype.act = function ( choice, action, surface ) {
	if ( choice === 'fix' ) {
		action.fragments.forEach( ( fragment ) => {
			const heading = surface.getModel().documentModel.getNearestNodeMatching(
				'mwHeading',
				// Note: we set a limit of 1 here because otherwise this will turn around
				// to keep looking when it hits the document boundary:
				fragment.getSelection().getCoveringRange().start - 1, -1, 1
			);
			// A bolded heading doesn't look like the level 1 or 2 headings on
			// normal mediawiki css; 3 is where it starts to look like bold text.
			const level = heading ? Math.max( heading.getAttribute( 'level' ), 3 ) : 3;
			fragment
				.annotateContent( 'clear', 'textStyle/bold' )
				.convertNodes( 'mwHeading', { level } );
		} );
		action.select( surface, true );
		return;
	}
	// Parent method
	return mw.editcheck.FakeHeadingEditCheck.super.prototype.act.apply( this, arguments );
};

/* Registration */

mw.editcheck.editCheckFactory.register( mw.editcheck.FakeHeadingEditCheck );
