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
 * @extends ve.ui.NodeDialog
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWReferenceDialog = function VeUiMWReferenceDialog( config ) {
	// Parent constructor
	ve.ui.MWReferenceDialog.super.call( this, config );

	// Properties
	this.referenceModel = null;
};

/* Inheritance */

OO.inheritClass( ve.ui.MWReferenceDialog, ve.ui.NodeDialog );

/* Static Properties */

ve.ui.MWReferenceDialog.static.name = 'reference';

ve.ui.MWReferenceDialog.static.title =
	OO.ui.deferMsg( 'visualeditor-dialog-reference-title' );

ve.ui.MWReferenceDialog.static.icon = 'reference';

ve.ui.MWReferenceDialog.static.actions = [
	{
		action: 'apply',
		label: OO.ui.deferMsg( 'visualeditor-dialog-action-apply' ),
		flags: 'primary',
		modes: 'edit'
	},
	{
		action: 'insert',
		label: OO.ui.deferMsg( 'visualeditor-dialog-action-insert' ),
		flags: [ 'primary', 'constructive' ],
		modes: 'insert'
	},
	{
		label: OO.ui.deferMsg( 'visualeditor-dialog-action-cancel' ),
		flags: 'safe',
		modes: [ 'insert', 'edit', 'insert-select' ]
	},
	{
		action: 'select',
		label: OO.ui.deferMsg( 'visualeditor-dialog-reference-useexisting-label' ),
		modes: [ 'insert', 'edit' ]
	},
	{
		action: 'back',
		label: OO.ui.deferMsg( 'visualeditor-dialog-action-goback' ),
		flags: 'safe',
		modes: 'select'
	}
];

ve.ui.MWReferenceDialog.static.modelClasses = [ ve.dm.MWReferenceNode ];

