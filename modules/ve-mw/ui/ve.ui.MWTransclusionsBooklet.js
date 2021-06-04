/**
 * Hides some of the complexity of managing the panes of a bookletLayout.
 *
 * This class wires a simple, high-level interface to the details of how pages
 * are added to the content pane and items to the sidebar.
 *
 * @class
 *
 * @constructor
 * @param {OO.ui.BookletLayout} [bookletLayout] Layout to manage
 */
ve.ui.MWTransclusionsBooklet = function VeUiMWTransclusionsBooklet( bookletLayout ) {
	this.bookletLayout = bookletLayout;
};

/* Setup */

OO.initClass( ve.ui.MWTransclusionsBooklet );

/**
 * Set the current element in all panes, by ID.
 *
 * @param {string} id transclusion part id
 */
ve.ui.MWTransclusionsBooklet.prototype.focusPart = function ( id ) {
	if ( this.bookletLayout.isOutlined() ) {
		this.bookletLayout.getOutline().selectItemByData( id );
	} else {
		this.bookletLayout.setPage( id );
	}
};

/**
 * Get the currently focused element
 *
 * @return {string|null} transclusion part id or null if no element is focused
 */
ve.ui.MWTransclusionsBooklet.prototype.getFocusedPart = function () {
	var item = this.bookletLayout.getOutline().findSelectedItem();
	return ( item ? item.getData() : null );
};
