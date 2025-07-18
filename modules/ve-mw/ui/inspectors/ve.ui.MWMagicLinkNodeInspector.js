/*!
 * VisualEditor UserInterface MWMagicLinkNodeInspector class.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Inspector for editing MediaWiki magic links (RFC/ISBN/PMID).
 *
 * @class
 * @extends ve.ui.NodeInspector
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWMagicLinkNodeInspector = function VeUiMWMagicLinkNodeInspector() {
	// Parent constructor
	ve.ui.MWMagicLinkNodeInspector.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWMagicLinkNodeInspector, ve.ui.NodeInspector );

/* Static properties */

ve.ui.MWMagicLinkNodeInspector.static.name = 'linkMagicNode';

ve.ui.MWMagicLinkNodeInspector.static.title = null; // see #getSetupProcess

ve.ui.MWMagicLinkNodeInspector.static.modelClasses = [ ve.dm.MWMagicLinkNode ];

ve.ui.MWMagicLinkNodeInspector.static.actions = [
	...ve.ui.MWMagicLinkNodeInspector.super.static.actions,
	{
		action: 'convert',
		label: OO.ui.deferMsg( 'visualeditor-magiclinknodeinspector-convert-link' ),
		modes: [ 'edit' ]
	}
];

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWMagicLinkNodeInspector.prototype.initialize = function () {
	// Parent method
	ve.ui.MWMagicLinkNodeInspector.super.prototype.initialize.call( this );

	// Properties
	this.targetInput = new OO.ui.TextInputWidget( {
		validate: this.validate.bind( this )
	} );
	this.targetInput.on( 'change', this.onChange.bind( this ) );

	// Initialization
	this.form.$element.append( this.targetInput.$element );
};

/**
 * Return true if the given string is a valid magic link of the
 * appropriate type.
 *
 * @private
 * @param {string} str String to validate
 * @return {boolean} String is valid
 */
ve.ui.MWMagicLinkNodeInspector.prototype.validate = function ( str ) {
	const node = this.getFragment().getSelectedNode();
	return node.constructor.static.validateContent( str, node.getMagicType() );
};

ve.ui.MWMagicLinkNodeInspector.prototype.onChange = function ( value ) {
	// Disable the unsafe action buttons if the input isn't valid
	const isValid = this.validate( value );
	this.actions.forEach( null, ( action ) => {
		if ( !action.hasFlag( 'safe' ) ) {
			action.setDisabled( !isValid );
		}
	} );
};

/**
 * @inheritdoc
 */
ve.ui.MWMagicLinkNodeInspector.prototype.getActionProcess = function ( action ) {
	if ( ( action === 'done' || action === 'convert' ) &&
		!this.validate( this.targetInput.getValue() ) ) {
		// Don't close dialog: input isn't valid.
		return new OO.ui.Process( 0 );
	}
	if ( action === 'convert' ) {
		return new OO.ui.Process( () => {
			this.close( { action: action } );
		} );
	}
	return ve.ui.MWMagicLinkNodeInspector.super.prototype.getActionProcess.call( this, action );
};

/**
 * @inheritdoc
 */
ve.ui.MWMagicLinkNodeInspector.prototype.getSetupProcess = function ( data ) {
	// Set the title based on the node type
	const fragment = data.fragment,
		node = fragment instanceof ve.dm.SurfaceFragment ?
			fragment.getSelectedNode() : null,
		type = node instanceof ve.dm.MWMagicLinkNode ?
			node.getMagicType() : null,
		msg = type ?
			'visualeditor-magiclinknodeinspector-title-' + type.toLowerCase() :
			null;

	data = ve.extendObject( {
		// The following messages are used here
		// * visualeditor-magiclinknodeinspector-title-isbn
		// * visualeditor-magiclinknodeinspector-title-pmid
		// * visualeditor-magiclinknodeinspector-title-rfc
		title: msg ? OO.ui.deferMsg( msg ) : null
	}, data );
	return ve.ui.MWMagicLinkNodeInspector.super.prototype.getSetupProcess.call( this, data )
		.next( () => {
			// Initialization
			this.targetInput.setValue(
				this.selectedNode ? this.selectedNode.getAttribute( 'content' ) : ''
			).setReadOnly( this.isReadOnly() );
		} );
};

/**
 * @inheritdoc
 */
ve.ui.MWMagicLinkNodeInspector.prototype.getReadyProcess = function ( data ) {
	return ve.ui.MWMagicLinkNodeInspector.super.prototype.getReadyProcess.call( this, data )
		.next( () => {
			this.targetInput.focus().select();
		} );
};

/**
 * @inheritdoc
 */
ve.ui.MWMagicLinkNodeInspector.prototype.getTeardownProcess = function ( data = {} ) {
	return ve.ui.MWMagicLinkNodeInspector.super.prototype.getTeardownProcess.call( this, data )
		.first( () => {
			const surfaceView = this.manager.getSurface().getView(),
				surfaceModel = this.getFragment().getSurface(),
				doc = surfaceModel.getDocument(),
				nodeRange = this.selectedNode.getOuterRange(),
				value = this.targetInput.getValue(),
				done = data.action === 'done',
				convert = data.action === 'convert',
				remove = data.action === 'remove' || ( done && !value );

			if ( remove ) {
				surfaceModel.change(
					ve.dm.TransactionBuilder.static.newFromRemoval( doc, nodeRange )
				);
			} else if ( convert ) {
				const annotation = ve.dm.MWMagicLinkNode.static.annotationFromContent(
					value
				);
				if ( annotation ) {
					const annotations = doc.data.getAnnotationsFromOffset( nodeRange.start ).clone();
					annotations.push( annotation );
					const content = value.split( '' );
					ve.dm.Document.static.addAnnotationsToData( content, annotations );
					surfaceModel.change(
						ve.dm.TransactionBuilder.static.newFromReplacement( doc, nodeRange, content )
					);
					setTimeout( () => {
						surfaceView.selectAnnotation( ( view ) => view.model instanceof ve.dm.LinkAnnotation );
					} );
				}
			} else if ( done && this.validate( value ) ) {
				surfaceModel.change(
					ve.dm.TransactionBuilder.static.newFromAttributeChanges(
						doc, nodeRange.start, { content: value }
					)
				);
			}
		} );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWMagicLinkNodeInspector );
