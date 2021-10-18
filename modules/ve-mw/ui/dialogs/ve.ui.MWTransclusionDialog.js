/*!
 * VisualEditor user interface MWTransclusionDialog class.
 *
 * @copyright 2011-2020 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for inserting and editing MediaWiki transclusions, i.e. a sequence of one or more template
 * invocations that strictly belong to each other (e.g. because they are unbalanced), possibly
 * mixed with raw wikitext snippets.
 *
 * Note the base class {@see ve.ui.MWTemplateDialog} alone does not allow to manage more than a
 * single template invocation. Most of the code for this feature set is exclusive to this subclass.
 *
 * @class
 * @extends ve.ui.MWTemplateDialog
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWTransclusionDialog = function VeUiMWTransclusionDialog( config ) {
	var veConfig = mw.config.get( 'wgVisualEditorConfig' );

	// Parent constructor
	ve.ui.MWTransclusionDialog.super.call( this, config );

	// Properties
	this.isSidebarExpanded = null;

	this.resetConfirmation = new OO.ui.FieldsetLayout( {
		classes: [ 'oo-ui-processDialog-errors' ]
	} );
	this.resetConfirmationTitle = new OO.ui.LabelWidget( {
		label: OO.ui.deferMsg( 'visualeditor-dialog-transclusion-reset-confirmation-title' )
	} );
	this.resetConfirmationMessage = new OO.ui.MessageWidget( {
		label: OO.ui.deferMsg( 'visualeditor-dialog-transclusion-reset-confirmation-message' ),
		type: 'error'
	} );
	this.resetConfirmationCancelButton = new OO.ui.ButtonWidget( {
		label: OO.ui.deferMsg( 'visualeditor-dialog-transclusion-reset-confirmation-cancel' )
	} );
	this.resetConfirmationResetButton = new OO.ui.ButtonWidget( {
		label: OO.ui.deferMsg( 'visualeditor-dialog-transclusion-reset-confirmation-reset' ),
		flags: [ 'primary', 'destructive' ]
	} );

	// Events
	this.resetConfirmationCancelButton.connect( this, {
		click: 'resetConfirmationHide'
	} );
	this.resetConfirmationResetButton.connect( this, {
		click: 'resetConfirmationReset'
	} );
	this.setupHotkeyTriggers();

	// Initialization
	this.resetConfirmation.addItems( [
		new OO.ui.HorizontalLayout( {
			items: [ this.resetConfirmationTitle ],
			classes: [ 'oo-ui-processDialog-errors-title' ]
		} ),
		this.resetConfirmationMessage,
		new OO.ui.HorizontalLayout( {
			items: [ this.resetConfirmationCancelButton, this.resetConfirmationResetButton ],
			classes: [ 'oo-ui-processDialog-errors-actions' ]
		} )
	] );
	this.resetConfirmation.toggle( false );
	this.$content.append( this.resetConfirmation.$element );

	// Temporary feature flags
	this.useInlineDescriptions = veConfig.transclusionDialogInlineDescriptions;
	this.useBackButton = veConfig.transclusionDialogBackButton;
	this.useSearchImprovements = veConfig.templateSearchImprovements;
	this.useNewSidebar = veConfig.transclusionDialogNewSidebar;

	if ( this.useInlineDescriptions ) {
		this.$element.addClass( 've-ui-mwTransclusionDialog-bigger' );
	}
	if ( this.useSearchImprovements ) {
		this.$element.addClass( 've-ui-mwTransclusionDialog-enhancedSearch' );
	}
	if ( this.useNewSidebar ) {
		this.$element.addClass( 've-ui-mwTransclusionDialog-newSidebar' );
	}

	this.$element.on( 'keydown', this.onKeyDown.bind( this ) );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionDialog, ve.ui.MWTemplateDialog );

/* Static Properties */

ve.ui.MWTransclusionDialog.static.name = 'transclusion';

