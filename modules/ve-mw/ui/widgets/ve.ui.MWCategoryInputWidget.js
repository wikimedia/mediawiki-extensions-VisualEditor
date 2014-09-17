/*!
 * VisualEditor UserInterface MWCategoryInputWidget class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Creates an ve.ui.MWCategoryInputWidget object.
 *
 * @class
 * @extends OO.ui.TextInputWidget
 * @mixins OO.ui.LookupInputWidget
 *
 * @constructor
 * @param {ve.ui.MWCategoryWidget} categoryWidget
 * @param {Object} [config] Configuration options
 */
ve.ui.MWCategoryInputWidget = function VeUiMWCategoryInputWidget( categoryWidget, config ) {
	// Config intialization
	config = ve.extendObject( {
		placeholder: ve.msg( 'visualeditor-dialog-meta-categories-input-placeholder' )
	}, config );

	// Parent constructor
	OO.ui.TextInputWidget.call( this, config );

	// Mixin constructors
	OO.ui.LookupInputWidget.call( this, this, config );

	// Properties
	this.categoryWidget = categoryWidget;
	this.forceCapitalization = mw.config.get( 'wgCaseSensitiveNamespaces' ).indexOf( 14 ) === -1;
	this.categoryPrefix = mw.config.get( 'wgFormattedNamespaces' )['14'] + ':';

	// Initialization
	this.$element.addClass( 've-ui-mwCategoryInputWidget' );
	this.lookupMenu.$element.addClass( 've-ui-mwCategoryInputWidget-menu' );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWCategoryInputWidget, OO.ui.TextInputWidget );

OO.mixinClass( ve.ui.MWCategoryInputWidget, OO.ui.LookupInputWidget );

/* Methods */

/**
 * Gets a new request object of the current lookup query value.
 *
 * @method
 * @returns {jqXHR} AJAX object without success or fail handlers attached
 */
ve.ui.MWCategoryInputWidget.prototype.getLookupRequest = function () {
	return ve.init.target.constructor.static.apiRequest( {
		action: 'query',
		list: 'allcategories',
		acmin: 1,
		acprefix: this.value,
		acprop: 'hidden'
	} );
};

/**
 * Get lookup cache item from server response data.
 *
 * @method
 * @param {Mixed} data Response from server
 */
ve.ui.MWCategoryInputWidget.prototype.getLookupCacheItemFromData = function ( data ) {
	var result = [];
	data.query = data.query || {};

	$.each( data.query.allcategories || [], function ( index, category ) {
		result.push( category['*'] );
		this.categoryWidget.categoryHiddenStatus[category['*']] = category.hasOwnProperty( 'hidden' );
	}.bind( this ) );

	return result;
};

/**
 * Get list of menu items from a server response.
 *
 * @param {Object} data Query result
 * @returns {OO.ui.MenuItemWidget[]} Menu items
 */
ve.ui.MWCategoryInputWidget.prototype.getLookupMenuItemsFromData = function ( data ) {
	var exactMatch = false,
		itemWidgets = [],
		existingCategoryItems = [], matchingCategoryItems = [],
		hiddenCategoryItems = [], newCategoryItems = [],
		category = this.getCategoryItemFromValue( this.value ),
		existingCategories = this.categoryWidget.getCategories(),
		linkCacheUpdate = {},
		canonicalQueryValue = mw.Title.newFromText( this.value );

	if ( canonicalQueryValue ) {
		canonicalQueryValue = canonicalQueryValue.getMainText();
	} // Invalid titles just end up with canonicalQueryValue being null.

	$.each( data, function ( index, suggestedCategory ) {
		if ( canonicalQueryValue === suggestedCategory ) {
			exactMatch = true;
		}
		linkCacheUpdate['Category:' + suggestedCategory] = { missing: false };
		if ( ve.indexOf( suggestedCategory, existingCategories ) === -1 && suggestedCategory.lastIndexOf( canonicalQueryValue, 0 ) === 0 ) {
			if ( this.categoryWidget.categoryHiddenStatus[suggestedCategory] ) {
				hiddenCategoryItems.push( suggestedCategory );
			} else {
				matchingCategoryItems.push( suggestedCategory );
			}
		}
	}.bind( this ) );

	// Existing categories
	$.each( existingCategories, function ( index, existingCategory ) {
		if ( existingCategory === canonicalQueryValue ) {
			exactMatch = true;
		}
		if ( index < existingCategories.length - 1 && existingCategory.lastIndexOf( canonicalQueryValue, 0 ) === 0 ) {
			// Verify that item starts with category.value
			existingCategoryItems.push( existingCategory );
		}
	} );

	// New category
	if ( !exactMatch ) {
		newCategoryItems.push( canonicalQueryValue );
		linkCacheUpdate['Category:' + category.value] = { missing: true };
	}

	ve.init.platform.linkCache.set( linkCacheUpdate );

	// Add sections for non-empty groups. Each section consists of an id, a label and items
	$.each( [
		{
			id: 'newCategory',
			label: ve.msg( 'visualeditor-dialog-meta-categories-input-newcategorylabel' ),
			items: newCategoryItems
		},
		{
			id: 'inArticle',
			label: ve.msg( 'visualeditor-dialog-meta-categories-input-movecategorylabel' ),
			items: existingCategoryItems
		},
		{
			id: 'matchingCategories',
			label: ve.msg( 'visualeditor-dialog-meta-categories-input-matchingcategorieslabel' ),
			items: matchingCategoryItems
		},
		{
			id: 'hiddenCategories',
			label: ve.msg( 'visualeditor-dialog-meta-categories-input-hiddencategorieslabel' ),
			items: hiddenCategoryItems
		}
	], function ( index, sectionData ) {
		if ( sectionData.items.length ) {
			itemWidgets.push( new OO.ui.MenuSectionItemWidget(
				sectionData.id, { $: this.lookupMenu.$, label: sectionData.label }
			) );
			$.each( sectionData.items, function ( index, categoryItem ) {
				itemWidgets.push( new OO.ui.MenuItemWidget( categoryItem, { $: this.lookupMenu.$, label: categoryItem } ) );
			}.bind( this ) );
		}
	}.bind( this ) );

	return itemWidgets;
};

/**
 * Get a category item.
 *
 * @method
 * @param {string} value Category name
 * @returns {Object} Category item with name, value and metaItem properties
 */
ve.ui.MWCategoryInputWidget.prototype.getCategoryItemFromValue = function ( value ) {
	var title;

	// Normalize
	title = mw.Title.newFromText( this.categoryPrefix + value );
	if ( title ) {
		return {
			name: title.getPrefixedText(),
			value: title.getMainText(),
			metaItem: {}
		};
	}

	if ( this.forceCapitalization ) {
		value = value.substr( 0, 1 ).toUpperCase() + value.substr( 1 );
	}

	return {
		name: this.categoryPrefix + value,
		value: value,
		metaItem: {}
	};
};