ve.ui.MWReferenceDialog.static.toolbarGroups = [
	// History
	{ include: [ 'undo', 'redo' ] },
	// No formatting
	/* {
		type: 'menu',
		indicator: 'down',
		title: OO.ui.deferMsg( 'visualeditor-toolbar-format-tooltip' ),
		include: [ { group: 'format' } ],
		promote: [ 'paragraph' ],
		demote: [ 'preformatted', 'heading1' ]
	},*/
	// Style
	{
		type: 'list',
		icon: 'text-style',
		indicator: 'down',
		title: OO.ui.deferMsg( 'visualeditor-toolbar-style-tooltip' ),
		include: [ { group: 'textStyle' }, 'language', 'clear' ],
		promote: [ 'bold', 'italic' ],
		demote: [ 'strikethrough', 'code', 'underline', 'language', 'clear' ]
	},
	// Link
	{ include: [ 'link' ] },
	// Cite but not reference
	{
		type: 'list',
		label: OO.ui.deferMsg( 'visualeditor-toolbar-cite-label' ),
		indicator: 'down',
		include: [ { group: 'cite-transclusion' }/*, 'reference', 'reference/existing'*/ ]
		/*demote: [ 'reference', 'reference/existing' ]*/
	},
	// No structure
	/* {
		type: 'list',
		icon: 'bullet-list',
		indicator: 'down',
		include: [ { group: 'structure' } ],
		demote: [ 'outdent', 'indent' ]
	},*/
	// Insert
	{
		label: OO.ui.deferMsg( 'visualeditor-toolbar-insert' ),
		indicator: 'down',
		include: '*',
		exclude: [
			{ group: 'format' },
			{ group: 'structure' },
			'reference',
			'referencesList',
			'gallery'
		],
		promote: [ 'media', 'transclusion' ],
		demote: [ 'specialcharacter' ]
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

/**
 * Get the paste rules for the surface widget in the dialog
 *
 * @see ve.dm.ElementLinearData#sanitize
 * @return {Object} Paste rules
 */
ve.ui.MWReferenceDialog.static.getPasteRules = function () {
	return ve.extendObject(
		ve.copy( ve.init.target.constructor.static.pasteRules ),
		{
			all: {
				blacklist: OO.simpleArrayUnion(
					ve.getProp( ve.init.target.constructor.static.pasteRules, 'all', 'blacklist' ) || [],
					[
						// Nested references are impossible
						'mwReference', 'mwReferencesList',
						// Lists and tables are actually possible in wikitext with a leading
						// line break but we prevent creating these with the UI
						'list', 'listItem', 'definitionList', 'definitionListItem',
						'table', 'tableCaption', 'tableSection', 'tableRow', 'tableCell'
					]
				),
				// Headings are not possible in wikitext without HTML
				conversions: {
					mwHeading: 'paragraph'
				}
			}
		}
	);
};

/* Methods */

/**
 * Handle reference surface change events
 */
ve.ui.MWReferenceDialog.prototype.onDocumentTransact = function () {
	var data = this.referenceModel.getDocument().data,
		// TODO: Check for other types of empty, e.g. only whitespace?
		hasContent = data.countNonInternalElements() > 2;

	this.actions.setAbilities( {
		apply: hasContent,
		insert: hasContent,
		select: !hasContent && !this.search.isIndexEmpty()
	} );
};

/**
 * Handle search select events.
 *
 * @param {ve.dm.MWReferenceModel|null} ref Reference model or null if no item is selected
 */
ve.ui.MWReferenceDialog.prototype.onSearchSelect = function ( ref ) {
	if ( ref instanceof ve.dm.MWReferenceModel ) {
		if ( this.selectedNode instanceof ve.dm.MWReferenceNode ) {
			this.getFragment().removeContent();
			this.selectedNode = null;
		}
		this.useReference( ref );
		this.executeAction( 'insert' );
	}
};

/**
 * @inheritdoc
 */
ve.ui.MWReferenceDialog.prototype.getReadyProcess = function ( data ) {
	return ve.ui.MWReferenceDialog.super.prototype.getReadyProcess.call( this, data )
		.next( function () {
			this.referenceSurface.focus();
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWReferenceDialog.prototype.getBodyHeight = function () {
	// Clamp value to between 300 and 400px height, preferring the actual height if available
	return Math.min(
		400,
		Math.max(
			300,
			Math.ceil( this.panels.getCurrentItem().$element[0].scrollHeight )
		)
	);
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
		this.referenceModel = ref;
	} else {
		// Create a new reference
		this.referenceModel = new ve.dm.MWReferenceModel();
	}

	// Cleanup
	if ( this.referenceSurface ) {
		this.referenceSurface.destroy();
	}

	// Properties
	this.referenceSurface = new ve.ui.SurfaceWidget(
		this.referenceModel.getDocument(),
		{
			$: this.$,
			tools: this.constructor.static.toolbarGroups,
			commands: this.constructor.static.surfaceCommands,
			pasteRules: this.constructor.static.getPasteRules()
		}
	);

	// Events
	this.referenceModel.getDocument().connect( this, { transact: 'onDocumentTransact' } );
	this.referenceSurface.getSurface().getModel().connect( this, {
		documentUpdate: function () {
			mw.loader.using( 'mediawiki.notification' ).then( function () {
				this.wikitextWarning = ve.init.mw.ViewPageTarget.static.checkForWikitextWarning(
					this.referenceSurface.getSurface(),
					this.wikitextWarning
				);
			}.bind( this ) );
		}
	} );

	// Initialization
	this.referenceGroupInput.input.setValue( this.referenceModel.getGroup() );
	this.contentFieldset.$element.append( this.referenceSurface.$element );
	this.referenceSurface.initialize();

	return this;
};

/**
 * @inheritdoc
 */
ve.ui.MWReferenceDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.MWReferenceDialog.super.prototype.initialize.call( this );

	// Properties
	this.panels = new OO.ui.StackLayout( { $: this.$ } );
	this.editPanel = new OO.ui.PanelLayout( {
		$: this.$, scrollable: true, padded: true
	} );
	this.searchPanel = new OO.ui.PanelLayout( { $: this.$ } );
	this.contentFieldset = new OO.ui.FieldsetLayout( { $: this.$ } );
	this.optionsFieldset = new OO.ui.FieldsetLayout( {
		$: this.$,
		label: ve.msg( 'visualeditor-dialog-reference-options-section' ),
		icon: 'settings'
	} );
	this.referenceGroupInput = new ve.ui.MWReferenceGroupInputWidget( {
		$: this.$,
		emptyGroupName: ve.msg( 'visualeditor-dialog-reference-options-group-placeholder' )
	} );
	this.referenceGroupField = new OO.ui.FieldLayout( this.referenceGroupInput, {
		$: this.$,
		align: 'top',
		label: ve.msg( 'visualeditor-dialog-reference-options-group-label' )
	} );
	this.search = new ve.ui.MWReferenceSearchWidget( { $: this.$ } );

	// Events
	this.search.connect( this, { select: 'onSearchSelect' } );

	// Initialization
	this.panels.addItems( [ this.editPanel, this.searchPanel ] );
	this.editPanel.$element.append( this.contentFieldset.$element, this.optionsFieldset.$element );
	this.optionsFieldset.addItems( [ this.referenceGroupField ] );
	this.searchPanel.$element.append( this.search.$element );
	this.$body.append( this.panels.$element );
};

/**
 * Switches dialog to use existing reference mode
 *
 * @param {string} [action='select'] Symbolic name of action, either 'select' or 'insert-select'
 */
ve.ui.MWReferenceDialog.prototype.useExistingReference = function ( action ) {
	action = action || 'select';
	if ( action === 'insert-select' || action === 'select' ) {
		this.actions.setMode( action );
	}
	this.search.buildIndex();
	this.panels.setItem( this.searchPanel );
	this.search.getQuery().focus().select();
};

/**
 * @inheritdoc
 */
ve.ui.MWReferenceDialog.prototype.getActionProcess = function ( action ) {
	if ( action === 'insert' || action === 'apply' ) {
		return new OO.ui.Process( function () {
			var surfaceModel = this.getFragment().getSurface();

			this.referenceModel.setGroup( this.referenceGroupInput.input.getValue() );

			// Insert reference (will auto-create an internal item if needed)
			if ( !( this.selectedNode instanceof ve.dm.MWReferenceNode ) ) {
				if ( !this.referenceModel.findInternalItem( surfaceModel ) ) {
					this.referenceModel.insertInternalItem( surfaceModel );
				}
				// Collapse returns a new fragment, so update this.fragment
				this.fragment = this.getFragment().collapseRangeToEnd();
				this.referenceModel.insertReferenceNode( this.getFragment() );
			}

			// Update internal item
			this.referenceModel.updateInternalItem( surfaceModel );

			this.close( { action: action } );
		}, this );
	} else if ( action === 'back' ) {
		this.actions.setMode( this.selectedNode ? 'edit' : 'insert' );
		this.panels.setItem( this.editPanel );
		this.editPanel.$element.find( '.ve-ce-documentNode' )[0].focus();
	} else if ( action === 'select' || action === 'insert-select' ) {
		this.useExistingReference( action );
	}
	return ve.ui.MWReferenceDialog.super.prototype.getActionProcess.call( this, action );
};

/**
 * @inheritdoc
 * @param {Object} [data] Setup data
 * @param {boolean} [data.useExistingReference] Open the dialog in "use existing reference" mode
 */
ve.ui.MWReferenceDialog.prototype.getSetupProcess = function ( data ) {
	data = data || {};
	return ve.ui.MWReferenceDialog.super.prototype.getSetupProcess.call( this, data )
		.next( function () {
			this.panels.setItem( this.editPanel );
			if ( this.selectedNode instanceof ve.dm.MWReferenceNode ) {
				this.useReference(
					ve.dm.MWReferenceModel.static.newFromReferenceNode( this.selectedNode )
				);
			} else {
				this.useReference( null );
				this.actions.setAbilities( { apply: false, insert: false } );
			}

			this.actions.setMode( this.selectedNode ? 'edit' : 'insert' );
			this.search.setInternalList( this.getFragment().getDocument().getInternalList() );

			if ( data.useExisting ) {
				this.useExistingReference( 'insert-select' );
			}

			// If we're using an existing reference, start off disabled
			// If not, set disabled based on whether or not there are any existing ones.
			this.actions.setAbilities( {
				select: !( this.selectedNode instanceof ve.dm.MWReferenceNode ) &&
					!this.search.isIndexEmpty()
			} );

			this.referenceGroupInput.populateMenu( this.getFragment().getDocument().getInternalList() );
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWReferenceDialog.prototype.getTeardownProcess = function ( data ) {
	return ve.ui.MWReferenceDialog.super.prototype.getTeardownProcess.call( this, data )
		.first( function () {
			this.search.getQuery().setValue( '' );
			if ( this.wikitextWarning ) {
				this.wikitextWarning.close();
			}
			this.referenceSurface.destroy();
			this.referenceSurface = null;
			this.referenceModel = null;
		}, this );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWReferenceDialog );
