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
	var sourceField, refBasic,
		tools, i, len, item,
		items = [],
		limit = ve.init.mw.Target.static.citationToolsLimit;

	// Parent method
	ve.ui.MWGeneralReferenceDialog.super.prototype.initialize.apply( this, arguments );

	this.panel = new OO.ui.PanelLayout( {
		classes: [ 've-ui-mwGeneralReferenceDialog-panel' ],
		padded: true,
		expanded: false
	} );

	// Attach cite dialog tools
	try {
		// Must use mw.message to avoid JSON being parsed as Wikitext
		tools = JSON.parse( mw.message( 'visualeditor-cite-tool-definition.json' ).plain() );
	} catch ( e ) { }

	// Go over available tools
	if ( Array.isArray( tools ) ) {
		for ( i = 0, len = Math.min( limit, tools.length ); i < len; i++ ) {
			item = tools[i];
			items.push( new OO.ui.DecoratedOptionWidget( {
				icon: item.icon,
				label: item.title,
				data: {
					windowName: 'cite-' + item.name,
					dialogData: { template: item.template }
				}
			} ) );
		}
	}
	// Basic tools
	refBasic = new OO.ui.DecoratedOptionWidget( {
		icon: 'reference',
		label: ve.msg( 'visualeditor-dialogbutton-reference-full-label' ),
		data: { windowName: 'reference' }
	} );
	this.refExisting = new OO.ui.DecoratedOptionWidget( {
		icon: 'reference-existing',
		label: ve.msg( 'visualeditor-dialog-reference-useexisting-full-label' ),
		data: {
			windowName: 'reference',
			dialogData: { useExisting: true }
		}
	} );

	this.sourceSelect = new OO.ui.SelectWidget( {
		classes: [ 've-ui-mwGeneralReferenceDialog-select' ],
		items: items
	} );
	sourceField = new OO.ui.FieldLayout( this.sourceSelect, {
		classes: [ 've-ui-mwGeneralReferenceDialog-source-field' ],
		align: 'top',
		label: ve.msg( 'visualeditor-dialog-generalreference-intro' )
	} );

	this.basicSelect = new OO.ui.SelectWidget( {
		classes: [ 've-ui-mwGeneralReferenceDialog-select' ],
		items: [ refBasic, this.refExisting ]
	} );

	// Events
	this.sourceSelect.connect( this, { choose: 'onSelectChoose' } );
	this.basicSelect.connect( this, { choose: 'onSelectChoose' } );

	// Assemble the panel
	this.panel.$element.append(
		sourceField.$element,
		this.basicSelect.$element
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
			// Check if the 'use existing' button should be enabled
			this.refExisting.setDisabled( !this.doReferencesExist() );
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWGeneralReferenceDialog.prototype.getTeardownProcess = function ( data ) {
	return ve.ui.MWGeneralReferenceDialog.super.prototype.getTeardownProcess.call( this, data )
		.next( function () {
			// Clear selections
			this.sourceSelect.selectItem();
			this.basicSelect.selectItem();
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
 * Handle select widget choose events
 *
 * @param {OO.ui.OptionWidget} item Chosen item
 */
ve.ui.MWGeneralReferenceDialog.prototype.onSelectChoose = function ( item ) {
	var data = item.getData(),
		// Closing the dialog may unset some properties, so cache the ones we want
		fragment = this.getFragment(),
		manager = this.getManager();

	// Close this dialog then open the new dialog
	this.close().then( function () {
		manager.getSurface().execute( 'window', 'open', data.windowName, $.extend( {
			fragment: fragment
		}, data.dialogData ) );
	} );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWGeneralReferenceDialog );
