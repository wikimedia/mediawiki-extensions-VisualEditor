/*
 * VisualEditor user interface MWGeneralReferenceDialog class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/* global mw */

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

	this.fragment = null;
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

ve.ui.MWGeneralReferenceDialog.prototype.initialize = function ( data ) {
	var topLabel, refButtonsFieldset, refBaseButtonsFieldset, refBasic,
		tools, i, len, item, button,
		limit = ve.init.mw.Target.static.citationToolsLimit;

	// Parent method
	ve.ui.MWGeneralReferenceDialog.super.prototype.initialize.call( this, data );

	this.panel = new OO.ui.PanelLayout( {
		classes: [ 've-ui-mwGeneralReferenceDialog-panel' ],
		padded: true,
		expanded: false
	} );

	topLabel = new OO.ui.LabelWidget( {
		label: ve.msg( 'visualeditor-dialog-generalreference-intro' )
	} );

	refButtonsFieldset = new OO.ui.FieldsetLayout( {
		classes: [ 've-ui-mwGeneralReferenceDialog-buttons-fieldset' ]
	} );
	refBaseButtonsFieldset = new OO.ui.FieldsetLayout( {
		classes: [ 've-ui-mwGeneralReferenceDialog-buttons-base-fieldset' ]
	} );

	// Basic and re-use reference buttons
	refBasic = new OO.ui.ButtonWidget( {
		icon: 'reference',
		label: ve.msg( 'visualeditor-dialogbutton-reference-full-label' ),
		classes: [ 've-ui-mwGeneralReferenceDialog-ref-buttons' ],
		framed: false
	} );
	this.refExisting = new OO.ui.ButtonWidget( {
		icon: 'reference-existing',
		label: ve.msg( 'visualeditor-dialog-reference-useexisting-full-label' ),
		classes: [ 've-ui-mwGeneralReferenceDialog-ref-buttons' ],
		framed: false
	} );
	refBaseButtonsFieldset.$element.append( refBasic.$element, this.refExisting.$element );

	// Attach cite dialog tools
	try {
		// Must use mw.message to avoid JSON being parsed as Wikitext
		tools = JSON.parse( mw.message( 'visualeditor-cite-tool-definition.json' ).plain() );
	} catch ( e ) { }

	// Go over available tools
	if ( Array.isArray( tools ) ) {
		for ( i = 0, len = Math.min( limit, tools.length ); i < len; i++ ) {
			item = tools[i];
			// Create a button
			button = new OO.ui.ButtonWidget( {
				icon: item.icon,
				label: item.title,
				classes: [ 've-ui-mwGeneralReferenceDialog-ref-buttons' ],
				framed: false
			} );
			// Attach to fieldset
			refButtonsFieldset.$element.append( button.$element );
			// Event
			button.connect( this, { click: [ 'onDialogButtonClick', 'transclusion', { template: item.template } ] } );
		}
	}

	// Events
	refBasic.connect( this, { click: [ 'onDialogButtonClick', 'reference' ] } );
	this.refExisting.connect( this, { click: [ 'onDialogButtonClick', 'reference', { useExisting: true } ] } );

	// Assemble the panel
	this.panel.$element.append(
		topLabel.$element,
		refButtonsFieldset.$element,
		refBaseButtonsFieldset.$element
	);

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
			this.fragment = data.fragment;

			// Check if the 'use existing' button should be enabled
			this.refExisting.setDisabled( !this.doReferencesExist() );
		}, this );
};

/**
 * Check if there are any references in the current page.
 * @return {boolean} There are references
 */
ve.ui.MWGeneralReferenceDialog.prototype.doReferencesExist = function () {
	var groupName,
		groups = this.fragment.getDocument().getInternalList().getNodeGroups();

	for ( groupName in groups ) {
		if ( groupName.lastIndexOf( 'mwReference/' ) === 0 && groups[groupName].indexOrder.length ) {
			return true;
		}
	}
	return false;
};

/**
 * Respond to dialog button click
 * @param {string} windowName Window name
 * @param {Object} dialogData Data object
 */
ve.ui.MWGeneralReferenceDialog.prototype.onDialogButtonClick = function ( windowName, dialogData ) {
	var dialog = this,
		fragment = this.fragment;

	// Open the new dialog
	this.close().then( function () {
		dialog.getManager().openWindow( windowName, $.extend( {
			fragment: fragment
		}, dialogData ) );
	} );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWGeneralReferenceDialog );
