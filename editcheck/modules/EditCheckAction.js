/**
 * EditCheckAction
 *
 * @param {Object} config
 * @param {mw.editcheck.BaseEditCheck} check
 * @param {ve.dm.SurfaceFragment[]} highlights Fragments to highlight
 * @param {ve.dm.SurfaceFragment} selection Fragment to select when acting
 * @param {jQuery|string|Function|OO.ui.HtmlSnippet} message Check message body
 */
mw.editcheck.EditCheckAction = function MWEditCheckAction( config ) {
	this.check = config.check;
	this.highlights = config.highlights;
	this.selection = config.selection;
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
 * Get a description of the check
 *
 * @return {string}
 */
mw.editcheck.EditCheckAction.prototype.getDescription = function () {
	return this.check.getDescription( this );
};
