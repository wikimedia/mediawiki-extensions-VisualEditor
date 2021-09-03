/**
 * Placeholder page for a currently unnamed parameter. Represented as a unnamed
 * {@see ve.dm.MWParameterModel} in the corresponding {@see ve.dm.MWTemplateModel}.
 *
 * @class
 * @extends OO.ui.PageLayout
 *
 * @constructor
 * @param {ve.dm.MWParameterModel} parameter Reference to a placeholder parameter with an empty
 *  name, as well as to the template the parameter belongs to
 * @param {string} name Unique symbolic name of page
 * @param {Object} [config] Configuration options
 * @cfg {jQuery} [$overlay] Overlay to render dropdowns in
 */
ve.ui.MWAddParameterPage = function VeUiMWAddParameterPage( parameter, name, config ) {
	// Parent constructor
	ve.ui.MWAddParameterPage.super.call( this, name, ve.extendObject( {
		scrollable: false
	}, config ) );

	this.template = parameter.getTemplate();
	this.isExpanded = false;

	// Header button to expand
	this.addParameterInputHeader = new OO.ui.ButtonWidget( {
		label: ve.msg( 'visualeditor-dialog-transclusion-add-undocumented-param' ),
		icon: 'add',
		framed: false,
		inline: true,
		classes: [ 've-ui-mwTransclusionDialog-addParameterFieldset-header' ]
	} )
		.connect( this, { click: 'togglePlaceholder' } );

	// Input field and button
	this.paramInputField = new OO.ui.TextInputWidget( {
		placeholder: ve.msg( 'visualeditor-dialog-transclusion-add-param-placeholder' )
	} )
		.connect( this, {
			change: 'onParameterNameChanged',
			enter: 'onParameterInput'
		} );
	this.saveButton = new OO.ui.ButtonWidget( {
		label: ve.msg( 'visualeditor-dialog-transclusion-add-param-save' ),
		flags: [ 'primary', 'progressive' ]
	} )
		.connect( this, { click: 'onParameterInput' } )
		.setDisabled( true );

	this.addParameterInputField = new OO.ui.ActionFieldLayout(
		this.paramInputField,
		this.saveButton,
		{ classes: [ 've-ui-mwTransclusionDialog-addParameterFieldset-input' ] }
	);

	var link = this.template.getTitle() || this.template.getTarget().wt;
	var $helpText = mw.message(
		'visualeditor-dialog-transclusion-add-param-help',
		link
	).parseDom();
	ve.init.platform.linkCache.styleElement( link, $helpText );
	this.addParameterFieldset = new OO.ui.FieldsetLayout( {
		label: this.addParameterInputHeader.$element,
		helpInline: true,
		help: $helpText,
		classes: [ 've-ui-mwTransclusionDialog-addParameterFieldset' ],
		$content: this.addParameterInputField.$element
	} );

	ve.targetLinksToNewWindow( this.addParameterFieldset.$element[ 0 ] );

	// Init visibility
	this.togglePlaceholder( false );

	// Initialization
	this.$element
		.addClass( 've-ui-mwParameterPlaceholderPage' )
		.append( this.addParameterFieldset.$element );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWAddParameterPage, OO.ui.PageLayout );

/* Methods */

/**
 * @private
 * @param {string} value
 */
ve.ui.MWAddParameterPage.prototype.onParameterNameChanged = function ( value ) {
	var paramName = value.trim(),
		isValid = /^[^={|}]+$/.test( paramName );
	this.saveButton.setDisabled( !isValid );
};

ve.ui.MWAddParameterPage.prototype.onParameterInput = function () {
	var name = this.paramInputField.getValue().trim();
	if ( !name || this.saveButton.isDisabled() ) {
		return;
	}

	this.paramInputField.setValue( '' );

	if ( this.template.hasParameter( name ) ) {
		return;
	}

	if ( this.template.getSpec().isParameterDocumented( name ) ) {
		// TODO: This special case needs a proper error message for the user
		return;
	}

	this.template.addParameter( new ve.dm.MWParameterModel( this.template, name ) );

	ve.track( 'activity.transclusion', {
		action: 'add-unknown-parameter'
	} );
};

/**
 * @private
 * @param {boolean} [expand]
 */
ve.ui.MWAddParameterPage.prototype.togglePlaceholder = function ( expand ) {
	this.isExpanded = expand === undefined ? !this.isExpanded : !!expand;

	this.addParameterInputHeader.setIcon( this.isExpanded ? 'subtract' : 'add' );
	this.addParameterFieldset.$element.toggleClass(
		've-ui-mwTransclusionDialog-addParameterFieldset-collapsed',
		!this.isExpanded
	);
	if ( this.isExpanded ) {
		this.paramInputField.focus();
	}
};

ve.ui.MWAddParameterPage.prototype.setOutlineItem = function () {
	// Parent method
	ve.ui.MWParameterPage.super.prototype.setOutlineItem.apply( this, arguments );

	if ( this.outlineItem ) {
		// This page should not be shown in the (BookletLayout-based) sidebar
		this.outlineItem.$element.empty().removeAttr( 'class' );
	}
};
