/*
 * VisualEditor user interface MWTemplateDialog class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for inserting and editing MediaWiki transclusions.
 *
 * @class
 * @abstract
 * @extends ve.ui.Dialog
 *
 * @constructor
 * @param {ve.ui.Surface} surface Surface dialog is for
 * @param {Object} [config] Configuration options
 */
ve.ui.MWTemplateDialog = function VeUiMWTemplateDialog( config ) {
	// Parent constructor
	ve.ui.MWTemplateDialog.super.call( this, config );

	// Properties
	this.transclusionNode = null;
	this.transclusion = null;
	this.loaded = false;
	this.preventReselection = false;
	this.inserting = false;
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTemplateDialog, ve.ui.Dialog );

/* Static Properties */

ve.ui.MWTemplateDialog.static.icon = 'template';

ve.ui.MWTemplateDialog.static.title =
	OO.ui.deferMsg( 'visualeditor-dialog-transclusion-title' );

ve.ui.MWTemplateDialog.static.bookletLayoutConfig = {
	'continuous': true,
	'outlined': false
};

/* Methods */

/**
 * Handle the transclusion being ready to use.
 */
ve.ui.MWTemplateDialog.prototype.onTransclusionReady = function () {
	this.loaded = true;
};

/**
 * Handle parts being replaced.
 *
 * @param {ve.dm.MWTransclusionPartModel} removed Removed part
 * @param {ve.dm.MWTransclusionPartModel} added Added part
 */
ve.ui.MWTemplateDialog.prototype.onReplacePart = function ( removed, added ) {
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
		page = this.getPageFromPart( added );
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
	// Update widgets related to a transclusion being a single template or not
	this.applyButton
		.setLabel( this.getApplyButtonLabel() )
		.setDisabled( !this.isInsertable() );
	this.updateTitle();
};

/**
 * Handle add param events.
 *
 * @param {ve.dm.MWParameterModel} param Added param
 */
ve.ui.MWTemplateDialog.prototype.onAddParameter = function ( param ) {
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
ve.ui.MWTemplateDialog.prototype.onRemoveParameter = function ( param ) {
	var page = this.bookletLayout.getPage( param.getId() ),
		reselect = this.bookletLayout.getClosestPage( page );

	this.bookletLayout.removePages( [ page ] );
	if ( this.loaded && !this.preventReselection ) {
		this.setPageByName( reselect.getName() );
	}
};

/**
 * Checks if transclusion is in a valid state for inserting into the document
 *
 * If the transclusion is empty or only contains a placeholder it will not be insertable.
 *
 * @returns {boolean} Transclusion can be inserted
 */
ve.ui.MWTemplateDialog.prototype.isInsertable = function () {
	var parts = this.transclusion && this.transclusion.getParts();

	return !this.loading &&
		parts.length &&
		( parts.length > 1 || !( parts[0] instanceof ve.dm.MWTemplatePlaceholderModel ) );
};

/**
 * Get a page for a transclusion part.
 *
 * @param {ve.dm.MWTransclusionModel} part Part to get page for
 * @return {OO.ui.PageLayout|null} Page for part, null if no matching page could be found
 */
ve.ui.MWTemplateDialog.prototype.getPageFromPart = function ( part ) {
	if ( part instanceof ve.dm.MWTemplateModel ) {
		return new ve.ui.MWTemplatePage( part, part.getId(), { '$': this.$ } );
	} else if ( part instanceof ve.dm.MWTemplatePlaceholderModel ) {
		return new ve.ui.MWTemplatePlaceholderPage( part, part.getId(), { '$': this.$ } );
	}
	return null;
};

/**
 * Get the label of a template or template placeholder.
 *
 * @param {ve.dm.MWTemplateModel|ve.dm.MWTemplatePlaceholderModel} part Part to check
 * @returns {string} Label of template or template placeholder
 */
ve.ui.MWTemplateDialog.prototype.getTemplatePartLabel = function ( part ) {
	return part instanceof ve.dm.MWTemplateModel ?
		part.getSpec().getLabel() : ve.msg( 'visualeditor-dialog-transclusion-placeholder' );
};

/**
 * Get a label for the apply button.
 *
 * @returns {string} Apply button label
 */
ve.ui.MWTemplateDialog.prototype.getApplyButtonLabel = function () {
	return ve.msg(
		this.inserting ?
			'visualeditor-dialog-transclusion-insert-template' :
			'visualeditor-dialog-action-apply'
	);
};

/**
 * Get the transclusion node to be edited.
 *
 * @returns {ve.dm.MWTransclusionNode|null} Transclusion node to be edited, null if none exists
 */
ve.ui.MWTemplateDialog.prototype.getTransclusionNode = function () {
	var focusedNode = this.getFragment().getSelectedNode();
	return focusedNode instanceof ve.dm.MWTransclusionNode ? focusedNode : null;
};

/**
 * Set the page by name.
 *
 * Page names are always the ID of the part or param they represent.
 *
 * @param {string} name Page name
 */
ve.ui.MWTemplateDialog.prototype.setPageByName = function ( name ) {
	if ( this.bookletLayout.isOutlined() ) {
		this.bookletLayout.getOutline().selectItem(
			this.bookletLayout.getOutline().getItemFromData( name )
		);
	} else {
		this.bookletLayout.setPage( name );
	}
};

/**
 * Save changes.
 */
ve.ui.MWTemplateDialog.prototype.saveChanges = function () {
	var surfaceFragment = this.getFragment(),
		surfaceModel = surfaceFragment.getSurface(),
		obj = this.transclusion.getPlainObject();

	if ( this.transclusionNode instanceof ve.dm.MWTransclusionNode ) {
		this.transclusion.updateTransclusionNode( surfaceModel, this.transclusionNode );
	} else if ( obj !== null ) {
		this.transclusion.insertTransclusionNode( surfaceFragment );
	}
};

/**
 * Update the dialog title.
 */
ve.ui.MWTemplateDialog.prototype.updateTitle = function () {
	var parts = this.transclusion && this.transclusion.getParts();

	this.setTitle(
		parts && parts.length === 1 && parts[0] ?
			this.getTemplatePartLabel( parts[0] ) :
			this.constructor.static.title
	);
};

/**
 * @inheritdoc
 */
ve.ui.MWTemplateDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.MWTemplateDialog.super.prototype.initialize.call( this );

	// Properties
	this.applyButton = new OO.ui.ButtonWidget( {
		'$': this.$,
		'flags': ['primary']
	} );
	this.bookletLayout = new OO.ui.BookletLayout(
		ve.extendObject(
			{ '$': this.$ },
			this.constructor.static.bookletLayoutConfig
		)
	);

	// Events
	this.applyButton.connect( this, { 'click': [ 'close', { 'action': 'apply' } ] } );

	// Initialization
	this.frame.$content.addClass( 've-ui-mwTemplateDialog' );
	this.$body.append( this.bookletLayout.$element );
	this.$foot.append( this.applyButton.$element );
	this.setSize( 'medium' );
};

