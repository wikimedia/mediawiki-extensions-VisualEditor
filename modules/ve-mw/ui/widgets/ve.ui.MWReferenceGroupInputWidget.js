/*!
 * VisualEditor UserInterface MWReferenceGroupInput class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Creates an ve.ui.MWReferenceGroupInput object.
 *
 * @class
 * @extends OO.ui.ComboBoxWidget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @cfg {string} emptyGroupName Label of the placeholder item
 */
ve.ui.MWReferenceGroupInputWidget = function VeUiMWReferenceGroupInput( config ) {
	config = config || {};

	this.emptyGroupName = config.emptyGroupName;

	// Parent constructor
	OO.ui.ComboBoxWidget.call( this, $.extend( true, { input: { placeholder: config.emptyGroupName } }, config ) );

	this.$element.addClass( 've-ui-mwReferenceGroupInputWidget' );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWReferenceGroupInputWidget, OO.ui.ComboBoxWidget );

/* Methods */

/**
 * Populate the reference group menu
 *
 * @param {ve.dm.InternalList} internalList Internal list with which to populate the menu
 */
ve.ui.MWReferenceGroupInputWidget.prototype.populateMenu = function ( internalList ) {
	var placeholderGroupItem = new OO.ui.MenuItemWidget( '', {
		$: this.$,
		label: this.emptyGroupName,
		flags: 'emptyGroupPlaceholder'
	} );
	this.menu.clearItems();
	this.menu.addItems( [ placeholderGroupItem ].concat( $.map(
		Object.keys( internalList.getNodeGroups() ),
		function ( groupInternalName ) {
			if ( groupInternalName.indexOf( 'mwReference/' ) === 0 ) {
				var groupName = groupInternalName.substring( 'mwReference/'.length );
				if ( groupName ) {
					return new OO.ui.MenuItemWidget( groupName, { label: groupName } );
				}
			}
		}
	) ), 0 );
	this.onInputChange( this.input.getValue() );
	this.menu.toggle( false );
};
