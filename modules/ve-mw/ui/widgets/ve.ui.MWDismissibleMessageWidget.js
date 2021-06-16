/**
 * Creates a ve.ui.MWDismissibleMessageWidget object.
 *
 * This widget allows a user to permanently dismiss a message widget
 * {@see OO.ui.MessageWidget}. When the widget is dismissed, a flag
 * is set in the local storage. This flag will then be used to prevent
 * the widget from being shown on subsequent views.
 *
 * @class
 * @extends OO.ui.MessageWidget
 *
 * @constructor
 * @param {Object} config Configuration options
 * @cfg {mw.Message} message Message to display
 */
ve.ui.MWDismissibleMessageWidget = function VeUiMWDismissibleMessageWidget( config ) {
	var $label = config.message.parseDom();
	$label.filter( 'a' ).attr( 'target', '_blank' );
	// eslint-disable-next-line no-jquery/variable-pattern
	config.label = $label;

	// Parent constructor
	ve.ui.MWDismissibleMessageWidget.super.call( this, config );

	// Properties
	this.messageKey = config.message.key;
	delete config.message;

	var dismissButton = new OO.ui.ButtonWidget( {
		icon: 'close',
		framed: false
	} )
		.connect( this, { click: 'onDismissClick' } );

	this.$element
		.addClass( 've-ui-dismissibleMessageWidget' )
		.prepend( dismissButton.$element );

	var hidden = !!mw.storage.get( this.getStorageKey() );
	this.toggle( !hidden );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWDismissibleMessageWidget, OO.ui.MessageWidget );

/* Static Properties */

ve.ui.MWDismissibleMessageWidget.static.storageKeyPrefix = 'mwe-visualeditor-hide-';

/* Methods */

/**
 * Generates a local storage key using both a shared prefix and
 * the message's key {@see mw.Message}.
 *
 * @return {string} The local storage key
 */
ve.ui.MWDismissibleMessageWidget.prototype.getStorageKey = function () {
	return this.constructor.static.storageKeyPrefix + this.messageKey;
};

/**
 * Respond to dismiss button click event.
 * @fires close
 */
ve.ui.MWDismissibleMessageWidget.prototype.onDismissClick = function () {
	mw.storage.set( this.getStorageKey(), '1' );
	this.toggle( false );
	this.emit( 'close' );
};
