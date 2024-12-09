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

	// Pre-initialization
	this.$element.addClass( 've-ui-editCheckDialog' );
};

/* Inheritance */

OO.inheritClass( ve.ui.EditCheckDialog, ve.ui.ToolbarDialog );

ve.ui.EditCheckDialog.static.name = 'editCheckDialog';

ve.ui.EditCheckDialog.static.position = OO.ui.isMobile() ? 'below' : 'side';

ve.ui.EditCheckDialog.static.size = OO.ui.isMobile() ? 'full' : 'medium';

ve.ui.EditCheckDialog.static.framed = false;

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

ve.ui.EditCheckDialog.prototype.update = function () {
	const surfaceView = this.surface.getView();
	// We only regenerate the checks on-change during the edit. If we're in
	// the proofreading step, no new checks should appear based on changes:
	if ( this.listener === 'onDocumentChange' || !this.currentChecks ) {
		this.currentChecks = mw.editcheck.editCheckFactory.createAllByListener( this.listener, this.surface.getModel() );
	}
	if ( this.listener === 'onBeforeSave' && this.currentChecks.length === 0 ) {
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

	this.setCurrentOffset( newOffset );
};

ve.ui.EditCheckDialog.prototype.position = function () {
	this.drawHighlights();
	this.scrollCurrentCheckIntoView();
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
 */
ve.ui.EditCheckDialog.prototype.setCurrentOffset = function ( offset ) {
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

		this.scrollCurrentCheckIntoView();
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
			this.listener = data.listener || 'onDocumentChange';
			this.reviewMode = data.reviewMode;
			this.surface = data.surface;

			this.surface.getModel().on( 'undoStackChange', this.updateDebounced );
			this.surface.getView().on( 'position', this.positionDebounced );

			this.closeButton.toggle( OO.ui.isMobile() );
			this.footer.toggle(
				this.listener === 'onBeforeSave' &&
				!mw.config.get( 'wgVisualEditorConfig' ).editCheckSingle
			);

			this.$element.toggleClass( 've-ui-editCheckDialog-singleAction', this.listener === 'onBeforeSave' );

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
			// The end of the ready process triggers a reflow after an
			// animation, so we need to get past that to avoid the content
			// being immediately scrolled away
			setTimeout( () => {
				this.scrollCurrentCheckIntoView();
			}, 500 );
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

		if ( !data ) {
			// Nothing happened, just fall back and leave the check
			return;
		}

		if ( this.listener === 'onBeforeSave' ) {
			// We must have been acting on the currentOffset
			setTimeout( () => {
				// We want to linger for a brief moment before moving away
				this.currentChecks.splice( this.currentOffset, 1 );
				this.currentOffset = Math.max( 0, this.currentOffset - 1 );
				this.update();
			}, 500 );
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
		this.setCurrentOffset( this.currentChecks.indexOf( check ) );
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
	this.setCurrentOffset( this.currentOffset + 1 );
};

/**
 * Handle click events from the previous button
 */
ve.ui.EditCheckDialog.prototype.onPreviousButtonClick = function () {
	this.setCurrentOffset( this.currentOffset - 1 );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.EditCheckDialog );

ve.ui.commandRegistry.register(
	new ve.ui.Command(
		'editCheckDialogInProcess', 'window', 'toggle', { args: [ 'editCheckDialog', { listener: 'onDocumentChange' } ] }
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
ve.ui.EditCheckDialogTool.static.commandName = 'editCheckDialogInProcess';
// ve.ui.EditCheckDialogTool.static.commandName = 'editCheckDialogBeforeSave';

// Demo button for opening edit check sidebar
// ve.ui.toolFactory.register( ve.ui.EditCheckDialogTool );
