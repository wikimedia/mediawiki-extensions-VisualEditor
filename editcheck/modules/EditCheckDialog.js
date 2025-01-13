/*!
 * VisualEditor UserInterface EditCheckDialog class.
 *
 * @copyright See AUTHORS.txt
 */

/**
 * Find and replace dialog.
 *
 * @class
 * @extends ve.ui.ToolbarDialog
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.EditCheckDialog = function VeUiEditCheckDialog( config ) {
	// Parent constructor
	ve.ui.EditCheckDialog.super.call( this, config );

	// Don't run a scroll if the previous animation is still running (which is jQuery 'fast' === 200ms)
	this.scrollCurrentCheckIntoViewDebounced = ve.debounce( this.scrollCurrentCheckIntoView.bind( this ), 200, true );

	// Pre-initialization
	this.$element.addClass( 've-ui-editCheckDialog' );
};

/* Inheritance */

OO.inheritClass( ve.ui.EditCheckDialog, ve.ui.ToolbarDialog );

ve.ui.EditCheckDialog.static.name = 'editCheckDialog';

ve.ui.EditCheckDialog.static.position = OO.ui.isMobile() ? 'below' : 'side';

ve.ui.EditCheckDialog.static.size = OO.ui.isMobile() ? 'full' : 'medium';

ve.ui.EditCheckDialog.static.framed = false;

// TODO: Keep surface active on mobile for some checks?
ve.ui.EditCheckDialog.static.activeSurface = !OO.ui.isMobile();

// Invisible title for accessibility
ve.ui.EditCheckDialog.static.title = OO.ui.deferMsg( 'editcheck-review-title' );

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.EditCheckDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.EditCheckDialog.super.prototype.initialize.call( this );

	this.title = new OO.ui.LabelWidget( {
		label: this.constructor.static.title,
		classes: [ 've-ui-editCheckDialog-title' ]
	} );

	// FIXME: click handlers are getting unbound when the window is closed

	this.closeButton = new OO.ui.ButtonWidget( {
		classes: [ 've-ui-editCheckDialog-close' ],
		framed: false,
		label: ve.msg( 'visualeditor-contextitemwidget-label-close' ),
		invisibleLabel: true,
		icon: 'expand'
	} ).connect( this, {
		click: 'onCloseButtonClick'
	} );

	this.currentOffset = 0;
	this.currentChecks = null;

	this.footerLabel = new OO.ui.LabelWidget();
	this.previousButton = new OO.ui.ButtonWidget( {
		icon: 'previous',
		title: ve.msg( 'last' ),
		invisibleLabel: true,
		framed: false
	} ).connect( this, {
		click: 'onPreviousButtonClick'
	} );
	this.nextButton = new OO.ui.ButtonWidget( {
		icon: 'next',
		title: ve.msg( 'next' ),
		invisibleLabel: true,
		framed: false
	} ).connect( this, {
		click: 'onNextButtonClick'
	} );
	this.footer = new OO.ui.HorizontalLayout( {
		classes: [ 've-ui-editCheckDialog-footer' ],
		items: [
			this.footerLabel,
			this.previousButton,
			this.nextButton
		]
	} );

	this.$checks = $( '<div>' );
	this.$body.append( this.title.$element, this.closeButton.$element, this.$checks, this.footer.$element );

	this.$highlights = $( '<div>' );

	this.updateDebounced = ve.debounce( this.update.bind( this ), 100 );
	this.positionDebounced = ve.debounce( this.position.bind( this ), 100 );
};

