/**
 * EditCheckActionWidget
 *
 * @class
 * @extends OO.ui.MessageWidget
 *
 * @param {Object} config Configuration options
 * @param {string} config.type Type of message (e.g., 'warning', 'error')
 * @param {string} [config.icon] Icon name
 * @param {string|jQuery|Function|OO.ui.HtmlSnippet} config.label Title
 * @param {string|jQuery|Function|OO.ui.HtmlSnippet} config.message Body message
 * @param {boolean} [config.singleAction] This is the only action shown
 * @param {string} [config.mode] Mode for the action set widget
 */
mw.editcheck.EditCheckActionWidget = function MWEditCheckActionWidget( config ) {
	this.singleAction = config.singleAction;
	this.mode = config.mode || '';

	this.actions = new OO.ui.ActionSet();
	this.actions.connect( this, {
		change: 'onActionsChange'
	} );

	mw.editcheck.EditCheckActionWidget.super.call( this, config );

	this.message = new OO.ui.LabelWidget( { label: config.message } );
	this.footer = config.footer && new OO.ui.LabelWidget( {
		label: config.footer,
		classes: [ 've-ui-editCheckActionWidget-footer' ]
	} );
	this.$actions = $( '<div>' ).addClass( 've-ui-editCheckActionWidget-actions oo-ui-element-hidden' );

	this.$element.on( 'click', this.onClick.bind( this ) );

	this.$body = $( '<div>' )
		.append( this.message.$element, this.$actions )
		.addClass( 've-ui-editCheckActionWidget-body' );

	if ( this.footer ) {
		this.$body.append( this.footer.$element );
	}

	this.$element
		.append( this.$body )
		.addClass( 've-ui-editCheckActionWidget' );
};

/* Inheritance */

OO.inheritClass( mw.editcheck.EditCheckActionWidget, OO.ui.MessageWidget );

/* Events */

/**
 * Fired when the user toggles the collapsed state of the widget.
 *
 * @event mw.editcheck.EditCheckActionWidget#togglecollapse
 * @param {boolean} collapsed Whether the widget is now collapsed
 */

/* Methods */

/**
 * Handle change events on the action set
 */
mw.editcheck.EditCheckActionWidget.prototype.onActionsChange = function () {
	this.$actions.empty().addClass( 'oo-ui-element-hidden' );
	this.actions.get( { modes: [ this.mode ] } ).forEach( ( actionWidget ) => {
		this.$actions.append( actionWidget.$element ).removeClass( 'oo-ui-element-hidden' );
	} );
};

/**
 * @inheritdoc
 */
mw.editcheck.EditCheckActionWidget.prototype.setDisabled = function ( disabled ) {
	OO.ui.Widget.prototype.setDisabled.call( this, disabled );
	this.actions.forEach( null, ( action ) => {
		action.setDisabled( disabled );
	} );
};

/**
 * Handle click events anywhere on the widget
 *
 * @param {jQuery.Event} e Click event
 * @fires mw.editcheck.EditCheckActionWidget#togglecollapse
 */
mw.editcheck.EditCheckActionWidget.prototype.onClick = function ( e ) {
	if ( this.singleAction ) {
		return;
	}
	if ( this.$body[ 0 ].contains( e.target ) ) {
		return;
	}

	e.preventDefault();
	// eslint-disable-next-line no-jquery/no-class-state
	this.$element.toggleClass( 've-ui-editCheckActionWidget-collapsed' );
	// eslint-disable-next-line no-jquery/no-class-state
	this.emit( 'togglecollapse', this.$element.hasClass( 've-ui-editCheckActionWidget-collapsed' ) );
};
