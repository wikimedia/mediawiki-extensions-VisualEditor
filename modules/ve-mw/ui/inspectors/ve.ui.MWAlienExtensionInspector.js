/*!
 * VisualEditor UserInterface MWAlienExtensionInspector class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki alien extension inspector.
 *
 * @class
 * @extends ve.ui.MWExtensionInspector
 *
 * @constructor
 * @param {ve.ui.Surface} surface Surface inspector is for
 * @param {Object} [config] Configuration options
 */
ve.ui.MWAlienExtensionInspector = function VeUiMWAlienExtensionInspector( surface, config ) {
	// Parent constructor
	ve.ui.MWExtensionInspector.call( this, surface, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWAlienExtensionInspector, ve.ui.MWExtensionInspector );

/* Static properties */

ve.ui.MWAlienExtensionInspector.static.name = 'alienExtension';

ve.ui.MWAlienExtensionInspector.static.icon = 'alienextension';

ve.ui.MWAlienExtensionInspector.static.title =
	OO.ui.deferMsg( 'visualeditor-mwalienextensioninspector-title' );

ve.ui.MWAlienExtensionInspector.static.nodeView = ve.ce.MWAlienExtensionNode;

ve.ui.MWAlienExtensionInspector.static.nodeModel = ve.dm.MWAlienExtensionNode;

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWAlienExtensionInspector.prototype.getTitle = function () {
	return this.surface.getView().getFocusedNode().getModel().getExtensionName();
};

/**
 * @inheritdoc
 */
ve.ui.MWAlienExtensionInspector.prototype.initialize = function () {
	// Parent method
	ve.ui.MWExtensionInspector.prototype.initialize.call( this );

	var key, attributeInput, field,
		attributes = this.surface.getView().getFocusedNode().model.getAttribute( 'mw' ).attrs;

	this.attributeInputs = {};

	if ( attributes && !ve.isEmptyObject( attributes ) ) {
		for ( key in attributes ) {
			attributeInput = new OO.ui.TextInputWidget( {
				'$': this.$,
				'value': attributes[key]
			} );
			this.attributeInputs[key] = attributeInput;
			field = new OO.ui.FieldLayout(
				attributeInput,
				{
					'$': this.$,
					'align': 'left',
					'label': key
				}
			);
			this.$form.append( field.$element.addClass( 've-ui-mwAlienExtensionInspector-attributes' ) );
		}
	}
};

/** */
ve.ui.MWAlienExtensionInspector.prototype.updateMwData = function ( mwData ) {
	// Parent method
	ve.ui.MWExtensionInspector.prototype.updateMwData.call( this, mwData );

	var key;

	if ( !ve.isEmptyObject( this.attributeInputs ) ) {
		// Make sure we have an attrs object to populate
		mwData.attrs = mwData.attrs || {};
		for ( key in this.attributeInputs ) {
			mwData.attrs[key] = this.attributeInputs[key].getValue();
		}
	}
};

/* Registration */

ve.ui.inspectorFactory.register( ve.ui.MWAlienExtensionInspector );
