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
	this.$movers = $( '<div>' );
	this.upButton = new OO.ui.ButtonWidget( {
		framed: false,
		icon: 'upTriangle',
		title: OO.ui.msg( 'ooui-outline-control-move-up' )
	} );
	this.downButton = new OO.ui.ButtonWidget( {
		framed: false,
		icon: 'downTriangle',
		title: OO.ui.msg( 'ooui-outline-control-move-down' )
	} );
	this.removeButton = new OO.ui.ButtonWidget( {
		framed: false,
		icon: 'trash',
		title: OO.ui.msg( 'ooui-outline-control-remove' )
	} );

	// Events
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
	this.$group.addClass( 've-ui-mwTransclusionOutlineControlsWidget-items' );
	this.$movers
		.addClass( 've-ui-mwTransclusionOutlineControlsWidget-movers' )
		.append( this.upButton.$element, this.downButton.$element, this.removeButton.$element );
	this.$element.append( this.$icon, this.$group, this.$movers );
};

/* Setup */

OO.inheritClass( ve.ui.MWTransclusionOutlineControlsWidget, OO.ui.Widget );
OO.mixinClass( ve.ui.MWTransclusionOutlineControlsWidget, OO.ui.mixin.GroupElement );

/* Events */

/**
 * @event move
 * @param {number} places Number of places to move
 */

/**
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
