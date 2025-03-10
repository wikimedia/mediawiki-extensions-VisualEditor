'use strict';

function Controller( target ) {
	// Mixin constructors
	OO.EventEmitter.call( this );

	this.actionsByListener = {};

	this.target = target;

	this.surface = null;
	this.listener = 'onDocumentChange';

	this.$highlights = $( '<div>' );

	this.dismissedFragments = {};
	this.dismissedIds = {};

	this.onDocumentChangeDebounced = ve.debounce( this.onDocumentChange.bind( this ), 100 );
	this.onPositionDebounced = ve.debounce( this.onPosition.bind( this ), 100 );

	// Don't run a scroll if the previous animation is still running (which is jQuery 'fast' === 200ms)
	this.scrollActionIntoViewDebounced = ve.debounce( this.scrollActionIntoView.bind( this ), 200, true );
}

OO.mixinClass( Controller, OO.EventEmitter );

Controller.prototype.setup = function () {
	const target = this.target;
	target.on( 'surfaceReady', () => {
		if ( target.getSurface().getMode() !== 'visual' ) {
			// Some checks will entirely work in source mode for most cases.
			// But others will fail spectacularly -- e.g. reference check
			// isn't aware of <ref> tags and so will suggest that all content
			// has references added. As such, disable in source mode for now.
			return;
		}
		// ideally this would happen slightly earlier:
		document.documentElement.classList.add( 've-editcheck-available' );

		this.surface = target.getSurface();

		this.surface.getView().on( 'position', this.onPositionDebounced );
		this.surface.getModel().on( 'undoStackChange', this.onDocumentChangeDebounced );

		this.on( 'actionsUpdated', ( listener, actions, newActions, discardedActions ) => {
			// do we need to redraw anything?
			if ( newActions.length || discardedActions.length ) {
				if ( this.focused && discardedActions.indexOf( this.focused ) !== -1 ) {
					this.focused = undefined;
				}
				this.drawSelections();
				this.drawGutter();
			}

			// do we need to show mid-edit actions?
			if ( listener !== 'onDocumentChange' ) {
				return;
			}
			if ( !actions.length ) {
				return;
			}
			let shownPromise;
			const currentWindow = this.surface.getToolbarDialogs( ve.ui.EditCheckDialog.static.position ).getCurrentWindow();
			if ( !currentWindow || currentWindow.constructor.static.name !== 'editCheckDialog' ) {
				const windowAction = ve.ui.actionFactory.create( 'window', this.surface, 'check' );
				shownPromise = windowAction.open(
					'editCheckDialog',
					{ listener: 'onDocumentChange', actions: actions, controller: this }
				).then( () => {
					ve.track( 'activity.editCheckDialog', { action: 'window-open-from-check-midedit' } );
				} );
			} else {
				shownPromise = ve.createDeferred().resolve().promise();
			}
			shownPromise.then( () => {
				newActions.forEach( ( action ) => {
					ve.track( 'activity.editCheck-' + action.getName(), { action: 'check-shown-midedit' } );
				} );
			} );
		}, null, this );

		// Run on load (e.g. recovering from auto-save)
		setTimeout( () => this.onDocumentChange(), 100 );

		this.surface.on( 'destroy', () => {
			this.off( 'actionsUpdated' );

			this.surface = null;
			this.actionsByListener = {};

			this.dismissedFragments = {};
			this.dismissedIds = {};
		} );
	}, null, this );

	target.on( 'teardown', () => {
		document.documentElement.classList.remove( 've-editcheck-available' );
	}, null, this );

	mw.hook( 've.preSaveProcess' ).add( ( saveProcess, saveTarget ) => {
		// This being a global hook means that it could fire on a different
		// target, or on our target when it's not in visual mode.
		if ( saveTarget === this.target && this.surface ) {
			this.onPreSaveProcess( saveProcess );
		}
	} );
};

Controller.prototype.refresh = function () {
	if ( this.listener === 'onBeforeSave' ) {
		// These shouldn't be recalculated
		this.emit( 'actionsUpdated', this.listener, this.getActions( this.listener ), [], [] );
	} else {
		this.updateForListener( this.listener, true );
	}
};

Controller.prototype.updateForListener = function ( listener, always ) {
	listener = listener || this.listener;
	const existing = this.actionsByListener[ listener ] || [];
	const actions = mw.editcheck.editCheckFactory.createAllByListener( this, listener, this.surface.getModel() )
		.map( ( action ) => existing.find( ( oldAction ) => oldAction.equals( action ) ) || action );

	this.actionsByListener[ listener ] = actions;

	const newActions = actions.filter( ( action ) => existing.every( ( oldAction ) => !action.equals( oldAction ) ) );
	const discardedActions = existing.filter( ( action ) => actions.every( ( newAction ) => !action.equals( newAction ) ) );
	if ( always || actions.length !== existing.length || newActions.length || discardedActions.length ) {
		this.emit( 'actionsUpdated', listener, actions, newActions, discardedActions );
	}
	return actions;
};

