/*!
 * VisualEditor UserInterface MediaWiki EducationPopupTool class.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
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
	var popupCloseButton, $popupContent, $shield,
		usePrefs = !mw.user.isAnon(),
		prefSaysShow = usePrefs && !mw.user.options.get( 'visualeditor-hideusered' ),
		tool = this;

	config = config || {};

	if (
		!( ve.init.mw.DesktopArticleTarget && ve.init.target instanceof ve.init.mw.DesktopArticleTarget ) ||
		(
			!prefSaysShow &&
			!(
				!usePrefs &&
				mw.storage.get( 've-hideusered' ) === null &&
				$.cookie( 've-hideusered' ) === null
			)
		)
	) {
		return;
	}

	if ( !( this.toolGroup instanceof OO.ui.BarToolGroup ) ) {
		// The popup gets hideously deformed in other cases. Getting it to work would probably be
		// difficult. Let's just not show it. (T170919)
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
		$floatableContainer: this.$element,
		$content: $popupContent,
		padded: true,
		width: 300
	} );

	this.shownEducationPopup = false;
	this.$pulsatingDot = $( '<div>' ).addClass( 've-ui-pulsatingDot' );
	this.$stillDot = $( '<div>' ).addClass( 've-ui-stillDot' );
	$shield = $( '<div>' ).addClass( 've-ui-educationPopup-shield' );
	this.$element
		.addClass( 've-ui-educationPopup' )
		.append( $shield, this.popup.$element, this.$stillDot, this.$pulsatingDot );
	this.$element.children().not( this.popup.$element ).on( 'click', function () {
		if ( !tool.shownEducationPopup ) {
			if ( ve.init.target.openEducationPopupTool ) {
				ve.init.target.openEducationPopupTool.popup.toggle( false );
				ve.init.target.openEducationPopupTool.setActive( false );
				ve.init.target.openEducationPopupTool.$pulsatingDot.show();
				ve.init.target.openEducationPopupTool.$stillDot.show();
			}
			ve.init.target.openEducationPopupTool = tool;
			tool.$pulsatingDot.hide();
			tool.$stillDot.hide();
			tool.popup.toggle( true );
			$shield.remove();
		}
	} );
};

/* Inheritance */

OO.initClass( ve.ui.MWEducationPopupTool );

/* Methods */

/**
 * Click handler for the popup close button
 */
ve.ui.MWEducationPopupTool.prototype.onPopupCloseButtonClick = function () {
	var usePrefs = !mw.user.isAnon(),
		prefSaysShow = usePrefs && !mw.user.options.get( 'visualeditor-hideusered' );

	this.shownEducationPopup = true;
	this.popup.toggle( false );
	this.setActive( false );
	ve.init.target.openEducationPopupTool = undefined;

	if ( prefSaysShow ) {
		new mw.Api().saveOption( 'visualeditor-hideusered', 1 );
		mw.user.options.set( 'visualeditor-hideusered', 1 );
	} else if ( !usePrefs ) {
		if ( !mw.storage.set( 've-hideusered', 1 ) ) {
			$.cookie( 've-hideusered', 1, { path: '/', expires: 30 } );
		}
	}

	this.onSelect();
};
