/*!
 * VisualEditor UserInterface LinkAnnotationInspector class.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Inspector for applying and editing labeled MediaWiki internal and external links.
 *
 * @class
 * @extends ve.ui.LinkAnnotationInspector
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWLinkAnnotationInspector = function VeUiMWLinkAnnotationInspector( config ) {
	// Parent constructor
	ve.ui.MWLinkAnnotationInspector.super.call( this, ve.extendObject( { padded: false }, config ) );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWLinkAnnotationInspector, ve.ui.LinkAnnotationInspector );

/* Static properties */

ve.ui.MWLinkAnnotationInspector.static.name = 'link';

ve.ui.MWLinkAnnotationInspector.static.modelClasses = [
	ve.dm.MWExternalLinkAnnotation,
	ve.dm.MWInternalLinkAnnotation
];

ve.ui.MWLinkAnnotationInspector.static.actions = ve.ui.MWLinkAnnotationInspector.static.actions.concat( [
	{
		action: 'convert',
		label: null, // see #updateActions
		modes: [ 'edit', 'insert' ]
	}
] );

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWLinkAnnotationInspector.prototype.initialize = function () {
	// Properties
	this.allowProtocolInInternal = false;
	this.internalAnnotationInput = new ve.ui.MWInternalLinkAnnotationWidget();
	this.externalAnnotationInput = new ve.ui.MWExternalLinkAnnotationWidget();

	this.linkTypeIndex = new OO.ui.IndexLayout( {
		expanded: false
	} );

	this.linkTypeIndex.addTabPanels( [
		new OO.ui.TabPanelLayout( 'internal', {
			label: ve.msg( 'visualeditor-linkinspector-button-link-internal' ),
			expanded: false,
			scrollable: false,
			padded: true
		} ),
		new OO.ui.TabPanelLayout( 'external', {
			label: ve.msg( 'visualeditor-linkinspector-button-link-external' ),
			expanded: false,
			scrollable: false,
			padded: true
		} )
	] );

	// Events
	this.linkTypeIndex.connect( this, { set: 'onLinkTypeIndexSet' } );
	this.internalAnnotationInput.connect( this, { change: 'onInternalLinkChange' } );
	this.externalAnnotationInput.connect( this, { change: 'onExternalLinkChange' } );
	this.internalAnnotationInput.input.getResults().connect( this, { choose: 'onFormSubmit' } );
	// Form submit only auto triggers on enter when there is one input
	this.internalAnnotationInput.getTextInputWidget().connect( this, { change: 'onInternalLinkInputChange' } );
	this.internalAnnotationInput.getTextInputWidget().connect( this, { enter: 'onFormSubmit' } );
	this.externalAnnotationInput.getTextInputWidget().connect( this, { enter: 'onFormSubmit' } );

	this.internalAnnotationInput.input.results.connect( this, {
		add: 'onInternalLinkChangeResultsChange'
		// Listening to remove causes a flicker, and is not required
		// as 'add' is always trigger on a change too
	} );

	// Parent method
	ve.ui.MWLinkAnnotationInspector.super.prototype.initialize.call( this );

	// Initialization
	// HACK: IndexLayout is absolutely positioned, so place actions inside it
	this.linkTypeIndex.$content.append( this.$otherActions );
	this.linkTypeIndex.getTabPanel( 'internal' ).$element.append( this.internalAnnotationInput.$element );
	this.linkTypeIndex.getTabPanel( 'external' ).$element.append( this.externalAnnotationInput.$element );
	this.form.$element.append( this.linkTypeIndex.$element );
};

/**
 * Check if the current input mode is for external links
 *
 * @return {boolean} Input mode is for external links
 */
ve.ui.MWLinkAnnotationInspector.prototype.isExternal = function () {
	return this.linkTypeIndex.getCurrentTabPanelName() === 'external';
};

/**
 * Handle change events on the internal link widget
 *
 * @param {ve.dm.MWInternalLinkAnnotation} annotation Annotation
 */
ve.ui.MWLinkAnnotationInspector.prototype.onInternalLinkChange = function () {
	this.updateActions();
};

/**
 * Handle list change events ('add') from the interal link's result widget
 *
 * @param {OO.ui.OptionWidget[]} items Added items
 * @param {number} index Index of insertion point
 */
ve.ui.MWLinkAnnotationInspector.prototype.onInternalLinkChangeResultsChange = function () {
	this.updateSize();
};

/**
 * Handle change events on the external link widget
 *
 * @param {ve.dm.MWExternalLinkAnnotation} annotation Annotation
 */
ve.ui.MWLinkAnnotationInspector.prototype.onExternalLinkChange = function () {
	this.updateActions();
};

/**
 * @inheritdoc
 */
ve.ui.MWLinkAnnotationInspector.prototype.updateActions = function () {
	var content, annotation, href, type,
		msg = null;

	ve.ui.MWLinkAnnotationInspector.super.prototype.updateActions.call( this );

	// show/hide convert action
	content = this.fragment ? this.fragment.getText() : '';
	annotation = this.annotationInput.getAnnotation();
	href = annotation && annotation.getHref();
	if ( href && ve.dm.MWMagicLinkNode.static.validateHref( content, href ) ) {
		type = ve.dm.MWMagicLinkType.static.fromContent( content ).type;
		msg = 'visualeditor-linkinspector-convert-link-' + type.toLowerCase();
	}

	// Once we toggle the visibility of the ActionWidget, we can't filter
	// it with `get` any more.  So we have to use `forEach`:
	this.actions.forEach( null, function ( action ) {
		if ( action.getAction() === 'convert' ) {
			if ( msg ) {
				action.setLabel( OO.ui.deferMsg( msg ) );
				action.toggle( true );
			} else {
				action.toggle( false );
			}
		}
	} );
};

/**
 * Handle change events on the internal link widget's input
 *
 * @param {string} value Current value of input widget
 */
ve.ui.MWLinkAnnotationInspector.prototype.onInternalLinkInputChange = function ( value ) {
	// If this looks like an external link, switch to the correct tabPanel.
	// Note: We don't care here if it's a *valid* link, so we just
	// check whether it looks like a URI -- i.e. whether it starts with
	// something that appears to be a schema per RFC1630. Later the external
	// link inspector will use getExternalLinkUrlProtocolsRegExp for validity
	// checking.
	// Note 2: RFC1630 might be too broad in practice. You don't really see
	// schemas that use the full set of allowed characters, and we might get
	// more false positives by checking for them.
	// Note 3: We allow protocol-relative URIs here.
	if ( this.internalAnnotationInput.getTextInputWidget().getValue() !== value ) {
		return;
	}
	if (
		!this.allowProtocolInInternal &&
		/^(?:[a-z][a-z0-9$\-_@.&!*"'(),]*:)?\/\//i.test( value.trim() )
	) {
		this.linkTypeIndex.setTabPanel( 'external' );
		// Changing tabPanel focuses and selects the input, so collapse the cursor back to the end.
		this.externalAnnotationInput.getTextInputWidget().moveCursorToEnd();
	}
};

/**
 * @inheritdoc
 */
ve.ui.MWLinkAnnotationInspector.prototype.createAnnotationInput = function () {
	return this.isExternal() ? this.externalAnnotationInput : this.internalAnnotationInput;
};

/**
 * @inheritdoc
 */
ve.ui.MWLinkAnnotationInspector.prototype.getSetupProcess = function ( data ) {
	return ve.ui.MWLinkAnnotationInspector.super.prototype.getSetupProcess.call( this, data )
		.next( function () {
			this.linkTypeIndex.setTabPanel(
				this.initialAnnotation instanceof ve.dm.MWExternalLinkAnnotation ? 'external' : 'internal'
			);
			this.annotationInput.setAnnotation( this.initialAnnotation );
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWLinkAnnotationInspector.prototype.getActionProcess = function ( action ) {
	if ( action === 'convert' ) {
		return new OO.ui.Process( function () {
			this.close( { action: 'done', convert: true } );
		}, this );
	}
	return ve.ui.MWLinkAnnotationInspector.super.prototype.getActionProcess.call( this, action );
};

/**
 * @inheritdoc
 */
ve.ui.MWLinkAnnotationInspector.prototype.getTeardownProcess = function ( data ) {
	var fragment;
	return ve.ui.MWLinkAnnotationInspector.super.prototype.getTeardownProcess.call( this, data )
		.first( function () {
			// Save the original fragment for later.
			fragment = this.getFragment();
		}, this )
		.next( function () {
			var annotations, data,
				selection = fragment && fragment.getSelection();

			// Handle conversion to magic link.
			if ( data && data.convert && selection instanceof ve.dm.LinearSelection ) {
				annotations = fragment.getDocument().data
					.getAnnotationsFromRange( selection.getRange() )
					// Remove link annotations
					.filter( function ( annotation ) {
						return !/^link/.test( annotation.name );
					} );
				data = new ve.dm.ElementLinearData( annotations.store, [
					{
						type: 'link/mwMagic',
						attributes: {
							content: fragment.getText()
						}
					},
					{
						type: '/link/mwMagic'
					}
				] );
				data.setAnnotationsAtOffset( 0, annotations );
				fragment.insertContent( data.getData(), true );
			}

			// Clear dialog state.
			this.allowProtocolInInternal = false;
			// Make sure both inputs are cleared
			this.internalAnnotationInput.setAnnotation( null );
			this.externalAnnotationInput.setAnnotation( null );
		}, this );
};

/**
 * Handle set events from the linkTypeIndex layout
 *
 * @param {OO.ui.TabPanelLayout} tabPanel Current tabPanel
 */
ve.ui.MWLinkAnnotationInspector.prototype.onLinkTypeIndexSet = function () {
	var text = this.annotationInput.getTextInputWidget().getValue(),
		end = text.length,
		isExternal = this.isExternal(),
		inputHasProtocol = ve.init.platform.getExternalLinkUrlProtocolsRegExp().test( text );

	this.annotationInput = isExternal ? this.externalAnnotationInput : this.internalAnnotationInput;

	this.updateSize();

	// If the user manually switches to internal links with an external link in the input, remember this
	if ( !isExternal && inputHasProtocol ) {
		this.allowProtocolInInternal = true;
	}

	this.annotationInput.getTextInputWidget().setValue( text ).focus();
	// Select entire link when switching, for ease of replacing entire contents.
	// Most common case:
	// 1. Inspector opened, internal-link shown with the selected-word prefilled
	// 2. User clicks external link tab (unnecessary, because we'd auto-switch, but the user doesn't know that)
	// 3. User pastes a link, intending to replace the existing prefilled link
	this.annotationInput.getTextInputWidget().$input[ 0 ].setSelectionRange( 0, end );
	// Focusing a TextInputWidget normally unsets validity. However, because
	// we're kind of pretending this is the same input, just in a different
	// mode, it doesn't make sense to the user that the focus behavior occurs.
	this.annotationInput.getTextInputWidget().setValidityFlag();

	this.updateActions();
};

/**
 * Gets an annotation object from a fragment.
 *
 * The type of link is automatically detected based on some crude heuristics.
 *
 * @method
 * @param {ve.dm.SurfaceFragment} fragment Current selection
 * @return {ve.dm.MWInternalLinkAnnotation|ve.dm.MWExternalLinkAnnotation|null}
 */
ve.ui.MWLinkAnnotationInspector.prototype.getAnnotationFromFragment = function ( fragment ) {
	var target = fragment.getText(),
		title = mw.Title.newFromText( target );

	// Figure out if this is an internal or external link
	if ( ve.init.platform.getExternalLinkUrlProtocolsRegExp().test( target ) ) {
		// External link
		return new ve.dm.MWExternalLinkAnnotation( {
			type: 'link/mwExternal',
			attributes: {
				href: target
			}
		} );
	} else if ( title ) {
		// Internal link
		return ve.dm.MWInternalLinkAnnotation.static.newFromTitle( title );
	} else {
		// Doesn't look like an external link and mw.Title considered it an illegal value,
		// for an internal link.
		return null;
	}
};

/**
 * @inheritdoc
 */
ve.ui.MWLinkAnnotationInspector.prototype.getInsertionData = function () {
	// If this is a new external link, insert an autonumbered link instead of a link annotation (in
	// #getAnnotation we have the same condition to skip the annotating). Otherwise call parent method
	// to figure out the text to insert and annotate.
	if ( this.isExternal() ) {
		return [
			{
				type: 'link/mwNumberedExternal',
				attributes: {
					href: this.annotationInput.getHref()
				}
			},
			{ type: '/link/mwNumberedExternal' }
		];
	} else {
		return ve.ui.MWLinkAnnotationInspector.super.prototype.getInsertionData.call( this );
	}
};

/**
 * ve.ui.MWInternalLinkAnnotationWidget.prototype.getHref will try to return an href, obviously,
 * but we don't want this to go into the text and can just call its parent instead.
 */
ve.ui.MWLinkAnnotationInspector.prototype.getInsertionText = function () {
	return this.annotationInput.constructor.super.prototype.getHref.call( this.annotationInput );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWLinkAnnotationInspector );
