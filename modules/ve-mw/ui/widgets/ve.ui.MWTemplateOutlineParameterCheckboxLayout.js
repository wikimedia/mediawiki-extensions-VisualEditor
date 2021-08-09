/*!
 * VisualEditor user interface MWTemplateOutlineParameterCheckboxLayout class.
 *
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Container for checkbox and label
 *
 * @class
 * @extends OO.ui.FieldLayout
 *
 * @constructor
 * @param {Object} config
 * @cfg {string} data Parameter name
 * @cfg {string} label
 * @cfg {boolean} [required]
 * @cfg {boolean} [selected]
 */
ve.ui.MWTemplateOutlineParameterCheckboxLayout = function VeUiMWTemplateOutlineParameterCheckboxLayout( config ) {
	config = config || {};
	config = ve.extendObject( { align: 'inline' }, config );

	var checkbox = new OO.ui.CheckboxInputWidget( {
		title: config.required ? ve.msg( 'visualeditor-dialog-transclusion-required-parameter' ) : null,
		disabled: config.required,
		selected: config.selected || config.required
	} )
	// FIXME: pass-through binding like [ 'emit', 'toggle' ]?
		.connect( this, { change: 'onCheckboxChange' } );
	checkbox.$input.on( 'keydown', this.onCheckboxKeyDown.bind( this ) );

	// Parent constructor
	ve.ui.MWTemplateOutlineParameterCheckboxLayout.super.call( this, checkbox, config );

	// Mixin constructors
	if ( checkbox.isDisabled() ) {
		OO.ui.mixin.TabIndexedElement.call( this, config );
	}

	// Initialization
	this.$element
		.addClass( 've-ui-mwTransclusionOutlineItem' )
		.on( 'click', this.onClick.bind( this ) )
		.on( 'keydown', this.onKeyDown.bind( this ) );

	// Override base behaviors
	// Unwire native label->input linkage, and replace with our custom click handler.
	this.$label.attr( 'for', null );
	this.$header.on( 'click', this.onLabelClick.bind( this ) );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTemplateOutlineParameterCheckboxLayout, OO.ui.FieldLayout );
OO.mixinClass( ve.ui.MWTemplateOutlineParameterCheckboxLayout, OO.ui.mixin.TabIndexedElement );

/* Events */

/**
 * @event change
 * @param {string} paramName
 * @param {boolean} checked New checkbox state
 */

/**
 * @event select
 * @param {string} paramName
 */

/* Methods */

// FIXME: This is a hack. Needs to be a subclass of Widget instead.
ve.ui.MWTemplateOutlineParameterCheckboxLayout.prototype.isDisabled = function () {
	return false;
};

/**
 * @fires select
 */
ve.ui.MWTemplateOutlineParameterCheckboxLayout.prototype.onClick = function () {
	this.emit( 'select', this.getData() );
};

ve.ui.MWTemplateOutlineParameterCheckboxLayout.prototype.onKeyDown = function ( e ) {
	if ( e.keyCode === OO.ui.Keys.ENTER ) {
		this.emit( 'select', this.getData() );
		return false;
	}
};

ve.ui.MWTemplateOutlineParameterCheckboxLayout.prototype.onCheckboxKeyDown = function ( e ) {
	if ( e.keyCode === OO.ui.Keys.ENTER ) {
		this.fieldWidget.setSelected( true );
		this.emit( 'select', this.getData() );
		return false;
	}
};

/**
 * Handles a checkbox input widget change event {@see OO.ui.CheckboxInputWidget}.
 *
 * @param {boolean} value
 * @fires change
 */
ve.ui.MWTemplateOutlineParameterCheckboxLayout.prototype.onCheckboxChange = function ( value ) {
	this.emit( 'change', this.getData(), value );
};

ve.ui.MWTemplateOutlineParameterCheckboxLayout.prototype.onLabelClick = function () {
	this.fieldWidget.setSelected( true );
};

ve.ui.MWTemplateOutlineParameterCheckboxLayout.prototype.setSelected = function ( state, internal ) {
	this.fieldWidget.setSelected( state, internal );
};