ve.ui.MWTransclusionDialog.static.actions = ve.ui.MWTemplateDialog.static.actions.concat( [
	{
		action: 'mode',
		modes: [ 'edit', 'insert' ],
		// HACK: Will be set later, but we want measurements to be accurate in the mean time, this
		// will not be needed when T93290 is resolved
		label: $( document.createTextNode( '\u00a0' ) )
	},
	{
		action: 'back',
		label: OO.ui.deferMsg( 'visualeditor-dialog-action-goback' ),
		modes: [ 'edit', 'insert' ],
		flags: [ 'safe', 'back' ]
	}
] );

/** @inheritdoc */
ve.ui.MWTransclusionDialog.static.bookletLayoutConfig = ve.extendObject(
	{},
	ve.ui.MWTemplateDialog.static.bookletLayoutConfig,
	{ outlined: true, editable: true }
);

ve.ui.MWTransclusionDialog.static.smallScreenMaxWidth = 540;

/* Methods */

/**
 * Handle outline controls move events.
 *
 * @private
 * @param {number} places Number of places to move the selected item
 */
ve.ui.MWTransclusionDialog.prototype.onOutlineControlsMove = function ( places ) {
	var parts = this.transclusionModel.getParts(),
		itemId = this.findSelectedPartId();

	if ( itemId ) {
		var part = this.transclusionModel.getPartFromId( itemId );
		// Move part to new location, and if dialog is loaded switch to new part page
		var promise = this.transclusionModel.addPart( part, parts.indexOf( part ) + places );
		if ( this.loaded && !this.preventReselection ) {
			promise.done( this.focusPart.bind( this, part.getId() ) );
		}
	}
};

/**
 * Handle outline controls remove events.
 *
 * @private
 */
ve.ui.MWTransclusionDialog.prototype.onOutlineControlsRemove = function () {
	var id = this.findSelectedPartId();

	if ( id ) {
		var part = this.transclusionModel.getPartFromId( id );
		// Check if the part is the actual template, or one of its parameters
		if ( part instanceof ve.dm.MWTemplateModel && id !== part.getId() ) {
			var param = part.getParameterFromId( id );
			if ( param instanceof ve.dm.MWParameterModel ) {
				part.removeParameter( param );
			}
		} else if ( part instanceof ve.dm.MWTransclusionPartModel ) {
			this.transclusionModel.removePart( part );
		}
	}
};

/**
 * Create a new template part at the end of the transclusion.
 *
 * @private
 */
ve.ui.MWTransclusionDialog.prototype.addTemplatePlaceholder = function () {
	this.addPart( new ve.dm.MWTemplatePlaceholderModel( this.transclusionModel ) );
};

/**
 * Handle add content button click events.
 *
 * @private
 */
ve.ui.MWTransclusionDialog.prototype.addContent = function () {
	this.addPart( new ve.dm.MWTransclusionContentModel( this.transclusionModel ) );
};

/**
 * Handle add parameter button click events.
 *
 * @private
 */
ve.ui.MWTransclusionDialog.prototype.addParameter = function () {
	var partId = this.findSelectedPartId();
	if ( !partId ) {
		return;
	}

	var part = this.transclusionModel.getPartFromId( partId );
	if ( !( part instanceof ve.dm.MWTemplateModel ) ) {
		return;
	}

	// TODO: Use a distinct class for placeholder model rather than
	// these magical "empty" constants.
	var placeholderParameter = new ve.dm.MWParameterModel( part );
	part.addParameter( placeholderParameter );
	this.focusPart( placeholderParameter.getId() );

	if ( this.useInlineDescriptions ) {
		this.autoExpandSidebar();
	}
};

/**
 * Handle booklet layout page set events.
 *
 * @private
 * @param {OO.ui.PageLayout} page Active page
 */
ve.ui.MWTransclusionDialog.prototype.onBookletLayoutSetPage = function ( page ) {
	var isLastPlaceholder = page instanceof ve.ui.MWTemplatePlaceholderPage &&
			this.transclusionModel.isSinglePart(),
		acceptsNewParameters = page instanceof ve.ui.MWTemplatePage ||
			page instanceof ve.ui.MWParameterPage;

	this.addParameterButton.setDisabled( !acceptsNewParameters || this.isReadOnly() );
	this.bookletLayout.getOutlineControls().removeButton.toggle( !isLastPlaceholder );

	if ( this.pocSidebar ) {
		this.pocSidebar.setSelectionByPageName( page.getName() );
	}
};

/**
 * @inheritdoc
 */
ve.ui.MWTransclusionDialog.prototype.onReplacePart = function ( removed, added ) {
	ve.ui.MWTransclusionDialog.super.prototype.onReplacePart.call( this, removed, added );
	var parts = this.transclusionModel.getParts();

	if ( parts.length === 0 ) {
		this.addParameterButton.setDisabled( true );
		this.addPart( new ve.dm.MWTemplatePlaceholderModel( this.transclusionModel ) );
	} else if ( parts.length > 1 ) {
		this.bookletLayout.getOutlineControls().toggle( true );
		this.$element.removeClass( 've-ui-mwTransclusionDialog-single-transclusion' );
	}

	this.multipartMessage.toggle( parts.length > 1 && this.useNewSidebar );

	this.autoExpandSidebar();
	this.updateModeActionState();
	this.updateActionSet();
};

/**
 * @private
 * @param {string} key
 * @return {string}
 */
ve.ui.MWTransclusionDialog.prototype.getHotkeyCombo = function ( key ) {
	return ( ve.getSystemPlatform() === 'mac' ? 'meta+' : 'ctrl+' ) + 'shift+' + key;
};

/**
 * @private
 */
ve.ui.MWTransclusionDialog.prototype.setupHotkeyTriggers = function () {
	var context = this;

	this.hotkeyTriggers = {};
	this.hotkeyTriggers[ this.getHotkeyCombo( 'e' ) ] = function () {
		context.addTemplatePlaceholder();
	};
	this.hotkeyTriggers[ this.getHotkeyCombo( 'y' ) ] = function () {
		context.addContent();
	};
	this.hotkeyTriggers[ this.getHotkeyCombo( 'u' ) ] = function () {
		context.addParameter();
	};
};

/**
 * Handles key down events.
 *
 * @protected
 * @param {jQuery.Event} e Key down event
 */
ve.ui.MWTransclusionDialog.prototype.onKeyDown = function ( e ) {
	var eventTrigger = new ve.ui.Trigger( e ).toString();

	if ( this.hotkeyTriggers[ eventTrigger ] ) {
		this.hotkeyTriggers[ eventTrigger ]();
		e.preventDefault();
		e.stopPropagation();
	}
};

/**
 * @return {string|undefined}
 */
ve.ui.MWTransclusionDialog.prototype.findSelectedPartId = function () {
	if ( this.pocSidebar ) {
		return this.pocSidebar.findSelectedPartId();
	}

	var item = this.bookletLayout.getOutline().findSelectedItem();
	return item && item.getData();
};

/**
 * @inheritdoc
 */
ve.ui.MWTransclusionDialog.prototype.getPageFromPart = function ( part ) {
	var page = ve.ui.MWTransclusionDialog.super.prototype.getPageFromPart.call( this, part );
	if ( !page && part instanceof ve.dm.MWTransclusionContentModel ) {
		return new ve.ui.MWTransclusionContentPage( part, part.getId(), { $overlay: this.$overlay, isReadOnly: this.isReadOnly() } );
	}
	return page;
};

/**
 * Automatically expand or collapse the sidebar according to default logic.
 *
 * @protected
 */
