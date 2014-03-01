/*
 * VisualEditor user interface MWAdvancedTransclusionDialog class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for inserting and editing MediaWiki transclusions.
 *
 * @class
 * @extends ve.ui.MWTransclusionDialog
 *
 * @constructor
 * @param {ve.ui.WindowSet} windowSet Window set this dialog is part of
 * @param {Object} [config] Configuration options
 */
ve.ui.MWAdvancedTransclusionDialog = function VeUiMWAdvancedTransclusionDialog( windowSet, config ) {
	// Parent constructor
	ve.ui.MWTransclusionDialog.call( this, windowSet, config );

	// Properties
	this.node = null;
	this.transclusion = null;
	this.loaded = false;
};

/* Inheritance */

OO.inheritClass( ve.ui.MWAdvancedTransclusionDialog, ve.ui.MWTransclusionDialog );

/* Static Properties */

ve.ui.MWAdvancedTransclusionDialog.static.name = 'transclusion';

ve.ui.MWAdvancedTransclusionDialog.static.title =
	OO.ui.deferMsg( 'visualeditor-dialog-transclusion-title' );

ve.ui.MWAdvancedTransclusionDialog.static.icon = 'template';

/* Methods */

/**
 * Handle outline controls move events.
 *
 * @param {number} places Number of places to move the selected item
 */
ve.ui.MWAdvancedTransclusionDialog.prototype.onOutlineControlsMove = function ( places ) {
	var part, promise,
		parts = this.transclusion.getParts(),
		item = this.bookletLayout.getOutline().getSelectedItem();

	if ( item ) {
		part = this.transclusion.getPartFromId( item.getData() );
		// Move part to new location, and if dialog is loaded switch to new part page
		promise = this.transclusion.addPart( part, ve.indexOf( part, parts ) + places );
		if ( this.loaded ) {
			promise.done( ve.bind( this.setPageByName, this, part.getId() ) );
		}
	}
};

/**
 * Handle outline controls remove events.
 */
ve.ui.MWAdvancedTransclusionDialog.prototype.onOutlineControlsRemove = function () {
	var id, part, param,
		item = this.bookletLayout.getOutline().getSelectedItem();

	if ( item ) {
		id = item.getData();
		part = this.transclusion.getPartFromId( id );
		// Check if the part is the actual template, or one of its parameters
		if ( part instanceof ve.dm.MWTemplateModel && id !== part.getId() ) {
			param = part.getParameterFromId( id );
			if ( param instanceof ve.dm.MWParameterModel ) {
				part.removeParameter( param );
			}
		} else if ( part instanceof ve.dm.MWTransclusionPartModel ) {
			this.transclusion.removePart( part );
		}
	}
};

/**
 * Handle add template button click events.
 */
ve.ui.MWAdvancedTransclusionDialog.prototype.onAddTemplateButtonClick = function () {
	this.addPart( new ve.dm.MWTemplatePlaceholderModel( this.transclusion ) );
};

/**
 * Handle add content button click events.
 */
ve.ui.MWAdvancedTransclusionDialog.prototype.onAddContentButtonClick = function () {
	this.addPart( new ve.dm.MWTransclusionContentModel( this.transclusion, '' ) );
};

/**
 * Handle add parameter button click events.
 */
ve.ui.MWAdvancedTransclusionDialog.prototype.onAddParameterButtonClick = function () {
	var part, param,
		item = this.bookletLayout.getOutline().getSelectedItem();

	if ( item ) {
		part = this.transclusion.getPartFromId( item.getData() );
		if ( part instanceof ve.dm.MWTemplateModel ) {
			param = new ve.dm.MWParameterModel( part, '', null );
			part.addParameter( param );
		}
	}
};

/**
 * Handle booklet layout page set events.
 *
 * @param {OO.ui.PageLayout} page Active page
 */
ve.ui.MWAdvancedTransclusionDialog.prototype.onBookletLayoutSet = function ( page ) {
	this.addParameterButton.setDisabled(
		!( page instanceof ve.ui.MWTemplatePage || page instanceof ve.ui.MWParameterPage )
	);
};

/**
 * @inheritdoc
 */
ve.ui.MWAdvancedTransclusionDialog.prototype.getBookletLayout = function () {
	return new OO.ui.BookletLayout( {
		'$': this.$,
		'continuous': true,
		'autoFocus': true,
		'outlined': true,
		'editable': true
	} );
};

/**
 * Add a part to the transclusion.
 *
 * @param {ve.dm.MWTransclusionPartModel} part Part to add
 */
ve.ui.MWAdvancedTransclusionDialog.prototype.addPart = function ( part ) {
	var index, promise,
		parts = this.transclusion.getParts(),
		item = this.bookletLayout.getOutline().getSelectedItem();

	if ( part ) {
		// Insert after selected part, or at the end if nothing is selected
		index = item ?
			ve.indexOf( this.transclusion.getPartFromId( item.getData() ), parts ) + 1 :
			parts.length;
		// Add the part, and if dialog is loaded switch to part page
		promise = this.transclusion.addPart( part, index );
		if ( this.loaded ) {
			promise.done( ve.bind( this.setPageByName, this, part.getId() ) );
		}
	}
};

/**
 * @inheritdoc
 */
ve.ui.MWAdvancedTransclusionDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.MWTransclusionDialog.prototype.initialize.call( this );

	// Properties
	this.addTemplateButton = new OO.ui.ButtonWidget( {
		'$': this.$,
		'frameless': true,
		'icon': 'template',
		'title': ve.msg( 'visualeditor-dialog-transclusion-add-template' )
	} );

	this.addContentButton = new OO.ui.ButtonWidget( {
		'$': this.$,
		'frameless': true,
		'icon': 'source',
		'title': ve.msg( 'visualeditor-dialog-transclusion-add-content' )
	} );

	this.addParameterButton = new OO.ui.ButtonWidget( {
		'$': this.$,
		'frameless': true,
		'icon': 'parameter',
		'title': ve.msg( 'visualeditor-dialog-transclusion-add-param' )
	} );

	// Events
	this.bookletLayout.connect( this, { 'set': 'onBookletLayoutSet' } );
	this.addTemplateButton.connect( this, { 'click': 'onAddTemplateButtonClick' } );
	this.addContentButton.connect( this, { 'click': 'onAddContentButtonClick' } );
	this.addParameterButton.connect( this, { 'click': 'onAddParameterButtonClick' } );
	this.bookletLayout.getOutlineControls()
		.addItems( [ this.addTemplateButton, this.addContentButton, this.addParameterButton ] )
		.connect( this, {
			'move': 'onOutlineControlsMove',
			'remove': 'onOutlineControlsRemove'
		} );
};

/* Registration */

ve.ui.dialogFactory.register( ve.ui.MWAdvancedTransclusionDialog );
