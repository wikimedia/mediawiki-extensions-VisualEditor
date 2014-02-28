/*
 * VisualEditor user interface MWTransclusionDialog class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for inserting and editing MediaWiki transclusions.
 *
 * @class
 * @extends ve.ui.MWDialog
 *
 * @constructor
 * @param {ve.ui.WindowSet} windowSet Window set this dialog is part of
 * @param {Object} [config] Configuration options
 */
ve.ui.MWTransclusionDialog = function VeUiMWTransclusionDialog( windowSet, config ) {
	// Parent constructor
	ve.ui.MWDialog.call( this, windowSet, config );

	// Properties
	this.node = null;
	this.transclusion = null;
	this.loaded = false;
	this.preventReselection = false;
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionDialog, ve.ui.MWDialog );

/* Static Properties */

ve.ui.MWTransclusionDialog.static.icon = 'template';

/* Methods */

/**
 * Handle parts being replaced.
 *
 * @param {ve.dm.MWTransclusionPartModel} removed Removed part
 * @param {ve.dm.MWTransclusionPartModel} added Added part
 */
ve.ui.MWTransclusionDialog.prototype.onReplacePart = function ( removed, added ) {
	var i, len, page, name, names, params, partPage, reselect,
		removePages = [];

	if ( removed ) {
		// Remove parameter pages of removed templates
		partPage = this.bookletLayout.getPage( removed.getId() );
		if ( removed instanceof ve.dm.MWTemplateModel ) {
			params = removed.getParameters();
			for ( name in params ) {
				removePages.push( this.bookletLayout.getPage( params[name].getId() ) );
			}
			removed.disconnect( this );
		}
		if ( this.loaded && !this.preventReselection && partPage.isActive() ) {
			reselect = this.bookletLayout.getClosestPage( partPage );
		}
		removePages.push( partPage );
		this.bookletLayout.removePages( removePages );
	}

	if ( added ) {
		if ( added instanceof ve.dm.MWTemplateModel ) {
			page = new ve.ui.MWTemplatePage( added, added.getId(), { '$': this.$ } );
		} else if ( added instanceof ve.dm.MWTransclusionContentModel ) {
			page = new ve.ui.MWTransclusionContentPage( added, added.getId(), { '$': this.$ } );
		} else if ( added instanceof ve.dm.MWTemplatePlaceholderModel ) {
			page = new ve.ui.MWTemplatePlaceholderPage( added, added.getId(), { '$': this.$ } );
		}
		if ( page ) {
			this.bookletLayout.addPages( [ page ], this.transclusion.getIndex( added ) );
			if ( reselect ) {
				// Use added page instead of closest page
				this.setPageByName( added.getId() );
			}
			// Add existing params to templates (the template might be being moved)
			if ( added instanceof ve.dm.MWTemplateModel ) {
				names = added.getParameterNames();
				params = added.getParameters();
				// Prevent selection changes
				this.preventReselection = true;
				for ( i = 0, len = names.length; i < len; i++ ) {
					this.onAddParameter( params[names[i]] );
				}
				this.preventReselection = false;
				added.connect( this, { 'add': 'onAddParameter', 'remove': 'onRemoveParameter' } );
				if ( names.length ) {
					this.setPageByName( params[names[0]].getId() );
				}
			}

			// Add required params to user created templates
			if ( added instanceof ve.dm.MWTemplateModel && this.loaded ) {
				// Prevent selection changes
				this.preventReselection = true;
				added.addRequiredParameters();
				this.preventReselection = false;
				names = added.getParameterNames();
				params = added.getParameters();
				if ( names.length ) {
					this.setPageByName( params[names[0]].getId() );
				}
			}
		}
	} else if ( reselect ) {
		this.setPageByName( reselect.getName() );
	}
};

/**
 * Handle add param events.
 *
 * @param {ve.dm.MWParameterModel} param Added param
 */
ve.ui.MWTransclusionDialog.prototype.onAddParameter = function ( param ) {
	var page;

	if ( param.getName() ) {
		page = new ve.ui.MWParameterPage( param, param.getId(), { '$': this.$ } );
	} else {
		page = new ve.ui.MWParameterPlaceholderPage( param, param.getId(), { '$': this.$ } );
	}
	this.bookletLayout.addPages( [ page ], this.transclusion.getIndex( param ) );
	if ( this.loaded && !this.preventReselection ) {
		this.setPageByName( param.getId() );
	}
};

