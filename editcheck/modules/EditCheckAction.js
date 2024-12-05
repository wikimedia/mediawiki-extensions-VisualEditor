/**
 * EditCheckAction
 *
 * @param {Object} config
 * @param {mw.editcheck.BaseEditCheck} check
 * @param {ve.dm.SurfaceFragment[]} fragments Affected fragments
 * @param {jQuery|string|Function|OO.ui.HtmlSnippet} message Check message body
 */
mw.editcheck.EditCheckAction = function MWEditCheckAction( config ) {
	this.check = config.check;
	this.fragments = config.fragments;
	this.message = config.message;
};

OO.initClass( mw.editcheck.EditCheckAction );

/**
 * Get the available choices
 *
 * @return {Object[]}
 */
mw.editcheck.EditCheckAction.prototype.getChoices = function () {
	return this.check.getChoices( this );
};

/**
 * Get selections to highlight for this check
 *
 * @return {ve.dm.Selection[]}
 */
mw.editcheck.EditCheckAction.prototype.getHighlightSelections = function () {
	return this.fragments.map( ( fragment ) => fragment.getSelection() );
};

/**
 * Get a description of the check
 *
 * @return {string}
 */
mw.editcheck.EditCheckAction.prototype.getDescription = function () {
	return this.check.getDescription( this );
};
