/*!
 * VisualEditor UserInterface MediaWiki MWReferenceDialog class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for editing MediaWiki references.
 *
 * @class
 * @extends ve.ui.MWDialog
 *
 * @constructor
 * @param {ve.ui.Surface} surface Surface dialog is for
 * @param {Object} [config] Configuration options
 */
ve.ui.MWReferenceDialog = function VeUiMWReferenceDialog( surface, config ) {
	// Configuration initialization
	config = ve.extendObject( { 'size': 'medium' }, config );

	// Parent constructor
	ve.ui.MWDialog.call( this, surface, config );

	// Properties
	this.ref = null;
};

/* Inheritance */

OO.inheritClass( ve.ui.MWReferenceDialog, ve.ui.MWDialog );

/* Static Properties */

ve.ui.MWReferenceDialog.static.name = 'reference';

ve.ui.MWReferenceDialog.static.title =
	OO.ui.deferMsg( 'visualeditor-dialog-reference-title' );

ve.ui.MWReferenceDialog.static.icon = 'reference';

ve.ui.MWReferenceDialog.static.toolbarGroups = [
	// History
	{ 'include': [ 'undo', 'redo' ] },
	// No formatting
	/* {
		'type': 'menu',
		'indicator': 'down',
		'title': OO.ui.deferMsg( 'visualeditor-toolbar-format-tooltip' ),
		'include': [ { 'group': 'format' } ],
		'promote': [ 'paragraph' ],
		'demote': [ 'preformatted', 'heading1' ]
	},*/
	// Style
	{
		'type': 'list',
		'icon': 'text-style',
		'indicator': 'down',
		'title': OO.ui.deferMsg( 'visualeditor-toolbar-style-tooltip' ),
		'include': [ { 'group': 'textStyle' }, 'clear' ],
		'promote': [ 'bold', 'italic' ],
		'demote': [ 'strikethrough', 'code', 'underline', 'clear' ]
	},
	// Link
	{ 'include': [ 'link' ] },
	// Cite
	{
		'type': 'list',
		'label': 'Cite',
		'indicator': 'down',
		'include': [ { 'group': 'cite-transclusion' } ]
	},
	// No structure
	/* {
		'type': 'bar',
		'include': [ 'number', 'bullet', 'outdent', 'indent' ]
	},*/
	// Insert
	{
		'label': OO.ui.deferMsg( 'visualeditor-toolbar-insert' ),
		'indicator': 'down',
		'include': '*',
		'exclude': [
			{ 'group': 'format' },
			{ 'group': 'structure' },
			'reference',
			'referenceList',
			'gallery'
		],
		'promote': [ 'mediaInsert' ],
		'demote': [ 'language', 'specialcharacter' ]
	}
];

ve.ui.MWReferenceDialog.static.surfaceCommands = [
	'undo',
	'redo',
	'bold',
	'italic',
	'link',
	'clear',
	'underline',
	'subscript',
	'superscript',
	'pasteSpecial'
];

ve.ui.MWReferenceDialog.static.pasteRules = ve.extendObject(
	ve.copy( ve.init.mw.Target.static.pasteRules ),
	{
		'all': {
			'blacklist': OO.simpleArrayUnion(
				ve.getProp( ve.init.mw.Target.static.pasteRules, 'all', 'blacklist' ) || [],
				[
					// Nested references are impossible
					'mwReference', 'mwReferenceList',
					// Lists are tables are actually possible in wikitext with a leading
					// line break but we prevent creating these with the UI
					'list', 'listItem', 'definitionList', 'definitionListItem',
					'table', 'tableCaption', 'tableSection', 'tableRow', 'tableCell'
				]
			),
			// Headings are not possible in wikitext without HTML
			'conversions': {
				'mwHeading': 'paragraph'
			}
		}
	}
);

/* Methods */

/**
 * Handle reference surface change events
 */
ve.ui.MWReferenceDialog.prototype.onDocumentTransact = function () {
	var data = this.referenceSurface.getContent(),
		// TODO: Check for other types of empty, e.g. only whitespace?
		disabled = data.length <= 4;

	this.insertButton.setDisabled( disabled );
	this.applyButton.setDisabled( disabled );
};

/**
 * Handle search select events.
 *
 * @param {ve.dm.MWReferenceModel|null} ref Reference model or null if no item is selected
 */
ve.ui.MWReferenceDialog.prototype.onSearchSelect = function ( ref ) {
	if ( ref instanceof ve.dm.MWReferenceModel ) {
		this.useReference( ref );
		this.close( { 'action': 'insert' } );
	}
};

/**
 * Work on a specific reference.
 *
 * @param {ve.dm.MWReferenceModel} [ref] Reference model, omit to work on a new reference
 * @chainable
 */
ve.ui.MWReferenceDialog.prototype.useReference = function ( ref ) {
	// Properties
	if ( ref instanceof ve.dm.MWReferenceModel ) {
		// Use an existing reference
		this.ref = ref;
	} else {
		// Create a new reference
		this.ref = new ve.dm.MWReferenceModel();
	}

	// Cleanup
	if ( this.referenceSurface ) {
		this.referenceSurface.destroy();
	}

	// Properties
	this.referenceSurface = new ve.ui.SurfaceWidget(
		this.ref.getDocument(),
		{
			'$': this.$,
			'tools': this.constructor.static.toolbarGroups,
			'commands': this.constructor.static.surfaceCommands,
			'pasteRules': this.constructor.static.pasteRules
		}
	);

	// Events
	this.ref.getDocument().connect( this, { 'transact': 'onDocumentTransact' } );

	// Initialization
	this.referenceGroupInput.setValue( this.ref.getGroup() );
	this.contentFieldset.$element.append( this.referenceSurface.$element );
	this.referenceSurface.initialize();

	return this;
};

