/*!
 * VisualEditor UserInterface MWAceEditorWidget class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see http://ve.mit-license.org
 */

/* global ace, require */

/**
 * Text input widget which hides but preserves leading and trailing whitespace
 *
 * @class
 * @extends ve.ui.WhitespacePreservingTextInputWidget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWAceEditorWidget = function VeUiMWAceEditorWidget( config ) {
	// Configuration
	config = config || {};

	this.$ace = $( '<div dir="ltr">' );
	this.editor = null;
	// Initialise to a rejected promise for the setValue call in the parent constructor
	this.loadingPromise = $.Deferred().reject().promise();
	this.styleHeight = null;

	// Parent constructor
	ve.ui.MWAceEditorWidget.super.call( this, config );

	// Clear the fake loading promise and setup properly
	this.loadingPromise = null;
	this.setup();

	this.$element
		.append( this.$ace )
		.addClass( 've-ui-mwAceEditorWidget' );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWAceEditorWidget, ve.ui.WhitespacePreservingTextInputWidget );

/* Events */

/**
 * The editor has resized
 * @event resize
 */

/* Methods */

/**
 * Setup the Ace editor instance
 */
ve.ui.MWAceEditorWidget.prototype.setup = function () {
	if ( !this.loadingPromise ) {
		this.loadingPromise = mw.loader.getState( 'ext.codeEditor.ace.modes' ) ?
			mw.loader.using( 'ext.codeEditor.ace.modes' ).then( this.setupEditor.bind( this ) ) :
			$.Deferred().reject().promise();
	}
};

/**
 * Destroy the Ace editor instance
 */
ve.ui.MWAceEditorWidget.prototype.teardown = function () {
	var widget = this;
	this.loadingPromise.done( function () {
		widget.$input.removeClass( 'oo-ui-element-hidden' );
		widget.editor.destroy();
		widget.editor = null;
	} ).always( function () {
		widget.loadingPromise = null;
	} );
};

/**
 * Setup the Ace editor
 */
ve.ui.MWAceEditorWidget.prototype.setupEditor = function () {
	this.$input.addClass( 'oo-ui-element-hidden' );
	this.editor = ace.edit( this.$ace[ 0 ] );
	this.editor.setOptions( {
		minLines: this.minRows || 3,
		maxLines: this.autosize ? this.maxRows : this.minRows || 3
	} );
	this.editor.getSession().on( 'change', this.onEditorChange.bind( this ) );
	this.editor.renderer.on( 'resize', this.emit.bind( this, 'resize' ) );
	this.editor.resize();
};

/**
 * @inheritdoc
 */
ve.ui.MWAceEditorWidget.prototype.setValue = function ( value ) {
	var widget = this;
	this.loadingPromise.done( function () {
		widget.editor.setValue( value );
		widget.editor.selection.moveTo( 0, 0 );
	} ).fail( function () {
		ve.ui.MWAceEditorWidget.super.prototype.setValue.call( widget, value );
	} );
};

/**
 * Handle change events from the Ace editor
 */
ve.ui.MWAceEditorWidget.prototype.onEditorChange = function () {
	// Call setValue on the parent to keep the value property in sync with the editor
	ve.ui.MWAceEditorWidget.super.prototype.setValue.call( this, this.editor.getValue() );
};

/**
 * Toggle the visibility of line numbers
 *
 * @param {boolean} visible Visible
 */
ve.ui.MWAceEditorWidget.prototype.toggleLineNumbers = function ( visible ) {
	var widget = this;
	this.loadingPromise.done( function () {
		widget.editor.renderer.setOption( 'showLineNumbers', visible );
	} );
};

/**
 * Set the language mode of the editor (programming language)
 *
 * @param {string} lang Language
 */
ve.ui.MWAceEditorWidget.prototype.setLanguage = function ( lang ) {
	var widget = this;
	this.loadingPromise.done( function () {
		widget.editor.getSession().setMode( 'ace/mode/' + ( require( 'ace/mode/' + lang ) ? lang : 'text' ) );
	} );
};

/**
 * Focus the editor
 */
ve.ui.MWAceEditorWidget.prototype.focus = function () {
	var widget = this;
	this.loadingPromise.done( function () {
		widget.editor.focus();
	} ).fail( function () {
		ve.ui.MWAceEditorWidget.super.prototype.focus.call( widget );
	} );
};

/**
 * @inheritdoc
 * TODO Move this upstream to OOUI
 */
ve.ui.MWAceEditorWidget.prototype.adjustSize = function () {
	var styleHeight,
		widget = this;

	// Parent method
	ve.ui.MWAceEditorWidget.super.prototype.adjustSize.call( this );

	// Implement resize events for plain TextWidget
	this.loadingPromise.fail( function () {
		styleHeight = widget.$input[ 0 ].style.height;

		if ( styleHeight !== widget.styleHeight ) {
			widget.styleHeight = styleHeight;
			widget.emit( 'resize' );
		}
	} );
};