ve.ui.EditCheckDialog.prototype.update = function ( fromUserAction ) {
	const surfaceView = this.surface.getView();
	// We only regenerate the checks on-change during the edit. If we're in
	// the proofreading step, no new checks should appear based on changes:
	if ( this.listener === 'onDocumentChange' || !this.currentChecks ) {
		this.currentChecks = mw.editcheck.editCheckFactory.createAllByListener( this.listener, this.surface.getModel() );
	}
	if ( this.currentChecks.length === 0 ) {
		return this.close( 'complete' );
	}
	const checks = this.currentChecks;
	const newOffset = Math.min( this.currentOffset, checks.length - 1 );
	this.$checks.empty();
	this.$highlights.empty();

	checks.forEach( ( check, index ) => {
		const widget = check.render( index !== newOffset, this.listener === 'onBeforeSave', this.surface );
		widget.on( 'togglecollapse', this.onToggleCollapse, [ check, index ], this );
		widget.on( 'act', this.onAct, [ widget ], this );
		this.$checks.append( widget.$element );
		check.widget = widget;
	} );

	if ( this.reviewMode ) {
		// Review mode grays out everything that's not highlighted:
		const highlightNodes = [];
		checks.forEach( ( check ) => {
			check.getHighlightSelections().forEach( ( selection ) => {
				highlightNodes.push.apply( highlightNodes, surfaceView.getDocument().selectNodes( selection.getCoveringRange(), 'branches' ).map( ( spec ) => spec.node ) );
			} );
		} );
		surfaceView.setReviewMode( true, highlightNodes );
	}

	this.setCurrentOffset( newOffset, fromUserAction );
};

ve.ui.EditCheckDialog.prototype.position = function () {
	this.drawHighlights();
	if ( this.reviewMode ) {
		this.scrollCurrentCheckIntoViewDebounced();
	}
};

ve.ui.EditCheckDialog.prototype.drawHighlights = function () {
	const surfaceView = this.surface.getView();
	this.$highlights.empty();

	this.currentChecks.forEach( ( check, index ) => {
		check.getHighlightSelections().forEach( ( selection ) => {
			const selectionView = ve.ce.Selection.static.newFromModel( selection, surfaceView );
			const rect = selectionView.getSelectionBoundingRect();
			// The following classes are used here:
			// * ve-ui-editCheck-gutter-highlight-error
			// * ve-ui-editCheck-gutter-highlight-warning
			// * ve-ui-editCheck-gutter-highlight-notice
			// * ve-ui-editCheck-gutter-highlight-success
			// * ve-ui-editCheck-gutter-highlight-active
			// * ve-ui-editCheck-gutter-highlight-inactive
			this.$highlights.append( $( '<div>' )
				.addClass( 've-ui-editCheck-gutter-highlight' )
				.addClass( 've-ui-editCheck-gutter-highlight-' + check.getType() )
				.addClass( 've-ui-editCheck-gutter-highlight-' + ( index === this.currentOffset ? 'active' : 'inactive' ) )
				.css( {
					top: rect.top - 2,
					height: rect.height + 4
				} )
			);
		} );
	} );

	surfaceView.appendHighlights( this.$highlights, false );
};

/**
 * Set the offset of the current check, within the list of all checks
 *
 * @param {number} offset
 * @param {boolean} fromUserAction
 */
ve.ui.EditCheckDialog.prototype.setCurrentOffset = function ( offset, fromUserAction ) {
	// TODO: work out how to tell the window to recalculate height here
	this.currentOffset = Math.max( 0, offset );

	this.$body.find( '.ve-ui-editCheckActionWidget' ).each( ( i, el ) => {
		$( el ).toggleClass( 've-ui-editCheckActionWidget-collapsed', i !== this.currentOffset );
	} );

	this.footerLabel.setLabel(
		ve.msg( 'visualeditor-find-and-replace-results',
			ve.init.platform.formatNumber( this.currentOffset + 1 ),
			ve.init.platform.formatNumber( this.currentChecks.length )
		)
	);
	this.nextButton.setDisabled( this.currentOffset >= this.currentChecks.length - 1 );
	this.previousButton.setDisabled( this.currentOffset <= 0 );

	this.updateSize();

	if ( this.isOpening() ) {
		return;
	}

	const surfaceView = this.surface.getView();
	if ( this.currentChecks.length > 0 ) {
		// The currently-focused check gets a selection:
		// TODO: clicking the selection should activate the sidebar-action
		surfaceView.getSelectionManager().drawSelections(
			'editCheckWarning',
			this.currentChecks[ this.currentOffset ].getHighlightSelections().map(
				( selection ) => ve.ce.Selection.static.newFromModel( selection, surfaceView )
			)
		);

		if ( fromUserAction || this.reviewMode ) {
			this.scrollCurrentCheckIntoViewDebounced();
		}
	} else {
		surfaceView.getSelectionManager().drawSelections( 'editCheckWarning', [] );
	}

	this.drawHighlights();
};

