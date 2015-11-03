/*!
 * VisualEditor UserInterface MediaWiki EducationPopupTool class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * UserInterface education popup tool. Used as a mixin to show a pulsating blue dot
 * which, when you click, reveals a popup with useful information.
 *
 * @class
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWEducationPopupTool = function VeUiMwEducationPopupTool( config ) {
	var popupCloseButton, $popupContent,
		usePrefs = !mw.user.isAnon(),
		prefSaysShow = usePrefs && !mw.user.options.get( 'visualeditor-hideusered' ),
		tool = this;

	config = config || {};

	if (
		ve.init.target.dummyToolbar ||
		(
			!prefSaysShow &&
			!(
				!usePrefs &&
				localStorage.getItem( 've-hideusered' ) === null &&
				$.cookie( 've-hideusered' ) === null
			)
		)
	) {
		return;
	}

	popupCloseButton = new OO.ui.ButtonWidget( {
		label: ve.msg( 'visualeditor-educationpopup-dismiss' ),
		flags: [ 'progressive', 'primary' ],
		classes: [ 've-ui-educationPopup-dismiss' ]
	} );
	popupCloseButton.connect( this, { click: 'onPopupCloseButtonClick' } );
	$popupContent = $( '<div>' ).append(
		$( '<div>' ).addClass( 've-ui-educationPopup-header' ),
		$( '<h3>' ).text( config.title ),
		$( '<p>' ).text( config.text ),
		popupCloseButton.$element
	);

	this.popup = new OO.ui.PopupWidget( {
		$content: $popupContent,
		padded: true,
		width: 300
	} );

	this.$pulsatingDot = $( '<div>' ).addClass( 've-ui-pulsatingDot' );
	this.$stillDot = $( '<div>' ).addClass( 've-ui-stillDot' );
	this.$element
		.addClass( 've-ui-educationPopup' )
		.append( this.popup.$element, this.$stillDot, this.$pulsatingDot );

	setTimeout( function () {
		var radius = tool.$pulsatingDot.width() / 2;
		tool.$pulsatingDot.css( {
			left: tool.$element.width() / 2 - radius,
			top: tool.$element.height() - radius
		} );
		tool.$stillDot.css( {
			left: tool.$element.width() / 2 - radius / 3,
			top: tool.$element.height() - radius / 3
		} );
	}, 0 );
};

/* Inheritance */

OO.initClass( ve.ui.MWEducationPopupTool );

/* Methods */

/**
 * Click handler for the popup close button
 */
ve.ui.MWEducationPopupTool.prototype.onPopupCloseButtonClick = function () {
	this.popup.toggle( false );
	this.setActive( false );
	ve.init.target.openEducationPopupTool = undefined;
};

/**
 * Overrides Tool's onSelect to bring up popup where necessary
 */
ve.ui.MWEducationPopupTool.prototype.onSelect = function () {
	var usePrefs = !mw.user.isAnon(),
		prefSaysShow = usePrefs && !mw.user.options.get( 'visualeditor-hideusered' );

	// Beware: this method is called even if the constructor bailed after checking
	// the user preference / cookie / localStorage. In that case, this.$pulsatingDot,
	// this.popup and other properties will not be set.
	if ( this.$pulsatingDot && this.$pulsatingDot.is( ':visible' ) ) {
		if ( ve.init.target.openEducationPopupTool ) {
			ve.init.target.openEducationPopupTool.popup.toggle( false );
			ve.init.target.openEducationPopupTool.setActive( false );
			ve.init.target.openEducationPopupTool.$pulsatingDot.show();
		}
		ve.init.target.openEducationPopupTool = this;
		this.$pulsatingDot.hide();
		this.popup.toggle( true );
		this.popup.$element.css( {
			left: this.$element.width() / 2,
			top: this.$element.height()
		} );

		if ( prefSaysShow ) {
			new mw.Api().saveOption( 'visualeditor-hideusered', 1 );
			mw.user.options.set( 'visualeditor-hideusered', 1 );
		} else if ( !usePrefs ) {
			try {
				localStorage.setItem( 've-hideusered', 1 );
			} catch ( e ) {
				$.cookie( 've-hideusered', 1, { path: '/', expires: 30 } );
			}
		}
	} else if ( !this.popup || !this.popup.isVisible() ) {
		return this.constructor.super.prototype.onSelect.apply( this, arguments );
	}
};
