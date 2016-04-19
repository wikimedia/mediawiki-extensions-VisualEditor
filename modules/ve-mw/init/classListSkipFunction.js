/*!
 *
 * VisualEditor skip function for classList.js.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see http://ve.mit-license.org
 * Adapted from http://purl.eligrey.com/github/classList.js/blob/master/classList.js
 */
return !!(
        'classList' in document.createElement( '_' ) &&
        !(
            document.createElementNS &&
            !( 'classList' in document.createElementNS( 'http://www.w3.org/2000/svg', 'g' ) )
        )
    );
