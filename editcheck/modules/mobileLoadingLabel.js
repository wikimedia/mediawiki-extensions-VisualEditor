/*
 * Listens for MobileFrontend's 'mobileFrontend.fakeToolbar.ready' hook and, when suggestion
 * mode is available, appends a second phrase to the mobile editor's loading label
 * so it rotates with "Loading editor…".
 */
mw.hook( 'mobileFrontend.fakeToolbar.ready' ).add( ( { $loadingMessage, isSourceMode } ) => {
	const suggestionsAvailable = mw.config.get( 'wgVisualEditor', {} ).editCheckSuggestionsAvailable ||
		!!+mw.user.options.get( 'visualeditor-editcheck-suggestions' );
	if (
		isSourceMode ||
		!suggestionsAvailable
	) {
		return;
	}
	$loadingMessage.find( '.ve-mobile-fakeToolbar-loading-label' ).append(
		$( '<span>' )
			.addClass( 've-mobile-fakeToolbar-loading-label-text' )
			.text( mw.msg( 'editcheck-mobile-loading-suggestions' ) )
	);
} );
