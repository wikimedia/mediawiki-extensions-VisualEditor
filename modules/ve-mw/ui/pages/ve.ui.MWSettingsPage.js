/*!
 * VisualEditor user interface MWSettingsPage class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki meta dialog settings page.
 *
 * @class
 * @extends OO.ui.PageLayout
 *
 * @constructor
 * @param {ve.ui.Surface} surface Surface being worked on
 * @param {string} name Unique symbolic name of page
 * @param {Object} [config] Configuration options
 */
ve.ui.MWSettingsPage = function VeUiMWSettingsPage( surface, name, config ) {
	// Configuration initialization
	config = ve.extendObject( {
		'icon': 'settings',
		'label': ve.msg( 'visualeditor-dialog-meta-settings-section' )
	}, config );

	// Parent constructor
	OO.ui.PageLayout.call( this, name, config );

	// Properties
	this.metaList = surface.getModel().metaList;
	this.tocOptionTouched = false;
	this.redirectOptionsTouched = false;

	this.label = ve.msg( 'visualeditor-dialog-meta-settings-section' );

	this.settingsFieldset = new OO.ui.FieldsetLayout( {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-meta-settings-label' ),
		'icon': 'settings'
	} );

	// Initialization

	// Table of Contents items
	this.tocOptionSelector = new OO.ui.SelectWidget( { '$': this.$ } );
	this.tocOptionWidgets = {
		'default': new OO.ui.OptionWidget(
			'default',
			{ 'label': ve.msg( 'visualeditor-dialog-meta-settings-toc-default' ) }
		),
		'mwTOCForce': new OO.ui.OptionWidget(
			'mwTOCForce',
			{ 'label': ve.msg( 'visualeditor-dialog-meta-settings-toc-force' ) }
		),
		'mwTOCDisable': new OO.ui.OptionWidget(
			'mwTOCDisable',
			{ 'label': ve.msg( 'visualeditor-dialog-meta-settings-toc-disable' ) }
		)
	};
	this.tocOptionSelector.addItems( ve.getObjectValues( this.tocOptionWidgets ) );
	this.settingsFieldset.$element.append(
		this.$( '<span>' )
			.text( ve.msg( 'visualeditor-dialog-meta-settings-toc-label' ) ),
		this.tocOptionSelector.$element
	);
	this.tocOptionSelector.connect( this, { 'select': 'onTOCOptionChange' } );

	// Redirect items
	this.enableRedirectInput = new OO.ui.CheckboxWidget( {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-meta-settings-redirect-label' )
	} );
	this.redirectTargetInput = new OO.ui.TextInputWidget( {
		'$': this.$,
		'placeholder': ve.msg( 'visualeditor-dialog-meta-settings-redirect-placeholder' ),
	} );
	this.enableStaticRedirectInput = new OO.ui.CheckboxWidget( {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-meta-settings-redirect-staticlabel' )
	} );
	this.settingsFieldset.$element.append(
		this.enableRedirectInput.$element,
		this.redirectTargetInput.$element,
		this.enableStaticRedirectInput.$element
	);
	this.enableRedirectInput.connect( this, { 'change': 'onEnableRedirectChange' } );
	this.redirectTargetInput.connect( this, { 'change': 'onRedirectTargetChange' } );
	this.enableStaticRedirectInput.connect( this, { 'change': 'onEnableStaticRedirectChange' } );

	// Disable section edit links items
	this.disableSectionEditLinksInput = new OO.ui.CheckboxWidget( {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-meta-settings-noeditsection-label' )
	} );
	this.settingsFieldset.$element.append( this.disableSectionEditLinksInput.$element );

	this.$element.append( this.settingsFieldset.$element );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWSettingsPage, OO.ui.PageLayout );

/* Methods */

/* Table of Contents methods */

/**
 * Handle Table Of Contents display change events.
 *
 * @method
 */
ve.ui.MWSettingsPage.prototype.onTOCOptionChange = function () {
	this.tocOptionTouched = true;
};

/**
 * Get Table Of Contents option
 *
 * @returns {ve.dm.MetaItem|null} TOC option, if any
 */
ve.ui.MWSettingsPage.prototype.getTOCOptionItem = function () {
	return this.metaList.getItemsInGroup( 'mwTOC' )[0] || null;
};

/* Redirect methods */

/**
 * Handle redirect state change events.
 *
 * @param {boolean} value Whether a redirect is to be set for this page
 */
ve.ui.MWSettingsPage.prototype.onEnableRedirectChange = function ( value ) {
	this.redirectTargetInput.setDisabled( !value );
	this.enableStaticRedirectInput.setDisabled( !value );
	if ( !value ) {
		this.redirectTargetInput.setValue( '' );
		this.enableStaticRedirectInput.setValue( false );
	}
	this.redirectOptionsTouched = true;
};

/**
 * Handle redirect target change events.
 */
ve.ui.MWSettingsPage.prototype.onRedirectTargetChange = function () {
	this.redirectOptionsTouched = true;
};

/**
 * Handle static redirect state change events.
 */
ve.ui.MWSettingsPage.prototype.onEnableStaticRedirectChange = function () {
	this.redirectOptionsTouched = true;
};

/**
 * Get the redirect item
 *
 * @returns {Object|null} Redirect target, if any
 */
ve.ui.MWSettingsPage.prototype.getRedirectTargetItem = function () {
	return this.metaList.getItemsInGroup( 'mwRedirect' )[0] || null;
};

/**
 * Get the static redirect item
 *
 * @returns {Object|null} Redirect target, if any
 */
ve.ui.MWSettingsPage.prototype.getRedirectStaticItem = function () {
	return this.metaList.getItemsInGroup( 'mwStaticRedirect' )[0] || null;
};

/**
 * Get the section edit link disabling item
 *
 * @returns {Object|null} Section edit link disabling meta item, if any
 */
ve.ui.MWSettingsPage.prototype.getDisableSectionEditLinksItem = function () {
	return this.metaList.getItemsInGroup( 'mwNoEditSection' )[0] || null;
};

/**
 * Setup settings page.
 *
 * @param {Object} [data] Dialog setup data
 */
ve.ui.MWSettingsPage.prototype.setup = function () {
	var // Table of Contents items
		tocOption = this.getTOCOptionItem(),
		tocType = tocOption && tocOption.element.type || 'default',

		// Redirect items
		redirectTargetItem = this.getRedirectTargetItem(),
		redirectTarget = redirectTargetItem && redirectTargetItem.getAttribute( 'href' ) || '',
		redirectStatic = this.getRedirectStaticItem();

	// Table of Contents items
	this.tocOptionSelector.selectItem( this.tocOptionWidgets[tocType] );
	this.tocOptionTouched = false;

	// Redirect items (disabled states set by change event)
	this.enableRedirectInput.setValue( !!redirectTargetItem );
	this.redirectTargetInput.setValue( redirectTarget );
	this.enableStaticRedirectInput.setValue( !!redirectStatic );
	this.enableStaticRedirectInput.setDisabled( !redirectTargetItem );
	this.redirectOptionsTouched = false;

	// Disable section edit links items
	this.disableSectionEditLinksInput.setValue( !!this.getDisableSectionEditLinksItem() );
};

/**
 * Tear down settings page.
 *
 * @param {Object} [data] Dialog tear down data
 */
ve.ui.MWSettingsPage.prototype.teardown = function ( data ) {
	// Data initialisation
	data = data || {};

	var // Table of Contents items
		currentTOCItem = this.getTOCOptionItem(),
		newTOCData = this.tocOptionSelector.getSelectedItem(),

		// Redirect items
		currentRedirectTargetItem = this.getRedirectTargetItem(),
		newRedirectData = this.redirectTargetInput.getValue(),
		newRedirectItemData = { 'type': 'mwRedirect', 'attributes': { 'href': newRedirectData } },

		currentStaticRedirectItem = this.getRedirectStaticItem(),
		newStaticRedirectState = this.enableStaticRedirectInput.getValue(),

		// Disable section edit links items
		currentDisableSectionEditLinksItem = this.getDisableSectionEditLinksItem(),
		newDisableSectionEditState = this.disableSectionEditLinksInput.getValue();

	// Alter the TOC option flag iff it's been touched & is actually different
	if ( this.tocOptionTouched ) {
		if ( newTOCData.data === 'default' ) {
			if ( currentTOCItem ) {
				currentTOCItem.remove();
			}
		} else {
			if ( !currentTOCItem ) {
				this.metaList.insertMeta( { 'type': newTOCData.data } );
			} else if ( currentTOCItem.getType() !== newTOCData.data ) {
				currentTOCItem.replaceWith(
					ve.extendObject( true, {},
						currentTOCItem.getElement(),
						{ 'type': newTOCData.data }
					)
				);
			}
		}
	}

	// Alter the redirect options iff they've been touched & are different
	if ( this.redirectOptionsTouched ) {
		if ( currentRedirectTargetItem ) {
			if ( newRedirectData ) {
				if ( currentRedirectTargetItem.getAttribute( 'href' ) !== newRedirectData ) {
					// There was a redirect and is a new one, but they differ, so replace
					currentRedirectTargetItem.replaceWith(
						ve.extendObject( true, {},
							currentRedirectTargetItem.getElement(),
							newRedirectItemData
					) );
				}
			} else {
				// There was a redirect and is no new one, so remove
				currentRedirectTargetItem.remove();
			}
		} else {
			if ( newRedirectData ) {
				// There's no existing redirect but there is a new one, so create
				this.metaList.insertMeta( newRedirectItemData );
			}
		}

		if ( currentStaticRedirectItem && ( !newStaticRedirectState || !newRedirectData ) ) {
			currentStaticRedirectItem.remove();
		}
		if ( !currentStaticRedirectItem && newStaticRedirectState ) {
			this.metaList.insertMeta( { 'type': 'mwStaticRedirect' } );
		}
	}

	// Disable section edit links items
	if ( currentDisableSectionEditLinksItem && !newDisableSectionEditState ) {
		currentDisableSectionEditLinksItem.remove();
	}
	if ( !currentDisableSectionEditLinksItem && newDisableSectionEditState ) {
		this.metaList.insertMeta( { 'type': 'mwNoEditSection' } );
	}
};