/**
 * @inheritdoc
 */
ve.ui.MWReferenceDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.MWDialog.prototype.initialize.call( this );

	// Properties
	this.panels = new OO.ui.StackLayout( { '$': this.$ } );
	this.editPanel = new OO.ui.PanelLayout( {
		'$': this.$, 'scrollable': true, 'padded': true
	} );
	this.searchPanel = new OO.ui.PanelLayout( { '$': this.$ } );
	this.applyButton = new OO.ui.ButtonWidget( {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-action-apply' ),
		'flags': ['primary']
	} );
	this.insertButton = new OO.ui.ButtonWidget( {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-reference-insert-button' ),
		'flags': ['constructive']
	} );
	this.selectButton = new OO.ui.ButtonWidget( {
		'$': this.$,
		'label': ve.msg ( 'visualeditor-dialog-reference-useexisting-label' )
	} );
	this.backButton = new OO.ui.ButtonWidget( {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-action-goback' )
	} );
	this.contentFieldset = new OO.ui.FieldsetLayout( { '$': this.$ } );
	this.optionsFieldset = new OO.ui.FieldsetLayout( {
		'$': this.$,
		'label': ve.msg( 'visualeditor-dialog-reference-options-section' ),
		'icon': 'settings'
	} );
	// TODO: Use a drop-down or something, and populate with existing groups instead of free-text
	this.referenceGroupInput = new OO.ui.TextInputWidget( {
		'$': this.$,
		'placeholder': ve.msg( 'visualeditor-dialog-reference-options-group-placeholder' )
	} );
	this.referenceGroupField = new OO.ui.FieldLayout( this.referenceGroupInput, {
		'$': this.$,
		'align': 'top',
		'label': ve.msg( 'visualeditor-dialog-reference-options-group-label' )
	} );
	this.search = new ve.ui.MWReferenceSearchWidget(
		this.surface, { '$': this.$ }
	);

	// Events
	this.applyButton.connect( this, { 'click': [ 'close', { 'action': 'apply' } ] } );
	this.insertButton.connect( this, { 'click': [ 'close', { 'action': 'insert' } ] } );
	this.selectButton.connect( this, { 'click': function () {
		this.backButton.$element.show();
		this.insertButton.$element.hide();
		this.selectButton.$element.hide();
		this.panels.setItem( this.searchPanel );
		this.search.getQuery().$input.focus().select();
	} } );
	this.backButton.connect( this, { 'click': function () {
		this.backButton.$element.hide();
		this.insertButton.$element.show();
		this.selectButton.$element.show();
		this.panels.setItem( this.editPanel );
		this.editPanel.$element.find( '.ve-ce-documentNode' ).focus();
	} } );
	this.search.connect( this, { 'select': 'onSearchSelect' } );

	// Initialization
	this.panels.addItems( [ this.editPanel, this.searchPanel ] );
	this.editPanel.$element.append( this.contentFieldset.$element, this.optionsFieldset.$element );
	this.optionsFieldset.addItems( [ this.referenceGroupField ] );
	this.searchPanel.$element.append( this.search.$element );
	this.$body.append( this.panels.$element );
	this.$foot.append(
		this.applyButton.$element,
		this.insertButton.$element,
		this.selectButton.$element,
		this.backButton.$element
	);
};

/**
 * @inheritdoc
 */
ve.ui.MWReferenceDialog.prototype.setup = function ( data ) {
	var focusedNode;

	// Parent method
	ve.ui.MWDialog.prototype.setup.call( this, data );

	focusedNode = this.surface.getView().getFocusedNode();

	// Data initialization
	data = data || {};

	this.panels.setItem( this.editPanel );
	if ( focusedNode instanceof ve.ce.MWReferenceNode ) {
		this.useReference(
			ve.dm.MWReferenceModel.static.newFromReferenceNode( focusedNode.getModel() )
		);
		this.applyButton.$element.show();
		this.insertButton.$element.hide();
		this.selectButton.$element.hide();
	} else {
		this.useReference( null );
		this.selectButton.$element.show();
		this.applyButton.$element.hide();
		this.insertButton.$element.show();
	}
	this.backButton.$element.hide();
	this.search.buildIndex();
	this.selectButton.setDisabled( this.search.isIndexEmpty() );
};

/**
 * @inheritdoc
 */
ve.ui.MWReferenceDialog.prototype.teardown = function ( data ) {
	var surfaceModel = this.surface.getModel();

	// Data initialization
	data = data || {};

	if ( data.action === 'insert' || data.action === 'apply' ) {
		this.ref.setGroup( this.referenceGroupInput.getValue() );

		// Insert reference (will auto-create an internal item if needed)
		if ( data.action === 'insert' ) {
			if ( !this.ref.findInternalItem( surfaceModel ) ) {
				this.ref.insertInternalItem( surfaceModel );
			}
			this.ref.insertReferenceNode( surfaceModel );
		}
		// Update internal item
		this.ref.updateInternalItem( surfaceModel );
	}

	this.referenceSurface.destroy();
	this.referenceSurface = null;
	this.ref = null;

	// Parent method
	ve.ui.MWDialog.prototype.teardown.call( this, data );
};

/* Registration */

ve.ui.dialogFactory.register( ve.ui.MWReferenceDialog );
