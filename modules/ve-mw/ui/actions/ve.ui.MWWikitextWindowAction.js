/*!
 * VisualEditor UserInterface MWWikitextWindowAction class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * Wikitext window action.
 *
 * @class
 * @extends ve.ui.WindowAction
 * @constructor
 * @param {ve.ui.Surface} surface Surface to act on
 */
ve.ui.MWWikitextWindowAction = function VeUiMWWikitextWindowAction( surface ) {
	// Parent constructor
	ve.ui.MWWikitextWindowAction.super.call( this, surface );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWWikitextWindowAction, ve.ui.WindowAction );

/* Methods */

/**
 * Open a window.
 *
 * @method
 * @param {string} name Symbolic name of window to open
 * @param {Object} [data] Window opening data
 * @param {string} [action] Action to execute after opening, or immediately if the window is already open
 * @return {boolean} Action was executed
 */
ve.ui.MWWikitextWindowAction.prototype.open = function ( name, data, action ) {
	var currentInspector, inspectorWindowManager,
		originalFragment, originalDocument, coveringRange, rangeInDocument, tempDocument, tempSurfaceModel,
		windowType = this.getWindowType( name ),
		windowManager = windowType && this.getWindowManager( windowType ),
		currentWindow = windowManager.getCurrentWindow(),
		autoClosePromises = [],
		surface = this.surface,
		fragment = surface.getModel().getFragment( undefined, true ),
		dir = surface.getView().getSelection().getDirection();

	if ( !( this.surface.getModel() instanceof ve.dm.MWWikitextSurface ) ||  ve.ui.windowFactory.lookup( name ).static.handlesWikitext ) {
		return ve.ui.MWWikitextWindowAction.super.prototype.open.apply( this, arguments );
	}

	// TODO: This duplicates code in SourceSurfaceFragment#annotateContent
	originalFragment = fragment;
	originalDocument = originalFragment.getDocument();
	coveringRange = originalFragment.getSelection().getCoveringRange();
	if ( coveringRange ) {
		tempDocument = surface.getModel().getDocument().shallowCloneFromRange( coveringRange );
		rangeInDocument = tempDocument.originalRange;
	} else {
		tempDocument = new ve.dm.Document(
			[
				{ type: 'paragraph', internal: { generated: 'wrapper' } }, { type: '/paragraph' },
				{ type: 'internalList' }, { type: '/internalList' }
			],
			null, null, null, null,
			originalDocument.getLang(),
			originalDocument.getDir()
		);
		rangeInDocument = new ve.Range( 1 );
	}
	tempSurfaceModel = new ve.dm.Surface( tempDocument );
	fragment = tempSurfaceModel.getLinearFragment( rangeInDocument );

	if ( !windowManager ) {
		return false;
	}

	data = ve.extendObject( { dir: dir }, data, { fragment: fragment } );
	if ( windowType === 'toolbar' || windowType === 'inspector' ) {
		data = ve.extendObject( data, { surface: surface } );
		// Auto-close the current window if it is different to the one we are
		// trying to open.
		// TODO: Make auto-close a window manager setting
		if ( currentWindow && currentWindow.constructor.static.name !== name ) {
			autoClosePromises.push( windowManager.closeWindow( currentWindow ) );
		}
	}

	// If we're opening a dialog, close all inspectors first
	if ( windowType === 'dialog' ) {
		inspectorWindowManager = this.getWindowManager( 'inspector' );
		currentInspector = inspectorWindowManager.getCurrentWindow();
		if ( currentInspector ) {
			autoClosePromises.push( inspectorWindowManager.closeWindow( currentInspector ) );
		}
	}

	$.when.apply( $, autoClosePromises ).always( function () {
		windowManager.getWindow( name ).then( function ( win ) {
			var opening = windowManager.openWindow( win, data );

			if ( !win.constructor.static.activeSurface ) {
				surface.getView().deactivate();
			}

			opening.then( function ( closing ) {
				// HACK: previousSelection is assumed to be in the visible surface
				win.previousSelection = null;
				closing.then( function ( closed ) {
					if ( !win.constructor.static.activeSurface ) {
						surface.getView().activate();
					}
					closed.then( function () {
						if ( tempSurfaceModel && tempSurfaceModel.hasBeenModified() ) {
							originalFragment.insertDocument( tempSurfaceModel.getDocument() );
						}
						surface.getView().emit( 'position' );
					} );
				} );
			} ).always( function () {
				if ( action ) {
					win.executeAction( action );
				}
			} );
		} );
	} );

	return true;
};

/* Registration */

ve.ui.actionFactory.register( ve.ui.MWWikitextWindowAction );
