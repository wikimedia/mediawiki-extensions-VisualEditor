'use strict';

function Controller() {
	// Mixin constructors
	OO.EventEmitter.call( this );

	this.checksByListener = {};

	this.target = false;
	this.surface = false;
	this.listener = 'onDocumentChange';

	this.$highlights = $( '<div>' );

	this.onDocumentChangeDebounced = ve.debounce( this.onDocumentChange.bind( this ), 100 );
	this.onPositionDebounced = ve.debounce( this.onPosition.bind( this ), 100 );

	// Don't run a scroll if the previous animation is still running (which is jQuery 'fast' === 200ms)
	this.scrollCheckIntoViewDebounced = ve.debounce( this.scrollCheckIntoView.bind( this ), 200, true );
}

OO.mixinClass( Controller, OO.EventEmitter );

Controller.prototype.setup = function () {
	mw.hook( 've.activationStart' ).add( () => {
		document.documentElement.classList.add( 've-editcheck-available' );

	} );
	mw.hook( 've.activationComplete' ).add( () => {
		this.target = ve.init.target;
		this.surface = this.target.getSurface();

		this.surface.getView().on( 'position', this.onPositionDebounced );
		this.surface.getModel().on( 'undoStackChange', this.onDocumentChangeDebounced );

		this.on( 'checksUpdated', ( listener, checks, newChecks, discardedChecks ) => {
			// do we need to redraw anything?
			if ( newChecks.length || discardedChecks.length ) {
				if ( this.focusedCheck && discardedChecks.indexOf( this.focusedCheck ) !== -1 ) {
					this.focusedCheck = undefined;
				}
				this.drawSelections();
				this.drawGutter();
			}

			// do we need to show mid-edit actions?
			if ( listener !== 'onDocumentChange' ) {
				return;
			}
			if ( !checks.length ) {
				return;
			}
			const currentWindow = this.surface.getToolbarDialogs( ve.ui.EditCheckDialog.static.position ).getCurrentWindow();
			if ( !currentWindow || currentWindow.constructor.static.name !== 'editCheckDialog' ) {
				const windowAction = ve.ui.actionFactory.create( 'window', this.surface, 'check' );
				return windowAction.open(
					'editCheckDialog',
					{ listener: 'onDocumentChange', checks: checks, controller: this }
				);
			}
		} );

		// Run on load (e.g. recovering from auto-save)
		setTimeout( () => this.onDocumentChange(), 100 );
	} );
	mw.hook( 've.deactivationComplete' ).add( () => {
		document.documentElement.classList.remove( 've-editcheck-available' );

		mw.editcheck.dismissedFragments = {};
		mw.editcheck.dismissedIds = {};

		this.surface.getModel().off( 'undoStackChange', this.onDocumentChangeDebounced );

		this.disconnect( this );

		this.target = false;
		this.surface = false;
		this.checksByListener = {};
	} );
	mw.hook( 've.preSaveProcess' ).add( this.onPreSaveProcess.bind( this ) );
};

Controller.prototype.refresh = function ( listener ) {
	if ( listener === 'onBeforeSave' ) {
		// These shouldn't be recalculated
		this.emit( 'checksUpdated', listener, this.getChecks( listener ), [], [] );
	} else {
		this.updateChecksForListener( listener, true );
	}
};

Controller.prototype.updateChecksForListener = function ( listener, always ) {
	listener = listener || this.listener;
	const existing = this.checksByListener[ listener ] || [];
	const checks = mw.editcheck.editCheckFactory.createAllByListener( listener, this.surface.getModel() )
		.map( ( check ) => existing.find( ( oldCheck ) => oldCheck.equals( check ) ) || check );

	this.checksByListener[ listener ] = checks;

	const newChecks = checks.filter( ( check ) => existing.every( ( oldCheck ) => !check.equals( oldCheck ) ) );
	const discardedChecks = existing.filter( ( check ) => checks.every( ( newCheck ) => !check.equals( newCheck ) ) );
	if ( always || checks.length !== existing.length || newChecks.length || discardedChecks.length ) {
		this.emit( 'checksUpdated', listener, checks, newChecks, discardedChecks );
	}
	return checks;
};

Controller.prototype.removeCheck = function ( listener, check ) {
	const checks = this.getChecks( listener );
	const index = checks.indexOf( check );
	if ( index === -1 ) {
		return;
	}
	const removed = checks.splice( index, 1 );

	if ( check === this.focusedCheck ) {
		this.focusedCheck = undefined;
	}

	this.emit( 'checksUpdated', listener, checks, [], removed );
};

