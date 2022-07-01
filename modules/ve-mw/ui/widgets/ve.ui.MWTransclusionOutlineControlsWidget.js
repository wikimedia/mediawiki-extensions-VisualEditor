/**
 * @class
 * @extends OO.ui.Widget
 * @mixins OO.ui.mixin.GroupElement
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWTransclusionOutlineControlsWidget = function OoUiOutlineControlsWidget( config ) {
	// Configuration initialization
	config = config || {};

	// Parent constructor
	ve.ui.MWTransclusionOutlineControlsWidget.super.call( this, config );

	// Mixin constructors
	OO.ui.mixin.GroupElement.call( this, config );

	// Properties
	this.addTemplateButton = new OO.ui.ButtonWidget( {
		framed: false,
		icon: 'puzzle',
		title: ve.msg( 'visualeditor-dialog-transclusion-add-template' )
	} );
	this.addWikitextButton = new OO.ui.ButtonWidget( {
		framed: false,
		icon: 'wikiText',
		title: ve.msg( 'visualeditor-dialog-transclusion-add-wikitext' )
	} );
	this.upButton = new OO.ui.ButtonWidget( {
		framed: false,
		icon: 'upTriangle',
		title: OO.ui.msg( 'ooui-outline-control-move-up' ),
		disabled: true
	} );
	this.downButton = new OO.ui.ButtonWidget( {
		framed: false,
		icon: 'downTriangle',
		title: OO.ui.msg( 'ooui-outline-control-move-down' ),
		disabled: true
	} );
	this.removeButton = new OO.ui.ButtonWidget( {
		framed: false,
		icon: 'trash',
		title: OO.ui.msg( 'ooui-outline-control-remove' ),
		disabled: true
	} );

	// Events
	this.addTemplateButton.connect( this, {
		click: [ 'emit', 'addTemplate' ]
	} );
	this.addWikitextButton.connect( this, {
		click: [ 'emit', 'addWikitext' ]
	} );
	this.upButton.connect( this, {
		click: [ 'emit', 'move', -1 ]
	} );
	this.downButton.connect( this, {
		click: [ 'emit', 'move', 1 ]
	} );
	this.removeButton.connect( this, {
		click: [ 'emit', 'remove' ]
	} );

	// Initialization
	this.$element.addClass( 've-ui-mwTransclusionOutlineControlsWidget' );
	this.$group.addClass( 've-ui-mwTransclusionOutlineControlsWidget-items' )
		.append(
			this.addTemplateButton.$element,
			this.addWikitextButton.$element
		);
	var $movers = $( '<div>' )
		.addClass( 've-ui-mwTransclusionOutlineControlsWidget-movers' )
		.append(
			this.upButton.$element,
			this.downButton.$element,
			this.removeButton.$element
		);
	this.$element.append( this.$icon, this.$group, $movers );
};

/* Setup */

OO.inheritClass( ve.ui.MWTransclusionOutlineControlsWidget, OO.ui.Widget );
OO.mixinClass( ve.ui.MWTransclusionOutlineControlsWidget, OO.ui.mixin.GroupElement );

/* Events */

/**
 * Emitted when the "Add template" button in the toolbar is clicked
 *
 * @event addTemplate
 */

/**
 * Emitted when the "Add wikitext" button in the toolbar is clicked
 *
 * @event addWikitext
 */

/**
 * Emitted when one of the two "Move item up/down" buttons in the toolbar is clicked
 *
 * @event move
 * @param {number} places Number of places to move, typically -1 or 1
 */

/**
 * Emitted when the "Remove item" button in the toolbar is clicked
 *
 * @event remove
 */

/* Methods */

/**
 * Change buttons
 *
 * @param {Object} states List of abilities with canMoveUp, canMoveDown and canBeDeleted
 * @param {boolean} states.canMoveUp Allow moving item up
 * @param {boolean} states.canMoveDown Allow moving item down
 * @param {boolean} states.canBeDeleted Allow removing removable item
 */
ve.ui.MWTransclusionOutlineControlsWidget.prototype.setButtonsEnabled = function ( states ) {
	this.upButton.setDisabled( !states.canMoveUp );
	this.downButton.setDisabled( !states.canMoveDown );
	this.removeButton.setDisabled( !states.canBeDeleted );
};
