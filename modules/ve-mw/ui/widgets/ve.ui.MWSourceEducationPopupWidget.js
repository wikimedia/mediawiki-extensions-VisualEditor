/*!
 * VisualEditor user interface MediaWiki SourceEducationPopup class.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * @class
 *
 * @constructor
 * @extends ve.ui.MWEducationPopupWidget
 * @param {jQuery} $target Element to attach to
 * @param {Object} config Configuration options
 * @param {Function} [config.onTrySource]
 */
ve.ui.MWSourceEducationPopupWidget = function VeUiMwSourceEducationPopup( $target, config ) {
	config = Object.assign( {
		popupTitle: ve.msg( 'visualeditor-sourceswitch-popup-title' ),
		popupText: mw.message( 'visualeditor-sourceswitch-popup-text' ).parseDom(),
		popupImage: 'sourceEducation',
		trackingName: 'sourceSwitch',
		closeButtonFlags: [],
		closeButtonLabel: ve.msg( 'visualeditor-sourceswitch-popup-dismiss' )
	}, config );

	ve.ui.MWSourceEducationPopupWidget.super.call( this, $target, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWSourceEducationPopupWidget, ve.ui.MWEducationPopupWidget );

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWSourceEducationPopupWidget.prototype.initialize = function ( $target, config ) {
	// Parent method
	ve.ui.MWSourceEducationPopupWidget.super.prototype.initialize.call( this, $target, config );

	// Additional properties
	this.onTrySource = config.onTrySource;
	this.trySourceButton = new OO.ui.ButtonWidget( {
		label: ve.msg( 'visualeditor-sourceswitch-popup-trysource' )
	} );

	// Events
	this.trySourceButton.connect( this, { click: 'onTrySourceButtonClick' } );

	// DOM modifications
	this.$element.addClass( 've-ui-sourceEducationPopup' );
	this.$buttons.append( this.trySourceButton.$element );
};

/**
 * @inheritdoc
 */
ve.ui.MWSourceEducationPopupWidget.prototype.shouldShow = function () {
	return mw.libs.ve.shouldShowSourceEducationPopup();
};

/**
 * @inheritdoc
 */
ve.ui.MWSourceEducationPopupWidget.prototype.stopShowing = function () {
	return mw.libs.ve.stopShowingSourceEducationPopup();
};

/**
 * @inheritdoc
 */
ve.ui.MWSourceEducationPopupWidget.prototype.getButtonToFocus = function () {
	return this.trySourceButton;
};

/**
 * @inheritdoc
 */
ve.ui.MWSourceEducationPopupWidget.prototype.addHandler = function () {
	this.$target[ 0 ].addEventListener( 'mousedown', this.onTargetMouseDownHandler, true );
};

/**
 * @inheritdoc
 */
ve.ui.MWSourceEducationPopupWidget.prototype.removeHandler = function () {
	this.$target[ 0 ].removeEventListener( 'mousedown', this.onTargetMouseDownHandler, true );
};

/**
 * Handle mouse down events on the handle
 *
 * @param {MouseEvent} e
 * @return {boolean|undefined}
 */
ve.ui.MWSourceEducationPopupWidget.prototype.onTargetMouseDown = function ( e ) {
	// need to explicitly call these to intercept the tool group handle's event
	e.preventDefault();
	e.stopImmediatePropagation();
	return ve.ui.MWSourceEducationPopupWidget.super.prototype.onTargetMouseDown.call( this );
};

/**
 * Click handler for the try source button
 */
ve.ui.MWSourceEducationPopupWidget.prototype.onTrySourceButtonClick = function () {
	if ( this.trackingName ) {
		ve.track( 'activity.' + this.trackingName + 'EducationPopup', { action: 'try-source' } );
	}
	this.closePopup();
	if ( this.onTrySource ) {
		this.onTrySource();
	}
};