ve.ui.MWTransclusionDialog.prototype.autoExpandSidebar = function () {
	var expandSidebar;

	if ( this.useInlineDescriptions ) {
		var isSmallScreen = this.isNarrowScreen();
		if ( isSmallScreen && this.isSingleTemplatePlaceholder() ) {
			expandSidebar = false;
		} else if ( isSmallScreen &&
			// eslint-disable-next-line no-jquery/no-class-state
			this.$content.hasClass( 've-ui-mwTransclusionDialog-small-screen' )
		) {
			// We did this already. If the sidebar is visible or not is now the user's decision.
			return;
		} else {
			expandSidebar = !isSmallScreen;
		}
		this.$otherActions.toggleClass( 'oo-ui-element-hidden', !isSmallScreen );
		this.$content.toggleClass( 've-ui-mwTransclusionDialog-small-screen', isSmallScreen );
	} else {
		expandSidebar = !this.isSingleTemplateTransclusion();
	}

	this.toggleSidebar( expandSidebar );
};

/**
 * Set if the sidebar is visible (which means the dialog is expanded), or collapsed.
 *
 * @param {boolean} expandSidebar
 * @private
 */
ve.ui.MWTransclusionDialog.prototype.toggleSidebar = function ( expandSidebar ) {
	if ( this.isSidebarExpanded === expandSidebar ) {
		return;
	}

	this.isSidebarExpanded = expandSidebar;
	this.$content
		.toggleClass( 've-ui-mwTransclusionDialog-collapsed', !expandSidebar )
		.toggleClass( 've-ui-mwTransclusionDialog-expanded', expandSidebar );

	var dialogSizeSidebarExpanded = this.useInlineDescriptions ? 'larger' : 'large';
	var dialogSizeSidebarCollapsed = this.useNewSidebar ? dialogSizeSidebarExpanded : 'medium';
	this.ignoreNextWindowResizeEvent = true;
	this.setSize( expandSidebar ? dialogSizeSidebarExpanded : dialogSizeSidebarCollapsed );

	this.bookletLayout.toggleOutline( expandSidebar );
	this.updateTitle();
	this.updateModeActionState();

	// HACK blur any active input so that its dropdown will be hidden and won't end
	// up being mispositioned
	this.$content.find( 'input:focus' ).trigger( 'blur' );

	if ( this.useInlineDescriptions && this.pocSidebar && this.loaded && this.isNarrowScreen() ) {
		// Reapply selection and scrolling when switching between panes.
		// FIXME: decouple from descendants
		var selectedPage = this.bookletLayout.stackLayout.getCurrentItem();
		if ( selectedPage ) {
			var name = selectedPage.getName();
			var dialog = this;
			// Align whichever panel is becoming visible, after animation completes.
			// TODO: Should hook onto an animation promise—but is this possible when pure CSS?
			setTimeout( function () {
				if ( expandSidebar ) {
					dialog.pocSidebar.setSelectionByPageName( name );
				} else {
					selectedPage.scrollElementIntoView();
					// TODO: Find a reliable way to refocus.
					// dialog.focusPart( name );
				}
			}, OO.ui.theme.getDialogTransitionDuration() );
		}
	}
};

ve.ui.MWTransclusionDialog.prototype.isNarrowScreen = function () {
	return $( window ).width() <= this.constructor.static.smallScreenMaxWidth;
};

/**
 * @inheritdoc
 */
ve.ui.MWTransclusionDialog.prototype.updateTitle = function () {
	if ( !this.isSingleTemplateTransclusion() ) {
		this.title.setLabel( ve.msg( 'visualeditor-dialog-transclusion-title-edit-transclusion' ) );
	} else {
		// Parent method
		ve.ui.MWTransclusionDialog.super.prototype.updateTitle.call( this );
	}
};

/**
 * Update the state of the 'mode' action
 *
 * @private
 */
ve.ui.MWTransclusionDialog.prototype.updateModeActionState = function () {
	var isExpanded = this.isSidebarExpanded,
		label = ve.msg( isExpanded ?
			'visualeditor-dialog-transclusion-collapse-options' :
			'visualeditor-dialog-transclusion-expand-options' );

	this.actions.forEach( { actions: [ 'mode' ] }, function ( action ) {
		action.setLabel( label );
		action.$button.attr( 'aria-expanded', isExpanded ? 1 : 0 );
	} );

	// Old sidebar: Only a single template can be collapsed, except it's still the initial
	// placeholder.
	// New sidebar: The button is only visible on very narrow screens, {@see autoExpandSidebar}.
	// It's always needed, except in the initial placeholder state.
	var canCollapse = ( this.isSingleTemplateTransclusion() || this.useInlineDescriptions ) &&
		!this.isSingleTemplatePlaceholder();
	this.actions.setAbilities( { mode: canCollapse } );
};

