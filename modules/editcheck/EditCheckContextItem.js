/*!
 * VisualEditor EditCheckContextItem class.
 *
 * @copyright 2011-2019 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * Context item shown after a rich text paste.
 *
 * @class
 * @extends ve.ui.PersistentContextItem
 *
 * @constructor
 * @param {ve.ui.LinearContext} context Context the item is in
 * @param {ve.dm.Model} model Model the item is related to
 * @param {Object} [config]
 */
ve.ui.EditCheckContextItem = function VeUiEditCheckContextItem() {
	// Parent constructor
	ve.ui.EditCheckContextItem.super.apply( this, arguments );

	// Initialization
	this.$element.addClass( 've-ui-editCheckContextItem' );
};

/* Inheritance */

OO.inheritClass( ve.ui.EditCheckContextItem, ve.ui.PersistentContextItem );

/* Static Properties */

ve.ui.EditCheckContextItem.static.name = 'editCheck';

ve.ui.EditCheckContextItem.static.icon = 'quotes';

ve.ui.EditCheckContextItem.static.label = OO.ui.deferMsg( 'editcheck-dialog-addref-title' );

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.EditCheckContextItem.prototype.renderBody = function () {
	// Prompt panel
	var acceptButton = new OO.ui.ButtonWidget( {
		label: ve.msg( 'editcheck-dialog-action-yes' ),
		icon: 'check'
	} );
	var rejectButton = new OO.ui.ButtonWidget( {
		label: ve.msg( 'editcheck-dialog-action-no' ),
		icon: 'close'
	} );

	acceptButton.connect( this, { click: 'onAcceptClick' } );
	rejectButton.connect( this, { click: 'onRejectClick' } );

	// HACK: Suppress close button on mobile context
	if ( this.context.isMobile() ) {
		this.context.closeButton.toggle( false );
	}

	this.$body.append(
		$( '<p>' ).text( ve.msg( 'editcheck-dialog-addref-description' ) ),
		$( '<div>' ).addClass( 've-ui-editCheckContextItem-actions' ).append(
			acceptButton.$element, rejectButton.$element
		)
	);
};

ve.ui.EditCheckContextItem.prototype.close = function ( data ) {
	// HACK: Un-suppress close button on mobile context
	if ( this.context.isMobile() ) {
		this.context.closeButton.toggle( true );
	}
	this.data.saveProcessDeferred.resolve( data );
};

ve.ui.EditCheckContextItem.prototype.onAcceptClick = function () {
	var contextItem = this;
	var fragment = this.data.fragment;
	var windowAction = ve.ui.actionFactory.create( 'window', this.context.getSurface() );
	fragment.collapseToEnd().select();

	windowAction.open( 'citoid' ).then( function ( instance ) {
		return instance.closing;
	} ).then( function ( data ) {
		if ( !data ) {
			// Reference was not inserted - re-open this context
			setTimeout( function () {
				// Deactivate again for mobile after teardown has modified selections
				contextItem.context.getSurface().getView().deactivate();
				contextItem.context.afterContextChange();
			}, 500 );
		} else {
			// Edit check inspector is already closed by this point, but
			// we need to end the workflow.
			contextItem.close( data );
		}
	} );
};

ve.ui.EditCheckContextItem.prototype.onRejectClick = function () {
	var contextItem = this;
	var windowAction = ve.ui.actionFactory.create( 'window', this.context.getSurface() );
	windowAction.open(
		'editCheckInspector',
		{
			fragment: this.data.fragment,
			saveProcessDeferred: this.data.saveProcessDeferred
		}
	).then( function ( instance ) {
		// contextItem.openingCitoid = false;
		return instance.closing;
	} ).then( function ( data ) {
		if ( !data ) {
			// Form was closed, re-open this context
			contextItem.context.afterContextChange();
		} else {
			contextItem.close( data );
		}
	} );
};

/* Registration */

ve.ui.contextItemFactory.register( ve.ui.EditCheckContextItem );
