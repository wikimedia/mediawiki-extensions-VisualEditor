/*
 * `ecenable` query string:
 *   0: editcheck is completely disabled
 *   1: override user eligibility criteria for all checks
 *   2: also load experimental checks
 * Can also be a comma-separated series of flags:
 *   experimental: also load experimental checks
 *   suggestions: enable suggestion mode
 *
 * NOTE: everything here involving enabling edit check and experimental mode
 * needs to be kept in sync with ve.init.mw.ArticleTargetLoader, which is
 * responsible for actually loading the modules.
 */
let ecenable = mw.libs.ve.initialUrl.searchParams.get( 'ecenable' );
if ( window.MWVE_FORCE_EDIT_CHECK_ENABLED && ecenable !== '0' ) {
	// if edit check isn't forcibly disabled, override from this global
	ecenable = window.MWVE_FORCE_EDIT_CHECK_ENABLED;
}

if ( ecenable === '0' ) {
	return;
}
// any setting for forceEnable will bypass account-specific configs, though it will still honor the other configs
const experimentalPref = !!mw.user.options.get( 'visualeditor-editcheck-experimental' ) && !!mw.user.options.get( 'visualeditor-editcheck-suggestions' );
mw.editcheck = {
	config: require( './config.json' ),
	forceEnable: !!ecenable,
	experimental: !!( mw.config.get( 'wgVisualEditorConfig' ).enableEditCheckExperimental || experimentalPref || ecenable === '2' ),
	suggestionsModeAvailable: !!mw.user.options.get( 'visualeditor-editcheck-suggestions' ),
	// runtime performance logging config that we can adjust from the console
	sessionPerfConfig: { checksMax: 5000, typingMaxSamples: 5000 },
	resetSessionState: function () {
		this.state = {
			checks: {
				shown: {},
				seen: {},
				used: {}
			},
			suggestions: {
				shown: {},
				seen: {},
				used: {}
			},
			errored: {}
		};
	}
};
mw.editcheck.resetSessionState();

if ( ecenable && /^[\w,]+$/.test( ecenable ) ) {
	const ecenableFlags = ecenable.split( ',' );
	mw.editcheck.experimental = mw.editcheck.experimental || ecenableFlags.includes( 'experimental' );
	mw.editcheck.suggestionsModeAvailable = mw.editcheck.suggestionsModeAvailable || ecenableFlags.includes( 'suggestions' );
}

const abCheck = mw.config.get( 'wgVisualEditorConfig' ).editCheckABTest;
const abGroup = mw.config.get( 'wgVisualEditorConfig' ).editCheckABTestGroup;
const enableAbCheck = abGroup === 'test' || mw.editcheck.forceEnable;

// Checks which are loaded for logging but shouldn't show by default yet
const nonDefaultChecks = new Set();

require( './utils.js' );
require( './EditCheckPerformance.js' );
require( './EditCheckPreSaveToolbarTools.js' );
require( './EditCheckFactory.js' );
require( './EditCheckAction.js' );
require( './EditCheckActionWidget.js' );
require( './EditCheckGutterSectionIconWidget.js' );
require( './EditCheckGutterSectionWidget.js' );
require( './dialogs/EditCheckScrollIntoViewWidget.js' );
require( './dialogs/EditCheckDialog.js' );
require( './dialogs/FixedEditCheckDialog.js' );
require( './dialogs/MobileEditCheckDialog.js' );
require( './dialogs/SidebarEditCheckDialog.js' );
require( './dialogs/GutterSidebarEditCheckDialog.js' );
require( './editchecks/BaseEditCheck.js' );
require( './editchecks/ContentBranchNodeCheck.js' );
require( './editchecks/LinkEditCheck.js' );
require( './editchecks/AsyncTextCheck.js' );

if ( mw.editcheck.experimental ) {
	// ext.visualEditor.editCheck.experimental already loaded by ve.init.mw.ArticleTargetLoader
	nonDefaultChecks.clear();
}

if ( enableAbCheck ) {
	nonDefaultChecks.delete( abCheck );
} else if ( abGroup === 'control' ) {
	// This allows us to make default checks a/b testable
	nonDefaultChecks.add( abCheck );
}

for ( const check of nonDefaultChecks ) {
	mw.editcheck.editCheckFactory.unregister( check );
}

if ( abCheck === 'paste' ) {
	// In the a/b test, force-enable/disable the check
	mw.editcheck.config.paste = ve.extendObject( mw.editcheck.config.paste || {}, { showAsCheck: enableAbCheck } );
}

