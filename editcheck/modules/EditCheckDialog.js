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
};

ve.ui.EditCheckDialog.prototype.onChecksUpdated = function ( listener, checks, newChecks ) {
	if ( listener !== this.listener ) {
		return;
	}
	this.currentChecks = checks;
	if ( checks.length === 0 ) {
		return this.close( 'complete' );
	}

	// This just adjusts so the previously selected check remains selected:
	let newOffset = Math.min( this.currentOffset, checks.length - 1 );
	if ( newChecks.length ) {
		newOffset = checks.indexOf( newChecks[ 0 ] );
	}

	this.refresh();

	this.setCurrentOffset( newOffset, false );
};

ve.ui.EditCheckDialog.prototype.refresh = function () {
	this.$checks.empty();

	this.currentChecks.forEach( ( check, index ) => {
		const widget = check.render( index !== this.currentOffset, this.singleAction, this.surface );
		widget.on( 'togglecollapse', this.onToggleCollapse, [ check, index ], this );
		check.off( 'act' ).on( 'act', this.onAct, [ check, widget ], this );
		this.$checks.append( widget.$element );

		// for scrolling later
		check.widget = widget;
	} );
};

/**
 * Set the offset of the current check, within the list of all checks
 *
 * @param {number} offset
 * @param {boolean} fromUserAction
 * @param {boolean} internal
 */
ve.ui.EditCheckDialog.prototype.setCurrentOffset = function ( offset, fromUserAction, internal ) {
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

	if ( !internal ) {
		this.controller.focusCheck( this.currentChecks[ this.currentOffset ], fromUserAction );
	}
};

ve.ui.EditCheckDialog.prototype.onFocusCheck = function ( check, index, scrollTo ) {
	this.setCurrentOffset( index, scrollTo, true );
};

/**
 * @inheritdoc
 */
ve.ui.EditCheckDialog.prototype.getSetupProcess = function ( data ) {
	return ve.ui.EditCheckDialog.super.prototype.getSetupProcess.call( this, data )
		.first( () => {
			this.controller = data.controller;
			this.controller.on( 'checksUpdated', this.onChecksUpdated, false, this );
			this.controller.on( 'focusCheck', this.onFocusCheck, false, this );

			this.listener = data.listener || 'onDocumentChange';
			this.currentOffset = 0;
			this.currentChecks = data.checks || this.controller.getChecks( this.listener );
			this.surface = data.surface;

			this.singleAction = ( this.listener === 'onBeforeSave' ) || OO.ui.isMobile();

			this.closeButton.toggle( OO.ui.isMobile() );
			this.footer.toggle(
				this.singleAction &&
				// If we're in single-check mode don't show even the disabled pagers:
				!mw.config.get( 'wgVisualEditorConfig' ).editCheckSingle
			);
			this.$element.toggleClass( 've-ui-editCheckDialog-singleAction', this.singleAction );

			this.surface.context.hide();

			this.onChecksUpdated( this.listener, this.currentChecks, this.currentChecks, [] );
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.EditCheckDialog.prototype.getTeardownProcess = function ( data ) {
	return ve.ui.EditCheckDialog.super.prototype.getTeardownProcess.call( this, data )
		.next( () => {
			this.controller.off( 'checksUpdated', this.onChecksUpdated, this );
			this.controller.off( 'focusCheck', this.onFocusCheck, this );
			this.$checks.empty();
		}, this );
};

/**
 * Handle 'act' events from the mw.widget.EditCheckActionWidget
 *
 * @param {mw.editcheck.EditCheckAction} check
 * @param {mw.editcheck.EditCheckActionWidget} widget
 * @param {jQuery.Promise} promise Promise which resolves when the action is complete
 */
ve.ui.EditCheckDialog.prototype.onAct = function ( check, widget, promise ) {
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
				this.controller.removeCheck( this.listener, check );
			}, pause );
		} else {
			this.controller.refresh();
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
		'editCheckDialogBeforeSave', 'window', 'toggle', { args: [ 'editCheckDialog', { listener: 'onBeforeSave' } ] }
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
