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
	 * Check if the browser copies the text in a text node
	 *
	 * @private
	 * @param {Text} node
	 * @return {boolean}
	 */
	function isCopyable( node ) {
		let el = node.parentElement;
		if ( !el || getComputedStyle( el ).visibility === 'hidden' ) {
			return false;
		}
		// Not all browsers inherit the computed value of user-select, so check each ancestor.
		// The default display of style and script is none, so this also skips them.
		for ( ; el; el = el.parentElement ) {
			const style = getComputedStyle( el );
			if ( style.display === 'none' || ( style.userSelect || style.webkitUserSelect ) === 'none' ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Find the first text node in a range that has selected text that the browser copies
	 *
	 * A marker next to text is valid HTML. Other positions can be invalid,
	 * for example whitespace in a table.
	 *
	 * @private
	 * @param {Range} range
	 * @return {Text|null}
	 */
	function findTextNode( range ) {
		const walker = document.createTreeWalker( range.commonAncestorContainer, NodeFilter.SHOW_TEXT );
		// Start at the range, not at the start of the root
		walker.currentNode = range.startContainer;
		let node = walker.currentNode.nodeType === Node.TEXT_NODE ? walker.currentNode : walker.nextNode();
		while ( node ) {
			if ( !range.intersectsNode( node ) ) {
				if ( range.comparePoint( node, 0 ) === 1 ) {
					// The node is after the range
					return null;
				}
			} else {
				const start = node === range.startContainer ? range.startOffset : 0;
				const end = node === range.endContainer ? range.endOffset : node.length;
				if ( node.data.slice( start, end ).trim() && isCopyable( node ) ) {
					return node;
				}
			}
			node = walker.nextNode();
		}
		return null;
	}

	/**
	 * Remove a metadata marker, and merge the text node that its insertion split
	 *
	 * @private
	 * @param {HTMLElement} marker
	 * @param {Text|null} splitNode
	 */
	function removeMarker( marker, splitNode ) {
		const next = marker.nextSibling;
		marker.remove();
		if ( !splitNode || !next || next.nodeType !== Node.TEXT_NODE || splitNode.nextSibling !== next ) {
			return;
		}
		const selection = document.getSelection();
		const points = selection && selection.rangeCount && (
			selection.anchorNode === next || selection.focusNode === next
		) ? [ selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset ] : null;
		const offset = splitNode.length;
		splitNode.appendData( next.data );
		// This moves selection points in `next` out of the text, so restore them below
		next.remove();
		if ( points ) {
			for ( let i = 0; i < 4; i += 2 ) {
				if ( points[ i ] === next ) {
					points[ i ] = splitNode;
					points[ i + 1 ] += offset;
				}
			}
			selection.setBaseAndExtent( ...points );
		}
	}

	/**
	 * Put a marker with metadata about the source wiki at the start of a range
	 *
	 * Paste handlers read it from the data-mw-clipboard attribute.
	 *
	 * @private
	 * @param {Range} range
	 * @return {Function|null} Function that removes the marker, or null if no marker was added
	 */
	function insertMarker( range ) {
		const textNode = findTextNode( range );
		if ( !textNode ) {
			return null;
		}
		const marker = document.createElement( 'span' );
		marker.setAttribute( 'data-mw-clipboard', JSON.stringify( { domain: location.hostname } ) );
		// Chrome does not copy an element if its width or height is zero
		marker.style.cssText = 'display:inline-block;width:1px;height:1px;margin-right:-1px';

		let splitNode = null;
		if ( textNode === range.startContainer ) {
			// This splits the text node
			range.insertNode( marker );
			splitNode = textNode;
		} else {
			textNode.parentNode.insertBefore( marker, textNode );
		}
		return () => removeMarker( marker, splitNode );
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
		// Only Parsoid read views have data-mw to keep
		if ( mw.config.get( 'wgParsoidHtmlVersion' ) ) {
			for ( const head of document.querySelectorAll( headSelector ) ) {
				if ( groupIntersects( head, range ) ) {
					const span = makeSpan( head );
					// Insert, do not replace: a <style> head styles every instance of the template
					head.parentNode.insertBefore( span, head );
					spans.push( span );
				}
			}
		}

		let container = range.commonAncestorContainer;
		if ( container.nodeType !== Node.ELEMENT_NODE ) {
			container = container.parentNode;
		}
		const removeMarkerFn = container && container.closest( '.mw-parser-output' ) ?
			insertMarker( range ) : null;

		if ( !spans.length && !removeMarkerFn ) {
			return;
		}
		// Chrome loses the selected text if a node is inserted at a selection boundary.
		// Setting the selection again fixes this.
		selection.setBaseAndExtent( selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset );
		const cleanup = () => {
			spans.forEach( ( span ) => span.remove() );
			if ( removeMarkerFn ) {
				removeMarkerFn();
			}
		};

		// Nodes come in document order, so only the first span can be at the start
		if ( spans.length && startsAt( range, spans[ 0 ] ) ) {
			// The browser does not copy the span, so write the clipboard data here.
			// This loses the inline styles that the browser adds.
			const extendedRange = range.cloneRange();
			extendedRange.setStartBefore( spans[ 0 ] );
			const wrapper = document.createElement( 'div' );
			wrapper.appendChild( extendedRange.cloneContents() );
			cleanup();
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
		setTimeout( cleanup );
	};

	document.addEventListener( 'copy', mw.libs.ve.onArticleCopy );
}() );