Controller.prototype.focusCheck = function ( check, scrollTo ) {
	this.focusedCheck = check;

	this.drawSelections();
	this.drawGutter();

	this.emit( 'focusCheck', check, this.getChecks().indexOf( check ), scrollTo );
};

Controller.prototype.getChecks = function ( listener ) {
	return this.checksByListener[ listener || this.listener ] || [];
};

Controller.prototype.onPosition = function () {
	this.drawGutter();

	if ( this.getChecks().length && this.focusedCheck && this.surface.getView().reviewMode ) {
		this.scrollCheckIntoViewDebounced( this.focusedCheck );
	}
};

Controller.prototype.onDocumentChange = function () {
	if ( this.surface.getMode() !== 'visual' ) {
		return;
	}
	if ( this.listener !== 'onBeforeSave' ) {
		this.updateChecksForListener( 'onDocumentChange' );
	}

	this.drawSelections();
	this.drawGutter();
};

Controller.prototype.onPreSaveProcess = function ( saveProcess, target ) {
	const surface = target.getSurface();

	if ( surface.getMode() !== 'visual' ) {
		// Some checks will entirely work in source mode for most cases.
		// But others will fail spectacularly -- e.g. reference check
		// isn't aware of <ref> tags and so will suggest that all content
		// has references added. As such, disable in source mode for now.
		return;
	}

	ve.track( 'counter.editcheck.preSaveChecksAvailable' );

	// clear rejection-reasons between runs of the save process, so only the last one counts
	mw.editcheck.rejections.length = 0;

	const oldFocusedCheck = this.focusedCheck;
	this.listener = 'onBeforeSave';
	const checks = this.updateChecksForListener( 'onBeforeSave' );
	if ( checks.length ) {
		ve.track( 'counter.editcheck.preSaveChecksShown' );
		mw.editcheck.refCheckShown = true;

		this.setupToolbar( target );

		let $contextContainer, contextPadding;
		if ( surface.context.popup ) {
			contextPadding = surface.context.popup.containerPadding;
			$contextContainer = surface.context.popup.$container;
			surface.context.popup.$container = surface.$element;
			surface.context.popup.containerPadding = 20;
		}

		saveProcess.next( () => {
			const windowAction = ve.ui.actionFactory.create( 'window', surface, 'check' );
			// .always is not chainable
			return windowAction.close( 'editCheckDialog' ).closed.then( () => {}, () => {} ).then( () => {
				this.originalToolbar.toggle( false );
				target.onContainerScroll();
				return windowAction.open( 'editCheckDialog', { listener: 'onBeforeSave', checks: checks, controller: this } )
					.then( ( instance ) => {
						instance.closed.then( () => {}, () => {} ).then( () => {
							surface.getView().setReviewMode( false );
							this.listener = 'onDocumentChange';
							this.focusedCheck = oldFocusedCheck;
							// Re-open the mid-edit sidebar if necessary.
							this.refresh();
						} );
						return instance.closing.then( ( data ) => {
							this.restoreToolbar( target );

							if ( $contextContainer ) {
								surface.context.popup.$container = $contextContainer;
								surface.context.popup.containerPadding = contextPadding;
							}

							target.onContainerScroll();

							if ( data ) {
								const delay = ve.createDeferred();
								// If they inserted, wait 2 seconds on desktop
								// before showing save dialog to make sure insertions are finialized
								setTimeout( () => {
									ve.track( 'counter.editcheck.preSaveChecksCompleted' );
									delay.resolve();
								}, !OO.ui.isMobile() && data.action !== 'reject' ? 2000 : 0 );
								return delay.promise();
							} else {
								// closed via "back" or otherwise
								ve.track( 'counter.editcheck.preSaveChecksAbandoned' );
								return ve.createDeferred().reject().promise();
							}
						} );
					} );
			} );
		} );
	} else {
		this.listener = 'onDocumentChange';
		// Counterpart to earlier preSaveChecksShown, for use in tracking
		// errors in check-generation:
		ve.track( 'counter.editcheck.preSaveChecksNotShown' );
	}
};

Controller.prototype.setupToolbar = function ( target ) {
	const surface = target.getSurface();
	const toolbar = target.getToolbar();
	const reviewToolbar = new ve.ui.PositionedTargetToolbar( target, target.toolbarConfig );
	reviewToolbar.setup( [
		{
			name: 'back',
			type: 'bar',
			include: [ 'editCheckBack' ]
		},
		// Placeholder toolbar groups
		// TODO: Make a proper TitleTool?
		{
			name: 'title',
			type: 'bar',
			include: []
		},
		{
			name: 'save',
			// TODO: MobileArticleTarget should ignore 'align'
			align: OO.ui.isMobile() ? 'before' : 'after',
			type: 'bar',
			include: [ 'showSaveDisabled' ]
		}
	], surface );
	reviewToolbar.$element.addClass( 've-ui-editCheck-toolbar' );

	reviewToolbar.items[ 1 ].$element.removeClass( 'oo-ui-toolGroup-empty' );
	reviewToolbar.items[ 1 ].$group.append(
		$( '<span>' ).addClass( 've-ui-editCheck-toolbar-title' ).text( ve.msg( 'editcheck-dialog-title' ) )
	);
	if ( OO.ui.isMobile() ) {
		reviewToolbar.$element.addClass( 've-init-mw-mobileArticleTarget-toolbar' );
	}
	target.toolbar.$element.before( reviewToolbar.$element );
	target.toolbar = reviewToolbar;

	this.originalToolbar = toolbar;
	this.reviewToolbar = reviewToolbar;
};

Controller.prototype.restoreToolbar = function ( target ) {
	if ( !this.reviewToolbar ) {
		return;
	}
	this.reviewToolbar.$element.remove();
	this.originalToolbar.toggle( true );
	target.toolbar = this.originalToolbar;

	// Creating a new PositionedTargetToolbar stole the
	// toolbar windowmanagers, so we need to make the
	// original toolbar reclaim them:
	this.originalToolbar.disconnect( target );
	target.setupToolbar( target.getSurface() );

	this.reviewToolbar = false;
	this.originalToolbar = false;
};

Controller.prototype.drawSelections = function () {
	const surfaceView = this.surface.getView();
	if ( this.focusedCheck ) {
		// The currently-focused check gets a selection:
		// TODO: clicking the selection should activate the sidebar-action
		surfaceView.getSelectionManager().drawSelections(
			'editCheckWarning',
			this.focusedCheck.getHighlightSelections().map(
				( selection ) => ve.ce.Selection.static.newFromModel( selection, surfaceView )
			)
		);
	} else {
		surfaceView.getSelectionManager().drawSelections( 'editCheckWarning', [] );
	}

	if ( this.listener === 'onBeforeSave' ) {
		// Review mode grays out everything that's not highlighted:
		const highlightNodes = [];
		this.getChecks().forEach( ( check ) => {
			check.getHighlightSelections().forEach( ( selection ) => {
				highlightNodes.push.apply( highlightNodes, surfaceView.getDocument().selectNodes( selection.getCoveringRange(), 'branches' ).map( ( spec ) => spec.node ) );
			} );
		} );
		surfaceView.setReviewMode( true, highlightNodes );
	}
};

Controller.prototype.drawGutter = function () {
	this.$highlights.empty();
	const checks = this.getChecks();
	if ( checks.length === 0 ) {
		return;
	}
	const surfaceView = this.surface.getView();

	checks.forEach( ( check ) => {
		check.getHighlightSelections().forEach( ( selection ) => {
			const selectionView = ve.ce.Selection.static.newFromModel( selection, surfaceView );
			const rect = selectionView.getSelectionBoundingRect();
			if ( !rect ) {
				return;
			}
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
				.addClass( 've-ui-editCheck-gutter-highlight-' + ( check === this.focusedCheck ? 'active' : 'inactive' ) )
				.css( {
					top: rect.top - 2,
					height: rect.height + 4
				} )
				.on( 'click', () => this.focusCheck( check ) )
			);
		} );
	} );

	surfaceView.appendHighlights( this.$highlights, false );
};

Controller.prototype.scrollCheckIntoView = function ( check ) {
	// scrollSelectionIntoView scrolls to the focus of a selection, but we
	// want the very beginning to be in view, so collapse it:
	const selection = check.getHighlightSelections()[ 0 ].collapseToStart();
	const padding = {
		top: OO.ui.isMobile() ? 80 : check.widget.$element[ 0 ].getBoundingClientRect().top,
		bottom: 20
	};
	if ( ve.ui.EditCheckDialog.static.position === 'below' ) {
		// TODO: ui.surface getPadding should really be fixed for this
		const currentWindow = this.surface.getToolbarDialogs( ve.ui.EditCheckDialog.static.position ).getCurrentWindow();
		if ( currentWindow ) {
			padding.bottom += currentWindow.getContentHeight();
		}
	}
	this.surface.scrollSelectionIntoView( selection, {
		animate: true,
		padding: padding,
		alignToTop: true
	} );
};

module.exports = {
	Controller: Controller,
	instance: new Controller()
};
