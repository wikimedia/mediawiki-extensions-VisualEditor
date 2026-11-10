/*!
 * Pulse the read mode suggestion indicator on its first view.
 */
const key = 'editcheck-read-suggestions-seen';
if ( !mw.storage.get( key ) ) {
	document.documentElement.classList.add( 'ext-editcheck-read-suggestions-pulse' );
	mw.storage.set( key, '1' );
}