// Helper functions for ve.init.mw.ArticleTarget save-tagging, keep logic
// in-sync with AddReferenceEditCheck and ToneCheck.

/**
 * Check if the document has content needing a reference, for AddReferenceEditCheck
 *
 * @param {ve.dm.Document} documentModel
 * @param {boolean} includeReferencedContent Include content that already contains a reference
 * @return {boolean}
 */
mw.editcheck.hasAddedContentNeedingReference = function ( documentModel, includeReferencedContent ) {
	// TODO: This should be factored out into a static method so we don't have to construct a dummy check
	// Check might not be registered so we can't use the factory.
	const check = new mw.editcheck.AddReferenceEditCheck( null, mw.editcheck.editCheckFactory.buildConfig( 'addReference', { showAsCheck: true } ) );
	// Tag anything in the allowed namespaces, regardless of other eligibility checks
	if ( !check.inAllowedNamespace() ) {
		return false;
	}
	try {
		return check.findAddedContent( documentModel, includeReferencedContent ).length > 0;
	} catch ( e ) {
		mw.log.error( 'Error checking hasAddedContentNeedingReference', e );
		return false;
	}
};

mw.editcheck.hasFailingToneCheck = function ( surfaceModel ) {
	// Check might not be registered so we can't use the factory.
	const check = new mw.editcheck.ToneCheck( null, mw.editcheck.editCheckFactory.buildConfig( 'tone', { showAsCheck: true } ) );
	// Run actual check eligibility before calling API
	let canBeShown;
	try {
		canBeShown = check.canBeShown( surfaceModel.getDocument(), false );
	} catch ( e ) {
		mw.log.error( 'Error checking hasFailingToneCheck', e );
		return Promise.resolve( false );
	}
	if ( !canBeShown ) {
		return ve.createDeferred().resolve( false ).promise();
	}
	try {
		return Promise.all( check.handleListener( 'onCheckAll', surfaceModel ) )
			.then( ( results ) => results.some( ( result ) => result !== null ) )
			.catch( () => {} );
	} catch ( e ) {
		mw.log.error( 'Error checking hasFailingToneCheck', e );
		return Promise.resolve( false );
	}
};

if ( mw.config.get( 'wgVisualEditorConfig' ).editCheckTagging ) {
	mw.hook( 've.newTarget' ).add( ( target ) => {
		if ( target.constructor.static.name !== 'article' ) {
			return;
		}

		let initLength;
		function getRefNodes() {
			// The firstNodes list is a numerically indexed array of reference nodes in the document.
			// The list is append only, and removed references are set to undefined in place.
			// To check if a new reference is being published, we just need to know if a reference
			// with an index beyond the initial list (initLength) is still set.
			const internalList = target.getSurface().getModel().getDocument().getInternalList();
			const group = internalList.getNodeGroup( 'mwReference/' );
			return group ? group.firstNodes || [] : [];
		}
		function hasLLMPaste() {
			// Look for content pasted from an LLM anywhere in the document
			const documentModel = target.getSurface().getModel().getDocument();
			return documentModel.getDocumentNode().getAnnotationRanges().some( ( annRange ) => {
				const annotation = annRange.annotation;
				if ( !( annotation instanceof ve.dm.ImportedDataAnnotation ) ) {
					return false;
				}
				const source = annotation.getAttribute( 'source' );
				return !!source && source.categories.includes( 'ai' );
			} );
		}
		target.on( 'surfaceReady', () => {
			initLength = getRefNodes().length;
		} );

		let hasFailingToneCheck = null;
		target.getPreSaveProcess().first( () => {
			// Start checking for tone in the pre-save process, but don't block the save dialog
			// from appearing. If the tone check isn't finished by save time we will just log
			// an error.
			hasFailingToneCheck = null;
			mw.editcheck.hasFailingToneCheck( target.getSurface().getModel() ).then( ( result ) => {
				hasFailingToneCheck = result;
			} );
		} );

		// saveOptionsProcess is executed every time a save is attempted
		target.getSaveOptionsProcess().next( () => {
			if ( target.getSurface().getMode() !== 'visual' ) {
				return;
			}
			// In case someone is retrying a save, clear state for the
			// tags that could possibly change between saves:
			target.deleteSaveTag( 'editcheck-tone' );
			target.deleteSaveTag( 'editcheck-newreference' );
			target.deleteSaveTag( 'editcheck-llm-paste' );
			// Now build tags:
			const refNodes = getRefNodes();
			const newLength = refNodes.length;
			let newNodesInDoc = false;
			for ( let i = initLength; i < newLength; i++ ) {
				if ( refNodes[ i ] ) {
					newNodesInDoc = true;
					break;
				}
			}
			if ( newNodesInDoc ) {
				target.addSaveTag( 'editcheck-newreference' );
			}
			if ( mw.editcheck.state.checks.shown.addReference ) {
				target.addSaveTag( 'editcheck-references-shown' );
			}
			if ( mw.editcheck.state.checks.shown.tone ) {
				target.addSaveTag( 'editcheck-tone-shown' );
			}
			if ( mw.editcheck.state.checks.shown.paste ) {
				target.addSaveTag( 'editcheck-paste-shown' );
			}
			if ( hasLLMPaste() ) {
				target.addSaveTag( 'editcheck-llm-paste' );
			}
			if ( mw.editcheck.state.checks.shown[ 'llm-paste' ] ) {
				target.addSaveTag( 'editcheck-llm-paste-shown' );
			}
			if ( Object.keys( mw.editcheck.state.suggestions.seen ).length > 0 ) {
				target.addSaveTag( 'editsuggestion-seen' );
			}
			if ( Object.keys( mw.editcheck.state.suggestions.used ).length > 0 ) {
				target.addSaveTag( 'editsuggestion-used' );
			}
			if ( hasFailingToneCheck ) {
				target.addSaveTag( 'editcheck-tone' );
			} else if ( hasFailingToneCheck === null ) {
				ve.track( 'activity.editCheck-tone', { action: 'save-before-check-finalized' } );
			}
		} );
	} );
}