/**
 * Add a part to the transclusion.
 *
 * @param {ve.dm.MWTransclusionPartModel} part Part to add
 */
ve.ui.MWTransclusionDialog.prototype.addPart = function ( part ) {
	var parts = this.transclusionModel.getParts(),
		itemId = this.findSelectedPartId();

	if ( part ) {
		// Insert after selected part, or at the end if nothing is selected
		var index = itemId ?
			parts.indexOf( this.transclusionModel.getPartFromId( itemId ) ) + 1 :
			parts.length;
		// Add the part, and if dialog is loaded switch to part page
		var promise = this.transclusionModel.addPart( part, index );
		if ( this.loaded && !this.preventReselection ) {
			promise.done( this.focusPart.bind( this, part.getId() ) );
		}
	}
};

/**
 * @inheritdoc
 */
ve.ui.MWTransclusionDialog.prototype.getActionProcess = function ( action ) {
	if ( action === 'back' ) {
		if ( !this.transclusionModel.containsValuableData() ) {
			return this.getActionProcess( 'reset' );
		}
		return new OO.ui.Process( function () {
			this.resetConfirmation.toggle( true );
		}, this );
	}

	if ( action === 'reset' ) {
		return new OO.ui.Process( function () {
			this.resetDialog();
		}, this );
	}

	if ( action === 'mode' ) {
		return new OO.ui.Process( function () {
			this.toggleSidebar( !this.isSidebarExpanded );
		}, this );
	}

	return ve.ui.MWTransclusionDialog.super.prototype.getActionProcess.call( this, action );
};

/**
 * Update the widgets in the dialog's action bar.
 *
 * @private
 */
ve.ui.MWTransclusionDialog.prototype.updateActionSet = function () {
	var backButton = this.actions.get( { flags: [ 'back' ] } ).pop(),
		saveButton = this.actions.get( { actions: [ 'done' ] } ).pop();

	if ( saveButton && this.getMode() === 'edit' ) {
		saveButton.setLabel( ve.msg( 'visualeditor-dialog-transclusion-action-save' ) );
	}

	if ( this.useBackButton ) {
		var closeButton = this.actions.get( { flags: [ 'close' ] } ).pop(),
			isInitialPage = this.isSingleTemplatePlaceholder(),
			isInsertMode = this.getMode() === 'insert',
			isUsingClose = !isInsertMode || isInitialPage;

		closeButton.toggle( isUsingClose );
		backButton.toggle( !isUsingClose );
	} else {
		backButton.toggle( false );
	}
};

/**
 * Dismisses the reset confirmation.
 *
 * @private
 */
ve.ui.MWTransclusionDialog.prototype.resetConfirmationHide = function () {
	this.resetConfirmation.toggle( false );
};

/**
 * Dismisses the reset confirmation and runs the reset action.
 *
 * @private
 */
ve.ui.MWTransclusionDialog.prototype.resetConfirmationReset = function () {
	this.resetConfirmationHide();
	this.executeAction( 'reset' );
};

/**
 * Revert the dialog back to its initial state.
 *
 * @private
 */
ve.ui.MWTransclusionDialog.prototype.resetDialog = function () {
	var target = this;
	this.transclusionModel.reset();
	if ( this.pocSidebar ) {
		this.pocSidebar.clear();
	}
	this.bookletLayout.clearPages();
	this.transclusionModel
		.addPart( new ve.dm.MWTemplatePlaceholderModel( this.transclusionModel ), 0 )
		.done( function () {
			target.autoExpandSidebar();
		} );
};

/**
 * @inheritdoc
 */
