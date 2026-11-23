/*!
 * Pulse the read mode suggestion indicator the first time that the user sees it.
 */
const key = 'editcheck-read-suggestions-seen';
// The edit buttons that show the indicator. Each skin has only one of them.
// Vector 2022 shows its button only when the sticky header shows.
const buttonSelector = '#ca-ve-edit-sticky-header, #page-actions-edit, #page-actions-ve-edit';

$( () => {
	const button = !mw.storage.get( key ) && document.querySelector( buttonSelector );
	if ( !button ) {
		return;
	}

	let isVisible = false;
	let observer = null;
	const pulseIfVisible = () => {
		// In Minerva, overlays (e.g. the editor) cover the page, and they have a '#/' URL hash
		if ( !isVisible || location.hash.startsWith( '#/' ) || document.visibilityState !== 'visible' ) {
			return;
		}
		observer.disconnect();
		window.removeEventListener( 'hashchange', pulseIfVisible );
		document.removeEventListener( 'visibilitychange', pulseIfVisible );
		document.documentElement.classList.add( 'ext-editcheck-read-suggestions-pulse' );
		mw.storage.set( key, '1' );
	};

	observer = new IntersectionObserver( ( entries ) => {
		isVisible = entries[ entries.length - 1 ].isIntersecting;
		pulseIfVisible();
	}, { threshold: 1 } );
	observer.observe( button );
	window.addEventListener( 'hashchange', pulseIfVisible );
	document.addEventListener( 'visibilitychange', pulseIfVisible );
} );
