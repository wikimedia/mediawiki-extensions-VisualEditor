/*!
 * VisualEditor user interface MWTemplatesUsedPage class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki meta dialog TemplatesUsed page.
 *
 * @class
 * @extends OO.ui.PageLayout
 *
 * @constructor
 * @param {string} name Unique symbolic name of page
 * @param {Object} [config] Configuration options
 * @cfg {jQuery} [$overlay] Overlay to render dropdowns in
 */
ve.ui.MWTemplatesUsedPage = function VeUiMWTemplatesUsedPage() {
	// Parent constructor
	ve.ui.MWTemplatesUsedPage.super.apply( this, arguments );

	// Properties
	this.templatesUsedFieldset = new OO.ui.FieldsetLayout( {
		label: ve.msg( 'visualeditor-templatesused-tool' ),
		icon: 'puzzle'
	} );

	if ( ve.init.target.$templatesUsed && ve.init.target.$templatesUsed.find( 'li' ).length ) {
		this.templatesUsedFieldset.$element.append(
			ve.init.target.$templatesUsed.clone().find( 'a' ).each( function () {
				$( this ).attr( 'target', '_blank' ).attr( 'rel', 'noopener' );
			} ).end()
		);
	} else {
		this.templatesUsedFieldset.$element.append(
			$( '<em>' ).text( ve.msg( 'visualeditor-dialog-meta-templatesused-noresults' ) )
		);
	}

	// Initialization
	this.$element.append( this.templatesUsedFieldset.$element );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTemplatesUsedPage, OO.ui.PageLayout );

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWTemplatesUsedPage.prototype.setOutlineItem = function () {
	// Parent method
	ve.ui.MWTemplatesUsedPage.super.prototype.setOutlineItem.apply( this, arguments );

	if ( this.outlineItem ) {
		this.outlineItem
			.setIcon( 'puzzle' )
			.setLabel( ve.msg( 'visualeditor-templatesused-tool' ) );
	}
};

/**
 * @inheritdoc
 */
ve.ui.MWTemplatesUsedPage.prototype.focus = function () {
	// No controls, just focus the whole page instead of the first link
	this.$element.focus();
};
