/*!
 * VisualEditor user interface MWMetaDialog class.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for editing MediaWiki page information.
 *
 * @class
 * @extends ve.ui.FragmentDialog
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWMetaDialog = function VeUiMWMetaDialog( config ) {
	// Parent constructor
	ve.ui.MWMetaDialog.super.call( this, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWMetaDialog, ve.ui.FragmentDialog );

/* Static Properties */

ve.ui.MWMetaDialog.static.name = 'meta';

ve.ui.MWMetaDialog.static.title =
	OO.ui.deferMsg( 'visualeditor-dialog-meta-title' );

ve.ui.MWMetaDialog.static.size = 'large';

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWMetaDialog.prototype.getBodyHeight = function () {
	return 400;
};

/**
 * @inheritdoc
 */
ve.ui.MWMetaDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.MWMetaDialog.super.prototype.initialize.call( this );

	// Properties
	this.panels = new OO.ui.StackLayout();
	this.bookletLayout = new OO.ui.BookletLayout( { outlined: true } );
	this.pages = Object.keys( ve.ui.mwMetaDialogPageFactory.registry ).map(
		( name ) => ve.ui.mwMetaDialogPageFactory.create( name, name, { $overlay: this.$overlay } )
	);

	// Initialization
	this.$body.append( this.panels.$element );
	this.panels.addItems( [ this.bookletLayout ] );
	this.bookletLayout.addPages( this.pages );

	// Extensions reached for these to add their own fields to a built-in page. Deprecated,
	// and never extended to pages added since.
	[ 'categories', 'settings', 'advancedSettings', 'languages', 'templatesUsed' ].forEach( ( name ) => {
		mw.log.deprecate(
			this, name + 'Page', this.bookletLayout.getPage( name ),
			'Use bookletLayout.getPage() instead',
			've.ui.MWMetaDialog.' + name + 'Page'
		);
	} );

	this.bookletLayout.$menu.find( '[role=listbox]' ).first().attr( 'aria-label', OO.ui.deferMsg( 'visualeditor-dialog-meta-title' ) );
	this.oldSettings = null;
	this.widgetList = this.getAllWidgets();
};

/**
 * @return {boolean} Whether settings were changed.
 */
ve.ui.MWMetaDialog.prototype.compareSettings = function () {
	const newSettings = this.extractSettings();
	return !ve.compare( newSettings, this.oldSettings );
};

/**
 * @return {Object[]} An array of objects
 * {
 *     widget: OO.ui.Widget,
 *     name: string,
 *     hasChildren: boolean
 * }
 */
ve.ui.MWMetaDialog.prototype.getAllWidgets = function () {
	const widgetList = [];

	// eslint-disable-next-line no-jquery/no-each-util
	$.each( this.bookletLayout.pages, ( pageName, page ) => {
		const fieldsets = page.getFieldsets ? page.getFieldsets() : [];
		fieldsets.forEach( ( fieldset, fieldsetIndex ) => {
			fieldset.items.forEach( ( item, itemIndex ) => {
				const widget = item.fieldWidget;
				// we can recheck the value
				widgetList.push( {
					widget,
					name: pageName + '/' + fieldsetIndex + '/' + itemIndex,
					hasChildren: widget.items !== undefined
				} );
			} );
		} );
	} );

	return widgetList;
};

/**
 * Assigns updateActions to all widget updates.
 */
ve.ui.MWMetaDialog.prototype.assignEvents = function () {
	const widgetList = this.getAllWidgets();

	widgetList.forEach( ( value ) => {
		// This runs on every setup.
		value.widget.disconnect( this );
		value.widget.connect( this, {
			change: 'updateActions',
			select: 'updateActions'
		} );
	} );
};

/**
 * @param {Object} field Widget
 * @return {string|boolean} Value of the field
 */
ve.ui.MWMetaDialog.prototype.extractValue = function ( field ) {
	if ( field instanceof OO.ui.TextInputWidget ) {
		return field.getValue();
	} else if ( field instanceof OO.ui.CheckboxInputWidget ) {
		return field.isSelected();
	} else if ( field instanceof OO.ui.ButtonOptionWidget ) {
		return field.selected;
	} else if ( field instanceof ve.ui.MWCategoryItemWidget ) {
		return {
			value: field.value,
			sortKey: field.sortKey };
	} else if ( typeof field.getValue === 'function' ) {
		// Widget types the built-in pages don't use, e.g. dropdowns.
		return field.getValue();
	} else {
		throw new Error( 'Unhandled widget type', field );
	}
};

/**
 * @return {Object[]} An array of all widgets with their current value.
 * {
 *     name:string,
 *     value:string|boolean
 * }
 */
ve.ui.MWMetaDialog.prototype.extractSettings = function () {
	const ret = []; // return value

	this.widgetList.forEach( ( value ) => {
		if ( value.hasChildren ) {
			value.widget.items.forEach( ( item, index ) => {
				ret.push( {
					name: item.name + '/' + index,
					value: this.extractValue( item )
				} );
			} );
		} else {
			ret.push( {
				name: value.name,
				value: this.extractValue( value.widget )
			} );
		}
	} );

	return ret;
};

