mw.editcheck.RequiredTemplateParamsEditCheck = function MWRequiredTemplateParamsEditCheck() {
	// Parent constructor
	mw.editcheck.RequiredTemplateParamsEditCheck.super.apply( this, arguments );
};

OO.inheritClass( mw.editcheck.RequiredTemplateParamsEditCheck, mw.editcheck.BaseEditCheck );

mw.editcheck.RequiredTemplateParamsEditCheck.static.title = 'Template has missing parameters';

mw.editcheck.RequiredTemplateParamsEditCheck.static.name = 'requireTemplateParams';

mw.editcheck.RequiredTemplateParamsEditCheck.static.description = 'The template is missing some required parameters.';

// HACK: Use plain string above so Special:EditChecks can parse.
const description = mw.editcheck.RequiredTemplateParamsEditCheck.static.description;
mw.editcheck.RequiredTemplateParamsEditCheck.static.description = () => $( $.parseHTML( description ) );

mw.editcheck.RequiredTemplateParamsEditCheck.static.choices = [
	{
		action: 'edit',
		label: 'Edit'
	},
	{
		action: 'dismiss',
		label: OO.ui.deferMsg( 'ooui-dialog-process-dismiss' )
	}
];

mw.editcheck.RequiredTemplateParamsEditCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.BaseEditCheck.static.defaultConfig, {
	enabled: false
} );

mw.editcheck.RequiredTemplateParamsEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	const doc = surfaceModel.getDocument();
	const modified = this.getModifiedRanges( doc );

	return doc.getNodesByType( ve.dm.MWTransclusionNode, true ).map( ( node ) => {
		const range = node.getOuterRange();
		if ( !this.isDismissedRange( range ) && modified.some( ( modifiedRange ) => modifiedRange.touchesRange( range ) ) ) {
			// Check every template that makes up the transclusion for a missing require param
			const missingParams = node.getPartsList().map( ( part ) => {
				const title = part.templatePage ? mw.Title.newFromText( part.templatePage ) : null;
				if ( !title ) {
					return ve.createDeferred().resolve( false ).promise();
				}
				return ve.init.platform.templateDataCache.get( title.getPrefixedText() ).then(
					// Check if any of the params in the template spec are required
					// and missing from the transclusion.
					// spec.params can be unset for missing templates
					( spec ) => !!spec.params && Object.entries( spec.params ).some(
						( [ name, value ] ) => value.required && !(
							part.params && part.params[ name ] && part.params[ name ].wt.trim()
						)
					)
				);
			} );
			// If any of the templates are missing required params, flag the transclusion
			return Promise.all( missingParams ).then( ( hasMissingParams ) => {
				if ( hasMissingParams.some( Boolean ) ) {
					return new mw.editcheck.EditCheckAction( {
						fragments: [ surfaceModel.getLinearFragment( range ) ],
						check: this
					} );
				}
				return null;
			} );
		}
		return null;
	} );
};

mw.editcheck.RequiredTemplateParamsEditCheck.prototype.act = function ( choice, action, surface ) {
	if ( choice === 'edit' ) {
		action.fragments[ 0 ].select();
		surface.executeCommand( 'transclusion' );
		return;
	}
	// Parent method
	return mw.editcheck.RequiredTemplateParamsEditCheck.super.prototype.act.apply( this, arguments );
};

mw.editcheck.editCheckFactory.register( mw.editcheck.RequiredTemplateParamsEditCheck );
