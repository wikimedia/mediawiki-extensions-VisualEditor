mw.editcheck.DoubleBoldEditCheck = function MWDoubleBoldEditCheck() {
	// Parent constructor
	mw.editcheck.DoubleBoldEditCheck.super.apply( this, arguments );
};

OO.inheritClass( mw.editcheck.DoubleBoldEditCheck, mw.editcheck.BaseEditCheck );

mw.editcheck.DoubleBoldEditCheck.static.title = 'Remove unnecessary bold formatting';

mw.editcheck.DoubleBoldEditCheck.static.name = 'doubleBold';

mw.editcheck.DoubleBoldEditCheck.static.description = 'Bold is applied automatically to subheadings, definition list terms and table headers. Help readers by removing unnecessary bold formatting from these elements.';

mw.editcheck.DoubleBoldEditCheck.static.choices = [
	{
		action: 'remove',
		label: 'Remove bold' // TODO: i18n
	},
	{
		action: 'dismiss',
		label: OO.ui.deferMsg( 'ooui-dialog-process-dismiss' )
	}
];

mw.editcheck.DoubleBoldEditCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.BaseEditCheck.static.defaultConfig, {
	enabled: false
} );

mw.editcheck.DoubleBoldEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	const documentModel = surfaceModel.getDocument();
	let node, heading, cell, listItem;

	const modified = this.getModifiedContentRanges( documentModel );
	return documentModel.getDocumentNode().getAnnotationRanges()
		.filter( ( annRange ) => annRange.annotation instanceof ve.dm.BoldAnnotation &&
			!this.isDismissedRange( annRange.range ) &&
			this.isRangeInValidSection( annRange.range, documentModel ) &&
			modified.some( ( modifiedRange ) => modifiedRange.containsRange( annRange.range ) ) &&
			( node = documentModel.getBranchNodeFromOffset( annRange.range.start ) ) &&
			(
				(
					( heading = node.findParent( ve.dm.MWHeadingNode ) ) &&
					heading.getAttribute( 'level' ) >= 3
				) ||
				(
					( cell = node.findParent( ve.dm.TableCellNode ) ) &&
					cell.getAttribute( 'style' ) === 'header'
				) ||
				(
					( listItem = node.findParent( ve.dm.DefinitionListItemNode ) ) &&
					listItem.getAttribute( 'style' ) === 'term'
				)
			)
		).map( ( annRange ) => new mw.editcheck.EditCheckAction( {
			fragments: [ surfaceModel.getLinearFragment( annRange.range ) ],
			check: this
		} ) );
};

mw.editcheck.DoubleBoldEditCheck.prototype.act = function ( choice, action, surface ) {
	if ( choice === 'remove' ) {
		action.fragments[ 0 ].annotateContent( 'clear', 'textStyle/bold' );
		action.select( surface, this );
		return;
	}
	// Parent method
	mw.editcheck.DoubleBoldEditCheck.super.prototype.act.apply( this, arguments );
};

mw.editcheck.editCheckFactory.register( mw.editcheck.DoubleBoldEditCheck );
