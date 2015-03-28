/*!
 * VisualEditor MWInternalLinkContextItem class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * Context item for a MWInternalLink.
 *
 * @class
 * @extends ve.ui.LinkContextItem
 *
 * @constructor
 * @param {ve.ui.Context} context Context item is in
 * @param {ve.dm.Model} model Model item is related to
 * @param {Object} config Configuration options
 */
ve.ui.MWInternalLinkContextItem = function VeMWInternalLinkContextItem() {
	// Parent constructor
	ve.ui.MWInternalLinkContextItem.super.apply( this, arguments );

	// Initialization
	this.$element.addClass( 've-ui-mwInternalLinkContextItem' );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWInternalLinkContextItem, ve.ui.LinkContextItem );

/* Static Properties */

ve.ui.MWInternalLinkContextItem.static.name = 'link/internal';

ve.ui.MWInternalLinkContextItem.static.modelClasses = [ ve.dm.MWInternalLinkAnnotation ];

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWInternalLinkContextItem.prototype.getDescription = function () {
	return this.model.getAttribute( 'normalizedTitle' );
};

/**
 * @inheritdoc
 */
ve.ui.MWInternalLinkContextItem.prototype.renderBody = function () {
	var htmlDoc = this.context.getSurface().getModel().getDocument().getHtmlDocument(),
		$link = $( '<a>' )
			.text( this.getDescription() )
			.attr( {
				href: ve.resolveUrl( this.model.getHref(), htmlDoc ),
				target: '_blank'
			} );
	this.$body.empty().append( $link );

	// Style based on link cache information
	ve.init.platform.linkCache.styleElement( this.model.getAttribute( 'lookupTitle' ), $link );
};

/* Registration */

ve.ui.contextItemFactory.register( ve.ui.MWInternalLinkContextItem );
