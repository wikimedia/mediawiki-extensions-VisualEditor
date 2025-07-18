/*
 * `ecenable` query string:
 *   1: override user eligibility criteria for all checks
 *   2: also load experimental checks
 */
const ecenable = new URL( location.href ).searchParams.get( 'ecenable' );

mw.editcheck = {
	config: require( './config.json' ),
	forceEnable: !!( ecenable || window.MWVE_FORCE_EDIT_CHECK_ENABLED ),
	experimental: !!( mw.config.get( 'wgVisualEditorConfig' ).editCheckExperimental || ecenable === '2' )
};

require( './utils.js' );
require( './EditCheckPreSaveToolbarTools.js' );
require( './EditCheckFactory.js' );
require( './EditCheckAction.js' );
require( './EditCheckActionWidget.js' );
require( './dialogs/EditCheckDialog.js' );
require( './dialogs/FixedEditCheckDialog.js' );
require( './dialogs/SidebarEditCheckDialog.js' );
require( './dialogs/GutterSidebarEditCheckDialog.js' );
require( './editchecks/BaseEditCheck.js' );
require( './editchecks/AsyncTextCheck.js' );
require( './editchecks/AddReferenceEditCheck.js' );

if ( mw.editcheck.experimental ) {
	mw.loader.using( 'ext.visualEditor.editCheck.experimental' );
}

/**
 * Check if the document has content needing a reference, for AddReferenceEditCheck
 *
 * @param {ve.dm.Document} documentModel
 * @param {boolean} includeReferencedContent Include content that already contains a reference
 * @return {boolean}
 */
mw.editcheck.hasAddedContentNeedingReference = function ( documentModel, includeReferencedContent ) {
	// helper for ve.init.mw.ArticleTarget save-tagging, keep logic below in-sync with AddReferenceEditCheck.
	// This is bypassing the normal "should this check apply?" logic for creation, so we need to manually
	// apply the "only the main namespace" rule.
	if ( mw.config.get( 'wgNamespaceNumber' ) !== mw.config.get( 'wgNamespaceIds' )[ '' ] ) {
		return false;
	}
	const check = mw.editcheck.editCheckFactory.create( 'addReference', null, mw.editcheck.config.addReference );
	// TODO: This should be factored out into a static method so we don't have to construct a dummy check
	return check.findAddedContent( documentModel, includeReferencedContent ).length > 0;
};

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
				tags.push( 'editcheck-references-shown' );
			}
			if ( mw.editcheck.toneCheckShown ) {
				tags.push( 'editcheck-tone-shown' );
			}
			return tags.join( ',' );
		};
	} );
	mw.hook( 've.deactivationComplete' ).add( () => {
		const target = ve.init.target;
		delete target.saveFields.vetags;
	} );
}

if ( mw.config.get( 'wgVisualEditorConfig' ).editCheck || mw.editcheck.forceEnable ) {
	const Controller = require( './controller.js' ).Controller;
	mw.hook( 've.newTarget' ).add( ( target ) => {
		if ( target.constructor.static.name !== 'article' ) {
			return;
		}
		const controller = new Controller( target );
		controller.setup();
	} );
}
