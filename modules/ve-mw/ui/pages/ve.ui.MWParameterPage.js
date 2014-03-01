/*!
 * VisualEditor user interface MWParameterPage class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki transclusion dialog template page.
 *
 * @class
 * @extends OO.ui.PageLayout
 *
 * @constructor
 * @param {ve.dm.MWParameterModel} parameter Template parameter
 * @param {string} name Unique symbolic name of page
 * @param {Object} [config] Configuration options
 */
ve.ui.MWParameterPage = function VeUiMWParameter( parameter, name, config ) {
	var spec = parameter.getTemplate().getSpec();

	// Parent constructor
	OO.ui.PageLayout.call( this, name, config );

	// Properties
	this.parameter = parameter;
	this.spec = spec;
	this.valueInput = new OO.ui.TextInputWidget( {
			'$': this.$,
			'multiline': true,
			'autosize': true,
			'classes': [ 've-ui-mwTransclusionDialog-input' ]
		} )
		.setValue( this.parameter.getValue() )
		.connect( this, { 'change': 'onTextInputChange' } );
	this.valueField = new OO.ui.FieldLayout( this.valueInput, {
		'$': this.$,
		'align': 'top',
		'label': this.spec.getParameterDescription( this.parameter.getName() ) || ''
	} );
	this.removeButton = new OO.ui.ButtonWidget( {
			'$': this.$,
			'frameless': true,
			'icon': 'remove',
			'title': ve.msg( 'visualeditor-dialog-transclusion-remove-param' ),
			'flags': ['destructive'],
			'classes': [ 've-ui-mwTransclusionDialog-removeButton' ]
		} )
		.connect( this, { 'click': 'onRemoveButtonClick' } );
	this.valueFieldset = new OO.ui.FieldsetLayout( {
		'$': this.$,
		'label': this.spec.getParameterLabel( this.parameter.getName() ),
		'icon': 'parameter',
		'items': [ this.valueInput ]
	} );

	// TODO: Use spec.required
	// TODO: Use spec.deprecation
	// TODO: Use spec.default
	// TODO: Use spec.type

	// Initialization
	this.$element.append( this.valueFieldset.$element, this.removeButton.$element );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWParameterPage, OO.ui.PageLayout );

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWParameterPage.prototype.setOutlineItem = function ( outlineItem ) {
	// Parent method
	OO.ui.PageLayout.prototype.setOutlineItem.call( this, outlineItem );

	if ( this.outlineItem ) {
		this.outlineItem
			.setIcon( 'parameter' )
			.setMovable( false )
			.setRemovable( true )
			.setLevel( 1 )
			.setLabel( this.spec.getParameterLabel( this.parameter.getName() ) );

		if ( this.parameter.isRequired() ) {
			this.outlineItem
				.setIndicator( 'required' )
				.setIndicatorTitle( ve.msg( 'visualeditor-dialog-transclusion-required-parameter' ) );
		}
	}
};

ve.ui.MWParameterPage.prototype.onTextInputChange = function () {
	this.parameter.setValue( this.valueInput.getValue() );
};

ve.ui.MWParameterPage.prototype.onRemoveButtonClick = function () {
	this.parameter.remove();
};
