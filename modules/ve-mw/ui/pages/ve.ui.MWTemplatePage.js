/*!
 * VisualEditor user interface MWTemplatePage class.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Template dialog content pane header for a template.  Includes informational
 * messages about the template, such as a link to the page where it's defined.
 *
 * @class
 * @extends OO.ui.PageLayout
 *
 * @constructor
 * @param {ve.dm.MWTemplateModel} template Template model
 * @param {string} name Unique symbolic name of page
 * @param {Object} [config] Configuration options
 * @param {jQuery} [config.$overlay] Overlay to render dropdowns in
 * @param {boolean} [config.isReadOnly] Page is read-only
 */
ve.ui.MWTemplatePage = function VeUiMWTemplatePage( template, name, config ) {
	const link = template.getTemplateDataQueryTitle();

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
	this.pageId = this.spec.templateData.pageId;

	// Add favorite button
	this.usingTemplateDiscovery = mw.templateData !== undefined && mw.templateData.FavoriteButton !== undefined;
	if ( this.usingTemplateDiscovery ) {
		this.favoritesStore = new mw.templateData.FavoritesStore();
		this.favoriteButton = new mw.templateData.FavoriteButton( {
			pageId: this.pageId,
			favoritesStore: this.favoritesStore
		} );

		this.$element.prepend(
			$( '<div>' )
				.addClass( 've-ui-mwTemplatePage-favorite' )
				.append( this.favoriteButton.$element )
		);
	}

	// Initialization
	const description = this.spec.getDescription();
	if ( description ) {
		this.$description.append(
			$( '<p>' ).text( description )
		);
	}

	// The transcluded page may be dynamically generated or unspecified in the DOM
	// for other reasons (T68724). In that case we can't tell the user what the
	// template is called, nor link to the template page. However, if we know for
	// certain that the template doesn't exist, be explicit about it (T162694).
	const linkData = ve.init.platform.linkCache.getCached( '_missing/' + link ),
		knownAsMissing = link && linkData && linkData.missing;

	let key,
		messageStyle = 've-ui-mwTemplatePage-description-missing';
	if ( description ) {
		key = 'visualeditor-dialog-transclusion-see-template';
		messageStyle = 've-ui-mwTemplatePage-description-extra';
	} else if ( !link || knownAsMissing ) {
		let title;
		try {
			title = link && new mw.Title( link );
		} catch ( e ) {
		}
		// When {{User:Foo}} can be parsed as "Foo", we know the ":" is not syntax.
		key = title && !title.getMain().includes( ':' ) ?
			'visualeditor-dialog-transclusion-template-title-nonexistent' :
			'visualeditor-dialog-transclusion-template-title-modifier';
	} else {
		key = 'visualeditor-dialog-transclusion-no-template-description';
	}

	if ( key ) {
		const $addMessageHere = $( '<p>' );
		// The following messages are used here:
		// * visualeditor-dialog-transclusion-no-template-description
		// * visualeditor-dialog-transclusion-see-template
		// * visualeditor-dialog-transclusion-template-title-modifier
		// * visualeditor-dialog-transclusion-template-title-nonexistent
		const $msg = mw.message( key, this.spec.getLabel(), link ).parseDom();
		// The following classes are used here:
		// * ve-ui-mwTemplatePage-description-extra
		// * ve-ui-mwTemplatePage-description-missing
		$addMessageHere.addClass( messageStyle ).append( $msg );
		ve.targetLinksToNewWindow( $addMessageHere[ 0 ] );
		this.$description.append( $addMessageHere );
	}

	this.$description.find( 'a[href]' )
		.on( 'click', () => {
			ve.track( 'activity.transclusion', { action: 'template-doc-link-click' } );
		} );

	this.infoFieldset.$element
		.append( this.$description );

	if ( !knownAsMissing ) {
		let noticeWidget;

		if ( this.template.getSpec().getDocumentedParameterOrder().length &&
			!this.template.getSpec().isDocumented()
		) {
			noticeWidget = new OO.ui.MessageWidget( {
				label: mw.message( 'visualeditor-dialog-transclusion-no-template-data-description', link ).parseDom(),
				classes: [ 've-ui-mwTransclusionDialog-template-note' ],
				type: 'warning'
			} );
		}

		if ( noticeWidget && noticeWidget.$element ) {
			ve.targetLinksToNewWindow( noticeWidget.$element[ 0 ] );
			this.infoFieldset.$element.append( noticeWidget.$element );
		}
	}

	this.$element
		.addClass( 've-ui-mwTemplatePage' )
		.append( this.infoFieldset.$element );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTemplatePage, OO.ui.PageLayout );

/* Methods */

ve.ui.MWTemplatePage.prototype.addPlaceholderParameter = function () {
	this.template.addParameter( new ve.dm.MWParameterModel( this.template ) );
};
