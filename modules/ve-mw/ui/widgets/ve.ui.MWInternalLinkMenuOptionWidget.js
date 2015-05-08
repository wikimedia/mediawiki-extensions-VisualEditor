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
 * @cfg {string} [data] Page title
 * @cfg {string} [imageUrl] Thumbnail image URL with URL encoding
 * @cfg {string} [description] Page description
 * @cfg {string} [query] Matching query string
 */
ve.ui.MWInternalLinkMenuOptionWidget = function VeUiMWInternalLinkMenuOptionWidget( config ) {
	var title = config.data;

	// Config initialization
	config = ve.extendObject( {
		icon: 'page-existing',
		label: title,
		href: mw.util.getUrl( title ),
		autoFitLabel: false
	}, config );

	// Parent constructor
	ve.ui.MWInternalLinkMenuOptionWidget.super.call( this, config );

	// Highlight matching parts of link suggestion
	this.$label.autoEllipsis( { hasSpan: false, tooltip: true, matchText: config.query } );

	// Style based on link cache information
	ve.init.platform.linkCache.styleElement( title, this.$link );

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
