/*!
 * VisualEditor UserInterface MWFloatingHelpElement class.
 *
 * @copyright 2011-2021 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * @class
 * @extends OO.ui.Element
 *
 * @constructor
 * @param {Object} config
 * @cfg {string} label
 * @cfg {jQuery} $message
 */
ve.ui.MWFloatingHelpElement = function VeUiMWFloatingHelpElement( config ) {
	// Parent constructor
	ve.ui.MWFloatingHelpElement.super.call( this, config );

	this.helpDialog = new ve.ui.MWFloatingHelpDialog( config );
	this.helpButton = new OO.ui.ButtonWidget( {
		icon: 'feedback',
		label: config.label,
		invisibleLabel: true,
		flags: 'progressive',
		rel: 'help',
		classes: [ 've-ui-mwFloatingHelpElement-toggle' ]
	} ).connect(
		this, { click: 'onClick' }
	);

	this.windowManager = new OO.ui.WindowManager();
	this.windowManager.addWindows( [ this.helpDialog ] );

	this.$element
		.addClass( 've-ui-mwFloatingHelpElement' )
		.append(
			this.windowManager.$element,
			this.helpButton.$element
		);
};

/* Inheritance */

OO.inheritClass( ve.ui.MWFloatingHelpElement, OO.ui.Element );

/* Methods */

ve.ui.MWFloatingHelpElement.prototype.onClick = function () {
	if ( !this.helpButton.hasFlag( 'primary' ) ) {
		var window = this.windowManager.openWindow( this.helpDialog ),
			element = this;

		window.opening.then( function () {
			element.updateButton( true );
		} );
		window.closing.then( function () {
			element.updateButton( false );
		} );
	} else {
		this.windowManager.closeWindow( this.helpDialog );
	}
};

ve.ui.MWFloatingHelpElement.prototype.updateButton = function ( isOpen ) {
	this.helpButton
		.setIcon( isOpen ? 'expand' : 'feedback' )
		.setFlags( { primary: isOpen } );
};
