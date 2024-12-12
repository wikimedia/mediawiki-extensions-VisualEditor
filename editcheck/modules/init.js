mw.editcheck = {
	config: require( './config.json' ),
	ecenable: !!( new URL( location.href ).searchParams.get( 'ecenable' ) || window.MWVE_FORCE_EDIT_CHECK_ENABLED )
};

require( './EditCheckContextItem.js' );
require( './EditCheckInspector.js' );
require( './EditCheckDialog.js' );
require( './EditCheckFactory.js' );
require( './EditCheckAction.js' );
require( './BaseEditCheck.js' );

// TODO: Load these checks behind feature flags
// require( './editchecks/ConvertReferenceEditCheck.js' );
// require( './editchecks/TextMatchEditCheck.js' );
require( './editchecks/AddReferenceEditCheck.js' );

/**
 * Check if the document has content needing a reference, for AddReferenceEditCheck
 *
 * @param {ve.dm.Document} documentModel
 * @param {boolean} includeReferencedContent Include contents that already contains a reference
 * @return {boolean}
 */
mw.editcheck.hasAddedContentNeedingReference = function ( documentModel, includeReferencedContent ) {
	// helper for ve.init.mw.ArticleTarget save-tagging, keep logic below in-sync with AddReferenceEditCheck.
	// This is bypassing the normal "should this check apply?" logic for creation, so we need to manually
	// apply the "only the main namespace" rule.
	if ( mw.config.get( 'wgNamespaceNumber' ) !== mw.config.get( 'wgNamespaceIds' )[ '' ] ) {
		return false;
	}
	const check = mw.editcheck.editCheckFactory.create( 'addReference', mw.editcheck.config.addReference );
	return check.findAddedContent( documentModel, includeReferencedContent ).length > 0;
};

mw.editcheck.rejections = [];

mw.editcheck.getRejectionReasons = function () {
	return mw.editcheck.rejections;
};

mw.editcheck.refCheckShown = false;

if ( mw.config.get( 'wgVisualEditorConfig' ).editCheckTagging ) {
	mw.hook( 've.activationComplete' ).add( () => {
		const target = ve.init.target;

		function getRefNodes() {
			// The firstNodes list is a numerically indexed array of reference nodes in the document.
			// The list is append only, and removed references are set to undefined in place.
			// To check if a new reference is being published, we just need to know if a reference
			// with an index beyond the initial list (initLength) is still set.
			const internalList = target.getSurface().getModel().getDocument().getInternalList();
			const group = internalList.getNodeGroup( 'mwReference/' );
			return group ? group.firstNodes || [] : [];
		}

		const initLength = getRefNodes().length;
		target.saveFields.vetags = function () {
			const refNodes = getRefNodes();
			const newLength = refNodes.length;
			let newNodesInDoc = false;
			for ( let i = initLength; i < newLength; i++ ) {
				if ( refNodes[ i ] ) {
					newNodesInDoc = true;
					break;
				}
			}
			const tags = [];
			if ( newNodesInDoc ) {
				tags.push( 'editcheck-newreference' );
			}
			if ( mw.editcheck.refCheckShown ) {
				tags.push( 'editcheck-references-activated' );
			}
			return tags.join( ',' );
		};
	} );
	mw.hook( 've.deactivationComplete' ).add( () => {
		const target = ve.init.target;
		delete target.saveFields.vetags;
	} );
}

if ( mw.config.get( 'wgVisualEditorConfig' ).editCheck || mw.editcheck.ecenable ) {
	mw.hook( 've.activationStart' ).add( () => {
		document.documentElement.classList.add( 've-editcheck-available' );
	} );
	mw.hook( 've.deactivationComplete' ).add( () => {
		document.documentElement.classList.remove( 've-editcheck-available' );
	} );
	mw.hook( 've.preSaveProcess' ).add( ( saveProcess, target ) => {
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

		const checks = mw.editcheck.editCheckFactory.createAllByListener( 'onBeforeSave', surface.getModel() );
		if ( checks.length ) {
			ve.track( 'counter.editcheck.preSaveChecksShown' );
			mw.editcheck.refCheckShown = true;

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

			let $contextContainer, contextPadding;
			if ( surface.context.popup ) {
				contextPadding = surface.context.popup.containerPadding;
				$contextContainer = surface.context.popup.$container;
				surface.context.popup.$container = surface.$element;
				surface.context.popup.containerPadding = 20;
			}

			saveProcess.next( () => {
				toolbar.toggle( false );
				target.onContainerScroll();
				// surface.executeCommand( 'editCheckDialogBeforeSave' );
				const windowAction = ve.ui.actionFactory.create( 'window', surface, 'check' );
				return windowAction.open( 'editCheckDialog', { listener: 'onBeforeSave', reviewMode: true } )
					.then( ( instance ) => instance.closing )
					.then( ( data ) => {
						reviewToolbar.$element.remove();
						toolbar.toggle( true );
						target.toolbar = toolbar;
						if ( $contextContainer ) {
							surface.context.popup.$container = $contextContainer;
							surface.context.popup.containerPadding = contextPadding;
						}
						// Creating a new PositionedTargetToolbar stole the
						// toolbar windowmanagers, so we need to make the
						// original toolbar reclaim them:
						toolbar.disconnect( target );
						target.setupToolbar( surface );
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
		} else {
			// Counterpart to earlier preSaveChecksShown, for use in tracking
			// errors in check-generation:
			ve.track( 'counter.editcheck.preSaveChecksNotShown' );
		}
	} );
}

ve.ui.EditCheckBack = function VeUiEditCheckBack() {
	// Parent constructor
	ve.ui.EditCheckBack.super.apply( this, arguments );

	this.setDisabled( false );
};
OO.inheritClass( ve.ui.EditCheckBack, ve.ui.Tool );
ve.ui.EditCheckBack.static.name = 'editCheckBack';
ve.ui.EditCheckBack.static.icon = 'previous';
ve.ui.EditCheckBack.static.autoAddToCatchall = false;
ve.ui.EditCheckBack.static.autoAddToGroup = false;
ve.ui.EditCheckBack.static.title =
	OO.ui.deferMsg( 'visualeditor-backbutton-tooltip' );
ve.ui.EditCheckBack.prototype.onSelect = function () {
	const surface = this.toolbar.getSurface();
	surface.getContext().hide();
	surface.execute( 'window', 'close', 'editCheckDialog' );
	this.setActive( false );
};
ve.ui.EditCheckBack.prototype.onUpdateState = function () {
	this.setDisabled( false );
};
ve.ui.toolFactory.register( ve.ui.EditCheckBack );

ve.ui.EditCheckSaveDisabled = function VeUiEditCheckSaveDisabled() {
	// Parent constructor
	ve.ui.EditCheckSaveDisabled.super.apply( this, arguments );
};
OO.inheritClass( ve.ui.EditCheckSaveDisabled, ve.ui.MWSaveTool );
ve.ui.EditCheckSaveDisabled.static.name = 'showSaveDisabled';
ve.ui.EditCheckSaveDisabled.static.autoAddToCatchall = false;
ve.ui.EditCheckSaveDisabled.static.autoAddToGroup = false;
ve.ui.EditCheckSaveDisabled.prototype.onUpdateState = function () {
	this.setDisabled( true );
};

ve.ui.toolFactory.register( ve.ui.EditCheckSaveDisabled );