/**
 * Handle remove param events.
 *
 * @param {ve.dm.MWParameterModel} param Removed param
 */
ve.ui.MWTransclusionDialog.prototype.onRemoveParameter = function ( param ) {
	var page = this.bookletLayout.getPage( param.getId() ),
		reselect = this.bookletLayout.getClosestPage( page );

	this.bookletLayout.removePages( [ page ] );
	if ( this.loaded && !this.preventReselection ) {
		this.setPageByName( reselect.getName() );
	}
};

/**
 * Get a booklet layout widget.
 *
 * @abstract
 * @returns {OO.ui.BookletLayout} Configured widget
 * @throws {Error} If method is not overridden in subclass
 */
ve.ui.MWTransclusionDialog.prototype.getBookletLayout = function () {
	throw new Error(
		'getBookletLayout must be overridden in subclass of ve.ui.MWTransclusionDialog'
	);
};

/**
 * Set the page by name.
 *
 * Page names are always the ID of the part or param they represent.
 *
 * @param {string} name Page name
 */
ve.ui.MWTransclusionDialog.prototype.setPageByName = function ( name ) {
	if ( this.bookletLayout.isOutlined() ) {
		this.bookletLayout.getOutline().selectItem(
			this.bookletLayout.getOutline().getItemFromData( name )
		);
	} else {
		this.bookletLayout.setPage( name );
	}
};

/**
 * @inheritdoc
 */
ve.ui.MWTransclusionDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.MWDialog.prototype.initialize.call( this );

	// Properties
	this.applyButton = new OO.ui.ButtonWidget( {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-action-apply' ),
		'flags': ['primary']
	} );
	this.bookletLayout = this.getBookletLayout();

	// Events
	this.applyButton.connect( this, { 'click': [ 'close', { 'action': 'apply' } ] } );

	// Initialization
	this.$body.append( this.bookletLayout.$element );
	this.$foot.append( this.applyButton.$element );
};

/**
 * @inheritdoc
 */
ve.ui.MWTransclusionDialog.prototype.setup = function ( data ) {
	// Parent method
	ve.ui.MWDialog.prototype.setup.call( this, data );

	// Properties
	this.node = this.surface.getView().getFocusedNode();
	this.transclusion = new ve.dm.MWTransclusionModel();
	this.loaded = false;

	// Events
	this.transclusion.connect( this, { 'replace': 'onReplacePart' } );

	// Initialization
	if ( this.node instanceof ve.ce.MWTransclusionNode ) {
		this.transclusion
			.load( ve.copy( this.node.getModel().getAttribute( 'mw' ) ) )
				.always( ve.bind( function () {
					this.loaded = true;
				}, this ) );
	} else {
		this.loaded = true;
		this.transclusion.addPart( new ve.dm.MWTemplatePlaceholderModel( this.transclusion ) );
	}
};

/**
 * @inheritdoc
 */
ve.ui.MWTransclusionDialog.prototype.teardown = function ( data ) {
	var surfaceModel = this.surface.getModel(),
		obj = this.transclusion.getPlainObject();

	// Data initialization
	data = data || {};

	// Save changes
	if ( data.action === 'apply' ) {
		if ( this.node instanceof ve.ce.MWTransclusionNode ) {
			if ( obj !== null ) {
				surfaceModel.getFragment().changeAttributes( { 'mw': obj } );
			} else {
				surfaceModel.getFragment().removeContent();
			}
		} else if ( obj !== null ) {
			surfaceModel.getFragment().collapseRangeToEnd().insertContent( [
				{
					'type': 'mwTransclusionInline',
					'attributes': {
						'mw': obj
					}
				},
				{ 'type': '/mwTransclusionInline' }
			] ).collapseRangeToEnd().select();
		}
	}

	this.transclusion.disconnect( this );
	this.transclusion.abortRequests();
	this.transclusion = null;
	this.bookletLayout.clearPages();
	this.node = null;
	this.content = null;

	// Parent method
	ve.ui.MWDialog.prototype.teardown.call( this, data );
};
