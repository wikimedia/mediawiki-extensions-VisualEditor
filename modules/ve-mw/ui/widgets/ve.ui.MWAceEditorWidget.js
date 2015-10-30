/*!
 * VisualEditor UserInterface MWAceEditorWidget class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see http://ve.mit-license.org
 */

/* global ace, require */

/**
 * Text input widget which use an Ace editor instance when available
 *
 * For the most part this can be treated just like a TextInputWidget with
 * a few extra considerations:
 *
 * - For performance it is recommended to destroy the editor when
 *   you are finished with it, using #teardown. If you need to use
 *   the widget again let the editor can be restored with #setup.
 * - After setting an initial value the undo stack can be reset
 *   using clearUndoStack so that you can't undo past the initial
 *   state.
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
 *
 * @fires resize
 */
ve.ui.MWAceEditorWidget.prototype.setupEditor = function () {
	this.$input.addClass( 'oo-ui-element-hidden' );
	this.editor = ace.edit( this.$ace[ 0 ] );
	this.editor.setOptions( {
		minLines: this.minRows || 3,
		maxLines: this.autosize ? this.maxRows : this.minRows || 3
	} );
	this.editor.getSession().on( 'change', this.onEditorChange.bind( this ) );
	this.editor.renderer.on( 'resize', this.onEditorResize.bind( this ) );
	this.editor.resize();
};

/**
 * @inheritdoc
 */
ve.ui.MWAceEditorWidget.prototype.setValue = function ( value ) {
	var widget = this;
	this.loadingPromise.done( function () {
		var selectionState;
		if ( value !== widget.editor.getValue() ) {
			selectionState = widget.editor.session.selection.toJSON();
			widget.editor.setValue( value );
			widget.editor.session.selection.fromJSON( selectionState );
		}
	} ).fail( function () {
		ve.ui.MWAceEditorWidget.super.prototype.setValue.call( widget, value );
	} );
	return this;
};

/**
 * Handle change events from the Ace editor
 */
ve.ui.MWAceEditorWidget.prototype.onEditorChange = function () {
	// Call setValue on the parent to keep the value property in sync with the editor
	ve.ui.MWAceEditorWidget.super.prototype.setValue.call( this, this.editor.getValue() );
};

/**
 * Handle resize events from the Ace editor
 *
 * @fires resize
 */
ve.ui.MWAceEditorWidget.prototype.onEditorResize = function () {
	this.emit.bind( this, 'resize' );
};

/**
 * Clear the editor's undo stack
 *
 * @chainable
 */
ve.ui.MWAceEditorWidget.prototype.clearUndoStack = function () {
	var widget = this;
	this.loadingPromise.done( function () {
		widget.editor.session.setUndoManager(
			new ace.UndoManager()
		);
	} );
	return this;
};

/**
 * Toggle the visibility of line numbers
 *
 * @param {boolean} visible Visible
 * @chainable
 */
ve.ui.MWAceEditorWidget.prototype.toggleLineNumbers = function ( visible ) {
	var widget = this;
	this.loadingPromise.done( function () {
		widget.editor.renderer.setOption( 'showLineNumbers', visible );
	} );
	return this;
};

/**
 * Set the language mode of the editor (programming language)
 *
 * @param {string} lang Language
 * @chainable
 */
ve.ui.MWAceEditorWidget.prototype.setLanguage = function ( lang ) {
	var widget = this;
	this.loadingPromise.done( function () {
		widget.editor.getSession().setMode( 'ace/mode/' + ( require( 'ace/mode/' + lang ) ? lang : 'text' ) );
	} );
	return this;
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
 */
ve.ui.MWAceEditorWidget.prototype.adjustSize = function () {
	var widget = this;
	// If the editor has loaded, resize events are emitted from #onEditorResize
	// so do nothing here, otherwise call the parent method.
	this.loadingPromise.fail( function () {
		// Parent method
		ve.ui.MWAceEditorWidget.super.prototype.adjustSize.call( widget );
	} );
};