Controller.prototype.removeAction = function ( listener, action ) {
	const actions = this.getActions( listener );
	const index = actions.indexOf( action );
	if ( index === -1 ) {
		return;
	}
	const removed = actions.splice( index, 1 );

	if ( action === this.focused ) {
		this.focused = undefined;
	}

	this.emit( 'actionsUpdated', listener, actions, [], removed );
};

Controller.prototype.focusAction = function ( action, scrollTo ) {
	this.focused = action;

	this.drawSelections();
	this.drawGutter();

	this.emit( 'focusAction', action, this.getActions().indexOf( action ), scrollTo );
};

Controller.prototype.getActions = function ( listener ) {
	return this.actionsByListener[ listener || this.listener ] || [];
};

Controller.prototype.onPosition = function () {
	this.drawGutter();

	if ( this.getActions().length && this.focused && this.surface.getView().reviewMode ) {
		this.scrollActionIntoViewDebounced( this.focused );
	}
};

Controller.prototype.onDocumentChange = function () {
	if ( this.listener !== 'onBeforeSave' ) {
		this.updateForListener( 'onDocumentChange' );
	}

	this.drawSelections();
	this.drawGutter();
};

Controller.prototype.onPreSaveProcess = function ( saveProcess ) {
	const target = this.target;
	const surface = target.getSurface();

	ve.track( 'counter.editcheck.preSaveChecksAvailable' );

	// clear rejection-reasons between runs of the save process, so only the last one counts
	mw.editcheck.rejections.length = 0;

	const oldFocused = this.focused;
	this.listener = 'onBeforeSave';
	const actions = this.updateForListener( 'onBeforeSave' );
	if ( actions.length ) {
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
				return windowAction.open( 'editCheckDialog', { listener: 'onBeforeSave', actions: actions, controller: this } )
					.then( ( instance ) => {
						ve.track( 'activity.editCheckDialog', { action: 'window-open-from-check-presave' } );
						actions.forEach( ( action ) => {
							ve.track( 'activity.editCheck-' + action.getName(), { action: 'check-shown-presave' } );
						} );
						instance.closed.then( () => {}, () => {} ).then( () => {
							surface.getView().setReviewMode( false );
							this.listener = 'onDocumentChange';
							this.focused = oldFocused;
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

	reviewToolbar.initialize();

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
	// original toolbar reclaims them:
	target.setupToolbar( target.getSurface() );
	// If the window was resized while the originalToolbar was hidden then
	// the cached measurements will be wrong. Recalculate.
	this.originalToolbar.onWindowResize();

	this.reviewToolbar = null;
	this.originalToolbar = null;
};

Controller.prototype.drawSelections = function () {
	const surfaceView = this.surface.getView();
	if ( this.focused ) {
		// The currently-focused check gets a selection:
		// TODO: clicking the selection should activate the sidebar-action
		surfaceView.getSelectionManager().drawSelections(
			'editCheckWarning',
			this.focused.getHighlightSelections().map(
				( selection ) => ve.ce.Selection.static.newFromModel( selection, surfaceView )
			)
		);
	} else {
		surfaceView.getSelectionManager().drawSelections( 'editCheckWarning', [] );
	}

	if ( this.listener === 'onBeforeSave' ) {
		// Review mode grays out everything that's not highlighted:
		const highlightNodes = [];
		this.getActions().forEach( ( action ) => {
			action.getHighlightSelections().forEach( ( selection ) => {
				highlightNodes.push.apply( highlightNodes, surfaceView.getDocument().selectNodes( selection.getCoveringRange(), 'branches' ).map( ( spec ) => spec.node ) );
			} );
		} );
		surfaceView.setReviewMode( true, highlightNodes );
	}
};

Controller.prototype.drawGutter = function () {
	this.$highlights.empty();
	const actions = this.getActions();
	if ( actions.length === 0 ) {
		return;
	}
	const surfaceView = this.surface.getView();

	actions.forEach( ( action ) => {
		action.getHighlightSelections().forEach( ( selection ) => {
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
				.addClass( 've-ui-editCheck-gutter-highlight-' + action.getType() )
				.addClass( 've-ui-editCheck-gutter-highlight-' + ( action === this.focused ? 'active' : 'inactive' ) )
				.css( {
					top: rect.top - 2,
					height: rect.height + 4
				} )
				.on( 'click', () => this.focusAction( action ) )
			);
		} );
	} );

	surfaceView.appendHighlights( this.$highlights, false );
};

Controller.prototype.scrollActionIntoView = function ( action ) {
	// scrollSelectionIntoView scrolls to the focus of a selection, but we
	// want the very beginning to be in view, so collapse it:
	const selection = action.getHighlightSelections()[ 0 ].collapseToStart();
	const padding = {
		top: OO.ui.isMobile() ? 80 : action.widget.$element[ 0 ].getBoundingClientRect().top,
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
	Controller: Controller
};