/**
 * @return {string} Name of the page shown when the dialog is opened without one
 */
ve.ui.MWMetaDialog.prototype.getDefaultPageName = function () {
	return this.pages[ 0 ].getName();
};

/**
 * Compares oldSetting with new settings and toggles the apply button accordingly.
 */
ve.ui.MWMetaDialog.prototype.updateActions = function () {
	// Validation may be asynchronous, so ignore any check the user has already superseded.
	const token = {};
	this.validationToken = token;

	ve.promiseAll(
		this.pages.map( ( page ) => page.isValid ? page.isValid() : true )
	).then( ( ...validities ) => {
		if ( this.validationToken !== token ) {
			return;
		}
		this.actions.setAbilities( {
			done: validities.every( Boolean ) && this.compareSettings()
		} );
	} );
};

/**
 * @inheritdoc ve.ui.FragmentWindow
 */
ve.ui.MWMetaDialog.prototype.isEditing = function () {
	// Always in editing mode, used for setting 'done' button label.
	return true;
};

/**
 * @inheritdoc
 */
ve.ui.MWMetaDialog.prototype.getActionProcess = function ( action ) {
	const surfaceModel = this.getFragment().getSurface();

	if ( action === 'done' ) {
		return new OO.ui.Process( () => {
			surfaceModel.applyStaging();
			this.close( { action } );
		} );
	}

	return ve.ui.MWMetaDialog.super.prototype.getActionProcess.call( this, action )
		.next( () => {
			surfaceModel.popStaging();
		} );
};

/**
 * @inheritdoc
 */
ve.ui.MWMetaDialog.prototype.getSetupProcess = function ( data = {} ) {
	return ve.ui.MWMetaDialog.super.prototype.getSetupProcess.call( this, data )
		.next( () => {
			const surfaceModel = this.getFragment().getSurface(),
				promises = [],
				selectWidget = this.bookletLayout.outlineSelectWidget,
				mode = ve.init.target.getSurface().getMode(),
				availablePages = [];

			this.pages.forEach( ( page ) => {
				const modes = page.constructor.static.modes;
				const available = !modes || modes.includes( mode );
				selectWidget.findItemFromData( page.getName() ).setDisabled( !available );
				if ( available ) {
					availablePages.push( page.getName() );
				}
			} );

			if ( !availablePages.includes( data.page || this.getDefaultPageName() ) ) {
				data.page = availablePages[ 0 ];
			}

			// Force all previous transactions to be separate from this history state
			surfaceModel.pushStaging();

			const config = {
				data,
				isReadOnly: this.isReadOnly()
			};

			// Let each page set itself up (not every page needs this)
			this.pages.forEach( ( page ) => {
				if ( page.setup ) {
					promises.push( page.setup( surfaceModel.getFragment(), config ) );
				}
			} );
			return ve.promiseAll( promises );
		} )
		.next( () => {
			if ( data.page && this.bookletLayout.getPage( data.page ) ) {
				// HACK: Prevent the setPage() call from focussing stuff in the selected page. For the
				// 'categories' page, this causes a dropdown to appear, and if it's done in the setup
				// process, the dropdown will be misaligned (T185944). We don't pass `autoFocus: false`
				// in the config because we want the auto-focus behavior when the user changes the page
				// after the dialog is open. We focus in getReadyProcess() anyway.
				this.bookletLayout.autoFocus = false;
				this.bookletLayout.setPage( data.page );
				this.bookletLayout.autoFocus = true;
			}

			// Not in initialize(): a page may only build its fields during setup.
			this.widgetList = this.getAllWidgets();
			this.assignEvents();
			this.oldSettings = this.extractSettings(); // setting that were just loaded

			this.actions.setAbilities( { done: false } );
		} );
};

/**
 * @inheritdoc
 */
ve.ui.MWMetaDialog.prototype.getReadyProcess = function ( data = {} ) {
	return ve.ui.MWMetaDialog.super.prototype.getReadyProcess.call( this, data )
		.next( () => {
			if ( data.page && this.bookletLayout.getPage( data.page ) ) {
				this.bookletLayout.getPage( data.page ).focus();
			}
		} );
};

/**
 * @inheritdoc
 */
ve.ui.MWMetaDialog.prototype.getTeardownProcess = function ( data = {} ) {
	return ve.ui.MWMetaDialog.super.prototype.getTeardownProcess.call( this, data )
		.first( () => {
			// Let each page tear itself down (not every page needs this)
			this.pages.forEach( ( page ) => {
				if ( page.teardown ) {
					page.teardown( { action: data.action } );
				}
			} );

			this.bookletLayout.setPage( this.getDefaultPageName() );
			this.bookletLayout.resetScroll();
		} );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWMetaDialog );
