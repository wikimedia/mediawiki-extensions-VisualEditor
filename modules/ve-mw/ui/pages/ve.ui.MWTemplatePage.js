/*!
 * VisualEditor user interface MWTemplatePage class.
 *
 * @copyright 2011-2020 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki transclusion dialog template page.
 *
 * @class
 * @extends OO.ui.PageLayout
 *
 * @constructor
 * @param {ve.dm.MWTemplateModel} template Template model
 * @param {string} name Unique symbolic name of page
 * @param {Object} [config] Configuration options
 * @cfg {jQuery} [$overlay] Overlay to render dropdowns in
 * @cfg {boolean} [isReadOnly] Page is read-only
 */
ve.ui.MWTemplatePage = function VeUiMWTemplatePage( template, name, config ) {
	var link = template.getTitle(),
		veConfig = mw.config.get( 'wgVisualEditorConfig' );

	// Configuration initialization
	config = ve.extendObject( {
		scrollable: false
	}, config );

	// Parent constructor
	ve.ui.MWTemplatePage.super.call( this, name, config );

	// Properties
	this.template = template;
	this.spec = template.getSpec();
	this.$description = $( '<div>' )
		.addClass( 've-ui-mwTemplatePage-description' );
	this.infoFieldset = new OO.ui.FieldsetLayout( {
		label: this.spec.getLabel(),
		icon: 'puzzle'
	} );

	// Initialization
	this.$description
		.text( this.spec.getDescription() );

	// The transcluded page may be dynamically generated or unspecified in the DOM
	// for other reasons (T68724). In that case we can't tell the user what the
	// template is called, nor link to the template page. However, if we know for
	// certain that the template doesn't exist, be explicit about it (T162694).
	var linkData = ve.init.platform.linkCache.getCached( '_missing/' + link ),
		pageMissing = link && linkData && linkData.missing;

	if ( link ) {
		if ( this.spec.getDescription() ) {
			this.$description
				.append(
					$( '<hr>' ),
					$( '<span>' )
						.addClass( 've-ui-mwTemplatePage-description-extra' )
						.append( mw.message(
							'visualeditor-dialog-transclusion-more-template-description',
							this.spec.getLabel(),
							link
						).parseDom() )
				);
		} else {
			this.$description
				.addClass( 've-ui-mwTemplatePage-description-missing' )
				.append( mw.message(
					pageMissing ? 'visualeditor-dialog-transclusion-absent-template' :
						'visualeditor-dialog-transclusion-no-template-description',
					this.spec.getLabel(), link
				).parseDom() );
		}
		ve.targetLinksToNewWindow( this.$description[ 0 ] );
	}
	this.$description.find( 'a[href]' )
		.on( 'click', function () {
			ve.track( 'activity.transclusion', { action: 'template-doc-link-click' } );
		} );

	this.infoFieldset.$element
		.append( this.$description );

	if ( veConfig.transclusionDialogNewSidebar && !pageMissing ) {
		if ( !this.template.getSpec().getDocumentedParameterOrder().length ) {
			var noParametersNote = new OO.ui.MessageWidget( {
				label: mw.message( 'visualeditor-dialog-transclusion-no-parameters-description' ).parseDom(),
				classes: [ 've-ui-mwTransclusionDialog-template-note' ]
			} );
			this.infoFieldset.$element.append( noParametersNote.$element );
		} else if ( !this.template.getSpec().isDocumented() ) {
			var noTemplateDataParametersWarning = new OO.ui.MessageWidget( {
				label: mw.message( 'visualeditor-dialog-transclusion-no-template-data-description', link ).parseDom(),
				classes: [ 've-ui-mwTransclusionDialog-template-note' ],
				type: 'warning'
			} );
			this.infoFieldset.$element.append( noTemplateDataParametersWarning.$element );
		}
	}

	this.$element
		.addClass( 've-ui-mwTemplatePage' )
		.append( this.infoFieldset.$element );

	if ( !config.isReadOnly ) {
		if ( !veConfig.transclusionDialogBackButton &&
			!veConfig.transclusionDialogNewSidebar
		) {
			var removeButton = new OO.ui.ButtonWidget( {
				framed: false,
				icon: 'trash',
				title: ve.msg( 'visualeditor-dialog-transclusion-remove-template' ),
				flags: [ 'destructive' ],
				classes: [ 've-ui-mwTransclusionDialog-removeButton' ]
			} )
				.connect( this, { click: 'onRemoveButtonClick' } );
			removeButton.$element.appendTo( this.$element );
		}

		if ( !veConfig.transclusionDialogNewSidebar ) {
			// This button is only shown as a last resort when this …TemplatePage is neither followed by
			// a …ParameterPage (i.e. the template doesn't have parameters) nor a
			// …ParameterPlaceholderPage (i.e. the parameter search widget isn't shown). This state
			// should be unreachable, but isn't. Hiding this is done via CSS.
			var addButton = new OO.ui.ButtonWidget( {
				framed: false,
				icon: 'parameter',
				label: ve.msg( 'visualeditor-dialog-transclusion-add-param' )
			} )
				.connect( this, { click: 'addPlaceholderParameter' } );
			$( '<div>' )
				.addClass( 've-ui-mwTemplatePage-more' )
				.append( addButton.$element )
				.appendTo( this.$element );
		}
	}
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTemplatePage, OO.ui.PageLayout );

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWTemplatePage.prototype.setOutlineItem = function () {
	// Parent method
	ve.ui.MWTemplatePage.super.prototype.setOutlineItem.apply( this, arguments );

	if ( this.outlineItem ) {
		this.outlineItem
			.setIcon( 'puzzle' )
			.setMovable( true )
			.setRemovable( true )
			.setLabel( this.spec.getLabel() );
	}
};

ve.ui.MWTemplatePage.prototype.onRemoveButtonClick = function () {
	this.template.remove();
};

ve.ui.MWTemplatePage.prototype.addPlaceholderParameter = function () {
	this.template.addParameter( new ve.dm.MWParameterModel( this.template ) );
};
