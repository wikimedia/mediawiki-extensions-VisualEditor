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

	this.collapsed = false;
	this.toggle( false );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWExpandableContentElement, OO.ui.Element );

OO.mixinClass( ve.ui.MWExpandableContentElement, OO.EventEmitter );

/* Methods */

ve.ui.MWExpandableContentElement.prototype.getLineHeight = function () {
	return parseInt( this.$content.css( 'line-height' ) );
};

ve.ui.MWExpandableContentElement.prototype.makeCollapsible = function () {
	var collapsedHeight = this.getLineHeight();

	this.button = new OO.ui.ButtonWidget( {
		framed: false,
		flags: [ 'progressive' ],
		label: ve.msg( 'visualeditor-expandable-more' ),
		classes: [ 've-ui-expandableContent-toggle' ],
		invisibleLabel: ve.ui.MWTransclusionDialog.static.isSmallScreen(),
		icon: 'expand'
	} ).on( 'click', this.onButtonClick.bind( this ) );

	this.$content.on( 'click', this.onDescriptionClick.bind( this ) )
		.addClass( 've-ui-expandableContent-collapsible' )
		.height( collapsedHeight );

	$( '<div>' )
		.addClass( 've-ui-expandableContent-container' )
		.append(
			$( '<div>' )
				.addClass( 've-ui-expandableContent-fade' )
		)
		.append( this.button.$element )
		.height( collapsedHeight )
		.appendTo( this.$element );
};

ve.ui.MWExpandableContentElement.prototype.onButtonClick = function () {
	if ( this.collapsed ) {
		this.button.setLabel( ve.msg( 'visualeditor-expandable-more' ) );
		this.$content.css( { height: this.getLineHeight() } );
		this.button.setIcon( 'expand' );
	} else {
		this.button.setLabel( ve.msg( 'visualeditor-expandable-less' ) );
		this.$content.css( { height: this.$content.prop( 'scrollHeight' ) + this.getLineHeight() } );
		this.button.setIcon( 'collapse' );
	}
	this.collapsed = !this.collapsed;
};

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

	if ( this.button ) {
		this.button.setInvisibleLabel( ve.ui.MWTransclusionDialog.static.isSmallScreen() );
	} else if ( this.$content.outerHeight() / this.getLineHeight() >= 3 ) {
		this.makeCollapsible();
	}
};