ve.ui.MWTransclusionDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.MWTransclusionDialog.super.prototype.initialize.call( this );

	// Properties
	this.addTemplateButton = new OO.ui.ButtonWidget( {
		framed: false,
		icon: 'puzzle',
		title: ve.msg( 'visualeditor-dialog-transclusion-add-template' )
	} );
	this.addContentButton = new OO.ui.ButtonWidget( {
		framed: false,
		icon: 'wikiText',
		title: ve.msg( this.useNewSidebar ?
			'visualeditor-dialog-transclusion-add-wikitext' :
			'visualeditor-dialog-transclusion-add-content' )
	} );
	this.addParameterButton = new OO.ui.ButtonWidget( {
		framed: false,
		icon: 'parameter',
		title: ve.msg( 'visualeditor-dialog-transclusion-add-param' )
	} );

	this.bookletLayout.getOutlineControls().addItems( [ this.addTemplateButton, this.addContentButton ] );
	if ( !this.useNewSidebar ) {
		this.bookletLayout.getOutlineControls().addItems( [ this.addParameterButton ] );
	}

	this.multipartMessage = new OO.ui.MessageWidget( {
		label: ve.msg( 'visualeditor-dialog-transclusion-multipart-message' ),
		classes: [ 've-ui-mwTransclusionDialog-multipart-message' ]
	} );

	// Events
	if ( this.useInlineDescriptions ) {
		this.getManager().connect( this, { resize: ve.debounce( this.onWindowResize.bind( this ) ) } );
	}
	this.bookletLayout.connect( this, { set: 'onBookletLayoutSetPage' } );
	this.bookletLayout.$menu.find( '[ role="listbox" ]' ).first()
		.attr( 'aria-label', ve.msg( 'visualeditor-dialog-transclusion-templates-menu-aria-label' ) );
	this.addTemplateButton.connect( this, { click: 'addTemplatePlaceholder' } );
	this.addContentButton.connect( this, { click: 'addContent' } );
	this.addParameterButton.connect( this, { click: 'addParameter' } );
	this.bookletLayout.getOutlineControls().connect( this, {
		move: 'onOutlineControlsMove',
		remove: 'onOutlineControlsRemove'
	} );
	if ( this.useNewSidebar ) {
		this.bookletLayout.stackLayout.$element.prepend( this.multipartMessage.$element );
	}
};

/**
 * @inheritdoc
 */
ve.ui.MWTransclusionDialog.prototype.getSetupProcess = function ( data ) {
	return ve.ui.MWTransclusionDialog.super.prototype.getSetupProcess.call( this, data )
		.next( function () {
			var isReadOnly = this.isReadOnly();
			this.addTemplateButton.setDisabled( isReadOnly );
			this.addContentButton.setDisabled( isReadOnly );
			this.addParameterButton.setDisabled( isReadOnly );
			this.bookletLayout.getOutlineControls().setAbilities( {
				move: !isReadOnly,
				remove: !isReadOnly
			} );

			if ( this.useNewSidebar ) {
				this.bookletLayout.getOutlineControls().toggle( !this.isSingleTemplateTransclusion() );
				this.$element.toggleClass(
					've-ui-mwTransclusionDialog-single-transclusion',
					this.isSingleTemplateTransclusion()
				);
			}

			this.updateModeActionState();
			this.autoExpandSidebar();
		}, this );
};

/**
 * @private
 */
ve.ui.MWTransclusionDialog.prototype.onWindowResize = function () {
	if ( !this.ignoreNextWindowResizeEvent ) {
		this.autoExpandSidebar();
	}
	this.ignoreNextWindowResizeEvent = false;
};

/**
 * @inheritdoc
 *
 * Temporary override to increase dialog size when a feature flag is enabled.
 */
ve.ui.MWTransclusionDialog.prototype.getSizeProperties = function () {
	var sizeProps = ve.ui.MWTransclusionDialog.super.prototype.getSizeProperties.call( this );

	if ( this.useInlineDescriptions ) {
		sizeProps = ve.extendObject( { height: '90%' }, sizeProps );
	}

	return sizeProps;
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWTransclusionDialog );
