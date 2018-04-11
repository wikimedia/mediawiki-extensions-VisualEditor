/*!
 * VisualEditor UserInterface MWWikitextSurface class.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * @class
 * @extends ve.ui.Surface
 *
 * @constructor
 * @param {HTMLDocument|Array|ve.dm.LinearData|ve.dm.Document} dataOrDoc Document data to edit
 * @param {Object} [config] Configuration options
 */
ve.ui.MWWikitextSurface = function VeUiMWWikitextSurface() {
	var surface = this;

	// Parent constructor
	ve.ui.MWWikitextSurface.super.apply( this, arguments );

	// Initialization
	// The following classes can be used here:
	// * mw-editfont-monospace
	// * mw-editfont-sans-serif
	// * mw-editfont-serif
	this.$element.addClass( 've-ui-mwWikitextSurface' );
	this.getView().$element.addClass( 'mw-editfont-' + mw.user.options.get( 'editfont' ) );
	this.$placeholder.addClass( 'mw-editfont-' + mw.user.options.get( 'editfont' ) );
	this.$textbox = $( '#wpTextbox1' );

	if ( !this.$textbox.length ) {
		this.$textbox = $( '<textarea>' )
			.attr( 'id', 'wpTextbox1' )
			.addClass( 've-dummyTextbox oo-ui-element-hidden' );
		// Append a dummy textbox to the surface, so it gets destroyed with it
		this.$element.append( this.$textbox );
	} else {
		// Existing textbox may have an API registered
		this.$textbox.textSelection( 'unregister' );
	}

	// Backwards support for the textSelection API
	this.$textbox.textSelection( 'register', {
		getContents: function () {
			return surface.getDom();
		},
		setContents: function ( content ) {
			surface.getModel().getLinearFragment( new ve.Range( 0 ), true ).expandLinearSelection( 'root' ).insertContent( content );
			return this;
		},
		getSelection: function () {
			var range = surface.getModel().getSelection().getCoveringRange();
			if ( !range ) {
				return '';
			}
			return surface.getModel().getDocument().data.getSourceText( range );
		},
		setSelection: function ( options ) {
			surface.getModel().setLinearSelection(
				surface.getModel().getRangeFromSourceOffsets( options.start, options.end )
			);
			return this;
		},
		getCaretPosition: function ( options ) {
			var range = surface.getModel().getSelection().getCoveringRange(),
				surfaceModel = surface.getModel(),
				caretPos = surfaceModel.getSourceOffsetFromOffset( range.start );

			return options.startAndEnd ?
				[ caretPos, surfaceModel.getSourceOffsetFromOffset( range.end ) ] :
				caretPos;
		},
		replaceSelection: function ( value ) {
			surface.getModel().getFragment().insertContent( value );
			return this;
		},
		// encapsulateSelection works automatically when we implement the overrides above
		scrollToCaretPosition: function () {
			surface.scrollCursorIntoView();
			return this;
		}
	} );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWWikitextSurface, ve.ui.Surface );

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWWikitextSurface.prototype.createModel = function ( doc ) {
	return new ve.dm.MWWikitextSurface( doc );
};

/**
 * @inheritdoc
 */
ve.ui.MWWikitextSurface.prototype.createView = function ( model ) {
	return new ve.ce.MWWikitextSurface( model, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWWikitextSurface.prototype.destroy = function () {
	this.$textbox.textSelection( 'unregister' );
	// Parent method
	return ve.ui.MWWikitextSurface.super.prototype.destroy.apply( this, arguments );
};
