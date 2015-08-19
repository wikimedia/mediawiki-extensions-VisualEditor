/*!
 * VisualEditor UserInterface MWReferenceSourceSelectWidget class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Creates an ve.ui.MWReferenceSourceSelectWidget object.
 *
 * @class
 * @extends OO.ui.SearchWidget
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @cfg {boolean} [showExisting] Show 're-use existing reference' as an option
 */
ve.ui.MWReferenceSourceSelectWidget = function VeUiMWReferenceSourceSelectWidget( config ) {
	var i, len, tools, item, limit,
		items = [];

	config = config || {};

	// Parent constructor
	ve.ui.MWReferenceSourceSelectWidget.super.call( this, config );

	limit = ve.init.target.constructor.static.citationToolsLimit;

	try {
		// Must use mw.message to avoid JSON being parsed as Wikitext
		tools = JSON.parse( mw.message( 'visualeditor-cite-tool-definition.json' ).plain() );
	} catch ( e ) {
		tools = [];
	}

	// Go over available tools
	for ( i = 0, len = Math.min( limit, tools.length ); i < len; i++ ) {
		item = tools[ i ];
		items.push( new OO.ui.DecoratedOptionWidget( {
			icon: item.icon,
			label: item.title,
			data: {
				windowName: 'cite-' + item.name,
				dialogData: { template: item.template }
			}
		} ) );
	}

	// Basic tools
	this.refBasic = new OO.ui.DecoratedOptionWidget( {
		icon: 'reference',
		label: ve.msg( 'visualeditor-dialogbutton-reference-full-label' ),
		data: { windowName: 'reference' }
	} );
	items.push( this.refBasic );

	if ( config.showExisting ) {
		this.refExisting = new OO.ui.DecoratedOptionWidget( {
			icon: 'reference-existing',
			label: ve.msg( 'visualeditor-dialog-reference-useexisting-full-label' ),
			data: {
				windowName: 'reference',
				dialogData: { useExisting: true }
			}
		} );
		items.push( this.refExisting );
	}

	this.addItems( items );

	// Initialization
	this.$element.addClass( 've-ui-mwReferenceSourceSelectWidget' );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWReferenceSourceSelectWidget, OO.ui.SelectWidget );

/* Methods */

/**
 * Get the basic reference option
 *
 * @return {OO.ui.OptionWidget} Basic reference option
 */
ve.ui.MWReferenceSourceSelectWidget.prototype.getRefBasic = function () {
	return this.refBasic;
};

/**
 * Get the existing reference option
 *
 * @return {OO.ui.OptionWidget} Existing reference option
 */
ve.ui.MWReferenceSourceSelectWidget.prototype.getRefExisting = function () {
	return this.refExisting;
};
