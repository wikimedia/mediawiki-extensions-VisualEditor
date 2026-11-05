/*
 * Listens for MobileFrontend's 'mobileFrontend.fakeToolbar.ready' hook and, when suggestion
 * mode is available and the user is bucketed into the loading-rotation experiment, appends a
 * second phrase to the mobile editor's loading label so it rotates with "Loading editor…".
 */
mw.hook( 'mobileFrontend.fakeToolbar.ready' ).add( ( { $loadingMessage, isSourceMode } ) => {
	if (
		isSourceMode ||
		!mw.config.get( 'wgVisualEditor', {} ).editCheckSuggestionsAvailable ||
		!mw.user.options.get( 'visualeditor-editcheck-loading-rotation' )
	) {
		return;
	}
	$loadingMessage.find( '.ve-mobile-fakeToolbar-loading-label' ).append(
		$( '<span>' )
			.addClass( 've-mobile-fakeToolbar-loading-label-text' )
			.text( mw.msg( 'editcheck-mobile-loading-suggestions' ) )
	);
} );
