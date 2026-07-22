/**
 * Edit check to detect citation needed templates
 *
 * @class
 * @extends mw.editcheck.BaseEditCheck
 *
 * @constructor
 * @param {mw.editcheck.Controller} controller
 * @param {Object} [config]
 * @param {boolean} [includeSuggestions=false]
 */
mw.editcheck.CitationNeededEditCheck = function MWCitationNeededEditCheck() {
	// Parent constructor
	mw.editcheck.CitationNeededEditCheck.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( mw.editcheck.CitationNeededEditCheck, mw.editcheck.BaseEditCheck );

/* Static properties */

mw.editcheck.CitationNeededEditCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.BaseEditCheck.static.defaultConfig, {
	// We just never show this as a check, as a just-inserted citation-needed template
	// means the user deliberately chose to insert that rather than a citation.
	showAsCheck: false
} );

mw.editcheck.CitationNeededEditCheck.static.title = OO.ui.deferMsg( 'editcheck-dialog-addref-title' );

mw.editcheck.CitationNeededEditCheck.static.description = ve.deferJQueryMsg( 'editcheck-dialog-addref-description' );

mw.editcheck.CitationNeededEditCheck.static.success = OO.ui.deferMsg( 'editcheck-dialog-addref-success-notify' );

mw.editcheck.CitationNeededEditCheck.static.footer = OO.ui.deferMsg( 'editcheck-citationneeded-footer' );

mw.editcheck.CitationNeededEditCheck.static.footerIcon = 'userAvatar';

mw.editcheck.CitationNeededEditCheck.static.name = 'citationNeeded';

mw.editcheck.CitationNeededEditCheck.static.choices = [
	{
		action: 'add',
		label: OO.ui.deferMsg( 'editcheck-action-add-citation' )
	},
	{
		action: 'dismiss',
		label: OO.ui.deferMsg( 'ooui-dialog-process-dismiss' )
	}
];

/* Methods */

mw.editcheck.CitationNeededEditCheck.prototype.getCitationNeededRanges = function ( documentModel ) {
	if ( !ve.ui.MWCitationNeededContextItem ) {
		return [];
	}

	return this.getAddedNodes( documentModel, 'mwTransclusionInline' )
		.filter(
			// MWCitationNeededContextItem.isCompatibleWith returns false when this check is available,
			// so check getMatchedTool directly instead.
			( node ) => ve.ui.MWCitationNeededContextItem.static.getMatchedTool( node )
		)
		.map( ( node ) => node.getOuterRange() );
};

mw.editcheck.CitationNeededEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	const documentModel = surfaceModel.getDocument();
	return this.getCitationNeededRanges( documentModel ).map( ( range ) => {
		if ( this.isDismissedRange( range ) ) {
			return null;
		}

		return new mw.editcheck.EditCheckAction( {
			fragments: [ surfaceModel.getLinearFragment( range ) ],
			check: this
		} );
	} );
};

/**
 * @inheritdoc
 */
mw.editcheck.CitationNeededEditCheck.prototype.getDescription = function ( action ) {
	const node = action.fragments[ 0 ].getSelectedNode();

	if ( !node ) {
		return this.constructor.static.description;
	}

	return ve.ui.MWCitationNeededContextItem.static.getDescription( node );
};

mw.editcheck.CitationNeededEditCheck.prototype.act = function ( choice, action, surface ) {
	if ( choice === 'add' ) {
		action.fragments[ 0 ].select();
		const node = action.fragments[ 0 ].getSelectedNode();
		const context = new ve.ui.MWCitationNeededContextItem( surface.getContext(), node );
		context.onAddClick();
		return;
	}

	// Parent method
	return mw.editcheck.CitationNeededEditCheck.super.prototype.act.apply( this, arguments );
};

/* Registration */

mw.editcheck.editCheckFactory.register( mw.editcheck.CitationNeededEditCheck );
