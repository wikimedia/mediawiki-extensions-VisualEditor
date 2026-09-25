/**
 * VisualEditor MediaWiki article copy handler.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

( function () {
	mw.libs.ve = mw.libs.ve || {};

	// Parsoid puts data-mw on the first element of a transclusion. Browsers drop
	// <link>, <meta> and <style> on copy, so a transclusion that starts with one
	// (e.g. TemplateStyles) loses its data-mw and VE cannot rebuild it (T174303).
	const headSelector = [ 'link', 'meta', 'style' ].map(
		( tag ) => '.mw-parser-output ' + tag + '[about][data-mw][typeof~="mw:Transclusion"]'
	).join( ',' );

	/**
	 * Check if any node in the about-group of a head is in a range
	 *
	 * Uses the same grouping rule as ve.dm.ModelFromDomConverter: contiguous
	 * element siblings with the same about attribute.
	 *
	 * @private
	 * @param {HTMLElement} head First element of the about-group
	 * @param {Range} range
	 * @return {boolean}
	 */
	function groupIntersects( head, range ) {
		const about = head.getAttribute( 'about' );
		let node = head;
		while ( node && node.nodeType === Node.ELEMENT_NODE && node.getAttribute( 'about' ) === about ) {
			if ( range.intersectsNode( node ) ) {
				return true;
			}
			node = node.nextSibling;
		}
		return false;
	}

	/**
	 * Make a span that holds the data-mw of a head in a form that copy keeps
	 *
	 * Matches the clipboard output of ve.dm.MWTransclusionNode#toDomElements.
	 *
	 * @private
	 * @param {HTMLElement} head
	 * @return {HTMLElement}
	 */
	function makeSpan( head ) {
		const span = document.createElement( 'span' );
		span.setAttribute( 'typeof', 'mw:Transclusion' );
		span.setAttribute( 'about', head.getAttribute( 'about' ) );
		span.setAttribute( 'data-mw', head.getAttribute( 'data-mw' ) );
		// Content comes from the pasted siblings, which can be incomplete, so make VE re-render
		span.setAttribute( 'data-ve-no-generated-contents', 'true' );
		return span;
	}

	/**
	 * Check if a range has no text before a node
	 *
	 * Browsers move the start of a copied selection to the first visible content,
	 * so they do not copy a span with no content at the start of the range.
	 *
	 * @private
	 * @param {Range} range
	 * @param {Node} node
	 * @return {boolean}
	 */
	function startsAt( range, node ) {
		if ( !range.intersectsNode( node ) ) {
			// The node is before the range start
			return true;
		}
		const before = range.cloneRange();
		before.setEndBefore( node );
		return before.toString().trim() === '';
	}

	/**
	 * Resolve a URL against the page
	 *
	 * @private
	 * @param {string} url
	 * @return {string} Absolute URL, or the input if it is not valid
	 */
	function absoluteUrl( url ) {
		try {
			return new URL( url, document.baseURI ).href;
		} catch ( err ) {
			return url;
		}
	}

	/**
	 * Handle copy events on an article view
	 *
	 * Public only for tests.
	 *
	 * @private
	 * @param {ClipboardEvent} e
	 */
	mw.libs.ve.onArticleCopy = function ( e ) {
		const selection = document.getSelection();
		const active = document.activeElement;
		if (
			// A VE surface handles its own copy and calls preventDefault
			e.defaultPrevented ||
			!selection || selection.rangeCount !== 1 || selection.isCollapsed ||
			// A copy from a form field copies the field text, not the selection around the field
			( active && ( active.isContentEditable || active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' ) )
		) {
			return;
		}
		const range = selection.getRangeAt( 0 );

		const spans = [];
		for ( const head of document.querySelectorAll( headSelector ) ) {
			if ( groupIntersects( head, range ) ) {
				const span = makeSpan( head );
				// Insert, do not replace: a <style> head styles every instance of the template
				head.parentNode.insertBefore( span, head );
				spans.push( span );
			}
		}
		if ( !spans.length ) {
			return;
		}

		// Nodes come in document order, so only the first span can be at the start
		if ( startsAt( range, spans[ 0 ] ) ) {
			// The browser does not copy the span, so write the clipboard data here.
			// This loses the inline styles that the browser adds.
			const extendedRange = range.cloneRange();
			extendedRange.setStartBefore( spans[ 0 ] );
			const wrapper = document.createElement( 'div' );
			wrapper.appendChild( extendedRange.cloneContents() );
			spans.forEach( ( span ) => span.remove() );
			// Remove the elements that the browser does not copy
			for ( const element of wrapper.querySelectorAll( 'link, meta, style' ) ) {
				element.remove();
			}
			// Make URLs absolute, as the browser does. The values come from the page,
			// not from user input, and DOMPurify is not loaded here.
			for ( const attr of [ 'href', 'src' ] ) {
				for ( const element of wrapper.querySelectorAll( '[' + attr + ']' ) ) {
					element.setAttribute( attr, absoluteUrl( element.getAttribute( attr ) ) );
				}
			}
			for ( const element of wrapper.querySelectorAll( '[srcset]' ) ) {
				// Each candidate is a URL with no spaces, then an optional descriptor.
				// A URL can contain commas, but trailing commas end the candidate.
				element.setAttribute( 'srcset', element.getAttribute( 'srcset' ).replace(
					/(^|,)(\s*)(\S+?)(?=,*(?:\s|$))/g,
					( match, separator, space, url ) => separator + space + absoluteUrl( url )
				) );
			}
			e.preventDefault();
			e.clipboardData.setData( 'text/html', wrapper.innerHTML );
			e.clipboardData.setData( 'text/plain', selection.toString() );
			return;
		}

		// The browser serializes the selection after all copy handlers return.
		// A microtask runs before that, so use a task.
		setTimeout( () => {
			spans.forEach( ( span ) => span.remove() );
		} );
	};

	// Only Parsoid read views have data-mw to keep
	if ( mw.config.get( 'wgParsoidHtmlVersion' ) ) {
		document.addEventListener( 'copy', mw.libs.ve.onArticleCopy );
	}
}() );