const Controller = require( './controller.js' ).Controller;
mw.editcheck.Controller = Controller;

if ( mw.config.get( 'wgVisualEditorConfig' ).editCheck || mw.editcheck.forceEnable ) {
	if ( mw.editcheck.suggestionsModeAvailable ) {
		require( './EditCheckSuggestionsTool.js' );
	}

	mw.hook( 've.newTarget' ).add( ( target ) => {
		if ( target.constructor.static.name !== 'article' ) {
			return;
		}
		const controller = new Controller( target, {
			suggestionsModeAvailable: mw.editcheck.suggestionsModeAvailable
		} );
		controller.setup();

		if ( ve.ui.EditCheckSuggestionsTool && !controller.editChecksArePossible( true ) ) {
			// This is mostly to stop the suggestion toolbar item from appearing outside enabled namespaces
			ve.ui.toolFactory.unregister( ve.ui.EditCheckSuggestionsTool );
		}

		target.editcheckController = controller;

		// Temporary logging for T394952
		if ( abCheck === 'tone' && !enableAbCheck ) {
			const checkForTone = function ( listener ) {
				mw.editcheck.hasFailingToneCheck( controller.surface.getModel() ).then( ( result ) => {
					if ( result ) {
						ve.track( 'activity.editCheck-tone', { action: 'check-control-' + listener } );
					}
				} );
			};
			controller.on( 'branchNodeChange', () => {
				checkForTone( 'branchNodeChange' );
			} );
			controller.on( 'onBeforeSave', () => {
				checkForTone( 'onBeforeSave' );
			} );
		}
		if ( mw.editcheck.experimental ) {
			ve.track( 'activity.editCheck', { action: 'session-initialized-with-experimental' } );
		}
		if ( mw.editcheck.suggestionsModeAvailable ) {
			ve.track( 'activity.editCheck', { action: 'session-initialized-with-suggestions' } );
		}
		target.on( 'surfaceReady', () => {
			target.getSurface().on( 'destroy', () => {
				mw.editcheck.resetSessionState();
			} );
			// Temporary logging for T402460
			target.getSurface().getView().on( 'paste', ( data ) => {
				const defaults = mw.editcheck.editCheckFactory.buildConfig( 'paste' );
				// Check might not be registered so we can't use the factory.
				const check = new mw.editcheck.PasteCheck( null, mw.editcheck.editCheckFactory.buildConfig( 'paste', { showAsCheck: true } ) );
				if ( check.canBeShown( target.getSurface().getModel().getDocument(), false ) && data.fragment.getSelection().getCoveringRange().getLength() >= check.config.minimumCharacters ) {
					// The check would be shown for the current viewer, and there's enough content that we care about it:
					if ( data.source ) {
						// Known-source pastes that we're not showing regardless of the check being enabled/disabled
						ve.track( 'activity.editCheck-paste', { action: 'ignored-paste-' + data.source } );
					} else if ( !defaults.showAsCheck ) {
						// The check is disabled, and there's no source so we would have shown the check otherwise
						ve.track( 'activity.editCheck-paste', { action: 'relevant-paste' } );
					}
				}
			} );
		} );
	} );
}
