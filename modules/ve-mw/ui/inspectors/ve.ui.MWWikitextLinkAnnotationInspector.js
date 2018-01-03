/*!
 * VisualEditor UserInterface MWWikitextLinkAnnotationInspector class.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Inspector for applying and editing labeled MediaWiki internal and external links.
 *
 * @class
 * @extends ve.ui.MWLinkAnnotationInspector
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWWikitextLinkAnnotationInspector = function VeUiMWWikitextLinkAnnotationInspector( config ) {
	// Parent constructor
	ve.ui.MWWikitextLinkAnnotationInspector.super.call( this, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWWikitextLinkAnnotationInspector, ve.ui.MWLinkAnnotationInspector );

/* Static properties */

ve.ui.MWWikitextLinkAnnotationInspector.static.name = 'wikitextLink';

ve.ui.MWWikitextLinkAnnotationInspector.static.modelClasses = [];

ve.ui.MWWikitextLinkAnnotationInspector.static.handlesSource = true;

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWWikitextLinkAnnotationInspector.prototype.getSetupProcess = function ( data ) {
	// Call grand-parent
	return ve.ui.FragmentInspector.prototype.getSetupProcess.call( this, data )
		.next( function () {
			var fragment = this.getFragment();

			// Initialize range
			if ( this.previousSelection instanceof ve.dm.LinearSelection ) {
				if (
					fragment.getSelection().isCollapsed() &&
					fragment.getDocument().data.isContentOffset( fragment.getSelection().getRange().start )
				) {
					// Expand to nearest word
					if ( !data.noExpand ) {
						fragment = fragment.expandLinearSelection( 'word' );
					}
				} else {
					// Trim whitespace
					fragment = fragment.trimLinearSelection();
				}
			}

			// Update selection
			fragment.select();
			this.initialSelection = fragment.getSelection();

			this.fragment = fragment;

			this.actions.setMode( this.getMode() );

			this.initialAnnotation = this.getAnnotationFromFragment( fragment );
			this.linkTypeIndex.setTabPanel(
				this.initialAnnotation instanceof ve.dm.MWExternalLinkAnnotation ? 'external' : 'internal'
			);
			this.annotationInput.setAnnotation( this.initialAnnotation );
			this.updateActions();
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWWikitextLinkAnnotationInspector.prototype.getTeardownProcess = function ( data ) {
	data = data || {};
	// Call grand-parent
	return ve.ui.FragmentInspector.prototype.getTeardownProcess.call( this, data )
		.first( function () {
			var insertion,
				annotation = this.getAnnotation(),
				fragment = this.getFragment(),
				surfaceModel = fragment.getSurface();

			if ( data && data.action === 'done' && annotation ) {
				if ( this.initialSelection.isCollapsed() && ( insertion = this.getInsertionData() ).length ) {
					fragment.insertContent( insertion );
				}
				// Action is async, so we use auto select to ensure the content is selected
				fragment.setAutoSelect( true );
				fragment.annotateContent( 'set', annotation );
			} else if ( !data.action ) {
				// Restore selection to what it was before we expanded it
				surfaceModel.setSelection( this.previousSelection );
			}
		}, this )
		.next( function () {
			// Reset state
			this.initialSelection = null;
			this.initialAnnotation = null;

			// Parent resets
			this.allowProtocolInInternal = false;
			this.internalAnnotationInput.setAnnotation( null );
			this.externalAnnotationInput.setAnnotation( null );
		}, this );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWWikitextLinkAnnotationInspector );

ve.ui.wikitextCommandRegistry.register(
	new ve.ui.Command(
		'link', 'window', 'open',
		{ args: [ 'wikitextLink' ], supportedSelections: [ 'linear' ] }
	)
);