ve.ui.EditCheckDialog.prototype.scrollCurrentCheckIntoView = function () {
	const currentCheck = this.currentChecks[ this.currentOffset ];
	if ( currentCheck ) {
		// scrollSelectionIntoView scrolls to the focus of a selection, but we
		// want the very beginning to be in view, so collapse it:
		const selection = currentCheck.getHighlightSelections()[ 0 ].collapseToStart();
		this.surface.scrollSelectionIntoView( selection, {
			animate: true,
			padding: {
				top: ( OO.ui.isMobile() ? 80 : currentCheck.widget.$element[ 0 ].getBoundingClientRect().top ),
				bottom: ( OO.ui.isMobile() ? this.getContentHeight() : 0 ) + 20
			},
			alignToTop: true
		} );
	}
};

/**
 * @inheritdoc
 */
ve.ui.EditCheckDialog.prototype.getSetupProcess = function ( data ) {
	return ve.ui.EditCheckDialog.super.prototype.getSetupProcess.call( this, data )
		.first( () => {
			this.currentOffset = 0;
			this.currentChecks = null;
			this.listener = data.listener || 'onDocumentChange';
			this.reviewMode = data.reviewMode;
			this.surface = data.surface;

			this.surface.getModel().on( 'undoStackChange', this.updateDebounced );
			this.surface.getView().on( 'position', this.positionDebounced );

			const singleAction = ( this.listener === 'onBeforeSave' ) || OO.ui.isMobile();

			this.closeButton.toggle( OO.ui.isMobile() );
			this.footer.toggle(
				singleAction &&
				// If we're in single-check mode don't show even the disabled pagers:
				!mw.config.get( 'wgVisualEditorConfig' ).editCheckSingle
			);
			this.$element.toggleClass( 've-ui-editCheckDialog-singleAction', singleAction );

			this.surface.context.hide();

			this.update();
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.EditCheckDialog.prototype.getReadyProcess = function ( data ) {
	return ve.ui.EditCheckDialog.super.prototype.getReadyProcess.call( this, data )
		.next( () => {
			// Call update again after the dialog has transitioned open, as the first
			// call of update will not have drawn any selections.
			setTimeout( () => {
				this.update();
			}, OO.ui.theme.getDialogTransitionDuration() );
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.EditCheckDialog.prototype.getTeardownProcess = function ( data ) {
	return ve.ui.EditCheckDialog.super.prototype.getTeardownProcess.call( this, data )
		.next( () => {
			this.surface.getView().setReviewMode( false );
			this.surface.getView().getSelectionManager().drawSelections( 'editCheckWarning', [] );
			this.surface.getView().off( 'position', this.positionDebounced );
			this.surface.getModel().off( 'undoStackChange', this.updateDebounced );
			this.$highlights.remove().empty();
			this.$checks.empty();
		}, this );
};

/**
 * Handle 'act' events from the mw.widget.EditCheckActionWidget
 *
 * @param {mw.editcheck.EditCheckActionWidget} widget
 * @param {Object} choice Choice object (with 'reason', 'object', 'label')
 * @param {string} actionChosen Choice action
 * @param {jQuery.Promise} promise Promise which resolves when the action is complete
 */
ve.ui.EditCheckDialog.prototype.onAct = function ( widget, choice, actionChosen, promise ) {
	widget.setDisabled( true );
	this.nextButton.setDisabled( true );
	this.previousButton.setDisabled( true );
	promise.then( ( data ) => {
		widget.setDisabled( false );
		this.nextButton.setDisabled( false );
		this.previousButton.setDisabled( false );
		this.surface.getModel().setNullSelection();
		if ( OO.ui.isMobile() ) {
			// Delay on mobile means we need to rehide this
			setTimeout( () => this.surface.getModel().setNullSelection(), 300 );
		}

		if ( data && this.listener === 'onBeforeSave' ) {
			// If an action has been taken, we want to linger for a brief moment
			// to show the result of the action before moving away
			// TODO: This was written for AddReferenceEditCheck but should be
			// more generic
			const pause = data.action !== 'reject' ? 500 : 0;
			setTimeout( () => {
				// We must have been acting on the currentOffset
				this.currentChecks.splice( this.currentOffset, 1 );
				this.currentOffset = Math.max( 0, this.currentOffset - 1 );
				this.update();
			}, pause );
		} else {
			this.updateDebounced( true );
		}
	} );
};

/**
 * Handle 'togglecollapse' events from the mw.widget.EditCheckActionWidget
 *
 * @param {mw.editcheck.EditCheckAction} check
 * @param {number} index
 * @param {boolean} collapsed
 */
ve.ui.EditCheckDialog.prototype.onToggleCollapse = function ( check, index, collapsed ) {
	if ( !collapsed ) {
		// expanded one
		this.setCurrentOffset( this.currentChecks.indexOf( check ), true );
	}
};

/**
 * Handle click events from the close button
 */
ve.ui.EditCheckDialog.prototype.onCloseButtonClick = function () {
	// eslint-disable-next-line no-jquery/no-class-state
	const collapse = !this.$element.hasClass( 've-ui-editCheckDialog-collapsed' );
	this.$element.toggleClass( 've-ui-editCheckDialog-collapsed', collapse );
	this.closeButton.setIcon( collapse ? 'collapse' : 'expand' );
};

/**
 * Handle click events from the next button
 */
ve.ui.EditCheckDialog.prototype.onNextButtonClick = function () {
	this.setCurrentOffset( this.currentOffset + 1, true );
};

/**
 * Handle click events from the previous button
 */
ve.ui.EditCheckDialog.prototype.onPreviousButtonClick = function () {
	this.setCurrentOffset( this.currentOffset - 1, true );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.EditCheckDialog );

ve.ui.commandRegistry.register(
	new ve.ui.Command(
		'editCheckDialogInProcessOpen', 'window', 'open', { args: [ 'editCheckDialog', { listener: 'onDocumentChange' } ] }
	)
);

ve.ui.commandRegistry.register(
	new ve.ui.Command(
		'editCheckDialogInProcessToggle', 'window', 'toggle', { args: [ 'editCheckDialog', { listener: 'onDocumentChange' } ] }
	)
);

ve.ui.commandRegistry.register(
	new ve.ui.Command(
		'editCheckDialogBeforeSave', 'window', 'toggle', { args: [ 'editCheckDialog', { listener: 'onBeforeSave', reviewMode: true } ] }
	)
);

/**
 * @class
 * @extends ve.ui.ToolbarDialogTool
 * @constructor
 * @param {OO.ui.ToolGroup} toolGroup
 * @param {Object} [config] Configuration options
 */
ve.ui.EditCheckDialogTool = function VeUiEditCheckDialogTool() {
	ve.ui.EditCheckDialogTool.super.apply( this, arguments );
};
OO.inheritClass( ve.ui.EditCheckDialogTool, ve.ui.ToolbarDialogTool );
ve.ui.EditCheckDialogTool.static.name = 'editCheckDialog';
ve.ui.EditCheckDialogTool.static.group = 'notices';
ve.ui.EditCheckDialogTool.static.icon = 'robot';
ve.ui.EditCheckDialogTool.static.title = 'Edit check'; // OO.ui.deferMsg( 'visualeditor-dialog-command-help-title' );
ve.ui.EditCheckDialogTool.static.autoAddToCatchall = false;
ve.ui.EditCheckDialogTool.static.commandName = 'editCheckDialogInProcessToggle';
// ve.ui.EditCheckDialogTool.static.commandName = 'editCheckDialogBeforeSave';

// Demo button for opening edit check sidebar
// ve.ui.toolFactory.register( ve.ui.EditCheckDialogTool );
