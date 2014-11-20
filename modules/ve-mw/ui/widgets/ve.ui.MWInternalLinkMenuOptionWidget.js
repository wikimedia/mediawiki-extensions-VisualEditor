/*!
 * VisualEditor UserInterface MWInternalLinkMenuOptionWidget class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Creates a ve.ui.MWInternalLinkMenuOptionWidget object.
 *
 * @class
 * @extends ve.ui.MWLinkMenuOptionWidget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @cfg {string} [pagename] Pagename to return the names of internal pages
 * @cfg {string} [imageUrl] Thumbnail image URL with URL encoding
 * @cfg {string} [description] Page description
 */
ve.ui.MWInternalLinkMenuOptionWidget = function VeUiMWInternalLinkMenuOptionWidget( config ) {
	// Config initialization
	config = ve.extendObject( { icon: 'article' }, config );

	// Properties
	this.pagename = config.pagename;

	// Parent constructor
	ve.ui.MWLinkMenuOptionWidget.call( this, $.extend( { label: this.pagename, href: mw.util.getUrl( this.pagename ) }, config ) );

	// Style based on link cache information
	ve.init.platform.linkCache.styleElement( this.pagename, this.$link );

	// Intialization
	this.$element.addClass( 've-ui-mwInternalLinkMenuOptionWidget' );

	if ( config.imageUrl ) {
		this.$icon
			.addClass( 've-ui-mwInternalLinkMenuOptionWidget-hasImage' )
			.css( 'background-image', 'url(' + config.imageUrl + ')' );
	}

	if ( config.description ) {
		this.$element.append(
			$( '<span>' )
				.addClass( 've-ui-mwInternalLinkMenuOptionWidget-description' )
				.text( config.description )
		);
	}
};

/* Inheritance */

OO.inheritClass( ve.ui.MWInternalLinkMenuOptionWidget, ve.ui.MWLinkMenuOptionWidget );
