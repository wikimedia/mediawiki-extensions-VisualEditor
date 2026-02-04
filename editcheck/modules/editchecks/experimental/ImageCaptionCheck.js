mw.editcheck.ImageCaptionEditCheck = function () {
	// Parent constructor
	mw.editcheck.ImageCaptionEditCheck.super.apply( this, arguments );
};

OO.inheritClass( mw.editcheck.ImageCaptionEditCheck, mw.editcheck.BaseEditCheck );

mw.editcheck.ImageCaptionEditCheck.static.name = 'imageCaption';

mw.editcheck.ImageCaptionEditCheck.static.title = 'Add image caption';

mw.editcheck.ImageCaptionEditCheck.static.description = 'This image does not have a caption. Help readers understand why the image is relevant by adding a <a href="//en.wikipedia.org/wiki/WP:CAP">short caption</a>.';

// HACK: Use plain string above so Special:EditChecks can parse.
const description = mw.editcheck.ImageCaptionEditCheck.static.description;
mw.editcheck.ImageCaptionEditCheck.static.description = () => $( $.parseHTML( description ) );

mw.editcheck.ImageCaptionEditCheck.static.choices = [
	{
		action: 'edit',
		label: 'Add caption'
	},
	{
		action: 'dismiss',
		label: 'Dismiss'
	}
];

mw.editcheck.ImageCaptionEditCheck.prototype.onBeforeSave = function ( surfaceModel ) {
	return this.getAddedNodes( surfaceModel.getDocument(), 'mwBlockImage' )
		.filter( ( image ) => !this.isDismissedRange( image.getOuterRange() ) )
		.filter( ( image ) => image.children[ 0 ] && image.children[ 0 ].getType() === 'mwImageCaption' && image.children[ 0 ].length === 2 )
		.map( ( image ) => new mw.editcheck.EditCheckAction( {
			check: this,
			fragments: [ surfaceModel.getFragment( new ve.dm.LinearSelection( image.getOuterRange() ) ) ]
		} ) );
};

mw.editcheck.ImageCaptionEditCheck.prototype.onBranchNodeChange = mw.editcheck.ImageCaptionEditCheck.prototype.onBeforeSave;

mw.editcheck.ImageCaptionEditCheck.prototype.act = function ( choice, action, surface ) {
	if ( choice === 'edit' ) {
		const windowAction = ve.ui.actionFactory.create( 'window', surface, 'check' );
		action.fragments[ 0 ].select();
		return windowAction.open( 'media' ).then( ( instance ) => instance.closing );
	}
	// Parent method
	return mw.editcheck.ImageCaptionEditCheck.super.prototype.act.apply( this, arguments );
};

mw.editcheck.editCheckFactory.register( mw.editcheck.ImageCaptionEditCheck );
