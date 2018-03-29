/*!
 * VisualEditor DataModel Surface class.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * DataModel surface.
 *
 * @class
 * @extends ve.ce.Surface
 *
 * @constructor
 * @param {ve.dm.Surface} model
 * @param {ve.ui.Surface} ui
 * @param {Object} [config]
 */
ve.ce.MWWikitextSurface = function VeCeMwWikitextSurface() {
	// Parent constructors
	ve.ce.MWWikitextSurface.super.apply( this, arguments );

	this.pasteTargetInput = new OO.ui.MultilineTextInputWidget();
};

/* Inheritance */

OO.inheritClass( ve.ce.MWWikitextSurface, ve.ce.Surface );

/**
 * @inheritdoc
 */
ve.ce.MWWikitextSurface.prototype.onCopy = function ( e ) {
	var originalSelection, scrollTop, slice, clipboardKey,
		view = this,
		clipboardData = e.originalEvent.clipboardData,
		text = this.getModel().getFragment().getText( true ).replace( /\n\n/g, '\n' );

	if ( !text ) {
		return;
	}

	if ( clipboardData ) {
		// Disable the default event so we can override the data
		e.preventDefault();
		clipboardData.setData( 'text/plain', text );
		// We're not going to set HTML, but for browsers that support custom data, set a clipboard key
		if ( ve.isClipboardDataFormatsSupported( e, true ) ) {
			slice = this.model.documentModel.shallowCloneFromSelection( this.getModel().getSelection() );
			this.clipboardIndex++;
			clipboardKey = this.clipboardId + '-' + this.clipboardIndex;
			this.clipboard = { slice: slice, hash: null };
			// Clone the elements in the slice
			slice.data.cloneElements( true );
			clipboardData.setData( 'text/xcustom', clipboardKey );
		}
	} else {
		originalSelection = new ve.SelectionState( this.nativeSelection );

		// Save scroll position before changing focus to "offscreen" paste target
		scrollTop = this.$window.scrollTop();

		// Prevent surface observation due to native range changing
		this.surfaceObserver.disable();
		this.$pasteTarget.empty().append( this.pasteTargetInput.$element );
		this.pasteTargetInput.setValue( text ).select();

		// Restore scroll position after changing focus
		this.$window.scrollTop( scrollTop );

		// setTimeout: postpone until after the default copy action
		setTimeout( function () {
			// Change focus back
			view.$documentNode[ 0 ].focus();
			view.showSelectionState( originalSelection );
			// Restore scroll position
			view.$window.scrollTop( scrollTop );
			view.surfaceObserver.clear();
			view.surfaceObserver.enable();
			// Detach input
			view.pasteTargetInput.$element.detach();
		} );
	}
};
