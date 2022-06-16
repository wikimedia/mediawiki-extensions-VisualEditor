/**
 * Container for textual elements, which should be collapsed to one line by default.
 *
 * A "more / less" button is used to toggle additional lines.
 *
 * @class
 * @extends OO.ui.Element
 * @mixins OO.EventEmitter
 *
 * @constructor
 * @param {Object} config
 * @cfg {jQuery} $content
 */
ve.ui.MWExpandableContentElement = function VeUiMWExpandableContentElement( config ) {
	// Parent constructor
	ve.ui.MWExpandableContentElement.super.call( this, config );

	// Mixin constructors
	OO.EventEmitter.call( this );

	this.$content = config.$content;

	this.collapsed = true;
	this.toggle( false );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWExpandableContentElement, OO.ui.Element );

OO.mixinClass( ve.ui.MWExpandableContentElement, OO.EventEmitter );

/* Methods */

/**
 * @private
 * @return {number}
 */
ve.ui.MWExpandableContentElement.prototype.getLineHeight = function () {
	return parseInt( this.$content.css( 'line-height' ) );
};

/**
 * @private
 * @return {number}
 */
ve.ui.MWExpandableContentElement.prototype.getTextHeight = function () {
	var currentHeight = this.$content.height(),
		expandedHeight = this.$content.css( 'height', 'auto' ).height();
	if ( expandedHeight !== currentHeight ) {
		this.$content.css( { height: currentHeight } );
	}
	return expandedHeight;
};

/**
 * @private
 */
ve.ui.MWExpandableContentElement.prototype.makeCollapsible = function () {
	this.button = new OO.ui.ButtonWidget( {
		framed: false,
		flags: [ 'progressive' ],
		label: ve.msg( 'visualeditor-expandable-more' ),
		classes: [ 've-ui-expandableContent-toggle' ],
		invisibleLabel: ve.ui.MWTransclusionDialog.static.isSmallScreen(),
		icon: 'expand'
	} ).on( 'click', this.onButtonClick.bind( this ) );

	this.$content.on( 'click', this.onDescriptionClick.bind( this ) )
		.addClass( 've-ui-expandableContent-collapsible' );

	this.$container = $( '<div>' )
		.addClass( 've-ui-expandableContent-container' )
		.append(
			$( '<div>' )
				.addClass( 've-ui-expandableContent-fade' )
		)
		.append( this.button.$element )
		.appendTo( this.$element );
};

/**
 * @private
 * @param {boolean} collapse
 */
ve.ui.MWExpandableContentElement.prototype.collapse = function ( collapse ) {
	var collapsedHeight = this.getLineHeight();

	if ( collapse ) {
		this.button.setLabel( ve.msg( 'visualeditor-expandable-more' ) );
		this.$content.css( { height: collapsedHeight } );
		this.button.setIcon( 'expand' );
	} else {
		this.button.setLabel( ve.msg( 'visualeditor-expandable-less' ) );
		this.$content.css( 'height', this.getTextHeight() + this.button.$element.height() );
		this.button.setIcon( 'collapse' );
	}
	this.$container.removeClass( 'oo-ui-element-hidden' );
	this.$container.height( collapsedHeight );
	this.button.setInvisibleLabel( ve.ui.MWTransclusionDialog.static.isSmallScreen() );
};

/**
 * @private
 */
ve.ui.MWExpandableContentElement.prototype.reset = function () {
	this.$content.css( 'height', 'auto' );
	this.$container.addClass( 'oo-ui-element-hidden' );
	this.button.setInvisibleLabel( false );
};

/**
 * @private
 */
ve.ui.MWExpandableContentElement.prototype.onButtonClick = function () {
	this.collapse( !this.collapsed );
	this.collapsed = !this.collapsed;
};

/**
 * @private
 */
ve.ui.MWExpandableContentElement.prototype.onDescriptionClick = function () {
	if ( this.button.invisibleLabel ) {
		// Don't toggle the description if the user is trying to select the text.
		if ( window.getSelection().toString() === '' ) {
			this.onButtonClick();
		}
	}
};

ve.ui.MWExpandableContentElement.prototype.updateSize = function () {
	this.toggle( true );

	if ( Math.floor( this.getTextHeight() / this.getLineHeight() ) > 3 ) {
		if ( !this.$container ) {
			this.makeCollapsible();
		}
		this.collapse( this.collapsed );
	} else {
		if ( this.$container ) {
			this.reset();
		}
	}
};
