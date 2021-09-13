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

	this.template = parameter.getTemplate()
		.connect( this, {
			// There is a "change" event, but it triggers way to often even for content changes
			add: 'onTemplateParametersChanged',
			remove: 'onTemplateParametersChanged'
		} );
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
			enter: 'onParameterNameSubmitted'
		} );
	this.saveButton = new OO.ui.ButtonWidget( {
		label: ve.msg( 'visualeditor-dialog-transclusion-add-param-save' ),
		flags: [ 'primary', 'progressive' ],
		disabled: true
	} )
		.connect( this, { click: 'onParameterNameSubmitted' } );

	this.actionFieldLayout = new OO.ui.ActionFieldLayout(
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
		$content: this.actionFieldLayout.$element
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
 * @inheritDoc OO.ui.PanelLayout
 */
ve.ui.MWAddParameterPage.prototype.focus = function () {
	if ( this.isExpanded ) {
		this.paramInputField.focus();
		return;
	}

	// Parent method
	ve.ui.MWAddParameterPage.super.prototype.focus.apply( this, arguments );
};

/**
 * @private
 */
ve.ui.MWAddParameterPage.prototype.onTemplateParametersChanged = function () {
	this.onParameterNameChanged( this.paramInputField.getValue() );
};

/**
 * @private
 * @param {string} value
 */
ve.ui.MWAddParameterPage.prototype.onParameterNameChanged = function ( value ) {
	var paramName = value.trim(),
		errors = this.getValidationErrors( paramName );

	this.actionFieldLayout.setErrors( errors );
	this.saveButton.setDisabled( !paramName || errors.length );
};

/**
 * @private
 */
ve.ui.MWAddParameterPage.prototype.onParameterNameSubmitted = function () {
	var name = this.paramInputField.getValue().trim();
	if ( !name || this.saveButton.isDisabled() ) {
		return;
	}

	this.paramInputField.setValue( '' );

	if ( this.template.hasParameter( name ) ) {
		return;
	}

	var param = new ve.dm.MWParameterModel( this.template, name );
	this.template.addParameter( param );
	this.emit( 'focusTemplateParameterById', param.getId() );

	ve.track( 'activity.transclusion', {
		action: 'add-unknown-parameter'
	} );
};

/**
 * @private
 * @param {string} name Parameter name or alias
 * @return {jQuery[]} An array as accepted by {@see OO.ui.FieldLayout.setErrors}
 */
ve.ui.MWAddParameterPage.prototype.getValidationErrors = function ( name ) {
	if ( !name ) {
		return [];
	}

	var forbiddenCharacter = name.match( /[={|}]/ );
	if ( forbiddenCharacter ) {
		return [ mw.message( 'visualeditor-dialog-transclusion-add-param-error-forbidden-char',
			forbiddenCharacter[ 0 ] ).parseDom() ];
	}

	var key,
		spec = this.template.getSpec();

	if ( spec.getParameterAliases( name ).indexOf( name ) !== -1 ) {
		key = 'visualeditor-dialog-transclusion-add-param-error-alias';
	} else if ( this.template.hasParameter( name ) ) {
		key = 'visualeditor-dialog-transclusion-add-param-error-exists-selected';
	} else if ( spec.isParameterDeprecated( name ) ) {
		key = 'visualeditor-dialog-transclusion-add-param-error-deprecated';
	} else if ( spec.isKnownParameterOrAlias( name ) ) {
		key = 'visualeditor-dialog-transclusion-add-param-error-exists-unselected';
	}

	if ( !key ) {
		return [];
	}

	var label = spec.getParameterLabel( this.template.getOriginalParameterName( name ) ),
		// eslint-disable-next-line mediawiki/msg-doc
		$msg = mw.message( key, name, label ).parseDom();
	ve.targetLinksToNewWindow( $( '<div>' ).append( $msg )[ 0 ] );
	return [ $msg ];
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

/**
 * @inheritDoc OO.ui.PageLayout
 */
ve.ui.MWAddParameterPage.prototype.setupOutlineItem = function () {
	this.outlineItem
		// Basic properties to make the OO.ui.OutlineControlsWidget buttons behave sane
		.setMovable( false )
		.setRemovable( false )
		.setLevel( 1 )
		// This page should not be shown in the (BookletLayout-based) sidebar
		.$element.empty().removeAttr( 'class' );
};
