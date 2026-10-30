/**
 * VisualEditor UserInterface EditCheckDiscoverabilityDialog class.
 *
 * @copyright See AUTHORS.txt
 */

/**
 * Dialog that shows the first time a suggestion appears in a session,
 * as a welcome to suggestion mode. It will only ever be shown to a user once.
 *
 * @class
 * @extends OO.ui.ProcessDialog
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.EditCheckDiscoverabilityDialog = function VeUiEditCheckDiscoverabilityDialog( config ) {
	// Parent constructor
	ve.ui.EditCheckDiscoverabilityDialog.super.call( this, config );

	this.$frame.addClass( 've-ui-editCheckDiscoverabilityDialog' );
};

/* Inheritance */

OO.inheritClass( ve.ui.EditCheckDiscoverabilityDialog, OO.ui.ProcessDialog );

/* Static properties */

ve.ui.EditCheckDiscoverabilityDialog.static.name = 'editCheckDiscoverability';

ve.ui.EditCheckDiscoverabilityDialog.static.size = 'small';

ve.ui.EditCheckDiscoverabilityDialog.static.title = OO.ui.deferMsg( 'editcheck-dialog-discoverability-title' );

ve.ui.EditCheckDiscoverabilityDialog.static.message = OO.ui.deferMsg( 'editcheck-dialog-discoverability-message' );

ve.ui.EditCheckDiscoverabilityDialog.static.actions = [
	{
		flags: [ 'safe', 'close' ]
	},
	{
		action: 'nothanks',
		label: OO.ui.deferMsg( 'editcheck-dialog-action-nothanks' ),
		flags: 'safe'
	},
	{
		action: 'view',
		label: OO.ui.deferMsg( 'editcheck-dialog-scroll-into-view' ),
		flags: 'progressive'
	}
];

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.EditCheckDiscoverabilityDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.EditCheckDiscoverabilityDialog.super.prototype.initialize.call( this );

	const content = new OO.ui.PanelLayout( { padded: true, expanded: false } );
	content.$element.append( $( '<p>' ).text( OO.ui.resolveMsg( this.constructor.static.message ) ) );
	const welcomeImage = mw.config.get( 'wgVisualEditorConfig' ).discoverabilityWelcomeImage;
	if ( welcomeImage ) {
		content.$element.append(
			$( '<div>' )
				.addClass( 've-ui-editCheckDiscoverabilityDialog-gif' )
				.css( 'background-image', 'url("' + welcomeImage + '")' )
		);
	}
	this.$body.append( content.$element );
};

/**
 * @inheritdoc
 */
ve.ui.EditCheckDiscoverabilityDialog.prototype.getSizeProperties = function () {
	const sizeProps = ve.ui.EditCheckDiscoverabilityDialog.super.prototype.getSizeProperties.call( this );
	if ( !OO.ui.isMobile() ) {
		return ve.extendObject( {}, sizeProps, { width: '400px' } );
	}
	return sizeProps;
};

/**
 * @inheritdoc
 *
 * Override the default implementation which balances padding around the title to avoid the
 * header icons, assuming a single-line, non-wrapping title. We want this dialog to let the
 * title wrap onto a second line and then center it with fixed CSS padding.
 */
ve.ui.EditCheckDiscoverabilityDialog.prototype.fitLabel = function () {
	// Since wrapping is allowed here, the body needs to know how tall the head actually renders
	this.$body.css( 'top', this.$head.outerHeight( true ) );
};

/**
 * @inheritdoc
 */
ve.ui.EditCheckDiscoverabilityDialog.prototype.getSetupProcess = function ( data ) {
	return ve.ui.EditCheckDiscoverabilityDialog.super.prototype.getSetupProcess.call( this, data )
		.next( () => {
			mw.editcheck.showDiscoverabilityWelcome = false;
			if ( !mw.user.isAnon() ) {
				new mw.Api().saveOption( 'visualeditor-editcheck-showdiscoverabilitywelcome', '0' );
				mw.user.options.set( 'visualeditor-editcheck-showdiscoverabilitywelcome', '0' );
			}
		} );
};

/**
 * @inheritdoc
 */
ve.ui.EditCheckDiscoverabilityDialog.prototype.getActionProcess = function ( action ) {
	return ve.ui.EditCheckDiscoverabilityDialog.super.prototype.getActionProcess.call( this, action )
		.first( () => {
			if ( action === 'nothanks' ) {
				mw.editcheck.discoverabilityOptOut = true;
			}
		} )
		.next( () => {
			if ( action ) {
				this.close( { action } );
			}
		} );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.EditCheckDiscoverabilityDialog );
