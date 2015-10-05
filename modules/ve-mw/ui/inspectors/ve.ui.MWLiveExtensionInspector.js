/*!
 * VisualEditor UserInterface MWLiveExtensionInspector class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Inspector for editing generic MediaWiki extensions with dynamic rendering.
 *
 * @class
 * @abstract
 * @extends ve.ui.MWExtensionInspector
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWLiveExtensionInspector = function VeUiMWLiveExtensionInspector() {
	// Parent constructor
	ve.ui.MWLiveExtensionInspector.super.apply( this, arguments );

	// Late bind onChangeHandler to a debounced updatePreview
	this.onChangeHandler = ve.debounce( this.updatePreview.bind( this ), 250 );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWLiveExtensionInspector, ve.ui.MWExtensionInspector );

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWLiveExtensionInspector.prototype.initialize = function () {
	// Parent method
	ve.ui.MWLiveExtensionInspector.super.prototype.initialize.call( this );

	// Elements for displaying errors
	this.$generatedContentsErrorContainer = $( '<div>', {
		'class': 've-ui-mwLiveExtensionInspector-error-container-hidden'
	} );
	this.generatedContentsErrorLabel = new OO.ui.LabelWidget( {
		classes: [
			've-ui-mwLiveExtensionInspector-error ve-ui-mwLiveExtensionInspector-error-collapsed'
		]
	} );
	this.generatedContentsErrorButton = new OO.ui.ButtonWidget( {
		framed: false,
		classes: [ 've-ui-mwLiveExtensionInspector-error-button' ],
		icon: 'expand'
	} );

	this.$generatedContentsErrorContainer.append(
		this.generatedContentsErrorButton.$element,
		this.generatedContentsErrorLabel.$element
	);
	this.form.$element.append( this.$generatedContentsErrorContainer );
};

/**
 * @inheritdoc
 */
ve.ui.MWLiveExtensionInspector.prototype.getSetupProcess = function ( data ) {
	return ve.ui.MWLiveExtensionInspector.super.prototype.getSetupProcess.call( this, data )
		.next( function () {
			var element = this.getNewElement();
			// Initialization
			this.getFragment().getSurface().pushStaging();

			if ( !this.selectedNode ) {
				// Create a new node
				// collapseToEnd returns a new fragment
				this.fragment = this.getFragment().collapseToEnd().insertContent( [
					element,
					{ type: '/' + element.type }
				] );
				// Check if the node was inserted at a structural offset and
				// wrapped in a paragraph
				if ( this.getFragment().getSelection().getRange().getLength() === 4 ) {
					this.fragment = this.getFragment().adjustLinearSelection( 1, -1 );
				}
				this.getFragment().select();
				this.selectedNode = this.getFragment().getSelectedNode();
			}
			this.input.on( 'change', this.onChangeHandler );
			this.selectedNode.connect( this, {
				generatedContentsError: this.renderGeneratedContentsError
			} );
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWLiveExtensionInspector.prototype.getTeardownProcess = function ( data ) {
	return ve.ui.MWLiveExtensionInspector.super.prototype.getTeardownProcess.call( this, data )
		.first( function () {
			this.removeGeneratedContentsError();
			this.input.off( 'change', this.onChangeHandler );
			this.selectedNode.disconnect( this );
			if ( data === undefined ) { // cancel
				this.getFragment().getSurface().popStaging();
			}
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWLiveExtensionInspector.prototype.insertOrUpdateNode = function () {
	// No need to call parent method as changes have already been made
	// to the model in staging, just need to apply them.
	this.updatePreview();
	this.getFragment().getSurface().applyStaging();
	// Force the selected node to re-render after staging has finished
	this.selectedNode.emit( 'update', false );
};

/**
 * @inheritdoc
 */
ve.ui.MWLiveExtensionInspector.prototype.removeNode = function () {
	this.getFragment().getSurface().popStaging();

	// Parent method
	ve.ui.MWLiveExtensionInspector.super.prototype.removeNode.call( this );
};

/**
 * Update the node rendering to reflect the current content in the inspector.
 */
ve.ui.MWLiveExtensionInspector.prototype.updatePreview = function () {
	var mwData = ve.copy( this.selectedNode.getAttribute( 'mw' ) );

	this.updateMwData( mwData );

	this.removeGeneratedContentsError();

	if ( this.visible ) {
		this.getFragment().changeAttributes( { mw: mwData } );
	}
};

/**
 * Show the error container and set the error label to contain the error.
 *
 * @param {jQuery} $element Element containing the error
 */
ve.ui.MWLiveExtensionInspector.prototype.renderGeneratedContentsError = function ( $element ) {
	// Display the error
	this.$generatedContentsErrorContainer
		.removeClass( 've-ui-mwLiveExtensionInspector-error-container-hidden' );
	this.generatedContentsErrorLabel.setLabel( this.formatGeneratedContentsError( $element ) );
	this.updateSize();

	this.generatedContentsErrorButton.connect( this, { click: 'toggleGeneratedContentsError' } );
};

/**
 * Hide the error and collapse the error container.
 */
ve.ui.MWLiveExtensionInspector.prototype.removeGeneratedContentsError = function () {
	this.$generatedContentsErrorContainer
		.addClass( 've-ui-mwLiveExtensionInspector-error-container-hidden' );
	this.generatedContentsErrorButton.setIcon( 'expand' ).disconnect( this );
	this.generatedContentsErrorLabel.setLabel( null );
	this.toggleGeneratedContentsError( true );
};

/**
 * Format the error.
 *
 * Default behaviour returns the error with no modification.
 *
 * @param {jQuery} $element Element containing the error
 * @return {jQuery} $element Element containing the error
 */
ve.ui.MWLiveExtensionInspector.prototype.formatGeneratedContentsError = function ( $element ) {
	return $element;
};

/**
 * Toggle the error between collapsed and expanded.
 *
 * @param {boolean} expanded Treat the error as expanded without checking
 */
ve.ui.MWLiveExtensionInspector.prototype.toggleGeneratedContentsError = function ( expanded ) {
	// Set the correct icon on the expand/collapse button
	expanded = expanded || this.generatedContentsErrorButton.getIcon() === 'collapse';
	this.generatedContentsErrorButton.setIcon( expanded ? 'expand' : 'collapse' );

	// Expand or collapse the error message
	this.generatedContentsErrorLabel.$element
		.removeClass(
			've-ui-mwLiveExtensionInspector-error-expanded ve-ui-mwLiveExtensionInspector-error-collapsed'
		)
		.addClass( 've-ui-mwLiveExtensionInspector-error-' + ( expanded ? 'collapsed' : 'expanded' ) );

	this.updateSize();
};
