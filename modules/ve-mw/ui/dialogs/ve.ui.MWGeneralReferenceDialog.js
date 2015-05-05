/*
 * VisualEditor user interface MWGeneralReferenceDialog class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for inserting and editing MediaWiki references by type.
 *
 * @class
 * @abstract
 * @extends ve.ui.NodeDialog
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWGeneralReferenceDialog = function VeUiMWGeneralReferenceDialog( config ) {
	// Parent constructor
	ve.ui.MWGeneralReferenceDialog.super.call( this, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWGeneralReferenceDialog, ve.ui.NodeDialog );

/* Static Properties */

ve.ui.MWGeneralReferenceDialog.static.name = 'generalreference';

ve.ui.MWGeneralReferenceDialog.static.title =
	OO.ui.deferMsg( 'visualeditor-dialog-generalreference-title' );

ve.ui.MWGeneralReferenceDialog.static.icon = 'reference';

ve.ui.MWGeneralReferenceDialog.static.actions = [
	{
		label: OO.ui.deferMsg( 'visualeditor-dialog-action-cancel' ),
		flags: 'safe'
	}
];

/**
 * @inheritdoc
 */
ve.ui.MWGeneralReferenceDialog.prototype.getBodyHeight = function () {
	return 400;
};

/**
 * @inheritdoc
 */
ve.ui.MWGeneralReferenceDialog.prototype.initialize = function () {
	var sourceField;

	// Parent method
	ve.ui.MWGeneralReferenceDialog.super.prototype.initialize.apply( this, arguments );

	this.panel = new OO.ui.PanelLayout( {
		classes: [ 've-ui-mwGeneralReferenceDialog-panel' ],
		padded: true,
		expanded: false
	} );

	this.sourceSelect = new ve.ui.MWReferenceSourceSelectWidget( {
		classes: [ 've-ui-mwGeneralReferenceDialog-select' ],
		showExisting: true
	} );
	$( '<div>' ).addClass( 've-ui-mwGeneralReferenceDialog-spacer' ).insertBefore(
		this.sourceSelect.getRefBasic().$element
	);
	sourceField = new OO.ui.FieldLayout( this.sourceSelect, {
		align: 'top',
		label: ve.msg( 'visualeditor-dialog-generalreference-intro' )
	} );

	// Events
	this.sourceSelect.connect( this, { choose: 'onSourceSelectChoose' } );

	// Assemble the panel
	this.panel.$element.append( sourceField.$element );

	this.$body
		.addClass( 've-ui-mwGeneralReferenceDialog' )
		.append( this.panel.$element );
};

/**
 * @inheritdoc
 */
ve.ui.MWGeneralReferenceDialog.prototype.getSetupProcess = function ( data ) {
	return ve.ui.MWGeneralReferenceDialog.super.prototype.getSetupProcess.call( this, data )
		.next( function () {
			if ( this.manager.surface.getInDialog() === 'reference' ) {
				// Hide basic reference if we are already in the basic reference menu
				this.sourceSelect.getRefBasic().setDisabled( true );
				this.sourceSelect.getRefExisting().setDisabled( true );
			} else {
				// Check if the 'use existing' button should be enabled
				this.sourceSelect.getRefExisting().setDisabled( !this.doReferencesExist() );
			}
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWGeneralReferenceDialog.prototype.getTeardownProcess = function ( data ) {
	return ve.ui.MWGeneralReferenceDialog.super.prototype.getTeardownProcess.call( this, data )
		.next( function () {
			// Clear selection
			this.sourceSelect.selectItem();
		}, this );
};

/**
 * Check if there are any references in the current page.
 *
 * @return {boolean} There are references
 */
ve.ui.MWGeneralReferenceDialog.prototype.doReferencesExist = function () {
	var groupName,
		groups = this.getFragment().getDocument().getInternalList().getNodeGroups();

	for ( groupName in groups ) {
		if ( groupName.lastIndexOf( 'mwReference/' ) === 0 && groups[groupName].indexOrder.length ) {
			return true;
		}
	}
	return false;
};

/**
 * Handle source select widget choose events
 *
 * @param {OO.ui.OptionWidget} item Chosen item
 */
ve.ui.MWGeneralReferenceDialog.prototype.onSourceSelectChoose = function ( item ) {
	var data = item.getData(),
		// Closing the dialog may unset some properties, so cache the ones we want
		fragment = this.getFragment(),
		manager = this.getManager();

	// Close this dialog then open the new dialog
	this.close().then( function () {
		manager.getSurface().execute( 'mwcite', 'open', data.windowName, $.extend( {
			fragment: fragment
		}, data.dialogData ) );
	} );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWGeneralReferenceDialog );
