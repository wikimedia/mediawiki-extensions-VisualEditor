/*!
 * VisualEditor UserInterface MWLinkNodeInspector class.
 *
 * @copyright See AUTHORS.txt
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
ve.ui.MWLinkNodeInspector = function VeUiMWLinkNodeInspector() {
	// Parent constructor
	ve.ui.MWLinkNodeInspector.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWLinkNodeInspector, ve.ui.NodeInspector );

/* Static properties */

ve.ui.MWLinkNodeInspector.static.name = 'linkNode';

ve.ui.MWLinkNodeInspector.static.title = OO.ui.deferMsg( 'visualeditor-linknodeinspector-title' );

ve.ui.MWLinkNodeInspector.static.modelClasses = [ ve.dm.MWNumberedExternalLinkNode ];

ve.ui.MWLinkNodeInspector.static.actions = [
	...ve.ui.MWLinkNodeInspector.super.static.actions,
	{
		action: 'convert',
		label: OO.ui.deferMsg( 'visualeditor-linknodeinspector-add-label' ),
		modes: [ 'edit' ]
	}
];

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
		return new OO.ui.Process( () => {
			this.close( { action: action } );
		} );
	}
	return ve.ui.MWLinkNodeInspector.super.prototype.getActionProcess.call( this, action );
};

/**
 * @inheritdoc
 */
ve.ui.MWLinkNodeInspector.prototype.getSetupProcess = function ( data ) {
	return ve.ui.MWLinkNodeInspector.super.prototype.getSetupProcess.call( this, data )
		.next( () => {
			// Initialization
			this.targetInput.setValue(
				this.selectedNode ? this.selectedNode.getAttribute( 'href' ) : ''
			);
			this.targetInput.setReadOnly( this.isReadOnly() );
		} );
};

/**
 * @inheritdoc
 */
ve.ui.MWLinkNodeInspector.prototype.getReadyProcess = function ( data ) {
	return ve.ui.MWLinkNodeInspector.super.prototype.getReadyProcess.call( this, data )
		.next( () => {
			this.targetInput.focus().select();
		} );
};

/**
 * @inheritdoc
 */
ve.ui.MWLinkNodeInspector.prototype.getTeardownProcess = function ( data = {} ) {
	return ve.ui.MWLinkNodeInspector.super.prototype.getTeardownProcess.call( this, data )
		.first( () => {
			let value = this.targetInput.getValue();
			const surfaceView = this.manager.getSurface().getView(),
				surfaceModel = this.getFragment().getSurface(),
				doc = surfaceModel.getDocument(),
				nodeRange = this.selectedNode.getOuterRange(),
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
					ve.dm.TransactionBuilder.static.newFromRemoval( doc, nodeRange )
				);
			} else if ( convert ) {
				const annotation = new ve.dm.MWExternalLinkAnnotation( {
					type: 'link/mwExternal',
					attributes: {
						href: value
					}
				} );
				const annotations = doc.data.getAnnotationsFromOffset( nodeRange.start ).clone();
				annotations.push( annotation );
				const content = value.split( '' );
				ve.dm.Document.static.addAnnotationsToData( content, annotations );
				surfaceModel.change(
					ve.dm.TransactionBuilder.static.newFromReplacement( doc, nodeRange, content )
				);
				setTimeout( () => {
					surfaceView.selectAnnotation( ( view ) => view.model instanceof ve.dm.MWExternalLinkAnnotation );
				} );
			} else {
				surfaceModel.change(
					ve.dm.TransactionBuilder.static.newFromAttributeChanges(
						doc, nodeRange.start, { href: value }
					)
				);
			}
		} );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWLinkNodeInspector );
