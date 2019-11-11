/*!
 * VisualEditor UserInterface MWWikitextLinkAnnotationInspector class.
 *
 * @copyright 2011-2019 VisualEditor Team and others; see AUTHORS.txt
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
			var insert, labelText, labelTitle, targetText,
				annotation = this.getAnnotation(),
				fragment = this.getFragment(),
				insertion = this.getInsertionText(),
				surfaceModel = fragment.getSurface();

			if ( data && data.action === 'done' && annotation ) {
				insert = this.initialSelection.isCollapsed() && insertion.length;
				if ( insert ) {
					fragment.insertContent( insertion );
				}
				labelText = fragment.getText();

				// Build internal links locally
				if ( annotation instanceof ve.dm.MWInternalLinkAnnotation ) {
					if ( labelText.indexOf( ']]' ) !== -1 ) {
						labelText = labelText.replace( /(\]{2,})/g, '<nowiki>$1</nowiki>' );
					}
					labelTitle = mw.Title.newFromText( labelText );
					if ( !labelTitle || labelTitle.getPrefixedText() !== annotation.getAttribute( 'normalizedTitle' ) ) {
						targetText = annotation.getAttribute( 'normalizedTitle' ) + '|';
					} else {
						targetText = '';
					}
					fragment.insertContent( '[[' + targetText + labelText + ']]' );
				} else {
					// Annotating the surface will send the content to Parsoid before
					// it is inserted into the wikitext document. It is slower but it
					// will handle all cases.
					// Where possible we should generate the wikitext locally.
					fragment.annotateContent( 'set', annotation );
				}

				// Fix selection after annotating is complete
				fragment.getPending().then( function () {
					if ( insert ) {
						fragment.collapseToEnd().select();
					} else {
						fragment.select();
					}
				} );
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
