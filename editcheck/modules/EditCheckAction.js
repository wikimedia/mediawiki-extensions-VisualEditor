/**
 * EditCheckAction
 *
 * @param {Object} config
 * @param {mw.editcheck.BaseEditCheck} check
 * @param {ve.dm.SurfaceFragment[]} fragments Affected fragments
 * @param {jQuery|string|Function|OO.ui.HtmlSnippet} message Check message body
 * @param {jQuery|string|Function|OO.ui.HtmlSnippet} title Check title
 */
mw.editcheck.EditCheckAction = function MWEditCheckAction( config ) {
	this.check = config.check;
	this.fragments = config.fragments;
	this.message = config.message;
	this.id = config.id;
	this.title = config.title;
	this.icon = config.icon;
	this.type = config.type || 'warning';
};

OO.initClass( mw.editcheck.EditCheckAction );

/**
 * Get the action's title
 *
 * @return {jQuery|string|Function|OO.ui.HtmlSnippet}
 */
mw.editcheck.EditCheckAction.prototype.getTitle = function () {
	return this.title || this.check.getTitle( this );
};

/**
 * Get the available choices
 *
 * @return {Object[]}
 */
mw.editcheck.EditCheckAction.prototype.getChoices = function () {
	return this.check.getChoices( this );
};

/**
 * Get selections to highlight for this check
 *
 * @return {ve.dm.Selection[]}
 */
mw.editcheck.EditCheckAction.prototype.getHighlightSelections = function () {
	return this.fragments.map( ( fragment ) => fragment.getSelection() );
};

/**
 * Get a description of the check
 *
 * @return {string}
 */
mw.editcheck.EditCheckAction.prototype.getDescription = function () {
	return this.message || this.check.getDescription( this );
};

mw.editcheck.EditCheckAction.prototype.getType = function () {
	return this.type;
};

/**
 * Get the name of the check type
 *
 * @return {string} Check type name
 */
mw.editcheck.EditCheckAction.prototype.getName = function () {
	return this.check.getName();
};

mw.editcheck.EditCheckAction.prototype.render = function ( collapsed, singleAction, surface ) {
	const widget = new mw.editcheck.EditCheckActionWidget( {
		type: this.type,
		icon: this.icon,
		label: this.getTitle(),
		message: this.getDescription(),
		classes: collapsed ? [ 've-ui-editCheckActionWidget-collapsed' ] : '',
		singleAction: singleAction
	} );
	this.getChoices().forEach( ( choice ) => {
		const button = new OO.ui.ButtonWidget( choice );
		button.connect( this, {
			click: () => {
				const promise = this.check.act( choice.action, this, surface ) || ve.createDeferred().resolve().promise();
				widget.emit( 'act', choice, choice.action, promise );
			}
		} );
		widget.addAction( button );
	} );

	return widget;
};

mw.editcheck.EditCheckActionWidget = function MWEditCheckActionWidget( config ) {
	// Configuration initialization
	config = config || {};

	this.singleAction = config.singleAction;

	this.actions = [];

	// Parent constructor
	mw.editcheck.EditCheckActionWidget.super.call( this, config );

	// Mixin constructors
	OO.ui.mixin.IconElement.call( this, config );
	OO.ui.mixin.LabelElement.call( this, config );
	OO.ui.mixin.TitledElement.call( this, config );
	OO.ui.mixin.FlaggedElement.call( this, config );

	this.setType( config.type );

	if ( config.icon ) {
		this.setIcon( config.icon );
	}

	this.message = new OO.ui.LabelWidget( { label: config.message } );
	this.$actions = $( '<div>' ).addClass( 've-ui-editCheckActionWidget-actions oo-ui-element-hidden' );

	this.$head = $( '<div>' )
		.append( this.$icon, this.$label )
		.addClass( 've-ui-editCheckActionWidget-head' )
		.on( 'click', this.onHeadClick.bind( this ) );
	this.$body = $( '<div>' )
		.append( this.message.$element, this.$actions )
		.addClass( 've-ui-editCheckActionWidget-body' );

	this.$element
		.append( this.$head, this.$body )
		// .append( this.$icon, this.$label, this.closeButton && this.closeButton.$element )
		.addClass( 've-ui-editCheckActionWidget' );
};

OO.inheritClass( mw.editcheck.EditCheckActionWidget, OO.ui.Widget );
OO.mixinClass( mw.editcheck.EditCheckActionWidget, OO.ui.mixin.IconElement );
OO.mixinClass( mw.editcheck.EditCheckActionWidget, OO.ui.mixin.LabelElement );
OO.mixinClass( mw.editcheck.EditCheckActionWidget, OO.ui.mixin.TitledElement );
OO.mixinClass( mw.editcheck.EditCheckActionWidget, OO.ui.mixin.FlaggedElement );

/**
 * @inheritdoc
 */
mw.editcheck.EditCheckActionWidget.prototype.setDisabled = function ( disabled ) {
	OO.ui.Widget.prototype.setDisabled.call( this, disabled );
	this.actions.forEach( ( action ) => {
		action.setDisabled( disabled );
	} );
};

mw.editcheck.EditCheckActionWidget.static.iconMap = {
	notice: 'infoFilled',
	error: 'error',
	warning: 'alert'
};

mw.editcheck.EditCheckActionWidget.prototype.setType = function ( type ) {
	if ( !this.constructor.static.iconMap[ type ] ) {
		type = 'notice';
	}
	if ( type !== this.type ) {
		this.clearFlags();
		this.setFlags( type );

		this.setIcon( this.constructor.static.iconMap[ type ] );
	}
	this.type = type;
};

mw.editcheck.EditCheckActionWidget.prototype.getType = function () {
	return this.type;
};

mw.editcheck.EditCheckActionWidget.prototype.addAction = function ( action ) {
	this.actions.push( action );
	this.$actions.append( action.$element ).removeClass( 'oo-ui-element-hidden' );
};

mw.editcheck.EditCheckActionWidget.prototype.onHeadClick = function ( e ) {
	if ( this.singleAction ) {
		return;
	}

	e.preventDefault();
	// eslint-disable-next-line no-jquery/no-class-state
	this.$element.toggleClass( 've-ui-editCheckActionWidget-collapsed' );
	// eslint-disable-next-line no-jquery/no-class-state
	this.emit( 'togglecollapse', this.$element.hasClass( 've-ui-editCheckActionWidget-collapsed' ) );
};
