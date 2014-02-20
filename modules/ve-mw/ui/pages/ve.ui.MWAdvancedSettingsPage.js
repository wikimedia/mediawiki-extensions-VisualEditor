/*!
 * VisualEditor user interface MWAdvancedSettingsPage class.
 *
 * @copyright 2011-2013 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki meta dialog advanced settings page.
 *
 * @class
 * @extends OO.ui.PageLayout
 *
 * @constructor
 * @param {ve.ui.Surface} surface Surface being worked on
 * @param {string} name Unique symbolic name of page
 * @param {Object} [config] Configuration options
 */
ve.ui.MWAdvancedSettingsPage = function VeUiMWAdvancedSettingsPage( surface, name, config ) {
	// Parent constructor
	OO.ui.PageLayout.call( this, name, config );

	// Properties
	this.metaList = surface.getModel().metaList;
	this.indexingOptionTouched = false;
	this.advancedSettingsFieldset = new OO.ui.FieldsetLayout( {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-meta-advancedsettings-label' ),
		'icon': 'advanced'
	} );

	// Initialization

	// Indexing items
	this.indexingOptionSelector = new OO.ui.ButtonSelectWidget( { '$': this.$ } );
	this.indexingOptionWidgets = {
		'mwIndexForce': new OO.ui.ButtonOptionWidget(
			'mwIndexForce',
			{ 'label': ve.msg( 'visualeditor-dialog-meta-settings-index-force' ) }
		),
		'mwIndexDisable': new OO.ui.ButtonOptionWidget(
			'mwIndexDisable',
			{ 'label': ve.msg( 'visualeditor-dialog-meta-settings-index-disable' ) }
		),
		'default': new OO.ui.ButtonOptionWidget(
			'default',
			{ 'label': ve.msg( 'visualeditor-dialog-meta-settings-index-default' ) }
		)
	};
	this.indexingOptionSelector.addItems( ve.getObjectValues( this.indexingOptionWidgets ) );
	this.advancedSettingsFieldset.$element.append(
		this.$( '<span>' )
			.text( ve.msg( 'visualeditor-dialog-meta-settings-index-label' ) ),
		this.indexingOptionSelector.$element
	);

	this.$element.append( this.advancedSettingsFieldset.$element );

	// Events
	this.indexingOptionSelector.connect( this, { 'select': 'onIndexingOptionChange' } );

};

/* Inheritance */

OO.inheritClass( ve.ui.MWAdvancedSettingsPage, OO.ui.PageLayout );

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWAdvancedSettingsPage.prototype.setOutlineItem = function ( outlineItem ) {
	// Parent method
	OO.ui.PageLayout.prototype.setOutlineItem.call( this, outlineItem );

	if ( this.outlineItem ) {
		this.outlineItem
			.setIcon( 'advanced' )
			.setLabel( ve.msg( 'visualeditor-dialog-meta-advancedsettings-section' ) );
	}
};

/* Indexing option methods */

/**
 * Handle indexing option state change events.
 */
ve.ui.MWAdvancedSettingsPage.prototype.onIndexingOptionChange = function () {
	this.indexingOptionTouched = true;
};

/**
 * Get indexing options
 *
 * @returns {Object|null} Indexing option, if any
 */
ve.ui.MWAdvancedSettingsPage.prototype.getIndexingOptionItem = function () {
	return this.metaList.getItemsInGroup( 'mwIndex' )[0] || null;
};

/**
 * Setup settings page.
 *
 * @param {Object} [data] Dialog setup data
 */
ve.ui.MWAdvancedSettingsPage.prototype.setup = function () {
	var // Indexing items
		indexingOption = this.getIndexingOptionItem(),
		indexingType = indexingOption && indexingOption.element.type || 'default';

	// Indexing items
	this.indexingOptionSelector.selectItem( this.indexingOptionWidgets[indexingType] );
	this.indexingOptionTouched = false;
};

/**
 * Tear down settings page.
 *
 * @param {Object} [data] Dialog tear down data
 */
ve.ui.MWAdvancedSettingsPage.prototype.teardown = function ( data ) {
	// Data initialization
	data = data || {};

	var // Indexing items
		currentIndexingItem = this.getIndexingOptionItem(),
		newIndexingData = this.indexingOptionSelector.getSelectedItem();

	// Alter the indexing option flag iff it's been touched & is actually different
	if ( this.indexingOptionTouched ) {
		if ( newIndexingData.data === 'default' ) {
			if ( currentIndexingItem ) {
				currentIndexingItem.remove();
			}
		} else {
			if ( !currentIndexingItem ) {
				this.metaList.insertMeta( { 'type': newIndexingData.data } );
			} else if ( currentIndexingItem.element.type !== newIndexingData.data ) {
				currentIndexingItem.replaceWith(
					ve.extendObject( true, {},
						currentIndexingItem.getElement(),
						{ 'type': newIndexingData.data }
					)
				);
			}
		}
	}

};