/**
 * @inheritdoc
 */
ve.ui.MWTemplateDialog.prototype.setup = function ( data ) {
	var template, promise, transclusionNode;

	// Parent method
	ve.ui.MWTemplateDialog.super.prototype.setup.call( this, data );

	// Data initialization
	data = data || {};
	transclusionNode = this.getTransclusionNode( data.template );

	// Properties
	this.loaded = false;
	this.transclusion = new ve.dm.MWTransclusionModel();
	this.transclusionNode = transclusionNode instanceof ve.dm.MWTransclusionNode &&
		( !data.template || transclusionNode.isSingleTemplate( data.template ) ) ?
			transclusionNode : null;
	this.inserting = !this.transclusionNode;

	// Events
	this.transclusion.connect( this, { 'replace': 'onReplacePart' } );

	// Initialization
	this.applyButton
		.setDisabled( true )
		.setLabel( ve.msg( 'visualeditor-dialog-transclusion-loading' ) );
	if ( this.inserting ) {
		if ( data.template ) {
			template = ve.dm.MWTemplateModel.newFromName( this.transclusion, data.template );
			promise = this.transclusion.addPart( template ).done( function () {
				template.addRequiredParameters();
			} );
		} else {
			promise = this.transclusion.addPart(
				new ve.dm.MWTemplatePlaceholderModel( this.transclusion )
			);
		}
	} else {
		promise = this.transclusion
			.load( ve.copy( this.transclusionNode.getAttribute( 'mw' ) ) );
	}
	promise.always( ve.bind( this.onTransclusionReady, this ) );
};

/**
 * @inheritdoc
 */
ve.ui.MWTemplateDialog.prototype.teardown = function ( data ) {
	// Data initialization
	data = data || {};

	// Save changes
	if ( data.action === 'apply' ) {
		this.saveChanges();
	}

	this.transclusion.disconnect( this );
	this.transclusion.abortRequests();
	this.transclusion = null;
	this.bookletLayout.clearPages();
	this.transclusionNode = null;
	this.content = null;

	// Parent method
	ve.ui.MWTemplateDialog.super.prototype.teardown.call( this, data );
};
