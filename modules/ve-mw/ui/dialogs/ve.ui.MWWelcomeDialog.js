/*!
 * VisualEditor user interface MWWelcomeDialog class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for welcoming new users to VisualEditor.
 *
 * @class
 * @extends OO.ui.MessageDialog
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWWelcomeDialog = function VeUiMWWelcomeDialog( config ) {
	// Parent constructor
	ve.ui.MWWelcomeDialog.super.call( this, config );

	this.$element
		.addClass( 've-init-mw-desktopArticleTarget-windowManager' )
		.addClass( 've-init-mw-desktopArticleTarget-windowManager-welcome' );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWWelcomeDialog, OO.ui.MessageDialog );

/* Static Properties */

ve.ui.MWWelcomeDialog.static.name = 'welcome';

ve.ui.MWWelcomeDialog.static.size = 'medium';

ve.ui.MWWelcomeDialog.static.verbose = true;

ve.ui.MWWelcomeDialog.static.actions = [
	{
		action: 'switch',
		label: OO.ui.deferMsg( 'visualeditor-welcomedialog-switch' )
	},
	{
		action: 'accept',
		label: OO.ui.deferMsg( 'visualeditor-welcomedialog-action' ),
		flags: [ 'progressive', 'primary' ]
	}
];

/**
 * @inheritdoc
 */
ve.ui.MWWelcomeDialog.prototype.getSetupProcess = function ( data ) {
	// Provide default title and message
	data = $.extend( {
		title: ve.msg( 'visualeditor-welcomedialog-title', mw.user, mw.config.get( 'wgSiteName' ) ),
		message: $( '<div>' ).addClass( 'visualeditor-welcomedialog-content' )
			.append(
				$( '<span>' )
					.addClass( 'visualeditor-welcomedialog-content-text' )
					.html(
						ve.msg( 'visualeditor-welcomedialog-content' ) +
						'<br />' +
						ve.msg( 'visualeditor-welcomedialog-content-thanks' )
					)
			)
	}, data );

	if ( data.targetName === 'mobile' ) {
		this.mobile = true;
	}

	return ve.ui.MWWelcomeDialog.super.prototype.getSetupProcess.call( this, data );
};

/**
 * @inheritdoc
 */
ve.ui.MWWelcomeDialog.prototype.getReadyProcess = function () {
	if ( this.mobile ) {
		this.actions.remove( this.actions.get( { actions: 'switch' } ) ); // ew
	}

	return ve.ui.MWWelcomeDialog.super.prototype.getReadyProcess.apply( this, arguments );
};

/**
 * @inheritdoc
 */
ve.ui.MWWelcomeDialog.prototype.getActionProcess = function ( action ) {
	if ( action === 'switch' ) {
		return new OO.ui.Process( function () {
			this.close( { action: 'switch' } );
		}, this );
	}

	// Parent method
	return ve.ui.MWWelcomeDialog.super.prototype.getActionProcess.call( this, action );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWWelcomeDialog );
