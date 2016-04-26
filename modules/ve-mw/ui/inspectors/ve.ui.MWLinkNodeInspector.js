/*!
 * VisualEditor UserInterface MWLinkNodeInspector class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Inspector for editing unlabeled MediaWiki external links.
 *
 * @class
 * @extends ve.ui.NodeInspector
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWLinkNodeInspector = function VeUiMWLinkNodeInspector( config ) {
	// Parent constructor
	ve.ui.NodeInspector.call( this, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWLinkNodeInspector, ve.ui.NodeInspector );

/* Static properties */

ve.ui.MWLinkNodeInspector.static.name = 'linkNode';

ve.ui.MWLinkNodeInspector.static.title = OO.ui.deferMsg( 'visualeditor-linknodeinspector-title' );

ve.ui.MWLinkNodeInspector.static.modelClasses = [ ve.dm.MWNumberedExternalLinkNode ];

ve.ui.MWLinkNodeInspector.static.actions = ve.ui.MWLinkNodeInspector.super.static.actions.concat( [
	{
		action: 'convert',
		label: OO.ui.deferMsg( 'visualeditor-linknodeinspector-add-label' ),
		modes: [ 'edit' ]
	}
] );

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWLinkNodeInspector.prototype.initialize = function () {
	// Parent method
	ve.ui.MWLinkNodeInspector.super.prototype.initialize.call( this );

	// Properties
	this.targetInput = new OO.ui.TextInputWidget( {
		validate: ve.init.platform.getExternalLinkUrlProtocolsRegExp()
	} );

	// Initialization
	this.form.$element.append( this.targetInput.$element );
};

/**
 * @inheritdoc
 */
ve.ui.MWLinkNodeInspector.prototype.getActionProcess = function ( action ) {
	if ( action === 'convert' ) {
		return new OO.ui.Process( function () {
			this.close( { action: action } );
		}, this );
	}
	return ve.ui.MWLinkNodeInspector.super.prototype.getActionProcess.call( this, action );
};

/**
 * @inheritdoc
 */
ve.ui.MWLinkNodeInspector.prototype.getSetupProcess = function ( data ) {
	return ve.ui.MWLinkNodeInspector.super.prototype.getSetupProcess.call( this, data )
		.next( function () {
			// Initialization
			this.targetInput.setValue(
				this.selectedNode ? this.selectedNode.getAttribute( 'href' ) : ''
			);
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWLinkNodeInspector.prototype.getReadyProcess = function ( data ) {
	return ve.ui.MWLinkNodeInspector.super.prototype.getReadyProcess.call( this, data )
		.next( function () {
			this.targetInput.focus().select();
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWLinkNodeInspector.prototype.getTeardownProcess = function ( data ) {
	data = data || {};
	return ve.ui.MWLinkNodeInspector.super.prototype.getTeardownProcess.call( this, data )
		.first( function () {
			var content, annotation, annotations,
				surfaceView = this.manager.getSurface().getView(),
				surfaceModel = this.getFragment().getSurface(),
				doc = surfaceModel.getDocument(),
				nodeRange = this.selectedNode.getOuterRange(),
				value = this.targetInput.getValue(),
				convert = data.action === 'convert',
				remove = data.action === 'remove' || !value;

			// Default to http:// if the external link doesn't already begin with a supported
			// protocol - this prevents the link from being converted into literal text upon
			// save and also fixes a common mistake users may make
			if ( !ve.init.platform.getExternalLinkUrlProtocolsRegExp().test( value ) ) {
				value = 'http://' + value;
			}

			if ( remove ) {
				surfaceModel.change(
					ve.dm.Transaction.newFromRemoval( doc, nodeRange )
				);
			} else if ( convert ) {
				annotation = new ve.dm.MWExternalLinkAnnotation( {
					type: 'link/mwExternal',
					attributes: {
						href: value
					}
				} );
				annotations = doc.data.getAnnotationsFromOffset( nodeRange.start ).clone();
				annotations.push( annotation );
				content = value.split( '' );
				ve.dm.Document.static.addAnnotationsToData( content, annotations );
				surfaceModel.change(
					ve.dm.Transaction.newFromReplacement( doc, nodeRange, content )
				);
				setTimeout( function () {
					// This just removed the node and turned it into an annotation. Thus, this inspector
					// is about to go away. It'll be replaced by a context popup for the new annotation,
					// because the cursor will still be contained within it. Before it goes away, adjust
					// the selection to make _sure_ that if the user just starts typing, it won't delete
					// the entire link. We need to manually fiddle the selection a little, because
					// annotations mean that the LinearSelection can't granularly say whether the
					// selection starts inside or outside of the node.
					// If you can think of a test function for "the selection has stabilised", this could
					// be moved to ve.scheduler.
					// Note: we can't rely on surfaceView.activeLink, because the selection-focus created
					// by the transaction might be outside the link node. As such, get the node immediately
					// after the offset where we inserted the annotation, and then get the closest link
					// annotation to it.
					var node = surfaceView.getDocument().getNodeAndOffset( nodeRange.start + 1 ).node;
					surfaceView.selectNodeContents( $( node ).closest( '.ve-ce-linkAnnotation' )[ 0 ] );
				} );
			} else {
				surfaceModel.change(
					ve.dm.Transaction.newFromAttributeChanges(
						doc, nodeRange.start, { href: value }
					)
				);
			}
		}, this );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWLinkNodeInspector );
